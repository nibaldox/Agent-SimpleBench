import os
import ollama
import requests
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    SERPER_API_KEY = os.getenv("SERPER_API_KEY")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "True").lower() == "true"
    LMSTUDIO_BASE_URL = os.getenv("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    ENABLE_TOON = os.getenv("ENABLE_TOON", "false").lower() == "true"
    
    # Model Definitions
    DEFAULT_MODEL_ID = "deepseek/deepseek-v3.2"
    
    @classmethod
    def get_lmstudio_models(cls):
        """Fetches available models from LM Studio."""
        try:
            response = requests.get(f"{cls.LMSTUDIO_BASE_URL}/models", timeout=2)
            if response.status_code == 200:
                data = response.json()
                models = {}
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    if model_id:
                        # Use readable name as key, lmstudio/id as value
                        key = f"LM Studio: {model_id}"
                        val = f"lmstudio/{model_id}"
                        models[key] = val
                return models
        except Exception as e:
            print(f"DEBUG: Could not fetch LM Studio models: {e}")
        return {}
    
    @classmethod
    def get_available_models(cls):
        """Returns a merged dictionary of cloud and local (Ollama + LM Studio) models."""
        models = {
            # --- OPENROUTER (CLOUD) ---
            "Xiaomi MiMo V2 Flash": "xiaomi/mimo-v2-flash:free",
            "Alibaba Tongyi DeepResearch": "alibaba/tongyi-deepresearch-30b-a3b:free",
            "OpenAI GPT-OSS 120B": "openai/gpt-oss-120b:free",
            "Z-AI GLM 4.5 Air": "z-ai/glm-4.5-air:free",
            "Qwen 3 235B": "qwen/qwen3-235b-a22b:free",
            "Google Gemma 3 27B IT": "google/gemma-3-27b-it:free",
            "Nvidia Nemotron 30B": "nvidia/nemotron-3-nano-30b-a3b:free",
            "Mistral Small 24B Instruct": "mistralai/mistral-small-3.1-24b-instruct:free",
            "Moonshot AI Kimi k2": "moonshotai/kimi-k2:free",
            "DeepSeek V3.2": "deepseek/deepseek-v3.2",
            "deepseek-v3.1-nex-n1": "nex-agi/deepseek-v3.1-nex-n1:free",
            "Trinity-mini": "arcee-ai/trinity-mini:free",
            "Qwen 3 Coder": "qwen/qwen3-coder:free",
            "DeepHermes 3 Mistral 24B Preview": "nousresearch/deephermes-3-mistral-24b-preview:free"
        }

        # --- DYNAMIC OLLAMA MODELS ---
        try:
            local_models = ollama.list()
            for m in local_models.models:
                # Use the full name as key and 'ollama/name' as value
                key = f"Ollama: {m.model}"
                val = f"ollama/{m.model}"
                models[key] = val
        except Exception as e:
            print(f"DEBUG: Could not fetch Ollama models: {e}")

        # --- DYNAMIC LM STUDIO MODELS ---
        lmstudio_models = cls.get_lmstudio_models()
        models.update(lmstudio_models)

        return models

    # For backward compatibility if needed, but the server should use the method
    AVAILABLE_MODELS = property(lambda self: self.get_available_models())
    
    DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]
    RESULTS_DIR = "benchmarks/results"
