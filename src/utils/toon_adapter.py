"""Lightweight adapter to optionally use TOON for prompt compression.
Falls back to compact JSON if no TOON encoder is available or if disabled.
"""
import json
import os
from functools import lru_cache
from typing import Any, Tuple

# Toggle via env var. Frontend can still override per-request.
TOON_ENABLED = os.getenv("ENABLE_TOON", "false").lower() == "true"

@lru_cache(maxsize=1)
def _load_toon_module():
    """Attempt to import a TOON encoder module, return None if unavailable."""
    candidates = (
        "toon",  # hypothetical official module name
        "toonfmt",  # alternate naming seen in some ports
        "toon_format",  # PyPI toon-format
    )
    for name in candidates:
        try:
            module = __import__(name)
            return module
        except Exception:
            continue
    return None


def encode_for_prompt(data: Any, prefer_toon: bool = True) -> Tuple[str, str]:
    """Encode data as TOON if available/desired; else compact JSON.

    Returns (encoded_text, format_label) where format_label is "toon" or "json".
    """
    if prefer_toon and TOON_ENABLED:
        toon_module = _load_toon_module()
        if toon_module:
            try:
                if hasattr(toon_module, "dumps"):
                    return toon_module.dumps(data), "toon"
                if hasattr(toon_module, "serialize"):
                    return toon_module.serialize(data), "toon"
            except Exception as exc:  # pragma: no cover - best-effort only
                print(f"WARNING: TOON encoding failed, falling back to JSON ({exc})")
        else:
            # Only log once per process
            if not getattr(encode_for_prompt, "_warned_missing", False):
                print("INFO: TOON requested but no encoder module found. Using JSON.")
                encode_for_prompt._warned_missing = True

    # Compact JSON fallback
    compact_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return compact_json, "json"
