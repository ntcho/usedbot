import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { PlainTextStateStore, createCoreEngine } from "@usedbot/core";
import type { ScraperClient } from "@usedbot/scraper-client";
import type { CapabilitiesResponse, EnrichRequest, EnrichResponse, HealthResponse, SearchRequest, SearchResponse } from "@usedbot/shared";

class FakeScraperClient implements ScraperClient {
  readonly requests: SearchRequest[] = [];
  readonly #responses: SearchResponse[];
  #index = 0;

  constructor(responses: SearchResponse[]) {
    this.#responses = responses;
  }

  async health(): Promise<HealthResponse> {
    return {
      status: "ok",
      started: true,
      capabilities: [],
    };
  }

  async capabilities(): Promise<CapabilitiesResponse> {
    return { capabilities: [] };
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.requests.push(request);
    const response = this.#responses[this.#index];
    this.#index += 1;

    return (
      response ?? {
        ok: true,
        marketplace: request.marketplace,
        listings: [],
      }
    );
  }

  async enrich(_request: EnrichRequest): Promise<EnrichResponse> {
    return { ok: false };
  }
}

test("core dedupes listings, updates by normalized link, and records notification eligibility", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-"));

  try {
    const client = new FakeScraperClient([
      {
        ok: true,
        marketplace: "danggeun",
        listings: [
          {
            marketplace: "danggeun",
            articleId: "a1",
            title: "Used Camera",
            priceText: "100,000원",
            link: "HTTPS://example.com/items/1/?utm_source=test&b=2&a=1#frag",
            query: "camera",
            seller: "alice",
            location: "Seoul",
            priceValue: 100000,
          },
          {
            marketplace: "danggeun",
            articleId: "a1",
            title: "Used Camera Duplicate",
            priceText: "100,000원",
            link: "https://example.com/items/1?b=2&a=1",
            query: "camera",
            priceValue: 100000,
          },
          {
            marketplace: "danggeun",
            articleId: "hash-new",
            title: "Used Camera URL Duplicate",
            priceText: "90,000원",
            link: "https://example.com/items/1?a=1&b=2",
            query: "camera",
            priceValue: 90000,
          },
          {
            marketplace: "danggeun",
            articleId: "speaker-1",
            title: "Vintage Speaker",
            priceText: "55,000원",
            link: "https://example.com/items/2",
            query: "speaker",
            priceValue: 55000,
          },
        ],
      },
      {
        ok: true,
        marketplace: "danggeun",
        listings: [
          {
            marketplace: "danggeun",
            articleId: "hash-new",
            title: "Used Camera 예약중",
            priceText: "90,000원",
            link: "https://example.com/items/1?a=1&b=2",
            query: "new-camera-query",
            seller: "",
            location: "",
            priceValue: 90000,
          },
        ],
      },
    ]);

    const store = new PlainTextStateStore({
      dataDir,
      defaultSettings: {
        notificationsEnabled: true,
        channels: {
          terminal: { enabled: true },
          webhook: { enabled: true, url: "https://example.test/hook" },
        },
      },
    });

    const engine = createCoreEngine({ scraperClient: client, store });

    const firstCycle = await engine.runMonitorCycle([{ marketplace: "danggeun", query: "camera" }]);
    assert.equal(firstCycle.firstCycle, true);
    assert.equal(firstCycle.processedListings.length, 2);
    assert.equal(firstCycle.state.listings.length, 2);
    assert.ok(
      firstCycle.processedListings
        .flatMap((result) => result.notificationDecisions)
        .every((decision) => decision.status === "skipped_first_cycle"),
    );

    const secondCycle = await engine.runMonitorCycle([{ marketplace: "danggeun", query: "camera" }]);
    assert.equal(secondCycle.firstCycle, false);
    assert.equal(secondCycle.state.listings.length, 2);
    assert.equal(secondCycle.state.priceHistory.length, 1);
    assert.equal(secondCycle.state.saleStatusHistory.length, 1);

    const updatedListing = secondCycle.state.listings.find((listing) => listing.articleId === "a1");
    assert.ok(updatedListing);
    assert.equal(updatedListing?.query, "camera");
    assert.equal(updatedListing?.priceText, "90,000원");
    assert.equal(updatedListing?.saleStatus, "reserved");
    assert.equal(updatedListing?.seller, "alice");
    assert.equal(updatedListing?.location, "Seoul");
    assert.equal(updatedListing?.normalizedLink, "https://example.com/items/1?a=1&b=2");

    const priceChangeResult = secondCycle.processedListings[0];
    assert.equal(priceChangeResult?.changeType, "price_changed");
    assert.deepEqual(
      priceChangeResult?.notificationDecisions.map((decision) => ({ channel: decision.channel, status: decision.status })),
      [
        { channel: "terminal", status: "eligible" },
        { channel: "webhook", status: "eligible" },
      ],
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("plain text storage reloads persisted state from repo-local files", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-store-"));

  try {
    const initialStore = new PlainTextStateStore({
      dataDir,
      defaultSettings: {
        notificationsEnabled: false,
      },
    });

    const initialEngine = createCoreEngine({
      scraperClient: new FakeScraperClient([
        {
          ok: true,
          marketplace: "bunjang",
          listings: [
            {
              marketplace: "bunjang",
              articleId: "b1",
              title: "Phone",
              priceText: "800,000원",
              link: "https://example.com/products/1?utm_medium=test",
              query: "phone",
              priceValue: 800000,
            },
          ],
        },
      ]),
      store: initialStore,
    });

    await initialEngine.runMonitorCycle([{ marketplace: "bunjang", query: "phone" }]);

    const recoveredEngine = createCoreEngine({
      scraperClient: new FakeScraperClient([]),
      store: new PlainTextStateStore({ dataDir }),
    });

    const recoveredState = await recoveredEngine.getState();
    assert.equal(recoveredState.meta.monitorCyclesCompleted, 1);
    assert.deepEqual(recoveredState.searches, []);
    assert.equal(recoveredState.listings.length, 1);
    assert.equal(recoveredState.listings[0]?.articleId, "b1");
    assert.equal(recoveredState.listings[0]?.normalizedLink, "https://example.com/products/1");

    const listingsFile = JSON.parse(await readFile(join(dataDir, "listings.json"), "utf8")) as Array<{ articleId: string }>;
    assert.equal(listingsFile.length, 1);
    assert.equal(listingsFile[0]?.articleId, "b1");
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("configured searches persist visibly in repo-local files", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-searches-"));

  try {
    const engine = createCoreEngine({
      scraperClient: new FakeScraperClient([]),
      store: new PlainTextStateStore({ dataDir }),
    });

    assert.equal(
      await engine.addSearch({ marketplace: "danggeun", query: " camera ", location: " Seoul " }),
      true,
    );
    assert.equal(
      await engine.addSearch({ marketplace: "danggeun", query: "camera", location: "Seoul" }),
      false,
    );

    const reloadedEngine = createCoreEngine({
      scraperClient: new FakeScraperClient([]),
      store: new PlainTextStateStore({ dataDir }),
    });
    const reloadedState = await reloadedEngine.getState();

    assert.deepEqual(reloadedState.searches, [
      {
        marketplace: "danggeun",
        query: "camera",
        location: "Seoul",
      },
    ]);

    const searchesFile = JSON.parse(await readFile(join(dataDir, "searches.json"), "utf8")) as Array<{
      marketplace: string;
      query: string;
      location?: string;
    }>;
    assert.deepEqual(searchesFile, [
      {
        marketplace: "danggeun",
        query: "camera",
        location: "Seoul",
      },
    ]);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("configured monitor cycles use stored searches and pass headed debugging through", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-configured-run-"));

  try {
    const client = new FakeScraperClient([
      {
        ok: true,
        marketplace: "bunjang",
        listings: [],
      },
    ]);
    const engine = createCoreEngine({
      scraperClient: client,
      store: new PlainTextStateStore({ dataDir }),
    });

    await assert.rejects(
      () => engine.runConfiguredMonitorCycle(),
      /No searches are configured/,
    );

    assert.equal(await engine.addSearch({ marketplace: "bunjang", query: "phone" }), true);

    const result = await engine.runConfiguredMonitorCycle({ headed: true });
    assert.equal(result.searchResults.length, 1);
    assert.deepEqual(client.requests, [
      {
        marketplace: "bunjang",
        query: "phone",
        headed: true,
      },
    ]);

    assert.equal(await engine.removeSearch({ marketplace: "bunjang", query: "phone" }), true);
    assert.equal(await engine.removeSearch({ marketplace: "bunjang", query: "phone" }), false);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("plain text storage fails loudly when local data is corrupted", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-corrupt-"));

  try {
    await writeFile(join(dataDir, "listings.json"), "{\n", "utf8");
    const store = new PlainTextStateStore({ dataDir });

    await assert.rejects(
      () => store.load(),
      (error) =>
        error instanceof Error &&
        error.message.includes("listings.json") &&
        error.message.includes("pnpm usedbot data repair"),
    );
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("plain text storage inspection reports top-level shape mismatches", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-shape-"));

  try {
    await writeFile(join(dataDir, "listings.json"), "{}\n", "utf8");
    const store = new PlainTextStateStore({ dataDir });
    const inspection = await store.inspect();

    assert.equal(inspection.ok, false);
    assert.equal(inspection.issues.length, 1);
    assert.equal(inspection.issues[0]?.fileName, "listings.json");
    assert.match(inspection.issues[0]?.message ?? "", /top-level array/);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("plain text storage repair backs up broken files and keeps valid data", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "usedbot-core-repair-"));

  try {
    await writeFile(
      join(dataDir, "searches.json"),
      JSON.stringify([{ marketplace: "danggeun", query: "camera", location: "Seoul" }], null, 2),
      "utf8",
    );
    await writeFile(join(dataDir, "listings.json"), "{\n", "utf8");

    const store = new PlainTextStateStore({ dataDir });
    const repair = await store.repair();

    assert.equal(repair.issues.length, 1);
    assert.equal(repair.issues[0]?.fileName, "listings.json");
    assert.equal(repair.repairedFiles.length, 1);
    assert.equal(repair.repairedFiles[0]?.fileName, "listings.json");
    assert.match(repair.repairedFiles[0]?.backupPath ?? "", /listings\.json\.broken-/);

    const repairedState = await store.load();
    assert.deepEqual(repairedState.searches, [
      {
        marketplace: "danggeun",
        query: "camera",
        location: "Seoul",
      },
    ]);
    assert.deepEqual(repairedState.listings, []);

    const listingsFile = JSON.parse(await readFile(join(dataDir, "listings.json"), "utf8")) as unknown[];
    assert.deepEqual(listingsFile, []);
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
