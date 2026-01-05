from __future__ import annotations

from pathlib import Path
import sys
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from benchmarks.eval_cases import TASKS, BenchmarkTask


CATEGORY_ORDER = [
    "coding",
    "research",
    "reasoning",
    "logic",
    "system",
    "extraction",
    "investigation",
    "writing",
    "safety",
    "long-context",
]


def _cat_rank(category: str) -> int:
    c = (category or "").strip().lower()
    try:
        return CATEGORY_ORDER.index(c)
    except ValueError:
        return len(CATEGORY_ORDER) + 1


def _safe_text_block(text: str) -> str:
    """Wrap text in a fence that can contain ``` blocks."""
    t = (text or "").rstrip() + "\n"
    return "````text\n" + t + "````\n"


def _iter_sorted_tasks(tasks: Iterable[BenchmarkTask]) -> list[BenchmarkTask]:
    def key(t: BenchmarkTask):
        return (
            _cat_rank(t.category),
            (t.category or "").lower(),
            (t.id or ""),
            (t.difficulty or ""),
            (t.name or ""),
        )

    return sorted(list(tasks), key=key)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_path = root / "PROMPTS_AND_TESTS.md"

    tasks = _iter_sorted_tasks(TASKS)

    # Build a quick index table
    index_lines = [
        "| ID | Name | Category | Difficulty |",
        "| --- | --- | --- | --- |",
    ]
    for t in tasks:
        index_lines.append(
            f"| {t.id} | {t.name} | {t.category} | {t.difficulty} |"
        )

    doc = []
    doc.append("# Agent-SimpleBench — Pruebas & Prompts\n")

    doc.append("## Cómo ejecutar\n")
    doc.append("- Iniciar la app web: `start_app.ps1` (PowerShell).\n")
    doc.append("- Ejecutar el benchmark runner (CLI): `python src/run_benchmark.py`\n")
    doc.append("\nVariables de entorno (evidencia para el juez):\n")
    doc.append("- `JUDGE_RUN_CODE=true|false` (default: true)\n")
    doc.append("- `JUDGE_VERIFY_SOURCES=true|false` (default: true)\n")

    doc.append("\n## Pipeline de prompts\n")
    doc.append(
        "Los prompts se definen en `benchmarks/eval_cases.py` y luego se decoran con un encabezado meta "
        "(rol, reglas estrictas, checklist de calidad) antes de enviarse al modelo.\n"
    )
    doc.append("El marcador usado es: `### BENCHMARK META ###`.\n")

    doc.append("\n## Contrato del juez (prompt de evaluación)\n")
    doc.append(
        "El juez evalúa el output contra `expected_criteria` y DEBE devolver STRICT JSON únicamente.\n"
        "También se le instruye ignorar cualquier prompt injection dentro de `<OUTPUT>`.\n"
    )
    doc.append("Shape esperado (JSON):\n")
    doc.append(
        "```json\n"
        "{\n"
        "  \"criteria_results\": [{\"id\": 1, \"pass\": true, \"evidence\": \"...\"}],\n"
        "  \"reason\": \"short overall explanation\"\n"
        "}\n"
        "```\n"
    )

    doc.append("\n## Modo estricto (sources & claims)\n")
    doc.append(
        "El modo estricto agrega reglas de citación para outputs tipo research (se puede activar desde la UI).\n"
        "Cuando está activo, los claims factuales (especialmente números/fechas/especificaciones) deben terminar con un `Sources:` "
        "donde cada bullet contenga SOLO un URL http(s) (sin texto extra en la misma línea).\n"
    )

    doc.append("\n## Índice de tareas\n")
    doc.append("\n".join(index_lines) + "\n")

    # Detailed tasks
    doc.append("\n## Tareas (detalle)\n")

    current_category = None
    for t in tasks:
        cat = (t.category or "(none)").strip()
        if cat != current_category:
            current_category = cat
            doc.append(f"\n### Categoría: {current_category}\n")

        doc.append(f"\n#### {t.id} — {t.name} ({t.difficulty})\n")

        if t.expected_criteria:
            doc.append("Criterios esperados:\n")
            for c in t.expected_criteria:
                doc.append(f"- {c}")
            doc.append("")

        doc.append("Prompt (tal como se envía al modelo):\n")
        doc.append(_safe_text_block(t.prompt))

    out_path.write_text("\n".join(doc).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
