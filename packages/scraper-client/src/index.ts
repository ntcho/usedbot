import {
  parseCapabilitiesResponse,
  parseEnrichResponse,
  parseHealthResponse,
  parseSearchResponse,
  type CapabilitiesResponse,
  type EnrichRequest,
  type EnrichResponse,
  type HealthResponse,
  type SearchRequest,
  type SearchResponse,
} from "@usedbot/shared";

const DEFAULT_BASE_URL = "http://127.0.0.1:5111";

export interface ScraperClient {
  health(): Promise<HealthResponse>;
  capabilities(): Promise<CapabilitiesResponse>;
  search(request: SearchRequest): Promise<SearchResponse>;
  enrich(request: EnrichRequest): Promise<EnrichResponse>;
}

export interface ScraperClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

interface ScraperClientErrorOptions {
  status?: number;
  body?: string;
  cause?: unknown;
}

export class ScraperClientError extends Error {
  readonly status: number | undefined;
  readonly body: string | undefined;

  constructor(message: string, options: ScraperClientErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ScraperClientError";
    this.status = options.status;
    this.body = options.body;
  }
}

export class HttpScraperClient implements ScraperClient {
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #headers: HeadersInit;

  constructor(options: ScraperClientOptions = {}) {
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (!fetchImplementation) {
      throw new ScraperClientError("Global fetch is not available for the scraper client");
    }

    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.#fetch = fetchImplementation;
    this.#headers = options.headers ?? {};
  }

  async health(): Promise<HealthResponse> {
    return this.#request("/health", { method: "GET" }, parseHealthResponse);
  }

  async capabilities(): Promise<CapabilitiesResponse> {
    return this.#request("/capabilities", { method: "GET" }, parseCapabilitiesResponse);
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    return this.#request(
      "/search",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      parseSearchResponse,
    );
  }

  async enrich(request: EnrichRequest): Promise<EnrichResponse> {
    return this.#request(
      "/enrich",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      parseEnrichResponse,
    );
  }

  async #request<T>(path: string, init: RequestInit, parser: (value: unknown) => T): Promise<T> {
    const url = new URL(path, this.#normalizeBaseUrl()).toString();
    const headers = new Headers(this.#headers);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    let response: Response;
    try {
      response = await this.#fetch(url, {
        ...init,
        headers,
      });
    } catch (error) {
      throw new ScraperClientError(`Failed to reach the scraper sidecar at ${url}`, {
        cause: error,
      });
    }

    const body = await response.text();
    let parsedBody: unknown = null;
    if (body) {
      try {
        parsedBody = JSON.parse(body) as unknown;
      } catch (error) {
        throw new ScraperClientError(`Scraper sidecar returned invalid JSON for ${path}`, {
          status: response.status,
          body,
          cause: error,
        });
      }
    }

    if (!response.ok) {
      throw new ScraperClientError(`Scraper sidecar request failed with status ${response.status}`, {
        status: response.status,
        ...(body ? { body } : {}),
      });
    }

    try {
      return parser(parsedBody);
    } catch (error) {
      throw new ScraperClientError(`Scraper sidecar contract mismatch for ${path}`, {
        status: response.status,
        ...(body ? { body } : {}),
        cause: error,
      });
    }
  }

  #normalizeBaseUrl(): string {
    return this.#baseUrl.endsWith("/") ? this.#baseUrl : `${this.#baseUrl}/`;
  }
}

export function createScraperClient(options: ScraperClientOptions = {}): ScraperClient {
  return new HttpScraperClient(options);
}
