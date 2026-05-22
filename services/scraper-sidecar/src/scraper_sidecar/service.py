from __future__ import annotations

from scraper_sidecar.adapters import ScraperAdapter, create_default_adapters
from scraper_sidecar.contracts import (
    CapabilitiesResponse,
    EnrichRequest,
    EnrichResponse,
    FailureDTO,
    FailureKind,
    HealthResponse,
    Marketplace,
    SearchRequest,
    SearchResponse,
)
from scraper_sidecar.mapping import SidecarFailure, map_item


class SidecarService:
    def __init__(self, adapters: dict[Marketplace, ScraperAdapter] | None = None):
        self._adapters = adapters or create_default_adapters()
        self.started = False

    async def start(self) -> None:
        self.started = True

    async def close(self) -> None:
        for adapter in self._adapters.values():
            await adapter.close()
        self.started = False

    def capabilities(self) -> CapabilitiesResponse:
        capabilities = [self._adapters[marketplace].capability() for marketplace in self._adapters]
        capabilities.sort(key=lambda capability: capability.marketplace.value)
        return CapabilitiesResponse(capabilities=capabilities)

    def health(self) -> HealthResponse:
        capability_response = self.capabilities()
        return HealthResponse(
            status="ok",
            started=self.started,
            capabilities=capability_response.capabilities,
        )

    async def search(self, request: SearchRequest) -> SearchResponse:
        await self._ensure_started()
        try:
            adapter = self._adapter_for(request.marketplace)
            items = await adapter.search(request)
            return SearchResponse(
                ok=True,
                marketplace=request.marketplace,
                listings=[map_item(item) for item in items],
            )
        except SidecarFailure as exc:
            return SearchResponse(
                ok=False,
                marketplace=request.marketplace,
                failure=exc.failure,
            )

    async def enrich(self, request: EnrichRequest) -> EnrichResponse:
        await self._ensure_started()
        try:
            adapter = self._adapter_for(request.listing.marketplace)
            item = await adapter.enrich(request)
            return EnrichResponse(ok=True, listing=map_item(item))
        except SidecarFailure as exc:
            return EnrichResponse(ok=False, failure=exc.failure)

    async def _ensure_started(self) -> None:
        if not self.started:
            await self.start()

    def _adapter_for(self, marketplace: Marketplace) -> ScraperAdapter:
        adapter = self._adapters.get(marketplace)
        if adapter is None:
            raise SidecarFailure(
                FailureDTO(
                    kind=FailureKind.UNSUPPORTED_MARKETPLACE,
                    message=f"Unsupported marketplace: {marketplace.value}",
                    retryable=False,
                )
            )
        return adapter
