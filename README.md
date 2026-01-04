# Agent SimpleBench

Benchmark + demo web para evaluar LLMs con un agente (herramientas opcionales), y ver resultados en un dashboard.

## Qué incluye

- **Backend (FastAPI)**: API + WebSocket para logs, ejecución de benchmarks y chat.  
  Entry: `src/server.py`
- **Frontend (React + Vite)**: UI para chat/benchmarks/resultados.  
  Carpeta: `web/`
- **Benchmark suite**: casos en `benchmarks/eval_cases.py`.

## Requisitos

- Python 3.10+ (recomendado 3.11)
- Node.js 18+ (para `web/`)
- (Opcional) **LM Studio** corriendo con API OpenAI-compatible en `http://localhost:1234`
- (Opcional) **Ollama** instalado y con modelos descargados
- (Opcional) API keys:
  - `OPENROUTER_API_KEY` (para modelos cloud via OpenRouter)
  - `SERPER_API_KEY` (para habilitar búsqueda web con Serper)

## Quickstart (Windows)

### 1) Backend

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Iniciar API
python -m uvicorn src.server:app --reload --port 8000
```

### 2) Frontend

```powershell
cd web
npm install
npm run dev
```

Abrir:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

### Atajo: iniciar todo

Si estás en Windows, puedes usar:

```powershell
.\start_app.ps1
```

## Configuración (.env)

Crea un archivo `.env` en la raíz (opcional) con tus variables:

```env
# OpenRouter (cloud)
OPENROUTER_API_KEY=...

# Serper (web search)
SERPER_API_KEY=...

# LM Studio (OpenAI-compatible)
LMSTUDIO_BASE_URL=http://localhost:1234/v1

# Debug
DEBUG_MODE=True

# Toon formatting (opcional)
ENABLE_TOON=false
```

Notas:
- Si no defines `OPENROUTER_API_KEY`, igual puedes usar **LM Studio** y/o **Ollama**.
- Para más detalles de LM Studio: ver `LM_STUDIO_SETUP.md`.

## Cómo correr benchmarks

La suite de tareas está en `benchmarks/eval_cases.py`. El runner escribe resultados en `benchmarks/results/`.

Ejemplo (runner por defecto):

```powershell
python src/run_benchmark.py
```

En la UI, también puedes lanzar benchmarks seleccionando modelo/dificultad.

## Proveedores de modelo soportados

- **OpenRouter**: modelos cloud (requiere `OPENROUTER_API_KEY`).
- **Ollama**: modelos locales detectados dinámicamente.
- **LM Studio**: modelos locales detectados dinámicamente vía `LMSTUDIO_BASE_URL`.

## Estructura

- `src/server.py`: FastAPI + WebSocket
- `src/run_benchmark.py`: BenchmarkRunner (genera `.json` y `.md` en resultados)
- `src/agent.py`: Agente (Agno) y herramientas
- `benchmarks/eval_cases.py`: tareas y criterios de evaluación
- `web/`: frontend (React/Vite)

## Troubleshooting

- Si Git en Windows falla con un archivo llamado `nul`, es un nombre reservado. Este repo lo ignora por defecto en `.gitignore`.
- Si no aparecen modelos de LM Studio: verifica `http://localhost:1234/v1/models`.
- Si no aparecen modelos de Ollama: verifica `ollama list`.
