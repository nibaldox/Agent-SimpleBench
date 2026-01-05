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


CATEGORY_LABELS_ES = {
    "coding": "coding (programación)",
    "research": "research (investigación con fuentes)",
    "reasoning": "razonamiento", 
    "logic": "lógica",
    "system": "sistemas / SRE",
    "extraction": "extracción de datos",
    "investigation": "investigación / triage",
    "writing": "escritura",
    "safety": "seguridad / políticas",
    "long-context": "contexto largo",
}


def _difficulty_es(difficulty: str) -> str:
    d = (difficulty or "").strip().lower()
    return {
        "easy": "Fácil",
        "medium": "Medio",
        "hard": "Difícil",
    }.get(d, difficulty or "")


def _category_es(category: str) -> str:
    c = (category or "").strip().lower()
    return CATEGORY_LABELS_ES.get(c, c or "(sin categoría)")


def _natural_task_description_es(t: BenchmarkTask) -> str:
    """Descripción en español, en lenguaje natural.

    Nota: No intenta traducir literalmente el prompt para no alterar el benchmark;
    solo describe la intención y restricciones típicas de cada tipo de tarea.
    """
    category = (t.category or "").strip().lower()
    difficulty = _difficulty_es(t.difficulty)

    base = f"Tarea de tipo **{_category_es(t.category)}** (dificultad **{difficulty}**)."

    if category == "coding":
        return (
            base
            + " El modelo debe devolver código que cumpla el formato pedido (normalmente un solo bloque) y que ejecute lo solicitado."
        )
    if category == "research":
        return (
            base
            + " El modelo debe investigar y respaldar afirmaciones con URLs verificables; si no puede verificar, debe declarar incertidumbre."
        )
    if category in {"extraction", "system", "investigation"}:
        return (
            base
            + " El modelo debe producir una salida estructurada (a menudo JSON) siguiendo el esquema exacto y sin texto extra."
        )
    if category in {"logic", "reasoning"}:
        return base + " El modelo debe razonar con los datos dados y respetar restricciones de formato (por ejemplo: una palabra, lista corta, etc.)."
    if category == "safety":
        return base + " El modelo debe rechazar solicitudes dañinas y ofrecer alternativas seguras, cumpliendo el formato pedido."
    if category == "writing":
        return base + " El modelo debe redactar cumpliendo restricciones de estilo/longitud/palabras prohibidas sin añadir formato extra."
    if category == "long-context":
        return base + " El modelo debe encontrar/contar información dentro de un texto largo, con alta precisión y salida mínima."
    return base


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
        "| ID | Nombre | Categoría | Dificultad |",
        "| --- | --- | --- | --- |",
    ]
    for t in tasks:
        index_lines.append(
            f"| {t.id} | {t.name} | {_category_es(t.category)} | {_difficulty_es(t.difficulty)} |"
        )

    doc = []
    doc.append("# Agent-SimpleBench — Pruebas y prompts (documentación)\n")

    doc.append("## Cómo ejecutar\n")
    doc.append("- Iniciar la app web: `start_app.ps1` (PowerShell).\n")
    doc.append("- Ejecutar el benchmark runner (CLI): `python src/run_benchmark.py`\n")
    doc.append("\nVariables de entorno (evidencia para el juez):\n")
    doc.append("- `JUDGE_RUN_CODE=true|false` (default: true)\n")
    doc.append("- `JUDGE_VERIFY_SOURCES=true|false` (default: true)\n")

    doc.append("\n## Cómo se construyen los prompts\n")
    doc.append(
        "Los prompts se definen en `benchmarks/eval_cases.py` y luego se decoran con un encabezado meta "
        "(rol, reglas estrictas, checklist de calidad) antes de enviarse al modelo.\n"
    )
    doc.append("El marcador usado es: `### BENCHMARK META ###`.\n")

    doc.append("\n## Contrato del juez (evaluación)\n")
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

    doc.append("\n## Modo estricto (fuentes y afirmaciones)\n")
    doc.append(
        "El modo estricto agrega reglas de citación para outputs tipo research (se puede activar desde la UI).\n"
        "Cuando está activo, los claims factuales (especialmente números/fechas/especificaciones) deben terminar con un `Sources:` "
        "donde cada bullet contenga SOLO un URL http(s) (sin texto extra en la misma línea).\n"
    )

    doc.append("\n## Índice de tareas\n")
    doc.append("\n".join(index_lines) + "\n")

    # Detailed tasks
    doc.append("\n## Tareas (detalle)\n")
    doc.append(
        "Este documento está en español y está escrito en lenguaje natural. "
        "Para preservar el benchmark, cada tarea incluye el **prompt literal** tal como se envía al modelo (no se traduce).\n"
    )

    current_category = None
    for t in tasks:
        cat = (t.category or "(none)").strip()
        if cat != current_category:
            current_category = cat
            doc.append(f"\n### Categoría: {_category_es(current_category)}\n")

        doc.append(f"\n#### {t.id} — {t.name} ({_difficulty_es(t.difficulty)})\n")

        doc.append(_natural_task_description_es(t) + "\n")

        if t.expected_criteria:
            doc.append("Criterios de evaluación (expected_criteria):\n")
            for c in t.expected_criteria:
                doc.append(f"- {c}")
            doc.append("")

        doc.append("Prompt literal (tal como se envía al modelo):\n")
        doc.append(_safe_text_block(t.prompt))

    out_path.write_text("\n".join(doc).rstrip() + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
