import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { ScraperClient } from "@usedbot/scraper-client";
import {
  createEmptyCoreState,
  detectSaleStatus,
  mergeCoreSettings,
  normalizeListingLink,
  normalizeSaleStatus,
  nowTimestamp,
  parseSearchRequest,
  parsePriceTextToValue,
  preferNonEmpty,
  type CoreSettings,
  type CoreStateSnapshot,
  type FailureDTO,
  type ListingChangeType,
  type ListingDTO,
  type MonitorCycleResult,
  type MonitorSearchResult,
  type NotificationChannel,
  type NotificationDecision,
  type NotificationDecisionStatus,
  type PriceChangeRecord,
  type ProcessedListingResult,
  type SaleStatus,
  type SaleStatusChangeRecord,
  type SearchRequest,
  type SearchResponse,
  type StoredListing,
} from "@usedbot/shared";

const META_FILE = "meta.json";
const SETTINGS_FILE = "settings.json";
const SEARCHES_FILE = "searches.json";
const LISTINGS_FILE = "listings.json";
const PRICE_HISTORY_FILE = "price-history.json";
const SALE_STATUS_HISTORY_FILE = "sale-status-history.json";
const NOTIFICATION_DECISIONS_FILE = "notification-decisions.json";
const NOTIFIABLE_CHANGES: readonly ListingChangeType[] = ["new", "price_changed"];
const STATE_FILE_SHAPES = [
  { fileName: META_FILE, expectedShape: "object" },
  { fileName: SETTINGS_FILE, expectedShape: "object" },
  { fileName: SEARCHES_FILE, expectedShape: "array" },
  { fileName: LISTINGS_FILE, expectedShape: "array" },
  { fileName: PRICE_HISTORY_FILE, expectedShape: "array" },
  { fileName: SALE_STATUS_HISTORY_FILE, expectedShape: "array" },
  { fileName: NOTIFICATION_DECISIONS_FILE, expectedShape: "array" },
] as const;

type StateFileShape = (typeof STATE_FILE_SHAPES)[number]["expectedShape"];

export interface StateStoreIssue {
  fileName: string;
  message: string;
}

export interface StateStoreInspectionResult {
  ok: boolean;
  dataDir: string;
  issues: StateStoreIssue[];
}

export interface StateStoreRepairFileResult {
  fileName: string;
  backupPath?: string;
}

export interface StateStoreRepairResult {
  dataDir: string;
  issues: StateStoreIssue[];
  repairedFiles: StateStoreRepairFileResult[];
  state: CoreStateSnapshot;
}

interface StateFileReadResult {
  fileName: string;
  filePath: string;
  parsed?: unknown;
  issue?: StateStoreIssue;
}

export interface PlainTextStateStoreOptions {
  dataDir?: string;
  defaultSettings?: Partial<CoreSettings>;
}

class StateStoreCorruptionError extends Error {
  readonly inspection: StateStoreInspectionResult;

  constructor(inspection: StateStoreInspectionResult) {
    super(formatStateStoreCorruptionMessage(inspection));
    this.name = "StateStoreCorruptionError";
    this.inspection = inspection;
  }
}

export class PlainTextStateStore {
  readonly dataDir: string;
  readonly #defaultSettings: Partial<CoreSettings>;
  #writeChain: Promise<void> = Promise.resolve();

  constructor(options: PlainTextStateStoreOptions = {}) {
    this.dataDir = resolve(options.dataDir ?? join(process.cwd(), "data", "core"));
    this.#defaultSettings = options.defaultSettings ?? {};
  }

  async load(): Promise<CoreStateSnapshot> {
    const scan = await this.#scanStateFiles();
    if (!scan.inspection.ok) {
      throw new StateStoreCorruptionError(scan.inspection);
    }

    return scan.state;
  }

  async save(snapshot: CoreStateSnapshot): Promise<void> {
    this.#writeChain = this.#writeChain.then(
      () => this.#writeSnapshot(snapshot),
      () => this.#writeSnapshot(snapshot),
    );

    return this.#writeChain;
  }

  async inspect(): Promise<StateStoreInspectionResult> {
    return (await this.#scanStateFiles()).inspection;
  }

  async repair(): Promise<StateStoreRepairResult> {
    const scan = await this.#scanStateFiles();
    const repairedFiles: StateStoreRepairFileResult[] = [];

    for (const file of scan.files) {
      if (file.issue === undefined) {
        continue;
      }

      repairedFiles.push({
        fileName: file.fileName,
        backupPath: await backupBrokenStateFile(file.filePath),
      });
    }

    if (repairedFiles.length > 0) {
      await this.#writeSnapshot(scan.state);
    }

    return {
      dataDir: this.dataDir,
      issues: scan.inspection.issues,
      repairedFiles,
      state: structuredClone(scan.state),
    };
  }

  async #writeSnapshot(snapshot: CoreStateSnapshot): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });

    const normalized = structuredClone(snapshot);
    normalized.meta.schemaVersion = 1;

    await writeJsonAtomic(join(this.dataDir, META_FILE), normalized.meta);
    await writeJsonAtomic(join(this.dataDir, SETTINGS_FILE), normalized.settings);
    await writeJsonAtomic(join(this.dataDir, SEARCHES_FILE), normalized.searches);
    await writeJsonAtomic(join(this.dataDir, LISTINGS_FILE), normalized.listings);
    await writeJsonAtomic(join(this.dataDir, PRICE_HISTORY_FILE), normalized.priceHistory);
    await writeJsonAtomic(join(this.dataDir, SALE_STATUS_HISTORY_FILE), normalized.saleStatusHistory);
    await writeJsonAtomic(join(this.dataDir, NOTIFICATION_DECISIONS_FILE), normalized.notificationDecisions);
  }

  async #scanStateFiles(): Promise<{
    inspection: StateStoreInspectionResult;
    state: CoreStateSnapshot;
    files: StateFileReadResult[];
  }> {
    await mkdir(this.dataDir, { recursive: true });

    const files = await Promise.all(
      STATE_FILE_SHAPES.map(({ fileName, expectedShape }) => this.#readStateFile(fileName, expectedShape)),
    );
    const issues = files.flatMap((file) => (file.issue === undefined ? [] : [file.issue]));

    return {
      inspection: {
        ok: issues.length === 0,
        dataDir: this.dataDir,
        issues,
      },
      state: this.#hydrateState(files),
      files,
    };
  }

  async #readStateFile(fileName: string, expectedShape: StateFileShape): Promise<StateFileReadResult> {
    const filePath = join(this.dataDir, fileName);

    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") {
        return { fileName, filePath };
      }

      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return {
        fileName,
        filePath,
        issue: {
          fileName,
          message: `Invalid JSON prevented the ${fileName} file from loading.`,
        },
      };
    }

    if (expectedShape === "object" ? !isRecord(parsed) : !Array.isArray(parsed)) {
      return {
        fileName,
        filePath,
        issue: {
          fileName,
          message: `${fileName} must contain a top-level ${expectedShape}.`,
        },
      };
    }

    return {
      fileName,
      filePath,
      parsed,
    };
  }

  #hydrateState(files: StateFileReadResult[]): CoreStateSnapshot {
    const state = createEmptyCoreState(this.#defaultSettings);
    const values = new Map(files.map((file) => [file.fileName, file.issue === undefined ? file.parsed : undefined]));

    const meta = values.get(META_FILE);
    if (isRecord(meta)) {
      if (typeof meta.monitorCyclesCompleted === "number" && meta.monitorCyclesCompleted >= 0) {
        state.meta.monitorCyclesCompleted = Math.floor(meta.monitorCyclesCompleted);
      }
      if (typeof meta.updatedAt === "string" && meta.updatedAt.trim()) {
        state.meta.updatedAt = meta.updatedAt;
      }
    }

    const settings = values.get(SETTINGS_FILE);
    if (isRecord(settings)) {
      state.settings = mergeCoreSettings(state.settings, settings as Partial<CoreSettings>);
    }

    const searches = values.get(SEARCHES_FILE);
    if (Array.isArray(searches)) {
      state.searches = searches.flatMap((search, index) => {
        try {
          return [normalizeStoredSearch(parseSearchRequest(search, `searches[${index}]`))];
        } catch {
          return [];
        }
      });
    }

    const listings = values.get(LISTINGS_FILE);
    if (Array.isArray(listings)) {
      state.listings = listings
        .filter(isRecord)
        .map((listing) => hydrateStoredListing(listing as unknown as StoredListing));
    }

    const priceHistory = values.get(PRICE_HISTORY_FILE);
    if (Array.isArray(priceHistory)) {
      state.priceHistory = priceHistory.filter(isRecord) as unknown as PriceChangeRecord[];
    }

    const saleStatusHistory = values.get(SALE_STATUS_HISTORY_FILE);
    if (Array.isArray(saleStatusHistory)) {
      state.saleStatusHistory = saleStatusHistory.filter(isRecord) as unknown as SaleStatusChangeRecord[];
    }

    const notificationDecisions = values.get(NOTIFICATION_DECISIONS_FILE);
    if (Array.isArray(notificationDecisions)) {
      state.notificationDecisions = notificationDecisions.filter(isRecord) as unknown as NotificationDecision[];
    }

    return state;
  }
}

export interface CoreEngineOptions {
  scraperClient: ScraperClient;
  store?: PlainTextStateStore;
  settings?: Partial<CoreSettings>;
}

export class CoreEngine {
  readonly #scraperClient: ScraperClient;
  readonly #store: PlainTextStateStore;
  #state: CoreStateSnapshot | null = null;

  constructor(options: CoreEngineOptions) {
    this.#scraperClient = options.scraperClient;
    this.#store = options.store ?? new PlainTextStateStore(options.settings ? { defaultSettings: options.settings } : {});
  }

  async getState(): Promise<CoreStateSnapshot> {
    return structuredClone(await this.#ensureState());
  }

  async inspectStorage(): Promise<StateStoreInspectionResult> {
    return this.#store.inspect();
  }

  async repairStorage(): Promise<StateStoreRepairResult> {
    const result = await this.#store.repair();
    this.#state = structuredClone(result.state);
    return result;
  }

  async updateSettings(updates: Partial<CoreSettings>): Promise<CoreStateSnapshot> {
    const state = await this.#ensureState();
    state.settings = mergeCoreSettings(state.settings, updates);
    state.meta.updatedAt = nowTimestamp();
    await this.#store.save(state);
    return structuredClone(state);
  }

  async addSearch(search: SearchRequest): Promise<boolean> {
    const state = await this.#ensureState();
    const normalized = normalizeStoredSearch(search);
    if (state.searches.some((current) => sameSearch(current, normalized))) {
      return false;
    }

    state.searches.push(normalized);
    state.meta.updatedAt = nowTimestamp();
    await this.#store.save(state);
    return true;
  }

  async removeSearch(search: SearchRequest): Promise<boolean> {
    const state = await this.#ensureState();
    const normalized = normalizeStoredSearch(search);
    const nextSearches = state.searches.filter((current) => !sameSearch(current, normalized));
    if (nextSearches.length === state.searches.length) {
      return false;
    }

    state.searches = nextSearches;
    state.meta.updatedAt = nowTimestamp();
    await this.#store.save(state);
    return true;
  }

  async runConfiguredMonitorCycle(options: { headed?: boolean } = {}): Promise<MonitorCycleResult> {
    const state = await this.#ensureState();
    if (state.searches.length === 0) {
      throw new Error("No searches are configured. Add a search before running monitor.");
    }

    return this.runMonitorCycle(
      state.searches.map((search) => normalizeRuntimeSearch(search, options.headed)),
    );
  }

  async runMonitorCycle(searches: SearchRequest[]): Promise<MonitorCycleResult> {
    const state = await this.#ensureState();
    const startedAt = nowTimestamp();
    const firstCycle = state.meta.monitorCyclesCompleted === 0;
    const searchResults: MonitorSearchResult[] = [];
    const mergedListings: ListingDTO[] = [];

    for (const criteria of searches) {
      try {
        const response = await this.#scraperClient.search(criteria);
        searchResults.push({ criteria, response });
        if (response.ok) {
          mergedListings.push(...response.listings);
        }
      } catch (error) {
        searchResults.push({
          criteria,
          response: createSearchFailure(criteria, error),
        });
      }
    }

    const processedListings = dedupeListings(mergedListings).map((listing) =>
      applyListingChange(state, listing, firstCycle, startedAt),
    );

    const completedAt = nowTimestamp();
    state.meta.monitorCyclesCompleted += 1;
    state.meta.updatedAt = completedAt;
    await this.#store.save(state);

    return {
      firstCycle,
      startedAt,
      completedAt,
      searchResults,
      processedListings,
      state: structuredClone(state),
    };
  }

  async #ensureState(): Promise<CoreStateSnapshot> {
    if (this.#state === null) {
      this.#state = await this.#store.load();
    }

    return this.#state;
  }
}

export function createCoreEngine(options: CoreEngineOptions): CoreEngine {
  return new CoreEngine(options);
}

export function dedupeListings(listings: ListingDTO[]): ListingDTO[] {
  const deduped: ListingDTO[] = [];
  const seenIdKeys = new Set<string>();
  const seenLinks = new Set<string>();

  for (const listing of listings) {
    const articleId = listing.articleId.trim();
    const idKey = `${listing.marketplace}:${articleId}`;
    const normalizedLink = normalizeListingLink(listing.link) ?? listing.link.trim();

    if (articleId && seenIdKeys.has(idKey)) {
      continue;
    }

    if (normalizedLink && seenLinks.has(normalizedLink)) {
      continue;
    }

    deduped.push(listing);
    if (articleId) {
      seenIdKeys.add(idKey);
    }
    if (normalizedLink) {
      seenLinks.add(normalizedLink);
    }
  }

  return deduped;
}

function applyListingChange(
  state: CoreStateSnapshot,
  incoming: ListingDTO,
  firstCycle: boolean,
  recordedAt: string,
): ProcessedListingResult {
  const existing = findListing(state.listings, incoming);
  if (!existing) {
    const created = createStoredListing(incoming, recordedAt);
    state.listings.push(created);
    const notificationDecisions = decideNotificationEligibility(created, "new", state.settings, firstCycle, recordedAt);
    state.notificationDecisions.push(...notificationDecisions);

    return {
      listing: structuredClone(created),
      changeType: "new",
      notificationDecisions,
    };
  }

  const previousPriceValue = existing.priceValue ?? parsePriceTextToValue(existing.priceText);
  const nextPriceValue = incoming.priceValue ?? parsePriceTextToValue(incoming.priceText) ?? existing.priceValue;
  const nextSaleStatus = normalizeSaleStatus(incoming.saleStatus) ?? detectSaleStatus(incoming.title);
  const nextTitle = preferNonEmpty(incoming.title, existing.title);
  const nextLink = preferNonEmpty(incoming.link, existing.link);
  const nextNormalizedLink = normalizeListingLink(nextLink) ?? existing.normalizedLink;
  const nextThumbnail = preferNonEmpty(incoming.thumbnail, existing.thumbnail);
  const nextSeller = preferNonEmpty(incoming.seller, existing.seller);
  const nextLocation = preferNonEmpty(incoming.location, existing.location);
  const nextPriceText = preferNonEmpty(incoming.priceText, existing.priceText);
  const nextQuery = preferNonEmpty(existing.query, incoming.query);

  const priceChanged =
    incoming.priceText.trim() !== "" &&
    existing.priceText !== incoming.priceText &&
    previousPriceValue !== nextPriceValue;
  const statusChanged = existing.saleStatus !== nextSaleStatus;
  const metadataChanged =
    nextTitle !== existing.title ||
    nextLink !== existing.link ||
    nextNormalizedLink !== existing.normalizedLink ||
    nextThumbnail !== existing.thumbnail ||
    nextSeller !== existing.seller ||
    nextLocation !== existing.location ||
    nextQuery !== existing.query;

  let priceChange: PriceChangeRecord | undefined;
  if (priceChanged) {
    priceChange = {
      listingId: existing.id,
      marketplace: existing.marketplace,
      articleId: existing.articleId,
      oldPriceText: existing.priceText,
      newPriceText: incoming.priceText,
      oldPriceValue: previousPriceValue ?? null,
      newPriceValue: nextPriceValue ?? null,
      changedAt: recordedAt,
    };
    state.priceHistory.push(priceChange);
  }

  let saleStatusChange: SaleStatusChangeRecord | undefined;
  if (statusChanged) {
    saleStatusChange = {
      listingId: existing.id,
      marketplace: existing.marketplace,
      articleId: existing.articleId,
      oldStatus: existing.saleStatus,
      newStatus: nextSaleStatus,
      changedAt: recordedAt,
    };
    state.saleStatusHistory.push(saleStatusChange);
  }

  existing.title = nextTitle;
  existing.link = nextLink;
  existing.query = nextQuery;
  existing.saleStatus = nextSaleStatus;
  existing.lastSeenAt = recordedAt;
  existing.updatedAt = recordedAt;

  if (nextNormalizedLink !== undefined) {
    existing.normalizedLink = nextNormalizedLink;
  }
  if (nextPriceValue !== undefined) {
    existing.priceValue = nextPriceValue;
  }
  if (nextThumbnail !== undefined) {
    existing.thumbnail = nextThumbnail;
  }
  if (nextSeller !== undefined) {
    existing.seller = nextSeller;
  }
  if (nextLocation !== undefined) {
    existing.location = nextLocation;
  }
  if (priceChanged) {
    existing.priceText = incoming.priceText;
  }

  const changeType: ListingChangeType = priceChange
    ? "price_changed"
    : saleStatusChange
      ? "status_changed"
      : metadataChanged
        ? "updated"
        : "unchanged";

  const notificationDecisions = decideNotificationEligibility(
    existing,
    changeType,
    state.settings,
    firstCycle,
    recordedAt,
  );
  state.notificationDecisions.push(...notificationDecisions);

  return {
    listing: structuredClone(existing),
    changeType,
    ...(priceChange === undefined ? {} : { priceChange }),
    ...(saleStatusChange === undefined ? {} : { saleStatusChange }),
    notificationDecisions,
  };
}

function createStoredListing(incoming: ListingDTO, recordedAt: string): StoredListing {
  const priceValue = incoming.priceValue ?? parsePriceTextToValue(incoming.priceText) ?? undefined;
  const normalizedLink = normalizeListingLink(incoming.link) ?? undefined;
  const saleStatus = normalizeSaleStatus(incoming.saleStatus) ?? detectSaleStatus(incoming.title);

  return {
    ...incoming,
    id: `${incoming.marketplace}:${incoming.articleId}`,
    saleStatus,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    firstSeenAt: recordedAt,
    lastSeenAt: recordedAt,
    ...(priceValue === undefined ? {} : { priceValue }),
    ...(normalizedLink === undefined ? {} : { normalizedLink }),
  };
}

function findListing(listings: StoredListing[], incoming: ListingDTO): StoredListing | undefined {
  const byArticleId = listings.find(
    (listing) => listing.marketplace === incoming.marketplace && listing.articleId === incoming.articleId,
  );
  if (byArticleId) {
    return byArticleId;
  }

  const normalizedLink = normalizeListingLink(incoming.link);
  if (!normalizedLink) {
    return undefined;
  }

  return listings.find(
    (listing) => listing.marketplace === incoming.marketplace && listing.normalizedLink === normalizedLink,
  );
}

function decideNotificationEligibility(
  listing: StoredListing,
  changeType: ListingChangeType,
  settings: CoreSettings,
  firstCycle: boolean,
  recordedAt: string,
): NotificationDecision[] {
  return (["terminal", "webhook"] as const).map((channel) => {
    const evaluation = evaluateChannelEligibility(channel, changeType, settings, firstCycle);
    return {
      id: `${listing.id}:${channel}:${recordedAt}:${changeType}`,
      listingId: listing.id,
      marketplace: listing.marketplace,
      articleId: listing.articleId,
      channel,
      changeType,
      status: evaluation.status,
      shouldNotify: evaluation.status === "eligible",
      recordedAt,
      ...(evaluation.reason === undefined ? {} : { reason: evaluation.reason }),
    };
  });
}

function evaluateChannelEligibility(
  channel: NotificationChannel,
  changeType: ListingChangeType,
  settings: CoreSettings,
  firstCycle: boolean,
): { status: NotificationDecisionStatus; reason?: string } {
  if (!NOTIFIABLE_CHANGES.includes(changeType)) {
    return {
      status: "skipped_not_notifiable",
      reason: "Only new listings and price changes trigger notifications in v1.",
    };
  }

  if (!settings.notificationsEnabled) {
    return {
      status: "skipped_disabled",
      reason: "Notifications are disabled in core settings.",
    };
  }

  if (firstCycle) {
    return {
      status: "skipped_first_cycle",
      reason: "The first monitoring cycle suppresses new and price-change notifications.",
    };
  }

  if (!settings.channels[channel].enabled) {
    return {
      status: "skipped_channel_disabled",
      reason: `${channel} notifications are disabled.`,
    };
  }

  if (channel === "webhook" && !settings.channels.webhook.url?.trim()) {
    return {
      status: "skipped_no_destination",
      reason: "Webhook notifications require a configured destination URL.",
    };
  }

  return { status: "eligible" };
}

function hydrateStoredListing(listing: StoredListing): StoredListing {
  const createdAt = listing.createdAt || nowTimestamp();
  const updatedAt = listing.updatedAt || createdAt;
  const firstSeenAt = listing.firstSeenAt || createdAt;
  const lastSeenAt = listing.lastSeenAt || updatedAt;
  const saleStatus = normalizeSaleStatus(listing.saleStatus) ?? detectSaleStatus(listing.title);
  const normalizedLink = listing.normalizedLink ?? normalizeListingLink(listing.link) ?? undefined;
  const priceValue = listing.priceValue ?? parsePriceTextToValue(listing.priceText) ?? undefined;

  return {
    ...listing,
    createdAt,
    updatedAt,
    firstSeenAt,
    lastSeenAt,
    saleStatus,
    ...(normalizedLink === undefined ? {} : { normalizedLink }),
    ...(priceValue === undefined ? {} : { priceValue }),
  };
}

function createSearchFailure(criteria: SearchRequest, error: unknown): SearchResponse {
  return {
    ok: false,
    marketplace: criteria.marketplace,
    listings: [],
    failure: toFailureDTO(error),
  };
}

function normalizeStoredSearch(search: SearchRequest): SearchRequest {
  const query = search.query.trim();
  const location = normalizeOptionalText(search.location);

  return {
    marketplace: search.marketplace,
    query,
    ...(location === undefined ? {} : { location }),
  };
}

function normalizeRuntimeSearch(search: SearchRequest, headed: boolean | undefined): SearchRequest {
  const normalized = normalizeStoredSearch(search);
  if (headed !== true) {
    return normalized;
  }

  return {
    ...normalized,
    headed: true,
  };
}

function sameSearch(left: SearchRequest, right: SearchRequest): boolean {
  return (
    left.marketplace === right.marketplace &&
    left.query === right.query &&
    normalizeOptionalText(left.location) === normalizeOptionalText(right.location)
  );
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toFailureDTO(error: unknown): FailureDTO {
  return {
    kind: "runtime_unavailable",
    message: error instanceof Error ? error.message : "Scraper client request failed",
    retryable: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function formatStateStoreCorruptionMessage(inspection: StateStoreInspectionResult): string {
  return [
    `Local data in ${inspection.dataDir} needs repair before usedbot can continue.`,
    ...inspection.issues.map((issue) => `- ${issue.fileName}: ${issue.message}`),
    "Run `pnpm usedbot data repair` to back up broken files and rebuild the supported state files.",
  ].join("\n");
}

async function backupBrokenStateFile(filePath: string): Promise<string> {
  const backupPath = `${filePath}.broken-${nowTimestamp().replaceAll(":", "-").replaceAll(".", "-")}`;
  await rename(filePath, backupPath);
  return backupPath;
}

async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const tempFile = `${filePath}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempFile, filePath);
}
