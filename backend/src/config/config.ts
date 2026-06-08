import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export class Config {
  static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  static SERPER_API_KEY = process.env.SERPER_API_KEY;
  static DEBUG_MODE = (process.env.DEBUG_MODE || 'true').toLowerCase() === 'true';
  static LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
  static ENABLE_TOON = (process.env.ENABLE_TOON || 'false').toLowerCase() === 'true';

  static DEFAULT_MODEL_ID = 'deepseek/deepseek-v3.2';
  static DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
  static RESULTS_DIR = 'benchmarks/results';

  static async getLMStudioModels(): Promise<Record<string, string>> {
    try {
      const response = await fetch(`${this.LMSTUDIO_BASE_URL}/models`, {
        signal: AbortSignal.timeout(2000)
      });

      if (response.ok) {
        const data = await response.json();
        const models: Record<string, string> = {};

        for (const model of data.data || []) {
          const modelId = model.id;
          if (modelId) {
            const key = `LM Studio: ${modelId}`;
            const val = `lmstudio/${modelId}`;
            models[key] = val;
          }
        }
        return models;
      }
    } catch (error) {
      console.log(`DEBUG: Could not fetch LM Studio models: ${error}`);
    }
    return {};
  }

  static async getAvailableModels(): Promise<Record<string, string>> {
    const models: Record<string, string> = {
      // --- OPENROUTER (CLOUD) ---
      'Xiaomi MiMo V2 Flash': 'xiaomi/mimo-v2-flash:free',
      'Alibaba Tongyi DeepResearch': 'alibaba/tongyi-deepresearch-30b-a3b:free',
      'OpenAI GPT-OSS 120B': 'openai/gpt-oss-120b:free',
      'Z-AI GLM 4.5 Air': 'z-ai/glm-4.5-air:free',
      'Qwen 3 235B': 'qwen/qwen3-235b-a22b:free',
      'Google Gemma 3 27B IT': 'google/gemma-3-27b-it:free',
      'Nvidia Nemotron 30B': 'nvidia/nemotron-3-nano-30b-a3b:free',
      'Mistral Small 24B Instruct': 'mistralai/mistral-small-3.1-24b-instruct:free',
      'Moonshot AI Kimi k2': 'moonshotai/kimi-k2:free',
      'DeepSeek V3.2': 'deepseek/deepseek-v3.2',
      'deepseek-v3.1-nex-n1': 'nex-agi/deepseek-v3.1-nex-n1:free',
      'Trinity-mini': 'arcee-ai/trinity-mini:free',
      'Qwen 3 Coder': 'qwen/qwen3-coder:free',
      'DeepHermes 3 Mistral 24B Preview': 'nousresearch/deephermes-3-mistral-24b-preview:free'
    };

    // --- DYNAMIC LM STUDIO MODELS ---
    const lmstudioModels = await this.getLMStudioModels();
    Object.assign(models, lmstudioModels);

    return models;
  }
}
