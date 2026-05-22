from __future__ import annotations

from dataclasses import dataclass
import unittest

from scraper_sidecar.adapters import UpstreamMarketplaceAdapter
from scraper_sidecar.contracts import Marketplace, SearchRequest


class FakeUpstreamScraper:
    instances: list["FakeUpstreamScraper"] = []

    def __init__(self, *, headless: bool, disable_images: bool):
        self.headless = headless
        self.disable_images = disable_images
        self.started = False
        self.closed = False
        FakeUpstreamScraper.instances.append(self)

    async def start(self) -> None:
        self.started = True

    async def close(self) -> None:
        self.closed = True

    async def _safe_search_async(self, keyword: str, location: str | None = None) -> list[FakeItem]:
        return [FakeItem(keyword=keyword, location=location)]

    async def enrich_item_async(self, item: object) -> object:
        return item

    def get_last_failure_kind(self) -> str | None:
        return None

    def is_healthy(self) -> bool:
        return True


@dataclass(slots=True)
class FakeItem:
    keyword: str
    location: str | None = None


class TestableMarketplaceAdapter(UpstreamMarketplaceAdapter):
    def _load_scraper_class(self):
        return FakeUpstreamScraper


class UpstreamMarketplaceAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        FakeUpstreamScraper.instances.clear()

    async def test_search_restarts_scraper_when_headed_mode_changes(self) -> None:
        adapter = TestableMarketplaceAdapter(Marketplace.DANGGEUN)

        await adapter.search(SearchRequest(marketplace=Marketplace.DANGGEUN, query="camera"))
        await adapter.search(SearchRequest(marketplace=Marketplace.DANGGEUN, query="camera", headed=True))

        self.assertEqual(len(FakeUpstreamScraper.instances), 2)
        self.assertTrue(FakeUpstreamScraper.instances[0].headless)
        self.assertTrue(FakeUpstreamScraper.instances[0].closed)
        self.assertFalse(FakeUpstreamScraper.instances[1].headless)
        self.assertTrue(FakeUpstreamScraper.instances[1].started)


if __name__ == "__main__":
    unittest.main()
