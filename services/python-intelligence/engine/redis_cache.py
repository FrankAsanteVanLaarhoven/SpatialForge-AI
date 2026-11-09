#!/usr/bin/env python3
"""
Zero-dependency sovereign Redis client with automatic in-memory fallback
for SpatialForge AI Python Intelligence microservice.
"""

from datetime import datetime, timezone
import os
import socket
import threading
import time

class SovereignPythonCache:
    def __init__(self, host=None, port=None):
        self.host = host or os.environ.get("REDIS_HOST", "127.0.0.1")
        self.port = int(port or os.environ.get("REDIS_PORT", 6379))
        self.address = f"{self.host}:{self.port}"
        self.is_connected = False
        self.last_checked_utc = None
        self._lock = threading.Lock()
        self._in_memory_store = {}  # key -> (value, expires_at_timestamp)

        # Initial probe
        self.ping()

    def _execute_cmd(self, cmd_parts):
        """Send raw RESP command over TCP with 1.0s timeout."""
        try:
            s = socket.create_connection((self.host, self.port), timeout=1.0)
            with s:
                # Format RESP array
                resp = f"*{len(cmd_parts)}\r\n"
                for p in cmd_parts:
                    p_str = str(p)
                    resp += f"${len(p_str.encode('utf-8'))}\r\n{p_str}\r\n"
                s.sendall(resp.encode("utf-8"))

                # Read response line
                resp_data = s.recv(4096)
                if not resp_data:
                    return None
                line = resp_data.decode("utf-8", errors="ignore")
                return line
        except Exception:
            return None

    def ping(self):
        """Test connection to Redis; fall back to local memory if unreachable."""
        res = self._execute_cmd(["PING"])
        now_str = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self.last_checked_utc = now_str
            if res and ("+PONG" in res or "PONG" in res):
                self.is_connected = True
                return True, "PONG (Redis 7.2 active)"
            self.is_connected = False
            return False, "LOCAL_ENCLAVE (In-Memory Fallback Active)"

    def set(self, key: str, value: str, ttl_sec: float = None):
        """Set a key in Redis, or local in-memory store."""
        if self.is_connected:
            cmd = ["SET", key, value]
            if ttl_sec and ttl_sec > 0:
                cmd.extend(["EX", str(int(ttl_sec))])
            res = self._execute_cmd(cmd)
            if res and "+OK" in res:
                return True

        with self._lock:
            exp = time.time() + ttl_sec if ttl_sec and ttl_sec > 0 else None
            self._in_memory_store[key] = (value, exp)
            return True

    def get(self, key: str):
        """Retrieve key from Redis, or local in-memory store."""
        if self.is_connected:
            res = self._execute_cmd(["GET", key])
            if res and not res.startswith("$-1"):
                # Parse bulk string: e.g. "$4\r\ntest\r\n"
                parts = res.split("\r\n")
                if len(parts) >= 2:
                    return parts[1]

        with self._lock:
            if key not in self._in_memory_store:
                return None
            val, exp = self._in_memory_store[key]
            if exp and time.time() > exp:
                del self._in_memory_store[key]
                return None
            return val

    def get_status(self):
        """Return diagnostic metrics."""
        with self._lock:
            mode = "REDIS_TCP" if self.is_connected else "IN_MEMORY_ENCLAVE"
            return {
                "mode": mode,
                "redis_target": self.address,
                "redis_connected": self.is_connected,
                "in_memory_keys": len(self._in_memory_store),
                "last_checked_utc": self.last_checked_utc or datetime.now(timezone.utc).isoformat(),
            }

