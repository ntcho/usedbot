from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Marketplace(str, Enum):
    DANGGEUN = "danggeun"
    BUNJANG = "bunjang"
    JOONGGONARA = "joonggonara"


class FailureKind(str, Enum):
    BLOCKED = "blocked"
    RUNTIME_UNAVAILABLE = "runtime_unavailable"
    UNSUPPORTED_MARKETPLACE = "unsupported_marketplace"
    UPSTREAM_ERROR = "upstream_error"


@dataclass(slots=True)
class ListingDTO:
    marketplace: Marketplace
    articleId: str
    title: str
    priceText: str
    link: str
    query: str
    thumbnail: str | None = None
    seller: str | None = None
    location: str | None = None
    saleStatus: str | None = None
    priceValue: int | None = None


@dataclass(slots=True)
class FailureDTO:
    kind: FailureKind
    message: str
    retryable: bool


@dataclass(slots=True)
class CapabilityDTO:
    marketplace: Marketplace
    available: bool
    supportsSearch: bool = True
    supportsEnrich: bool = True
    started: bool = False
    reason: str | None = None
    lastFailure: FailureKind | None = None


@dataclass(slots=True)
class CapabilitiesResponse:
    capabilities: list[CapabilityDTO] = field(default_factory=list)


@dataclass(slots=True)
class HealthResponse:
    status: str
    started: bool
    capabilities: list[CapabilityDTO] = field(default_factory=list)


@dataclass(slots=True)
class SearchRequest:
    marketplace: Marketplace
    query: str
    location: str | None = None


@dataclass(slots=True)
class SearchResponse:
    ok: bool
    marketplace: Marketplace
    listings: list[ListingDTO] = field(default_factory=list)
    failure: FailureDTO | None = None


@dataclass(slots=True)
class EnrichRequest:
    listing: ListingDTO


@dataclass(slots=True)
class EnrichResponse:
    ok: bool
    listing: ListingDTO | None = None
    failure: FailureDTO | None = None
