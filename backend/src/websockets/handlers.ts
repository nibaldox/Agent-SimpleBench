import { WebSocketServer, WebSocket } from 'ws';
import { manager } from './manager';
import { SessionState, WebSocketMessage, ChatMessage } from '../models/types';
import { summarizeHistory, estimateTokens, languageInstructions } from '../utils/helpers';

// In-memory session store
const SESSION_STORE: Map<string, SessionState> = new Map();

export function setupWebSocketHandlers(wss: WebSocketServer): void {
  // Main WebSocket endpoint for benchmark streaming
  wss.on('connection', (ws: WebSocket, req) => {
    const url = req.url || '';

    if (url.startsWith('/ws/chat')) {
      handleChatWebSocket(ws);
    } else if (url.startsWith('/ws')) {
      handleBenchmarkWebSocket(ws);
    }
  });
}

function handleBenchmarkWebSocket(ws: WebSocket): void {
  manager.connect(ws);

  ws.on('message', (message: string) => {
    console.log('DEBUG: Benchmark WebSocket received:', message);
  });

  ws.on('close', () => {
    manager.disconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('DEBUG: Benchmark WebSocket error:', error);
    manager.disconnect(ws);
  });
}

function handleChatWebSocket(ws: WebSocket): void {
  manager.connect(ws);
  console.log('DEBUG: Chat WebSocket Connected');

  let stopFlag = false;

  ws.on('message', async (message: string) => {
    try {
      const data: WebSocketMessage = JSON.parse(message);

      // Handle stop signal
      if (data.type === 'stop') {
        stopFlag = true;
        ws.send(JSON.stringify({ type: 'chat_end' }));
        return;
      }

      const userMessage = (data as any).message;
      const modelId = data.model || 'deepseek/deepseek-v3.2';
      const enableTools = data.enable_tools !== false;
      const toolsConfig = data.tools_config;
      const language = data.language || 'english';
      const roleId = data.role_id || 'generalist';
      const strictMode = data.strict_mode;
      const attachments = data.files || [];
      const sessionId = data.session_id || 'default';
      const preferToon = data.prefer_toon;
      const traceEnabled = data.trace || false;

      if (!userMessage) {
        return;
      }

      console.log(`DEBUG: Chat Request - Session: ${sessionId}, Language: ${language}`);

      // Load or initialize session state
      let sessionState = SESSION_STORE.get(sessionId);
      if (!sessionState) {
        sessionState = { history: [], attachments: [] };
        SESSION_STORE.set(sessionId, sessionState);
      }

      const chatHistory = sessionState.history;

      // Get language instruction
      const languageInstruction = languageInstructions[language.toLowerCase()] || '';
      let enhancedMessage = userMessage;

      if (languageInstruction) {
        enhancedMessage = `${userMessage}\n\n${languageInstruction}`;
      }

      // Add attachments info if present
      if (attachments.length > 0) {
        const attachedText = '\n\nAttached files (workspace/uploads):\n' +
          attachments.map((a: string) => `- ${a}`).join('\n');
        enhancedMessage = `${enhancedMessage}${attachedText}`;
      }

      // Update session attachments
      const sessionAttachments = new Set(sessionState.attachments);
      attachments.forEach((a: string) => sessionAttachments.add(a));
      sessionState.attachments = Array.from(sessionAttachments);

      // Update chat history
      chatHistory.push({ role: 'user', content: userMessage });
      const summarizedHistory = summarizeHistory(chatHistory, 8, 1200);

      // Build context
      const historyContext = summarizedHistory
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      enhancedMessage = `Conversation context:\n${historyContext}\n\nAssistant, continue the dialogue.\nUser: ${enhancedMessage}`;

      const promptTokensEst = estimateTokens(enhancedMessage);

      // TODO: Integrate with actual agent/model
      // For now, simulate a response
      const startTime = Date.now();
      const simulatedResponse = `This is a simulated response to: "${userMessage}". The TypeScript backend is working! Model: ${modelId}, Language: ${language}`;

      // Send response chunks (simulate streaming)
      const words = simulatedResponse.split(' ');
      for (const word of words) {
        if (stopFlag) break;

        ws.send(JSON.stringify({
          type: 'chat_chunk',
          content: word + ' ',
          mode: 'append',
          is_tool: false
        }));

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const duration = (Date.now() - startTime) / 1000;
      const completionTokensEst = estimateTokens(simulatedResponse);
      const totalTokensEst = promptTokensEst + completionTokensEst;

      // Send end message with metrics
      ws.send(JSON.stringify({
        type: 'chat_end',
        metrics: {
          prompt_tokens: promptTokensEst,
          completion_tokens: completionTokensEst,
          total_tokens: totalTokensEst,
          duration_seconds: duration,
          tokens_per_second: duration > 0 ? totalTokensEst / duration : 0
        }
      }));

      // Persist assistant message
      chatHistory.push({ role: 'assistant', content: simulatedResponse });
      sessionState.history = chatHistory;
      stopFlag = false;

    } catch (error) {
      console.error('ERROR in Chat Generation:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: String(error)
      }));
    }
  });

  ws.on('close', () => {
    console.log('DEBUG: Chat WebSocket Disconnected');
    manager.disconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('DEBUG: Chat WebSocket error:', error);
    manager.disconnect(ws);
  });
}
