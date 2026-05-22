from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from litestar import Litestar, get, post

from scraper_sidecar.contracts import (
    CapabilitiesResponse,
    EnrichRequest,
    EnrichResponse,
    HealthResponse,
    SearchRequest,
    SearchResponse,
)
from scraper_sidecar.service import SidecarService


# Litestar route handlers and lifespan hooks follow the documented patterns:
# https://docs.litestar.dev/latest/usage/routing/handlers.html
# https://docs.litestar.dev/latest/usage/applications.html#lifespan-context-managers
def create_app(service: SidecarService | None = None) -> Litestar:
    active_service = service or SidecarService()

    @asynccontextmanager
    async def service_lifespan(app: Litestar) -> AsyncIterator[None]:
        del app
        await active_service.start()
        try:
            yield
        finally:
            await active_service.close()

    @get("/health")
    async def health() -> HealthResponse:
        return active_service.health()

    @get("/capabilities")
    async def capabilities() -> CapabilitiesResponse:
        return active_service.capabilities()

    @post("/search", status_code=200)
    async def search(data: SearchRequest) -> SearchResponse:
        return await active_service.search(data)

    @post("/enrich", status_code=200)
    async def enrich(data: EnrichRequest) -> EnrichResponse:
        return await active_service.enrich(data)

    return Litestar(
        route_handlers=[health, capabilities, search, enrich],
        lifespan=[service_lifespan],
    )


app = create_app()
