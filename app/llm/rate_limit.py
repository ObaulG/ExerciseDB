import os
import time

from fastapi import HTTPException, Request

RATE_LIMIT_ENV_VAR = "LLM_RATE_LIMIT_SECONDS"
DEFAULT_RATE_LIMIT_SECONDS = 30.0


def get_rate_limit_seconds() -> float:
    try:
        return float(os.environ.get(RATE_LIMIT_ENV_VAR, DEFAULT_RATE_LIMIT_SECONDS))
    except ValueError:
        return DEFAULT_RATE_LIMIT_SECONDS


class LLMRateLimiter:
    """Limite globale : une requête LLM toutes les N secondes (0 désactive)."""

    def __init__(self) -> None:
        self._last_request = 0.0

    def check(self) -> None:
        interval = get_rate_limit_seconds()
        if interval <= 0:
            return
        now = time.monotonic()
        if now - self._last_request < interval:
            wait = int(self._last_request + interval - now) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requêtes. Maximum une requête toutes les "
                f"{int(interval)} secondes. Réessayez dans {wait}s.",
            )
        self._last_request = now

    def reset(self) -> None:
        self._last_request = 0.0


llm_rate_limiter = LLMRateLimiter()


async def enforce_llm_rate_limit(request: Request) -> None:
    llm_rate_limiter.check()
