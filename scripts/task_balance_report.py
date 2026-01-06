from __future__ import annotations

import os
import sys
from collections import Counter, defaultdict


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    from benchmarks.eval_cases import TASKS

    ids = [t.id for t in TASKS]
    dupes = [k for k, v in Counter(ids).items() if v > 1]
    if dupes:
        print("DUPLICATE_IDS:")
        for d in dupes:
            print("-", d)
        raise SystemExit(2)

    by_diff = Counter(t.difficulty for t in TASKS)
    by_cat = Counter(t.category for t in TASKS)
    by_dc = Counter((t.difficulty, t.category) for t in TASKS)

    diffs = sorted(by_diff.keys(), key=lambda x: str(x).lower())
    cats = sorted(by_cat.keys(), key=lambda x: str(x).lower())

    max_per_cat = {c: max(by_dc[(d, c)] for d in diffs) for c in cats}

    missing = defaultdict(int)
    for d in diffs:
        for c in cats:
            missing[(d, c)] = max_per_cat[c] - by_dc[(d, c)]

    print("TOTAL_TASKS", len(TASKS))
    print("DIFFICULTIES", diffs)
    print("CATEGORIES", cats)
    print("\nCOUNTS_BY_DIFFICULTY", dict(by_diff))
    print("COUNTS_BY_CATEGORY", dict(by_cat))

    print("\nTARGET_PER_CATEGORY_MAX", max_per_cat)

    print("\nMISSING_BY_DIFFICULTY_X_CATEGORY")
    for d in diffs:
        row = {c: missing[(d, c)] for c in cats}
        row = {k: v for k, v in row.items() if v > 0}
        print(f"- {d}: {row if row else '(none)'}")

    # Helpful: show existing IDs by difficulty/category
    by_bucket = defaultdict(list)
    for t in TASKS:
        by_bucket[(t.difficulty, t.category)].append(t.id)

    print("\nEXISTING_IDS_BY_BUCKET")
    for d in diffs:
        for c in cats:
            bucket = sorted(by_bucket[(d, c)])
            if bucket:
                print(f"- {d}/{c}: {bucket}")


if __name__ == "__main__":
    main()
