from __future__ import annotations

from typing import Protocol

from scraper_sidecar.contracts import FailureDTO, FailureKind, ListingDTO, Marketplace


class ItemLike(Protocol):
    platform: str
    article_id: str
    title: str
    price: str
    link: str
    keyword: str
    thumbnail: str | None
    seller: str | None
    location: str | None
    sale_status: str | None
    price_numeric: int | None


class SidecarFailure(Exception):
    def __init__(self, failure: FailureDTO):
        super().__init__(failure.message)
        self.failure = failure


def map_item(item: ItemLike) -> ListingDTO:
    marketplace = Marketplace(str(item.platform).lower())
    return ListingDTO(
        marketplace=marketplace,
        articleId=str(item.article_id),
        title=item.title,
        priceText=item.price,
        link=item.link,
        query=item.keyword,
        thumbnail=item.thumbnail,
        seller=item.seller,
        location=item.location,
        saleStatus=item.sale_status,
        priceValue=item.price_numeric,
    )


def map_upstream_failure(last_failure_kind: str | None, exc: Exception | None = None) -> FailureDTO:
    message = str(exc) if exc else "Upstream scraper failed"
    if last_failure_kind == "runtime_unavailable":
        return FailureDTO(
            kind=FailureKind.RUNTIME_UNAVAILABLE,
            message=message,
            retryable=False,
        )
    if last_failure_kind == "captcha_or_blocked":
        return FailureDTO(
            kind=FailureKind.BLOCKED,
            message=message if exc else "Marketplace blocked or challenged the scraper request",
            retryable=True,
        )
    return FailureDTO(
        kind=FailureKind.UPSTREAM_ERROR,
        message=message,
        retryable=True,
    )
