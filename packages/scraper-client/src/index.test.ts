import assert from "node:assert/strict";
import test from "node:test";

import { HttpScraperClient, ScraperClientError } from "@usedbot/scraper-client";

test("search posts sidecar requests and parses the stable listing contract", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const client = new HttpScraperClient({
    baseUrl: "http://127.0.0.1:9100",
    fetch: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          ok: true,
          marketplace: "danggeun",
          listings: [
            {
              marketplace: "danggeun",
              articleId: "article-1",
              title: "Used Camera",
              priceText: "100,000원",
              link: "https://example.test/items/1",
              query: "camera",
              priceValue: 100000,
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });

  const response = await client.search({
    marketplace: "danggeun",
    query: "camera",
    location: "Seoul",
  });

  assert.equal(capturedUrl, "http://127.0.0.1:9100/search");
  assert.equal(capturedInit?.method, "POST");
  assert.equal(new Headers(capturedInit?.headers).get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    marketplace: "danggeun",
    query: "camera",
    location: "Seoul",
  });
  assert.equal(response.ok, true);
  assert.equal(response.listings[0]?.articleId, "article-1");
  assert.equal(response.listings[0]?.priceValue, 100000);
});

test("contract mismatches raise a scraper client error", async () => {
  const client = new HttpScraperClient({
    fetch: async () =>
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  await assert.rejects(
    () => client.health(),
    (error) => error instanceof ScraperClientError && /contract mismatch/.test(error.message),
  );
});
