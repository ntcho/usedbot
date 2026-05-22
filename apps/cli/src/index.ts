#!/usr/bin/env node

import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PlainTextStateStore, createCoreEngine } from "../../../packages/core/src/index.js";
import { createScraperClient } from "../../../packages/scraper-client/src/index.js";
import {
  isMarketplace,
  type CoreSettings,
  type CoreStateSnapshot,
  type HealthResponse,
  type MonitorCycleResult,
  type SearchRequest,
} from "../../../packages/shared/src/index.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SIDECAR_DIR = resolve(REPO_ROOT, "services", "scraper-sidecar");
const DEFAULT_DATA_DIR = resolve(REPO_ROOT, "data", "core");
const DEFAULT_SIDECAR_BASE_URL = "http://127.0.0.1:5111";
const DEFAULT_SIDECAR_STARTUP_TIMEOUT_MS = 10_000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

interface ParsedArguments {
  positionals: string[];
  flags: Map<string, string | true>;
}

export interface CliCoreEngine {
  getState(): Promise<CoreStateSnapshot>;
  updateSettings(updates: Partial<CoreSettings>): Promise<CoreStateSnapshot>;
  addSearch(search: SearchRequest): Promise<boolean>;
  removeSearch(search: SearchRequest): Promise<boolean>;
  runConfiguredMonitorCycle(options?: { headed?: boolean }): Promise<MonitorCycleResult>;
}

export interface SidecarSession {
  started: boolean;
  health: HealthResponse;
  stop(): Promise<void>;
}

export interface SidecarManager {
  ensureAvailable(): Promise<SidecarSession>;
}

export interface CliServices {
  engine: CliCoreEngine;
  sidecarManager: SidecarManager;
  fetch: typeof fetch;
}

export interface CliRuntime {
  stdout(message: string): void;
  stderr(message: string): void;
  createServices(): CliServices;
}

interface HealthClient {
  health(): Promise<HealthResponse>;
}

type SpawnProcess = (command: string, args: string[], options: Parameters<typeof spawn>[2]) => ChildProcess;

export interface LocalSidecarManagerOptions {
  client: HealthClient;
  baseUrl: string;
  sidecarDir: string;
  env: NodeJS.ProcessEnv;
  startupTimeoutMs?: number;
  spawnProcess?: SpawnProcess;
  sleep?: (ms: number) => Promise<void>;
}

class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export class LocalSidecarManager implements SidecarManager {
  readonly #client: HealthClient;
  readonly #baseUrl: string;
  readonly #sidecarDir: string;
  readonly #env: NodeJS.ProcessEnv;
  readonly #startupTimeoutMs: number;
  readonly #spawnProcess: SpawnProcess;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(options: LocalSidecarManagerOptions) {
    this.#client = options.client;
    this.#baseUrl = options.baseUrl;
    this.#sidecarDir = options.sidecarDir;
    this.#env = options.env;
    this.#startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_SIDECAR_STARTUP_TIMEOUT_MS;
    this.#spawnProcess = options.spawnProcess ?? spawn;
    this.#sleep = options.sleep ?? ((ms) => sleep(ms).then(() => undefined));
  }

  async ensureAvailable(): Promise<SidecarSession> {
    try {
      const health = await this.#client.health();
      return {
        started: false,
        health,
        stop: async () => undefined,
      };
    } catch (initialError) {
      const launch = resolveSidecarLaunch(this.#baseUrl);
      const child = this.#spawnProcess("uv", ["run", "scraper-sidecar"], {
        cwd: this.#sidecarDir,
        env: {
          ...this.#env,
          SCRAPER_SIDECAR_HOST: launch.host,
          SCRAPER_SIDECAR_PORT: String(launch.port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr = appendBufferedOutput(stderr, String(chunk));
      });

      const deadline = Date.now() + this.#startupTimeoutMs;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) {
          break;
        }

        try {
          const health = await this.#client.health();
          return {
            started: true,
            health,
            stop: async () => this.#stopChild(child),
          };
        } catch {
          await this.#sleep(200);
        }
      }

      const failure = formatSidecarStartupFailure({
        baseUrl: this.#baseUrl,
        initialError,
        child,
        stderr,
      });
      await this.#stopChild(child);
      throw new CliError(failure);
    }
  }

  async #stopChild(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null) {
      return;
    }

    const exitPromise = waitForChildExit(child);
    child.kill("SIGTERM");
    await Promise.race([exitPromise, this.#sleep(2_000)]);

    if (child.exitCode !== null) {
      return;
    }

    child.kill("SIGKILL");
    await exitPromise;
  }
}

export async function runCli(argv: string[], runtime: CliRuntime = createNodeRuntime()): Promise<number> {
  try {
    return await execute(argv, runtime);
  } catch (error) {
    if (error instanceof CliError) {
      runtime.stderr(error.message);
      return error.exitCode;
    }

    runtime.stderr(error instanceof Error ? error.message : "Unexpected CLI failure");
    return 1;
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  process.exitCode = await runCli(argv);
}

async function execute(argv: string[], runtime: CliRuntime): Promise<number> {
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help" || argv[0] === "-h") {
    printHelp(runtime);
    return 0;
  }

  const services = runtime.createServices();
  const [command, ...rest] = argv;

  switch (command) {
    case "config":
      return handleConfig(rest, services, runtime);
    case "monitor":
      return handleMonitor(rest, services, runtime);
    case "results":
      return handleResults(rest, services, runtime);
    case "notify":
      return handleNotify(rest, services, runtime);
    default:
      throw new CliError(`Unknown command: ${command}\n\n${HELP_TEXT}`);
  }
}

async function handleConfig(argv: string[], services: CliServices, runtime: CliRuntime): Promise<number> {
  const [section, subsection, ...rest] = argv;

  if (section === "show" && subsection === undefined) {
    renderConfig(await services.engine.getState(), runtime);
    return 0;
  }

  if (section === "search") {
    switch (subsection) {
      case "add": {
        const parsed = parseArguments(rest);
        assertNoUnexpectedFlags(parsed, new Set(["marketplace", "query", "location"]));
        assertNoPositionals(parsed, "config search add");
        const search = parseSearchFlags(parsed);
        const added = await services.engine.addSearch(search);
        runtime.stdout(added ? `Saved search: ${formatSearch(search)}` : `Search already exists: ${formatSearch(search)}`);
        return 0;
      }
      case "list": {
        assertNoPositionalsOrFlags(parseArguments(rest), "config search list");
        renderSearches((await services.engine.getState()).searches, runtime);
        return 0;
      }
      case "remove": {
        const parsed = parseArguments(rest);
        assertNoUnexpectedFlags(parsed, new Set(["marketplace", "query", "location"]));
        assertNoPositionals(parsed, "config search remove");
        const search = parseSearchFlags(parsed);
        const removed = await services.engine.removeSearch(search);
        if (!removed) {
          throw new CliError(`Search not found: ${formatSearch(search)}`);
        }

        runtime.stdout(`Removed search: ${formatSearch(search)}`);
        return 0;
      }
      default:
        throw new CliError(`Unknown config search command: ${subsection ?? "(missing)"}`);
    }
  }

  if (section === "notifications" && subsection === "set") {
    const parsed = parseArguments(rest);
    assertNoUnexpectedFlags(parsed, new Set(["enabled", "terminal", "webhook", "webhook-url"]));
    assertNoPositionals(parsed, "config notifications set");
    const updates = buildNotificationUpdates(parsed);
    const state = await services.engine.updateSettings(updates);
    renderSettings(state, runtime);
    return 0;
  }

  throw new CliError(`Unknown config command.\n\n${HELP_TEXT}`);
}

async function handleMonitor(argv: string[], services: CliServices, runtime: CliRuntime): Promise<number> {
  const [action, ...rest] = argv;
  if (action !== "run") {
    throw new CliError(`Unknown monitor command: ${action ?? "(missing)"}`);
  }

  const parsed = parseArguments(rest);
  assertNoUnexpectedFlags(parsed, new Set(["headed"]));
  assertNoPositionals(parsed, "monitor run");
  const headed = readOptionalBooleanFlag(parsed, "headed") ?? false;

  const state = await services.engine.getState();
  if (state.searches.length === 0) {
    throw new CliError("No searches are configured. Add a search before running monitor.");
  }

  const session = await services.sidecarManager.ensureAvailable();
  if (session.started) {
    runtime.stdout("Started local scraper sidecar for this run.");
  }

  try {
    const result = await services.engine.runConfiguredMonitorCycle(headed ? { headed: true } : {});
    renderMonitorResult(result, runtime, headed);
    return result.searchResults.some((search) => !search.response.ok) ? 1 : 0;
  } finally {
    await session.stop();
  }
}

async function handleResults(argv: string[], services: CliServices, runtime: CliRuntime): Promise<number> {
  const [action, ...rest] = argv;
  if (action !== "list") {
    throw new CliError(`Unknown results command: ${action ?? "(missing)"}`);
  }

  const parsed = parseArguments(rest);
  assertNoUnexpectedFlags(parsed, new Set(["limit"]));
  assertNoPositionals(parsed, "results list");
  const limit = readOptionalNumberFlag(parsed, "limit") ?? 10;
  if (limit <= 0) {
    throw new CliError("--limit must be a positive integer.");
  }

  renderRecentResults(await services.engine.getState(), limit, runtime);
  return 0;
}

async function handleNotify(argv: string[], services: CliServices, runtime: CliRuntime): Promise<number> {
  const [action, channel, ...rest] = argv;
  if (action !== "test") {
    throw new CliError(`Unknown notify command: ${action ?? "(missing)"}`);
  }

  if (channel !== "terminal" && channel !== "webhook") {
    throw new CliError("notify test requires a channel: terminal or webhook.");
  }

  const parsed = parseArguments(rest);
  assertNoUnexpectedFlags(parsed, new Set(["message", "url"]));
  assertNoPositionals(parsed, "notify test");
  const message = readOptionalStringFlag(parsed, "message")?.trim() || "usedbot test notification";

  if (channel === "terminal") {
    runtime.stdout(`[terminal] ${message}`);
    return 0;
  }

  const state = await services.engine.getState();
  const configuredUrl = state.settings.channels.webhook.url;
  const webhookUrl = readOptionalStringFlag(parsed, "url") ?? configuredUrl;
  if (!webhookUrl) {
    throw new CliError("Webhook test requires a configured URL or --url.");
  }

  const response = await services.fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: "usedbot.test",
      channel: "webhook",
      message,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new CliError(`Webhook test failed with status ${response.status}${body ? `: ${body}` : ""}`);
  }

  runtime.stdout(`Webhook test sent to ${webhookUrl}`);
  return 0;
}

function createNodeRuntime(): CliRuntime {
  const baseUrl = readConfiguredBaseUrl(process.env);
  const scraperClient = createScraperClient({ baseUrl });
  const store = new PlainTextStateStore({ dataDir: readConfiguredDataDir(process.env) });
  const engine = createCoreEngine({
    scraperClient,
    store,
  });

  return {
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`),
    createServices: () => ({
      engine,
      sidecarManager: new LocalSidecarManager({
        client: scraperClient,
        baseUrl,
        sidecarDir: SIDECAR_DIR,
        env: process.env,
        startupTimeoutMs: readConfiguredStartupTimeout(process.env),
      }),
      fetch: globalThis.fetch,
    }),
  };
}

function parseArguments(argv: string[]): ParsedArguments {
  const parsed: ParsedArguments = {
    positionals: [],
    flags: new Map(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    if (!token.startsWith("--")) {
      parsed.positionals.push(token);
      continue;
    }

    const inlineSeparator = token.indexOf("=");
    if (inlineSeparator >= 0) {
      const name = token.slice(2, inlineSeparator);
      if (!name) {
        throw new CliError(`Invalid flag: ${token}`);
      }

      parsed.flags.set(name, token.slice(inlineSeparator + 1));
      continue;
    }

    const name = token.slice(2);
    if (!name) {
      throw new CliError(`Invalid flag: ${token}`);
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      parsed.flags.set(name, next);
      index += 1;
      continue;
    }

    parsed.flags.set(name, true);
  }

  return parsed;
}

function parseSearchFlags(parsed: ParsedArguments): SearchRequest {
  const marketplace = readRequiredStringFlag(parsed, "marketplace");
  if (!isMarketplace(marketplace)) {
    throw new CliError(`Unsupported marketplace: ${marketplace}`);
  }

  const query = readRequiredStringFlag(parsed, "query").trim();
  if (!query) {
    throw new CliError("--query cannot be empty.");
  }

  const location = normalizeOptionalText(readOptionalStringFlag(parsed, "location"));
  return {
    marketplace,
    query,
    ...(location === undefined ? {} : { location }),
  };
}

function buildNotificationUpdates(parsed: ParsedArguments): Partial<CoreSettings> {
  const enabled = readOptionalBooleanFlag(parsed, "enabled");
  const terminal = readOptionalBooleanFlag(parsed, "terminal");
  const webhook = readOptionalBooleanFlag(parsed, "webhook");
  const webhookUrl = readOptionalStringFlag(parsed, "webhook-url");

  if (enabled === undefined && terminal === undefined && webhook === undefined && webhookUrl === undefined) {
    throw new CliError("config notifications set needs at least one flag to change.");
  }

  const updates: Partial<CoreSettings> = {};
  if (enabled !== undefined) {
    updates.notificationsEnabled = enabled;
  }

  const channels: Partial<CoreSettings["channels"]> = {};
  if (terminal !== undefined) {
    channels.terminal = { enabled: terminal };
  }

  if (webhook !== undefined || webhookUrl !== undefined) {
    const webhookChannel: Partial<CoreSettings["channels"]["webhook"]> = {};
    if (webhook !== undefined) {
      webhookChannel.enabled = webhook;
    }
    if (webhookUrl !== undefined) {
      webhookChannel.url = webhookUrl;
    }
    channels.webhook = webhookChannel as CoreSettings["channels"]["webhook"];
  }

  if (Object.keys(channels).length > 0) {
    updates.channels = channels as CoreSettings["channels"];
  }

  return updates;
}

function readRequiredStringFlag(parsed: ParsedArguments, name: string): string {
  const value = readOptionalStringFlag(parsed, name);
  if (value === undefined) {
    throw new CliError(`Missing required flag --${name}.`);
  }

  return value;
}

function readOptionalStringFlag(parsed: ParsedArguments, name: string): string | undefined {
  const value = parsed.flags.get(name);
  if (value === undefined) {
    return undefined;
  }

  if (value === true) {
    throw new CliError(`Flag --${name} requires a value.`);
  }

  return value;
}

function readOptionalBooleanFlag(parsed: ParsedArguments, name: string): boolean | undefined {
  const value = parsed.flags.get(name);
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new CliError(`Flag --${name} must be true or false.`);
}

function readOptionalNumberFlag(parsed: ParsedArguments, name: string): number | undefined {
  const value = readOptionalStringFlag(parsed, name);
  if (value === undefined) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue)) {
    throw new CliError(`Flag --${name} must be an integer.`);
  }

  return parsedValue;
}

function assertNoUnexpectedFlags(parsed: ParsedArguments, allowed: ReadonlySet<string>): void {
  const unexpected = [...parsed.flags.keys()].filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    throw new CliError(`Unexpected flag(s): ${unexpected.map((name) => `--${name}`).join(", ")}`);
  }
}

function assertNoPositionals(parsed: ParsedArguments, command: string): void {
  if (parsed.positionals.length > 0) {
    throw new CliError(`Unexpected positional arguments for ${command}: ${parsed.positionals.join(" ")}`);
  }
}

function assertNoPositionalsOrFlags(parsed: ParsedArguments, command: string): void {
  assertNoPositionals(parsed, command);
  if (parsed.flags.size > 0) {
    throw new CliError(`Unexpected flags for ${command}: ${[...parsed.flags.keys()].map((name) => `--${name}`).join(", ")}`);
  }
}

function renderConfig(state: CoreStateSnapshot, runtime: CliRuntime): void {
  renderSearches(state.searches, runtime);
  renderSettings(state, runtime);
}

function renderSearches(searches: SearchRequest[], runtime: CliRuntime): void {
  runtime.stdout("Searches:");
  if (searches.length === 0) {
    runtime.stdout("  (none configured)");
    return;
  }

  searches.forEach((search, index) => {
    runtime.stdout(`  ${index + 1}. ${formatSearch(search)}`);
  });
}

function renderSettings(state: CoreStateSnapshot, runtime: CliRuntime): void {
  runtime.stdout("Settings:");
  runtime.stdout(`  notifications enabled: ${state.settings.notificationsEnabled}`);
  runtime.stdout(`  terminal enabled: ${state.settings.channels.terminal.enabled}`);
  runtime.stdout(`  webhook enabled: ${state.settings.channels.webhook.enabled}`);
  runtime.stdout(`  webhook url: ${state.settings.channels.webhook.url ?? "(not set)"}`);
}

function renderMonitorResult(result: MonitorCycleResult, runtime: CliRuntime, headed: boolean): void {
  const counts = new Map<string, number>();
  for (const listing of result.processedListings) {
    counts.set(listing.changeType, (counts.get(listing.changeType) ?? 0) + 1);
  }

  const eligibleNotifications = result.processedListings
    .flatMap((listing) => listing.notificationDecisions)
    .filter((decision) => decision.shouldNotify).length;
  const failures = result.searchResults.filter((search) => !search.response.ok);

  runtime.stdout("Monitor run complete:");
  runtime.stdout(`  searches: ${result.searchResults.length}`);
  runtime.stdout(`  listings processed: ${result.processedListings.length}`);
  runtime.stdout(`  new: ${counts.get("new") ?? 0}`);
  runtime.stdout(`  price changed: ${counts.get("price_changed") ?? 0}`);
  runtime.stdout(`  status changed: ${counts.get("status_changed") ?? 0}`);
  runtime.stdout(`  updated: ${counts.get("updated") ?? 0}`);
  runtime.stdout(`  unchanged: ${counts.get("unchanged") ?? 0}`);
  runtime.stdout(`  eligible notifications: ${eligibleNotifications}`);
  if (headed) {
    runtime.stdout("  headed debugging: enabled");
  }

  if (failures.length > 0) {
    runtime.stdout("Search failures:");
    failures.forEach((failure) => {
      runtime.stdout(
        `  - ${formatSearch(failure.criteria)}: ${failure.response.failure?.kind ?? "runtime_unavailable"} - ${failure.response.failure?.message ?? "Unknown failure"}`,
      );
    });
  }
}

function renderRecentResults(state: CoreStateSnapshot, limit: number, runtime: CliRuntime): void {
  const listings = [...state.listings]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);

  runtime.stdout(`Recent results (${listings.length}/${state.listings.length}):`);
  if (listings.length === 0) {
    runtime.stdout("  (no listings stored yet)");
    return;
  }

  listings.forEach((listing, index) => {
    runtime.stdout(
      `  ${index + 1}. [${listing.marketplace}] ${listing.title} | ${listing.priceText} | ${listing.saleStatus} | ${listing.updatedAt}`,
    );
  });
}

function formatSearch(search: SearchRequest): string {
  return [search.marketplace, search.query, search.location].filter(Boolean).join(" | ");
}

function resolveSidecarLaunch(baseUrl: string): { host: string; port: number } {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new CliError(`Invalid scraper base URL: ${baseUrl}`);
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new CliError(
      `Scraper base URL ${baseUrl} is not local. Start that sidecar manually or point USEDBOT_SCRAPER_BASE_URL at a local address.`,
    );
  }

  const port = url.port ? Number.parseInt(url.port, 10) : url.protocol === "https:" ? 443 : 80;
  if (!Number.isInteger(port) || port <= 0) {
    throw new CliError(`Invalid scraper sidecar port in ${baseUrl}`);
  }

  return {
    host: url.hostname,
    port,
  };
}

function formatSidecarStartupFailure(options: {
  baseUrl: string;
  initialError: unknown;
  child: ChildProcess;
  stderr: string;
}): string {
  const initialMessage = options.initialError instanceof Error ? options.initialError.message : "Initial health check failed";
  const exitDetail =
    options.child.exitCode !== null
      ? `sidecar exited with code ${options.child.exitCode}`
      : options.child.signalCode !== null
        ? `sidecar exited with signal ${options.child.signalCode}`
        : "sidecar did not become healthy before timeout";
  const stderrDetail = options.stderr.trim() ? `\nstderr:\n${options.stderr.trim()}` : "";

  return `Failed to start the local scraper sidecar at ${options.baseUrl}. ${exitDetail}. Initial error: ${initialMessage}.${stderrDetail}`;
}

function appendBufferedOutput(current: string, chunk: string): string {
  const next = `${current}${chunk}`;
  return next.length <= 4_000 ? next : next.slice(-4_000);
}

function waitForChildExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

function readConfiguredBaseUrl(env: NodeJS.ProcessEnv): string {
  const configured = env.USEDBOT_SCRAPER_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_SIDECAR_BASE_URL;
}

function readConfiguredDataDir(env: NodeJS.ProcessEnv): string {
  const configured = env.USEDBOT_DATA_DIR?.trim();
  return configured && configured.length > 0 ? resolve(REPO_ROOT, configured) : DEFAULT_DATA_DIR;
}

function readConfiguredStartupTimeout(env: NodeJS.ProcessEnv): number {
  const configured = env.USEDBOT_SIDECAR_STARTUP_TIMEOUT_MS?.trim();
  if (!configured) {
    return DEFAULT_SIDECAR_STARTUP_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(configured, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_SIDECAR_STARTUP_TIMEOUT_MS;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function printHelp(runtime: CliRuntime): void {
  runtime.stdout(HELP_TEXT);
}

const HELP_TEXT = [
  "usedbot command-only CLI",
  "",
  "Commands:",
  "  config show",
  "  config search add --marketplace <name> --query <text> [--location <text>]",
  "  config search list",
  "  config search remove --marketplace <name> --query <text> [--location <text>]",
  "  config notifications set [--enabled true|false] [--terminal true|false] [--webhook true|false] [--webhook-url <url>]",
  "  monitor run [--headed]",
  "  results list [--limit <n>]",
  "  notify test <terminal|webhook> [--message <text>] [--url <url>]",
].join("\n");

if (isDirectExecution()) {
  void main();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href;
}
