"""Simple in-memory sliding window rate limiter."""

from collections import deque
from threading import Lock
from time import monotonic


class SlidingWindowRateLimiter:
    """Thread-safe sliding window rate limiter for API endpoints."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        """Check and record an event if within the configured limit."""
        if limit <= 0 or window_seconds <= 0:
            return True

        now = monotonic()
        with self._lock:
            bucket = self._events.setdefault(key, deque())
            self._evict_old(bucket, now, window_seconds)
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True

    def retry_after_seconds(self, key: str, window_seconds: int) -> int:
        """Return a conservative retry-after hint in whole seconds."""
        if window_seconds <= 0:
            return 1

        now = monotonic()
        with self._lock:
            bucket = self._events.get(key)
            if not bucket:
                return 1
            self._evict_old(bucket, now, window_seconds)
            if not bucket:
                return 1
            oldest = bucket[0]
            remaining = max(1.0, (oldest + window_seconds) - now)
            return int(remaining) if remaining.is_integer() else int(remaining) + 1

    def remaining(self, key: str, limit: int, window_seconds: int) -> int:
        """Return remaining events for the current window."""
        if limit <= 0:
            return 0
        now = monotonic()
        with self._lock:
            bucket = self._events.setdefault(key, deque())
            self._evict_old(bucket, now, window_seconds)
            return max(0, limit - len(bucket))

    @staticmethod
    def _evict_old(bucket: deque[float], now: float, window_seconds: int) -> None:
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
