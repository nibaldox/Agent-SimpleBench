from pathlib import Path
from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from agno.models.ollama import Ollama
from agno.models.openai import OpenAIChat
from agno.tools.serper import SerperTools
from agno.tools.file import FileTools
from agno.tools.shell import ShellTools
from src.config import Config
from src.roles import get_role_profile

class BenchmarkAgent:
    def __init__(
        self,
        model_id: str = None,
        enable_tools: bool = True,
        tools_config: dict = None,
        role_id: str | None = None,
        strict_mode: bool | None = None,
    ):
        self.model_id = model_id or Config.DEFAULT_MODEL_ID
        self.enable_tools = enable_tools
        self.role_id = role_id or "generalist"
        self.strict_mode = strict_mode
        # Default config if not provided but tools are enabled
        if enable_tools and not tools_config:
            self.tools_config = {
                "web_search": True,
                "file_system": True,
                "shell": True # Legacy default, but maybe we should default to False? keeping True for consistency
            }
        elif not enable_tools:
            self.tools_config = {}
        else:
            self.tools_config = tools_config

        self.agent = self._create_agent()
    
    # ... (rest of class)

    def _create_agent(self) -> Agent:
        agent_tools = []

        role = get_role_profile(self.role_id)
        strict_enabled = bool(self.strict_mode) if self.strict_mode is not None else (self.role_id in {"researcher", "legal_policy"})

        strict_instructions = []
        if strict_enabled:
            strict_instructions = [
                "Strict mode (sources & claims):",
                "- If you make factual claims that are not obvious/common knowledge (especially numbers, dates, specs, prices), include a 'Sources:' section.",
                "- 'Sources:' must be the final section and contain bullet lines with ONLY a single http(s) URL per line (no extra text).",
                "- Do not cite sources without a URL; do not fabricate citations.",
                "- If you cannot find/verify a claim, say 'Insufficient evidence' and propose what to check next.",
            ]
        role_instructions = [
            f"Role: {role.name}",
            f"Tagline: {role.tagline}",
            f"Biography: {role.biography}",
            "Experience:",
            *[f"- {x}" for x in role.experience],
            "Personality:",
            *[f"- {x}" for x in role.personality],
            "Working style:",
            *[f"- {x}" for x in role.working_style],
            "Communication:",
            *[f"- {x}" for x in role.communication],
            "Rules:",
                "- Do not claim a real-world identity, personal history, or lived experience.",
            "- Stay consistent with the role unless the user explicitly requests a different style.",
        ]
        
        # 1. File System Tools (Safe Absolute Path)
        if self.tools_config.get("file_system", False):
            # Enforce absolute path to workspace directory
            workspace_path = Path.cwd() / "workspace"
            workspace_path.mkdir(exist_ok=True)
            agent_tools.append(FileTools(base_dir=workspace_path))

        # 2. Shell Tools (Caution)
        if self.tools_config.get("shell", False):
            agent_tools.append(ShellTools())

        # 3. Web Search (Serper)
        if self.tools_config.get("web_search", False):
            if Config.SERPER_API_KEY:
                agent_tools.append(SerperTools(api_key=Config.SERPER_API_KEY))
            else:
                print("WARNING: SERPER_API_KEY not found. Search capabilities disabled.")

        # Determine the model provider
        if self.model_id.startswith("ollama/"):
            # Extract actual model name (e.g., 'ollama/llama3.1' -> 'llama3.1')
            ollama_model = self.model_id.split("/", 1)[1]
            model = Ollama(id=ollama_model)
        elif self.model_id.startswith("lmstudio/"):
            # Extract actual model name (e.g., 'lmstudio/model-name' -> 'model-name')
            lmstudio_model = self.model_id.split("/", 1)[1]
            model = OpenAIChat(
                id=lmstudio_model,
                api_key="lm-studio",  # LM Studio doesn't require real API key
                base_url=Config.LMSTUDIO_BASE_URL
            )
        else:
            model = OpenRouter(
                id=self.model_id,
                api_key=Config.OPENROUTER_API_KEY,
            )

        return Agent(
            model=model,
            description=f"You are an AI agent operating in the role: {role.name}.",
            instructions=[
                "Reliability checkpoints (follow strictly):",
                "- Do not invent facts, numbers, quotes, code results, file contents, or sources.",
                "- If you are uncertain or missing information, say so explicitly and ask a targeted question or propose a safe next step.",
                "- When the user asks for sources, include them as http(s) URLs and keep claims attributable to those sources.",
                "- Never claim you ran commands, read files, or verified URLs unless you actually did so.",
                "- Before writing files or proposing commands: sanity-check assumptions and list risks/side-effects when relevant.",
                "- Prefer small, verifiable steps; validate outputs after changes when possible.",
                *strict_instructions,
                "\n".join(role_instructions),
            ],
            tools=agent_tools,
            markdown=True,
            debug_mode=Config.DEBUG_MODE,
        )

    def run(self, message: str, stream: bool = True):
        return self.agent.print_response(message, stream=stream)

    def get_response(self, message: str):
        return self.agent.run(message)

    def get_response_stream(self, message: str):
        """Yields streaming response chunks."""
        return self.agent.run(message, stream=True)
