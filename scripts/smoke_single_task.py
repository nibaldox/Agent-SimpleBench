from __future__ import annotations

import os
import sys


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    from src.run_benchmark import BenchmarkRunner

    task_id = os.getenv("SMOKE_TASK_ID", "E001")
    model_id = os.getenv("SMOKE_MODEL_ID")
    enable_tools = os.getenv("SMOKE_ENABLE_TOOLS", "false").lower() == "true"
    language = os.getenv("SMOKE_LANGUAGE", "english")
    runs = int(os.getenv("SMOKE_RUNS", "1"))

    runner = BenchmarkRunner(model_id=model_id, enable_tools=enable_tools, task_id=task_id, language=language)
    runner.num_runs = runs
    runner.run()


if __name__ == "__main__":
    main()
