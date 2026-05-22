const MARKETPLACE_VALUES = ["danggeun", "bunjang", "joonggonara"] as const;
const FAILURE_KIND_VALUES = [
  "blocked",
  "runtime_unavailable",
  "unsupported_marketplace",
  "upstream_error",
] as const;
const NOTIFICATION_CHANNEL_VALUES = ["terminal", "webhook"] as const;

export type Marketplace = (typeof MARKETPLACE_VALUES)[number];
export type FailureKind = (typeof FAILURE_KIND_VALUES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number];
export type SaleStatus = "for_sale" | "reserved" | "sold" | "unknown";
export type ListingChangeType = "new" | "price_changed" | "status_changed" | "updated" | "unchanged";
export type NotificationDecisionStatus =
  | "eligible"
  | "skipped_disabled"
  | "skipped_first_cycle"
  | "skipped_channel_disabled"
  | "skipped_no_destination"
  | "skipped_not_notifiable";

export interface ListingDTO {
  marketplace: Marketplace;
  articleId: string;
  title: string;
  priceText: string;
  link: string;
  query: string;
  thumbnail?: string;
  seller?: string;
  location?: string;
  saleStatus?: string;
  priceValue?: number;
}

export interface FailureDTO {
  kind: FailureKind;
  message: string;
  retryable: boolean;
}

export interface CapabilityDTO {
  marketplace: Marketplace;
  available: boolean;
  supportsSearch: boolean;
  supportsEnrich: boolean;
  started: boolean;
  reason?: string;
  lastFailure?: FailureKind;
}

export interface CapabilitiesResponse {
  capabilities: CapabilityDTO[];
}

export interface HealthResponse {
  status: string;
  started: boolean;
  capabilities: CapabilityDTO[];
}

export interface SearchRequest {
  marketplace: Marketplace;
  query: string;
  location?: string;
}

export interface SearchResponse {
  ok: boolean;
  marketplace: Marketplace;
  listings: ListingDTO[];
  failure?: FailureDTO;
}

export interface EnrichRequest {
  listing: ListingDTO;
}

export interface EnrichResponse {
  ok: boolean;
  listing?: ListingDTO;
  failure?: FailureDTO;
}

export interface NotificationChannelSettings {
  enabled: boolean;
}

export interface WebhookChannelSettings extends NotificationChannelSettings {
  url?: string;
}

export interface CoreNotificationChannels {
  terminal: NotificationChannelSettings;
  webhook: WebhookChannelSettings;
}

export interface CoreSettings {
  notificationsEnabled: boolean;
  channels: CoreNotificationChannels;
}

export interface StoredListing extends ListingDTO {
  id: string;
  normalizedLink?: string;
  saleStatus: SaleStatus;
  createdAt: string;
  updatedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PriceChangeRecord {
  listingId: string;
  marketplace: Marketplace;
  articleId: string;
  oldPriceText: string;
  newPriceText: string;
  oldPriceValue: number | null;
  newPriceValue: number | null;
  changedAt: string;
}

export interface SaleStatusChangeRecord {
  listingId: string;
  marketplace: Marketplace;
  articleId: string;
  oldStatus: SaleStatus;
  newStatus: SaleStatus;
  changedAt: string;
}

export interface NotificationDecision {
  id: string;
  listingId: string;
  marketplace: Marketplace;
  articleId: string;
  channel: NotificationChannel;
  changeType: ListingChangeType;
  status: NotificationDecisionStatus;
  shouldNotify: boolean;
  recordedAt: string;
  reason?: string;
}

export interface CoreStateMeta {
  schemaVersion: 1;
  monitorCyclesCompleted: number;
  updatedAt?: string;
}

export interface CoreStateSnapshot {
  meta: CoreStateMeta;
  settings: CoreSettings;
  listings: StoredListing[];
  priceHistory: PriceChangeRecord[];
  saleStatusHistory: SaleStatusChangeRecord[];
  notificationDecisions: NotificationDecision[];
}

export interface MonitorSearchResult {
  criteria: SearchRequest;
  response: SearchResponse;
}

export interface ProcessedListingResult {
  listing: StoredListing;
  changeType: ListingChangeType;
  priceChange?: PriceChangeRecord;
  saleStatusChange?: SaleStatusChangeRecord;
  notificationDecisions: NotificationDecision[];
}

export interface MonitorCycleResult {
  firstCycle: boolean;
  startedAt: string;
  completedAt: string;
  searchResults: MonitorSearchResult[];
  processedListings: ProcessedListingResult[];
  state: CoreStateSnapshot;
}

type UnknownRecord = Record<string, unknown>;

const RESERVED_PATTERNS = [/예약중/i, /예약/i, /reserved/i];
const SOLD_PATTERNS = [/판매완료/i, /거래완료/i, /sold/i];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new TypeError(`${context} must be an object`);
  }

  return value;
}

function readString(record: UnknownRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new TypeError(`${context}.${key} must be a string`);
  }

  return value;
}

function readOptionalString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new TypeError(`${key} must be a string when present`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readBoolean(record: UnknownRecord, key: string, context: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`${context}.${key} must be a boolean`);
  }

  return value;
}

function readOptionalNumber(record: UnknownRecord, key: string): number | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`${key} must be a number when present`);
  }

  return value;
}

function readArray(record: UnknownRecord, key: string, context: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`${context}.${key} must be an array`);
  }

  return value;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function isMarketplace(value: unknown): value is Marketplace {
  return typeof value === "string" && MARKETPLACE_VALUES.includes(value as Marketplace);
}

export function isFailureKind(value: unknown): value is FailureKind {
  return typeof value === "string" && FAILURE_KIND_VALUES.includes(value as FailureKind);
}

export function parseListingDTO(value: unknown, context = "listing"): ListingDTO {
  const record = asRecord(value, context);
  const marketplace = readString(record, "marketplace", context);
  if (!isMarketplace(marketplace)) {
    throw new TypeError(`${context}.marketplace is invalid`);
  }

  const thumbnail = readOptionalString(record, "thumbnail");
  const seller = readOptionalString(record, "seller");
  const location = readOptionalString(record, "location");
  const saleStatus = readOptionalString(record, "saleStatus");
  const priceValue = readOptionalNumber(record, "priceValue");

  return {
    marketplace,
    articleId: readString(record, "articleId", context),
    title: readString(record, "title", context),
    priceText: readString(record, "priceText", context),
    link: readString(record, "link", context),
    query: readString(record, "query", context),
    ...(thumbnail === undefined ? {} : { thumbnail }),
    ...(seller === undefined ? {} : { seller }),
    ...(location === undefined ? {} : { location }),
    ...(saleStatus === undefined ? {} : { saleStatus }),
    ...(priceValue === undefined ? {} : { priceValue }),
  };
}

export function parseFailureDTO(value: unknown, context = "failure"): FailureDTO {
  const record = asRecord(value, context);
  const kind = readString(record, "kind", context);
  if (!isFailureKind(kind)) {
    throw new TypeError(`${context}.kind is invalid`);
  }

  return {
    kind,
    message: readString(record, "message", context),
    retryable: readBoolean(record, "retryable", context),
  };
}

export function parseCapabilityDTO(value: unknown, context = "capability"): CapabilityDTO {
  const record = asRecord(value, context);
  const marketplace = readString(record, "marketplace", context);
  if (!isMarketplace(marketplace)) {
    throw new TypeError(`${context}.marketplace is invalid`);
  }

  const reason = readOptionalString(record, "reason");
  const lastFailure = record.lastFailure;
  if (lastFailure !== undefined && lastFailure !== null && !isFailureKind(lastFailure)) {
    throw new TypeError(`${context}.lastFailure is invalid`);
  }

  return {
    marketplace,
    available: readBoolean(record, "available", context),
    supportsSearch: record.supportsSearch === undefined ? true : readBoolean(record, "supportsSearch", context),
    supportsEnrich: record.supportsEnrich === undefined ? true : readBoolean(record, "supportsEnrich", context),
    started: record.started === undefined ? false : readBoolean(record, "started", context),
    ...(reason === undefined ? {} : { reason }),
    ...(lastFailure === undefined || lastFailure === null ? {} : { lastFailure }),
  };
}

export function parseCapabilitiesResponse(value: unknown): CapabilitiesResponse {
  const record = asRecord(value, "capabilities response");
  return {
    capabilities: readArray(record, "capabilities", "capabilities response").map((entry, index) =>
      parseCapabilityDTO(entry, `capabilities[${index}]`),
    ),
  };
}

export function parseHealthResponse(value: unknown): HealthResponse {
  const record = asRecord(value, "health response");
  return {
    status: readString(record, "status", "health response"),
    started: readBoolean(record, "started", "health response"),
    capabilities: readArray(record, "capabilities", "health response").map((entry, index) =>
      parseCapabilityDTO(entry, `capabilities[${index}]`),
    ),
  };
}

export function parseSearchResponse(value: unknown): SearchResponse {
  const record = asRecord(value, "search response");
  const marketplace = readString(record, "marketplace", "search response");
  if (!isMarketplace(marketplace)) {
    throw new TypeError(`search response.marketplace is invalid`);
  }

  const failure = record.failure;

  return {
    ok: readBoolean(record, "ok", "search response"),
    marketplace,
    listings: readArray(record, "listings", "search response").map((entry, index) =>
      parseListingDTO(entry, `listings[${index}]`),
    ),
    ...(failure === undefined || failure === null ? {} : { failure: parseFailureDTO(failure) }),
  };
}

export function parseEnrichResponse(value: unknown): EnrichResponse {
  const record = asRecord(value, "enrich response");
  const listing = record.listing;
  const failure = record.failure;

  return {
    ok: readBoolean(record, "ok", "enrich response"),
    ...(listing === undefined || listing === null ? {} : { listing: parseListingDTO(listing, "enrich response.listing") }),
    ...(failure === undefined || failure === null ? {} : { failure: parseFailureDTO(failure, "enrich response.failure") }),
  };
}

export function preferNonEmpty<T>(nextValue: T, currentValue: T): T {
  if (nextValue === null || nextValue === undefined) {
    return currentValue;
  }

  if (typeof nextValue === "string" && !nextValue.trim()) {
    return currentValue;
  }

  return nextValue;
}

export function parsePriceTextToValue(priceText: string | undefined): number | null {
  if (!priceText) {
    return null;
  }

  const trimmed = priceText.trim();
  if (!trimmed) {
    return null;
  }

  const manwon = trimmed.match(/([0-9]+(?:\.[0-9]+)?)\s*만원/);
  if (manwon) {
    const amount = Number(manwon[1]);
    return Number.isNaN(amount) ? null : Math.round(amount * 10_000);
  }

  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeSaleStatus(value: string | undefined): SaleStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === "for_sale" || normalized === "for sale" || normalized === "available" || normalized === "판매중") {
    return "for_sale";
  }

  if (normalized === "reserved" || normalized === "예약" || normalized === "예약중") {
    return "reserved";
  }

  if (normalized === "sold" || normalized === "판매완료" || normalized === "거래완료") {
    return "sold";
  }

  if (normalized === "unknown" || normalized === "알수없음") {
    return "unknown";
  }

  return undefined;
}

export function detectSaleStatus(title: string): SaleStatus {
  const normalizedTitle = title.trim();
  if (SOLD_PATTERNS.some((pattern) => pattern.test(normalizedTitle))) {
    return "sold";
  }

  if (RESERVED_PATTERNS.some((pattern) => pattern.test(normalizedTitle))) {
    return "reserved";
  }

  return "for_sale";
}

export function normalizeListingLink(link: string | undefined): string | null {
  if (!link) {
    return null;
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    const filteredEntries = [...url.searchParams.entries()]
      .filter(([key]) => !key.toLowerCase().startsWith("utm_"))
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        if (leftKey === rightKey) {
          return leftValue.localeCompare(rightValue);
        }

        return leftKey.localeCompare(rightKey);
      });

    url.search = filteredEntries.length ? new URLSearchParams(filteredEntries).toString() : "";
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function createCoreSettings(overrides: Partial<CoreSettings> = {}): CoreSettings {
  const webhookUrl = normalizeOptionalString(overrides.channels?.webhook?.url);

  return {
    notificationsEnabled: overrides.notificationsEnabled ?? false,
    channels: {
      terminal: {
        enabled: overrides.channels?.terminal?.enabled ?? true,
      },
      webhook: {
        enabled: overrides.channels?.webhook?.enabled ?? false,
        ...(webhookUrl === undefined ? {} : { url: webhookUrl }),
      },
    },
  };
}

export function mergeCoreSettings(current: CoreSettings, updates: Partial<CoreSettings>): CoreSettings {
  const webhookUrl = updates.channels?.webhook?.url ?? current.channels.webhook.url;

  return createCoreSettings({
    notificationsEnabled: updates.notificationsEnabled ?? current.notificationsEnabled,
    channels: {
      terminal: {
        enabled: updates.channels?.terminal?.enabled ?? current.channels.terminal.enabled,
      },
      webhook: {
        enabled: updates.channels?.webhook?.enabled ?? current.channels.webhook.enabled,
        ...(webhookUrl === undefined ? {} : { url: webhookUrl }),
      },
    },
  });
}

export function createEmptyCoreState(settings: Partial<CoreSettings> = {}): CoreStateSnapshot {
  return {
    meta: {
      schemaVersion: 1,
      monitorCyclesCompleted: 0,
    },
    settings: createCoreSettings(settings),
    listings: [],
    priceHistory: [],
    saleStatusHistory: [],
    notificationDecisions: [],
  };
}

export function nowTimestamp(date = new Date()): string {
  return date.toISOString();
}
