from __future__ import annotations

from dataclasses import dataclass
import unittest

from scraper_sidecar.contracts import FailureKind
from scraper_sidecar.mapping import map_item, map_upstream_failure


@dataclass(slots=True)
class MappingItem:
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


class MappingTests(unittest.TestCase):
    def test_map_item_preserves_stable_contract_shape(self) -> None:
        listing = map_item(
            MappingItem(
                platform="danggeun",
                article_id="100",
                title="Laptop",
                price="900,000원",
                link="https://example.test/listings/100",
                keyword="laptop",
                seller="seller-100",
                location="Incheon",
                sale_status="for_sale",
                price_numeric=900000,
            )
        )

        self.assertEqual(listing.marketplace.value, "danggeun")
        self.assertEqual(listing.articleId, "100")
        self.assertEqual(listing.query, "laptop")
        self.assertEqual(listing.priceValue, 900000)

    def test_map_upstream_failure_categorizes_runtime_and_blocked_states(self) -> None:
        runtime_failure = map_upstream_failure("runtime_unavailable", RuntimeError("missing playwright"))
        blocked_failure = map_upstream_failure("captcha_or_blocked")

        self.assertEqual(runtime_failure.kind, FailureKind.RUNTIME_UNAVAILABLE)
        self.assertFalse(runtime_failure.retryable)
        self.assertEqual(blocked_failure.kind, FailureKind.BLOCKED)
        self.assertTrue(blocked_failure.retryable)


if __name__ == "__main__":
    unittest.main()
