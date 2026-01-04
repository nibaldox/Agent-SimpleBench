"""Quick probe to compare JSON vs TOON sizes and token estimates for a given JSON file.
Usage:
  D:/12_WindSurf/42-Agents/0000-Agente-Bench/venv/Scripts/python.exe -m src.utils.toon_token_probe --file benchmarks/results/some_report.json
"""
import argparse
import json
import os
from pathlib import Path
from typing import Optional, Tuple

from src.utils.toon_adapter import encode_for_prompt


def _token_counter():
    """Return a token counting callable. Prefers tiktoken if available, else char/4 heuristic."""
    try:
        import tiktoken  # type: ignore

        # Prefer GPT o200k_base; fallback to cl100k_base
        for enc_name in ("o200k_base", "cl100k_base"):
            try:
                encoding = tiktoken.get_encoding(enc_name)
                return lambda text: len(encoding.encode(text))
            except Exception:
                continue
    except Exception:
        pass

    def fallback(text: str) -> int:
        return max(1, int(len(text) / 4)) if text else 0

    return fallback


def read_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def stats(text: str, label: str, count_tokens) -> Tuple[int, int]:
    token_count = count_tokens(text)
    byte_len = len(text.encode("utf-8"))
    print(f"{label}: tokens≈{token_count:,} bytes={byte_len:,}")
    return token_count, byte_len


def main():
    parser = argparse.ArgumentParser(description="Compare JSON vs TOON token usage")
    parser.add_argument("--file", required=True, help="Path to a JSON file")
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        raise SystemExit(f"File not found: {file_path}")

    data = read_json(file_path)
    count_tokens = _token_counter()

    # JSON compact
    json_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    json_tokens, json_bytes = stats(json_text, "JSON", count_tokens)

    # TOON (uses adapter so it honors installed encoder, else falls back to JSON)
    toon_text, toon_fmt = encode_for_prompt(data, prefer_toon=True)
    toon_tokens, toon_bytes = stats(toon_text, f"{toon_fmt.upper()}", count_tokens)

    delta_tokens = toon_tokens - json_tokens
    delta_pct = (delta_tokens / json_tokens * 100) if json_tokens else 0
    delta_bytes = toon_bytes - json_bytes
    delta_bytes_pct = (delta_bytes / json_bytes * 100) if json_bytes else 0

    print("\nDelta (TOON vs JSON):")
    print(f"  tokens: {delta_tokens:+,} ({delta_pct:+.2f}%)")
    print(f"  bytes : {delta_bytes:+,} ({delta_bytes_pct:+.2f}%)")


if __name__ == "__main__":
    main()
