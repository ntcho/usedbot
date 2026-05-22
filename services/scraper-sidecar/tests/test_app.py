from __future__ import annotations

from dataclasses import dataclass
import unittest

from litestar.testing import TestClient

from scraper_sidecar.app import create_app
from scraper_sidecar.contracts import CapabilityDTO, EnrichRequest, EnrichResponse, FailureKind, Marketplace
from scraper_sidecar.mapping import SidecarFailure, map_upstream_failure
from scraper_sidecar.service import SidecarService


@dataclass(slots=True)
class FakeItem:
    platform: str
    article_id: str
    title: str
    price: str
    link: str
    keyword: str
    thumbnail: str | None = None
    seller: str | None = None
    location: str | None = None
    sale_status: str | None = None
    price_numeric: int | None = None


class FakeAdapter:
    def __init__(self, capability: CapabilityDTO, *, items: list[FakeItem] | None = None, failure: SidecarFailure | None = None, enriched_item: FakeItem | None = None):
        self._capability = capability
        self._items = items or []
        self._failure = failure
        self._enriched_item = enriched_item
        self.closed = False

    def capability(self) -> CapabilityDTO:
        return self._capability

    async def search(self, request):
        del request
        if self._failure is not None:
            raise self._failure
        return self._items

    async def enrich(self, request: EnrichRequest):
        if self._failure is not None:
            raise self._failure
        return self._enriched_item or self._items[0] or request.listing

    async def close(self) -> None:
        self.closed = True


class SidecarAppTests(unittest.TestCase):
    def test_health_reports_capabilities_and_lifecycle(self) -> None:
        adapter = FakeAdapter(
            CapabilityDTO(
                marketplace=Marketplace.DANGGEUN,
                available=True,
                started=False,
            )
        )
        service = SidecarService(adapters={Marketplace.DANGGEUN: adapter})

        with TestClient(app=create_app(service)) as client:
            self.assertTrue(service.started)
            response = client.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "ok")
            self.assertTrue(response.json()["started"])
            self.assertEqual(response.json()["capabilities"][0]["marketplace"], "danggeun")
            self.assertTrue(response.json()["capabilities"][0]["available"])

        self.assertFalse(service.started)
        self.assertTrue(adapter.closed)

    def test_search_maps_items_into_stable_listing_dtos(self) -> None:
        adapter = FakeAdapter(
            CapabilityDTO(marketplace=Marketplace.DANGGEUN, available=True),
            items=[
                FakeItem(
                    platform="danggeun",
                    article_id="article-1",
                    title="Used Camera",
                    price="100,000원",
                    link="https://example.test/items/1",
                    keyword="camera",
                    seller="seller-1",
                    location="Seoul",
                    sale_status="for_sale",
                    price_numeric=100000,
                )
            ],
        )
        service = SidecarService(adapters={Marketplace.DANGGEUN: adapter})

        with TestClient(app=create_app(service)) as client:
            response = client.post(
                "/search",
                json={"marketplace": "danggeun", "query": "camera", "location": "Seoul"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["listings"][0]["articleId"], "article-1")
        self.assertEqual(payload["listings"][0]["priceText"], "100,000원")
        self.assertEqual(payload["listings"][0]["priceValue"], 100000)
        self.assertEqual(payload["listings"][0]["marketplace"], "danggeun")

    def test_search_returns_structured_failure_response(self) -> None:
        adapter = FakeAdapter(
            CapabilityDTO(marketplace=Marketplace.BUNJANG, available=False, lastFailure=FailureKind.BLOCKED),
            failure=SidecarFailure(map_upstream_failure("captcha_or_blocked")),
        )
        service = SidecarService(adapters={Marketplace.BUNJANG: adapter})

        with TestClient(app=create_app(service)) as client:
            response = client.post(
                "/search",
                json={"marketplace": "bunjang", "query": "iphone"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["failure"]["kind"], "blocked")
        self.assertTrue(payload["failure"]["retryable"])
        self.assertEqual(payload["listings"], [])

    def test_enrich_returns_mapped_listing(self) -> None:
        enriched_item = FakeItem(
            platform="joonggonara",
            article_id="42",
            title="Vintage Speaker",
            price="55,000원",
            link="https://example.test/items/42",
            keyword="speaker",
            seller="seller-42",
            location="Busan",
            sale_status="for_sale",
            price_numeric=55000,
        )
        adapter = FakeAdapter(
            CapabilityDTO(marketplace=Marketplace.JOONGGONARA, available=True),
            enriched_item=enriched_item,
        )
        service = SidecarService(adapters={Marketplace.JOONGGONARA: adapter})

        with TestClient(app=create_app(service)) as client:
            response = client.post(
                "/enrich",
                json={
                    "listing": {
                        "marketplace": "joonggonara",
                        "articleId": "42",
                        "title": "Vintage Speaker",
                        "priceText": "55,000원",
                        "link": "https://example.test/items/42",
                        "query": "speaker",
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["listing"]["seller"], "seller-42")
        self.assertEqual(payload["listing"]["location"], "Busan")


if __name__ == "__main__":
    unittest.main()
