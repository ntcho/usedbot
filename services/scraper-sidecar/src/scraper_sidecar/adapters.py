from __future__ import annotations

from importlib import import_module
from pathlib import Path
import sys
from typing import Any, Protocol

from scraper_sidecar.contracts import CapabilityDTO, EnrichRequest, FailureKind, Marketplace, SearchRequest
from scraper_sidecar.mapping import SidecarFailure, map_upstream_failure


REPO_ROOT = Path(__file__).resolve().parents[4]
VENDOR_ROOT = REPO_ROOT / "vendor" / "used-market-notifier"

SCRAPER_IMPORTS = {
    Marketplace.DANGGEUN: ("scrapers.playwright_danggeun", "PlaywrightDanggeunScraper"),
    Marketplace.BUNJANG: ("scrapers.playwright_bunjang", "PlaywrightBunjangScraper"),
    Marketplace.JOONGGONARA: ("scrapers.playwright_joonggonara", "PlaywrightJoonggonaraScraper"),
}


class UpstreamScraper(Protocol):
    async def start(self) -> None: ...

    async def close(self) -> None: ...

    async def _safe_search_async(self, keyword: str, location: str | None = None) -> list[Any]: ...

    async def enrich_item_async(self, item: Any) -> Any: ...

    def get_last_failure_kind(self) -> str | None: ...

    def is_healthy(self) -> bool: ...


class ScraperAdapter(Protocol):
    def capability(self) -> CapabilityDTO: ...

    async def search(self, request: SearchRequest) -> list[Any]: ...

    async def enrich(self, request: EnrichRequest) -> Any: ...

    async def close(self) -> None: ...


def create_default_adapters() -> dict[Marketplace, ScraperAdapter]:
    return {
        marketplace: UpstreamMarketplaceAdapter(marketplace)
        for marketplace in Marketplace
    }


class UpstreamMarketplaceAdapter:
    def __init__(self, marketplace: Marketplace):
        self.marketplace = marketplace
        self._scraper: UpstreamScraper | None = None
        self._import_error: Exception | None = None
        self._headless = True

    def capability(self) -> CapabilityDTO:
        available, reason = self._importable()
        started = self._scraper is not None
        last_failure = None
        if self._scraper is not None:
            last_failure = _map_last_failure(self._scraper.get_last_failure_kind())
            if not self._scraper.is_healthy() and last_failure is None:
                last_failure = FailureKind.UPSTREAM_ERROR
        return CapabilityDTO(
            marketplace=self.marketplace,
            available=available and (self._scraper is None or self._scraper.is_healthy()),
            started=started,
            reason=reason,
            lastFailure=last_failure,
        )

    async def search(self, request: SearchRequest) -> list[Any]:
        scraper = await self._get_scraper(headed=request.headed)
        try:
            items = await scraper._safe_search_async(request.query, request.location)
        except Exception as exc:
            raise SidecarFailure(map_upstream_failure(scraper.get_last_failure_kind(), exc)) from exc
        if not items and scraper.get_last_failure_kind() == "captcha_or_blocked":
            raise SidecarFailure(map_upstream_failure("captcha_or_blocked"))
        return items

    async def enrich(self, request: EnrichRequest) -> Any:
        scraper = await self._get_scraper()
        item_class = self._load_item_class()
        item = item_class(
            platform=request.listing.marketplace.value,
            article_id=request.listing.articleId,
            title=request.listing.title,
            price=request.listing.priceText,
            link=request.listing.link,
            keyword=request.listing.query,
            thumbnail=request.listing.thumbnail,
            seller=request.listing.seller,
            location=request.listing.location,
            sale_status=request.listing.saleStatus,
            price_numeric=request.listing.priceValue,
        )
        try:
            return await scraper.enrich_item_async(item)
        except Exception as exc:
            raise SidecarFailure(map_upstream_failure(scraper.get_last_failure_kind(), exc)) from exc

    async def close(self) -> None:
        if self._scraper is not None:
            await self._scraper.close()
            self._scraper = None
        self._headless = True

    def _importable(self) -> tuple[bool, str | None]:
        try:
            self._load_scraper_class()
        except Exception as exc:
            self._import_error = exc
            return False, str(exc)
        return True, None

    async def _get_scraper(self, *, headed: bool = False) -> UpstreamScraper:
        requested_headless = not headed
        if self._scraper is not None and self._headless != requested_headless:
            await self._scraper.close()
            self._scraper = None

        if self._scraper is not None:
            return self._scraper
        if self._import_error is not None:
            raise SidecarFailure(map_upstream_failure("runtime_unavailable", self._import_error))

        scraper_class = self._load_scraper_class()
        scraper = scraper_class(headless=requested_headless, disable_images=True)
        try:
            await scraper.start()
        except Exception as exc:
            raise SidecarFailure(map_upstream_failure("runtime_unavailable", exc)) from exc
        self._scraper = scraper
        self._headless = requested_headless
        return scraper

    def _load_scraper_class(self) -> type[UpstreamScraper]:
        _ensure_vendor_root()
        module_name, class_name = SCRAPER_IMPORTS[self.marketplace]
        module = import_module(module_name)
        return getattr(module, class_name)

    @staticmethod
    def _load_item_class() -> type[Any]:
        _ensure_vendor_root()
        module = import_module("models")
        return getattr(module, "Item")


def _ensure_vendor_root() -> None:
    vendor_path = str(VENDOR_ROOT)
    if vendor_path not in sys.path:
        sys.path.insert(0, vendor_path)


def _map_last_failure(last_failure_kind: str | None) -> FailureKind | None:
    if last_failure_kind == "captcha_or_blocked":
        return FailureKind.BLOCKED
    if last_failure_kind == "runtime_unavailable":
        return FailureKind.RUNTIME_UNAVAILABLE
    if last_failure_kind is None:
        return None
    return FailureKind.UPSTREAM_ERROR
