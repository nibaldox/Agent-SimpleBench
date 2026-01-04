from pathlib import Path
from agno.agent import Agent
from agno.models.openrouter import OpenRouter
from agno.models.ollama import Ollama
from agno.models.openai import OpenAIChat
from agno.tools.serper import SerperTools
from agno.tools.file import FileTools
from agno.tools.shell import ShellTools
from src.config import Config

class BenchmarkAgent:
    def __init__(self, model_id: str = None, enable_tools: bool = True, tools_config: dict = None):
        self.model_id = model_id or Config.DEFAULT_MODEL_ID
        self.enable_tools = enable_tools
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
            description="You are a general purpose AI agent designed to execute tasks.",
            instructions=[
                "You are an agnostic AI Agent.",
                "Your goal is to complete tasks accurately and efficiently.",
                "You have granular access to tools based on configuration.",
                "Always verify your actions if they involve writing files or running commands.",
                "If you need to search the web, use Serper.",
                "Provide concise and direct answers.",
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
