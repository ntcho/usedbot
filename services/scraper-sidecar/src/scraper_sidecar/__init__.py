from typing import Any

__all__ = ["app", "create_app", "SidecarService"]


def __getattr__(name: str) -> Any:
    if name in {"app", "create_app"}:
        from scraper_sidecar.app import app, create_app

        return {"app": app, "create_app": create_app}[name]

    if name == "SidecarService":
        from scraper_sidecar.service import SidecarService

        return SidecarService

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
