from __future__ import annotations

from collections import Counter
import os
import sys


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    from benchmarks.eval_cases import TASKS

    by_difficulty = Counter(t.difficulty for t in TASKS)
    by_category = Counter(t.category for t in TASKS)
    by_dc = Counter((t.difficulty, t.category) for t in TASKS)

    difficulties = sorted(by_difficulty.keys(), key=lambda x: str(x).lower())
    categories = sorted(by_category.keys(), key=lambda x: str(x).lower())

    print(f"TOTAL_TASKS: {len(TASKS)}")

    print("\nBY_DIFFICULTY:")
    for d in difficulties:
        print(f"- {d}: {by_difficulty[d]}")

    print("\nBY_CATEGORY:")
    for c in categories:
        print(f"- {c}: {by_category[c]}")

    print("\nBY_DIFFICULTY_X_CATEGORY:")
    for d in difficulties:
        row = ", ".join([f"{c}={by_dc[(d, c)]}" for c in categories])
        print(f"- {d}: {row}")

    # Targets
    max_total = max(by_difficulty.values()) if by_difficulty else 0
    max_per_category = {c: max(by_dc[(d, c)] for d in difficulties) for c in categories}

    print("\nTARGETS (add-only suggestion):")
    print(f"- total_per_difficulty: {max_total}")
    print(f"- per_category_max: {max_per_category}")

    print("\nADDITIONS_NEEDED_TO_MATCH_PER_CATEGORY_MAX:")
    for d in difficulties:
        needed = {c: (max_per_category[c] - by_dc[(d, c)]) for c in categories}
        needed = {k: v for k, v in needed.items() if v > 0}
        if needed:
            print(f"- {d}: {needed}")
        else:
            print(f"- {d}: (none)")

    print("\nADDITIONS_NEEDED_TO_MATCH_TOTAL_MAX:")
    for d in difficulties:
        print(f"- {d}: +{max_total - by_difficulty[d]}")


if __name__ == "__main__":
    main()
