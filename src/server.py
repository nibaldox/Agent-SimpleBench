from fastapi import FastAPI, WebSocket, Body, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import List, Optional
import threading
import os
import time
import json
from pathlib import Path
import uuid
from benchmarks.eval_cases import TASKS
from src.run_benchmark import BenchmarkRunner
from src.agent import BenchmarkAgent
from src.config import Config
from src.utils.toon_adapter import encode_for_prompt
from pydantic import BaseModel

app = FastAPI()

UPLOAD_DIR = Path.cwd() / "workspace" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Simple in-memory session store: {session_id: {history: [...], attachments: [...]}}
SESSION_STORE = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()
loop = None


def summarize_history(history, keep_last=6, max_chars=1200):
    """Naive summarization: compress older turns into one system message and keep last N turns."""
    if len(history) <= keep_last:
        return history
    older = history[:-keep_last]
    recent = history[-keep_last:]
    # Build a compact text summary from older turns
    summary_text = " | ".join([f"{m['role']}: {m.get('content','')}" for m in older])
    summary_text = (summary_text[:max_chars] + "…") if len(summary_text) > max_chars else summary_text
    summary_msg = {"role": "system", "content": f"Context summary: {summary_text}"}
    return [summary_msg, *recent]


def estimate_tokens(text: str) -> int:
    """Rough token estimate (chars/4) to surface basic metrics without tokenizer deps."""
    if not text:
        return 0
    return max(1, int(len(text) / 4))

@app.on_event("startup")
async def startup_event():
    global loop
    loop = asyncio.get_running_loop()
    print(f"DEBUG: Event loop captured: {loop}")

stop_event = threading.Event()


@app.post("/api/files")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload one or more files and store them under workspace/uploads.
    Returns file_ids (filenames) to be referenced from the chat payload.
    """
    saved = []
    for f in files:
        safe_name = f.filename.replace("..", "_").replace("/", "_").replace("\\", "_")
        timestamp = int(time.time() * 1000)
        target_name = f"{timestamp}_{safe_name}"
        target_path = UPLOAD_DIR / target_name
        with open(target_path, "wb") as out:
            out.write(await f.read())
        saved.append({
            "file_id": target_name,
            "name": safe_name,
            "size": target_path.stat().st_size,
            "path": str(target_path)
        })
    return {"files": saved}

def run_benchmark_thread(model_id: str, difficulty: str, enable_tools: bool, task_id: str = None, language: str = "english"):
    """Runs the benchmark in a separate thread and pushes logs to websockets."""
    print(f"DEBUG: Benchmark Thread Started. Model: {model_id}, Defaults: {difficulty}, Tools: {enable_tools}, Language: {language}")
    
    # Clear stop event at start
    stop_event.clear()
    
    try:
        def callback(msg):
            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(manager.broadcast(msg), loop)
            else:
                print("ERROR: Event loop is not running")

        runner = BenchmarkRunner(
            log_callback=callback,
            model_id=model_id,
            difficulty=difficulty,
            enable_tools=enable_tools,
            stop_event=stop_event,
            task_id=task_id,
            language=language
        )
        runner.run()
        print("DEBUG: Benchmark Thread Finished")
    except Exception as e:
        print(f"ERROR in Benchmark Thread: {e}")
        import traceback
        traceback.print_exc()

@app.post("/api/stop")
async def stop_benchmark():
    """Signals the running benchmark to stop."""
    print("DEBUG: Received STOP request")
    stop_event.set()
    return {"status": "stopping", "message": "Benchmark stop signal sent."}



@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print("DEBUG: WebSocket Connected")
    try:
        while True:
            await websocket.receive_text()
    except Exception as e:
        print(f"DEBUG: WebSocket Disconnected: {e}")
        manager.disconnect(websocket)

@app.websocket("/ws/chat")
async def chat_websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print("DEBUG: Chat WebSocket Connected")
    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)

            # Stop signal from frontend
            if data.get("type") == "stop":
                setattr(websocket, "stop_flag", True)
                await websocket.send_json({"type": "chat_end"})
                continue
            
            user_message = data.get("message")
            model_id = data.get("model")
            # Legacy boolean support, defaults to True if not present, but tools_config takes precedence
            enable_tools = data.get("enable_tools", True) 
            # Granular config
            tools_config = data.get("tools_config")
            language = data.get("language", "english")
            attachments = data.get("files", [])  # list of file_ids (filenames in uploads)
            session_id = data.get("session_id") or "default"
            prefer_toon = data.get("prefer_toon")
            trace_enabled = data.get("trace", False)
            
            if not user_message:
                continue
                
            print(f"DEBUG: Chat Request - Session: {session_id}, Config: {tools_config}, Language: {language}")

            # Load or init session state
            session_state = SESSION_STORE.get(session_id, {"history": [], "attachments": []})
            chat_history = session_state.get("history", [])
            
            # Language instruction mapping
            language_instructions = {
                "english": "Respond in English.",
                "spanish": "Responde en español.",
                "french": "Répondez en français.",
                "german": "Antworten Sie auf Deutsch.",
                "italian": "Rispondi in italiano.",
                "portuguese": "Responda em português.",
                "dutch": "Antwoord in het Nederlands.",
                "polish": "Odpowiedz po polsku.",
                "turkish": "Türkçe cevap verin.",
                "swedish": "Svara på svenska.",
                "arabic": "أجب باللغة العربية.",
                "hindi": "हिन्दी में उत्तर दें।",
                "chinese": "请用中文回答。",
                "japanese": "日本語で答えてください.",
                "korean": "한국어로 답변해 주세요.",
                "russian": "Отвечайте на русском языке.",
                "greek": "Απαντήστε στα ελληνικά.",
                "danish": "Svar på dansk.",
                "norwegian": "Svar på norsk.",
                "finnish": "Vastaa suomeksi."
            }
            
            # Append language instruction to message
            language_instruction = language_instructions.get(language.lower(), "")
            enhanced_message = user_message
            if language_instruction:
                enhanced_message = f"{user_message}\n\n{language_instruction}"

            if attachments:
                attached_text = "\n\nAttached files (workspace/uploads):\n" + "\n".join([f"- {a}" for a in attachments])
                enhanced_message = f"{enhanced_message}{attached_text}"

            # Update session attachments (union)
            session_attachments = set(session_state.get("attachments", []))
            for a in attachments:
                session_attachments.add(a)
            session_state["attachments"] = list(session_attachments)

            # Update chat history
            chat_history.append({"role": "user", "content": user_message})
            chat_history = summarize_history(chat_history, keep_last=8, max_chars=1200)

            # Build a compact structured transcript (optionally TOON) to give the agent conversational memory
            use_toon = prefer_toon if prefer_toon is not None else Config.ENABLE_TOON
            history_payload = {
                "turns": chat_history,
                "attachments": list(session_attachments),
                "language": language
            }
            history_block, history_format = encode_for_prompt(history_payload, prefer_toon=use_toon)
            enhanced_message = (
                f"Conversation context ({history_format.upper()}):\n"
                f"```{history_format}\n{history_block}\n```\n"
                f"Assistant, continue the dialogue.\nUser: {enhanced_message}"
            )

            prompt_tokens_est = estimate_tokens(enhanced_message)
            
            # Persist agent per websocket; re-create only if config changes
            reuse_agent = False
            agent_state = getattr(websocket, "agent_state", None)
            if agent_state:
                reuse_agent = (
                    agent_state.get("model_id") == model_id
                    and agent_state.get("enable_tools") == enable_tools
                    and agent_state.get("tools_config") == tools_config
                )

            if reuse_agent:
                agent = agent_state["agent"]
            else:
                agent = BenchmarkAgent(
                    model_id=model_id,
                    enable_tools=enable_tools,
                    tools_config=tools_config
                )
                websocket.agent_state = {
                    "agent": agent,
                    "model_id": model_id,
                    "enable_tools": enable_tools,
                    "tools_config": tools_config,
                }
            
            # Streaming response
            try:
                stream = agent.get_response_stream(enhanced_message)
                
                full_response = ""
                usage_metrics = None
                start_time = time.time()
                trace_step = 0

                def emit_trace(payload: dict):
                    if trace_enabled:
                        asyncio.run_coroutine_threadsafe(
                            websocket.send_json({"type": "trace", **payload}),
                            loop
                        )
                for chunk in stream:
                    # Agno RunResponse may expose text as content, output_text, or delta; coerce to string if present
                    content = None
                    if hasattr(chunk, "content") and chunk.content:
                        content = chunk.content
                    elif hasattr(chunk, "output_text") and chunk.output_text:
                        content = chunk.output_text
                    elif hasattr(chunk, "delta") and chunk.delta:
                        content = chunk.delta

                    if isinstance(content, str) and content.strip():
                        # Treat as delta (append) for smoother streaming
                        await websocket.send_json({
                            "type": "chat_chunk",
                            "content": content,
                            "mode": "append",
                            "is_tool": False
                        })
                        full_response = (full_response or "") + content

                        trace_step += 1
                        emit_trace({
                            "step": trace_step,
                            "phase": "thought",
                            "text": content,
                            "timestamp": time.time()
                        })

                    # Capture token usage if exposed by the provider
                    # Common patterns: chunk.usage or chunk.token_usage with keys prompt_tokens/completion_tokens/total_tokens
                    if usage_metrics is None:
                        candidate = None
                        if hasattr(chunk, "usage") and chunk.usage:
                            candidate = chunk.usage
                        elif hasattr(chunk, "token_usage") and chunk.token_usage:
                            candidate = chunk.token_usage
                        if isinstance(candidate, dict):
                            usage_metrics = {
                                "prompt_tokens": candidate.get("prompt_tokens"),
                                "completion_tokens": candidate.get("completion_tokens"),
                                "total_tokens": candidate.get("total_tokens")
                            }

                    # Tool call tracing if present on chunk
                    try:
                        tool_calls = None
                        if hasattr(chunk, "tool_calls") and chunk.tool_calls:
                            tool_calls = chunk.tool_calls
                        elif hasattr(chunk, "message") and hasattr(chunk.message, "tool_calls") and chunk.message.tool_calls:
                            tool_calls = chunk.message.tool_calls
                        if tool_calls:
                            for tc in tool_calls:
                                trace_step += 1
                                emit_trace({
                                    "step": trace_step,
                                    "phase": "tool",
                                    "tool": getattr(tc, "name", None) or getattr(tc, "type", None) or "tool",
                                    "args": getattr(tc, "arguments", None) or getattr(tc, "args", None),
                                    "timestamp": time.time()
                                })
                    except Exception as trace_err:
                        print(f"DEBUG: trace tool parse error: {trace_err}")

                    # Respect stop flag mid-stream
                    if getattr(websocket, "stop_flag", False):
                        break
                    
                    # Check for tools? Agno stream might include tool calls in debug/messages?
                    # For now, let's just stream text.
                
                # Prefer provider usage; fall back to estimation
                if usage_metrics and any(v is not None for v in usage_metrics.values()):
                    prompt_tokens_val = usage_metrics.get("prompt_tokens")
                    completion_tokens_val = usage_metrics.get("completion_tokens")
                    total_tokens_val = usage_metrics.get("total_tokens")
                else:
                    prompt_tokens_val = prompt_tokens_est
                    completion_tokens_val = estimate_tokens(full_response)
                    total_tokens_val = prompt_tokens_val + completion_tokens_val

                duration_s = max(0.001, time.time() - start_time)
                tokens_per_sec = total_tokens_val / duration_s if total_tokens_val is not None else None

                await websocket.send_json({
                    "type": "chat_end",
                    "metrics": {
                        "prompt_tokens": prompt_tokens_val,
                        "completion_tokens": completion_tokens_val,
                        "total_tokens": total_tokens_val,
                        "duration_seconds": duration_s,
                        "tokens_per_second": tokens_per_sec
                    }
                })

                if trace_enabled:
                    trace_step += 1
                    emit_trace({
                        "step": trace_step,
                        "phase": "result",
                        "text": full_response,
                        "timestamp": time.time()
                    })

                # Persist assistant message in history for future turns
                chat_history.append({"role": "assistant", "content": full_response})
                session_state["history"] = chat_history
                SESSION_STORE[session_id] = session_state
                setattr(websocket, "stop_flag", False)
                
            except Exception as e:
                print(f"ERROR in Chat Generation: {e}")
                await websocket.send_json({"type": "error", "message": str(e)})

    except Exception as e:
        print(f"DEBUG: Chat WebSocket Disconnected: {e}")
        manager.disconnect(websocket)

class StartRequest(BaseModel):
    model_id: Optional[str] = None
    difficulty: Optional[str] = "Medium"
    enable_tools: Optional[bool] = True
    task_id: Optional[str] = None
    language: Optional[str] = "english"
    language: Optional[str] = "english"

@app.post("/api/start")
async def start_benchmark(request: StartRequest):
    """Starts the benchmark process in the background."""
    print(f"DEBUG: Received start request: {request}")
    
    # Use default model from config if not provided, else verify it exists
    # For now, we trust the model_id string or fallback
    target_model = request.model_id or Config.DEFAULT_MODEL_ID
    
    print(f"DEBUG: Spawning thread for {target_model} with language={request.language}...")
    try:
        thread = threading.Thread(
            target=run_benchmark_thread, 
            args=(target_model, request.difficulty, request.enable_tools, request.task_id, request.language)
        )
        thread.start()
        print("DEBUG: Thread started successfully via threading.Thread")
    except Exception as e:
        print(f"ERROR: Failed to start thread: {e}")
        return {"status": "error", "message": f"Thread launch failed: {e}"}

    return {"status": "started", "message": f"Benchmark started with {target_model} ({request.difficulty})"}

@app.get("/api/config")
async def get_config():
    """Returns available models and difficulties for the frontend."""
    categories = sorted({t.category for t in TASKS if getattr(t, "category", None)})
    return {
        "models": Config.get_available_models(),
        "difficulties": ["All", *Config.DIFFICULTY_LEVELS],
        "categories": ["All", *categories],
        "tasks": [
            {"id": t.id, "name": t.name, "difficulty": t.difficulty, "category": t.category}
            for t in TASKS
        ],
    }


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Returns full task details for a specific task_id."""
    task = next((t for t in TASKS if t.id == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": task.id,
        "name": task.name,
        "prompt": task.prompt,
        "expected_criteria": task.expected_criteria,
        "category": task.category,
        "difficulty": task.difficulty,
    }

@app.get("/api/reports")
async def list_reports():
    """Lists available benchmark reports."""
    results_dir = Config.RESULTS_DIR or "benchmarks/results"
    reports = []
    
    if os.path.exists(results_dir):
        # List all JSON files
        files = [f for f in os.listdir(results_dir) if f.endswith('.json')]
        # Sort by modification time (newest first)
        files.sort(key=lambda x: os.path.getmtime(os.path.join(results_dir, x)), reverse=True)
        
        for f in files:
            path = os.path.join(results_dir, f)
            timestamp = os.path.getmtime(path)
            # Try to read basic info without parsing entire huge files if possible, 
            # but for now we'll just send metadata
            reports.append({
                "filename": f,
                "timestamp": timestamp,
                "date": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
            })
            
    return {"reports": reports}

@app.get("/api/reports/{filename}")
async def get_report(filename: str):
    """Retrieves a specific benchmark report."""
    results_dir = Config.RESULTS_DIR or "benchmarks/results"
    filepath = os.path.join(results_dir, filename)
    
    if not os.path.exists(filepath):
        # Security check: ensure we don't traverse up
        return {"error": "File not found"}
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        return {"error": f"Failed to load report: {str(e)}"}

class CreateTaskRequest(BaseModel):
    name: str
    prompt: str
    expected_criteria: List[str]
    difficulty: str = "Medium"

@app.post("/api/tasks")
async def create_task(task: CreateTaskRequest):
    """Creates a new user-defined task and saves it to user_tasks.json."""
    try:
        # Create user tasks file if it doesn't exist
        user_tasks_path = os.path.join(os.path.dirname(__file__), '..', 'benchmarks', 'data', 'user_tasks.json')
        os.makedirs(os.path.dirname(user_tasks_path), exist_ok=True)
        
        current_tasks = []
        if os.path.exists(user_tasks_path):
            try:
                with open(user_tasks_path, 'r', encoding='utf-8') as f:
                    current_tasks = json.load(f)
            except:
                current_tasks = []
        
        new_task = {
            "id": f"USER-{int(time.time())}",
            "name": task.name,
            "prompt": task.prompt,
            "expected_criteria": task.expected_criteria,
            "category": "user-defined",
            "difficulty": task.difficulty
        }
        
        current_tasks.append(new_task)
        
        with open(user_tasks_path, 'w', encoding='utf-8') as f:
            json.dump(current_tasks, f, indent=4)
            
        # Update in-memory list
        from benchmarks.eval_cases import TASKS, BenchmarkTask
        TASKS.append(BenchmarkTask(**new_task))
        
        return {"status": "success", "task_id": new_task["id"], "message": "Task created successfully"}
        
    except Exception as e:
        print(f"ERROR creating task: {e}")
        return {"status": "error", "message": str(e)}
