from __future__ import annotations

import os

import uvicorn

from scraper_sidecar.app import app


LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost"}


def main() -> None:
    host = os.environ.get("SCRAPER_SIDECAR_HOST", "127.0.0.1")
    if host not in LOCAL_HOSTS:
        raise SystemExit("SCRAPER_SIDECAR_HOST must stay on a local interface")

    port = int(os.environ.get("SCRAPER_SIDECAR_PORT", "5111"))
    log_level = os.environ.get("SCRAPER_SIDECAR_LOG_LEVEL", "info")
    uvicorn.run(app, host=host, port=port, log_level=log_level)


if __name__ == "__main__":
    main()
