import time
from typing import Any, Optional, Dict

class CacheService:
    """
    High-performance in-memory cache with TTL support and graceful degradation.
    Protects downstream RailRadar APIs from excessive calls and HTTP 429 rate-limiting.
    """
    def __init__(self, default_ttl_seconds: int = 60):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            return None
        if time.time() > entry["expires_at"]:
            del self._cache[key]
            return None
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl,
            "created_at": time.time()
        }

    def delete(self, key: str):
        if key in self._cache:
            del self._cache[key]

    def clear(self):
        self._cache.clear()

    def get_with_metadata(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self._cache.get(key)
        if not entry:
            return None
        is_expired = time.time() > entry["expires_at"]
        return {
            "value": entry["value"],
            "created_at": entry["created_at"],
            "is_expired": is_expired,
            "age_seconds": round(time.time() - entry["created_at"], 1)
        }

# Global singleton cache instance
cache_service = CacheService(default_ttl_seconds=60)
