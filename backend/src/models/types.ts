export interface BenchmarkTask {
  id: string;
  name: string;
  prompt: string;
  expected_criteria: string[];
  category: string;
  difficulty: string;
}

export interface StartRequest {
  model_id?: string;
  difficulty?: string;
  enable_tools?: boolean;
  task_id?: string;
  language?: string;
}

export interface CreateTaskRequest {
  name: string;
  prompt: string;
  expected_criteria: string[];
  difficulty: string;
}

export interface SessionState {
  history: ChatMessage[];
  attachments: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface WebSocketMessage {
  type: 'chat_chunk' | 'chat_end' | 'error' | 'trace' | 'stop';
  content?: string;
  message?: string;
  metrics?: TokenMetrics;
  model?: string;
  enable_tools?: boolean;
  tools_config?: any;
  language?: string;
  role_id?: string;
  strict_mode?: boolean;
  files?: string[];
  session_id?: string;
  prefer_toon?: boolean;
  trace?: boolean;
  mode?: string;
  is_tool?: boolean;
}

export interface TokenMetrics {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  duration_seconds?: number;
  tokens_per_second?: number;
}

export interface FileUploadResponse {
  files: {
    file_id: string;
    name: string;
    size: number;
    path: string;
  }[];
}

export interface ReportMetadata {
  filename: string;
  timestamp: number;
  date: string;
}

export interface ConfigResponse {
  models: string[];
  roles: any[];
  difficulties: string[];
  categories: string[];
  tasks: {
    id: string;
    name: string;
    difficulty: string;
    category: string;
  }[];
}
