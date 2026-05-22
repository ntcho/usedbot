import type { ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import {
  LocalSidecarManager,
  runCli,
  type CliCoreEngine,
  type CliRuntime,
  type SidecarManager,
} from "./index.js";
import {
  createCoreSettings,
  createEmptyCoreState,
  mergeCoreSettings,
  type CoreStateSnapshot,
  type HealthResponse,
  type MonitorCycleResult,
  type SearchRequest,
} from "../../../packages/shared/src/index.js";

class FakeEngine implements CliCoreEngine {
  state: CoreStateSnapshot = createEmptyCoreState();
  readonly addSearchCalls: SearchRequest[] = [];
  readonly removeSearchCalls: SearchRequest[] = [];
  readonly updateSettingsCalls: Partial<CoreStateSnapshot["settings"]>[] = [];
  readonly runConfiguredCalls: Array<{ headed?: boolean }> = [];
  monitorResult: MonitorCycleResult = {
    firstCycle: true,
    startedAt: "2026-05-22T00:00:00.000Z",
    completedAt: "2026-05-22T00:00:01.000Z",
    searchResults: [],
    processedListings: [],
    state: createEmptyCoreState(),
  };

  async getState(): Promise<CoreStateSnapshot> {
    return structuredClone(this.state);
  }

  async updateSettings(updates: Partial<CoreStateSnapshot["settings"]>): Promise<CoreStateSnapshot> {
    this.updateSettingsCalls.push(updates);
    this.state.settings = mergeCoreSettings(this.state.settings, updates);
    return this.getState();
  }

  async addSearch(search: SearchRequest): Promise<boolean> {
    this.addSearchCalls.push(search);
    this.state.searches.push(search);
    return true;
  }

  async removeSearch(search: SearchRequest): Promise<boolean> {
    this.removeSearchCalls.push(search);
    this.state.searches = this.state.searches.filter(
      (current) =>
        !(
          current.marketplace === search.marketplace &&
          current.query === search.query &&
          current.location === search.location
        ),
    );
    return true;
  }

  async runConfiguredMonitorCycle(options: { headed?: boolean } = {}): Promise<MonitorCycleResult> {
    this.runConfiguredCalls.push(options);
    return this.monitorResult;
  }
}

class FakeSidecarManager implements SidecarManager {
  ensureCalls = 0;
  stopCalls = 0;
  started = false;
  error: Error | undefined;
  health: HealthResponse = {
    status: "ok",
    started: true,
    capabilities: [],
  };

  async ensureAvailable() {
    this.ensureCalls += 1;
    if (this.error) {
      throw this.error;
    }

    return {
      started: this.started,
      health: this.health,
      stop: async () => {
        this.stopCalls += 1;
      },
    };
  }
}

class FakeChildProcess extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  readonly killedSignals: Array<NodeJS.Signals | number> = [];

  kill(signal: NodeJS.Signals | number = "SIGTERM"): boolean {
    this.killedSignals.push(signal);
    if (this.exitCode === null) {
      this.exitCode = signal === "SIGKILL" ? 137 : 0;
      this.signalCode = typeof signal === "string" ? signal : null;
      queueMicrotask(() => {
        this.emit("exit", this.exitCode, this.signalCode);
      });
    }
    return true;
  }
}

test("config search add parses flags and invokes the core engine", async () => {
  const engine = new FakeEngine();
  const sidecar = new FakeSidecarManager();
  const { runtime, stdout, stderr } = createRuntime(engine, sidecar);

  const exitCode = await runCli(
    ["config", "search", "add", "--marketplace", "danggeun", "--query", " camera ", "--location", " Seoul "],
    runtime,
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(engine.addSearchCalls, [
    {
      marketplace: "danggeun",
      query: "camera",
      location: "Seoul",
    },
  ]);
  assert.match(stdout.join("\n"), /Saved search/);
  assert.deepEqual(stderr, []);
});

test("config notifications set forwards local settings updates to the core engine", async () => {
  const engine = new FakeEngine();
  engine.state.settings = createCoreSettings();
  const sidecar = new FakeSidecarManager();
  const { runtime } = createRuntime(engine, sidecar);

  const exitCode = await runCli(
    [
      "config",
      "notifications",
      "set",
      "--enabled",
      "true",
      "--terminal",
      "false",
      "--webhook",
      "true",
      "--webhook-url",
      "https://example.test/hook",
    ],
    runtime,
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(engine.updateSettingsCalls, [
    {
      notificationsEnabled: true,
      channels: {
        terminal: { enabled: false },
        webhook: { enabled: true, url: "https://example.test/hook" },
      },
    },
  ]);
});

test("monitor run uses configured searches, headed mode, and sidecar availability", async () => {
  const engine = new FakeEngine();
  engine.state.searches = [{ marketplace: "danggeun", query: "camera" }];
  engine.monitorResult = {
    firstCycle: false,
    startedAt: "2026-05-22T00:00:00.000Z",
    completedAt: "2026-05-22T00:00:01.000Z",
    searchResults: [
      {
        criteria: { marketplace: "danggeun", query: "camera", headed: true },
        response: { ok: true, marketplace: "danggeun", listings: [] },
      },
    ],
    processedListings: [],
    state: createEmptyCoreState(),
  };

  const sidecar = new FakeSidecarManager();
  sidecar.started = true;
  const { runtime } = createRuntime(engine, sidecar);

  const exitCode = await runCli(["monitor", "run", "--headed"], runtime);

  assert.equal(exitCode, 0);
  assert.equal(sidecar.ensureCalls, 1);
  assert.equal(sidecar.stopCalls, 1);
  assert.deepEqual(engine.runConfiguredCalls, [{ headed: true }]);
});

test("local sidecar manager starts a local sidecar after an initial health failure", async () => {
  const child = new FakeChildProcess();
  let healthChecks = 0;
  const manager = new LocalSidecarManager({
    client: {
      async health() {
        healthChecks += 1;
        if (healthChecks === 1) {
          throw new Error("connect ECONNREFUSED");
        }

        return {
          status: "ok",
          started: true,
          capabilities: [],
        };
      },
    },
    baseUrl: "http://127.0.0.1:5111",
    sidecarDir: "/tmp/usedbot-sidecar",
    env: {},
    spawnProcess: () => child as unknown as ChildProcess,
    sleep: async () => undefined,
  });

  const session = await manager.ensureAvailable();

  assert.equal(session.started, true);
  await session.stop();
  assert.deepEqual(child.killedSignals, ["SIGTERM"]);
});

test("local sidecar manager includes stderr when startup exits early", async () => {
  const child = new FakeChildProcess();
  const manager = new LocalSidecarManager({
    client: {
      async health() {
        throw new Error("connect ECONNREFUSED");
      },
    },
    baseUrl: "http://127.0.0.1:5111",
    sidecarDir: "/tmp/usedbot-sidecar",
    env: {},
    startupTimeoutMs: 50,
    spawnProcess: () => {
      queueMicrotask(() => {
        child.stderr.write("missing playwright\n");
        child.exitCode = 1;
        child.emit("exit", 1, null);
      });
      return child as unknown as ChildProcess;
    },
    sleep: async () => undefined,
  });

  await assert.rejects(
    () => manager.ensureAvailable(),
    (error) => error instanceof Error && error.message.includes("missing playwright"),
  );
});

function createRuntime(engine: FakeEngine, sidecarManager: FakeSidecarManager): {
  runtime: CliRuntime;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    runtime: {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
      createServices: () => ({
        engine,
        sidecarManager,
        fetch: async () => new Response(null, { status: 204 }),
      }),
    },
    stdout,
    stderr,
  };
}
