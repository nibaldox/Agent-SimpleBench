# LM Studio Setup Guide

## 🚀 Quick Setup

### 1. Download and Install LM Studio
- Download from: https://lmstudio.ai/
- Install and launch the application

### 2. Load a Model
1. Open LM Studio
2. Go to the "Discover" tab
3. Search and download your preferred model (e.g., `DeepSeek-V3-Chat`, `Qwen2.5`, `Llama-3.1`, etc.)
4. Wait for the download to complete

### 3. Start the Local Server
1. Go to the "Local Server" tab in LM Studio
2. Select the model you want to serve
3. Click "Start Server"
4. Verify the server is running at `http://localhost:1234`

### 4. Configure AgentBench (Optional)
If LM Studio is running on a different port or host:

Edit your `.env` file:
```env
LMSTUDIO_BASE_URL=http://localhost:YOUR_PORT/v1
```

Default is `http://localhost:1234/v1`

### 5. Use in AgentBench
1. Start AgentBench backend: `python -m src.server`
2. Start frontend: `cd web && npm run dev`
3. Open the web interface
4. In the model selector, you'll see models prefixed with "LM Studio:"
5. Select any LM Studio model and run benchmarks or chat!

## 🔍 Troubleshooting

### Models not appearing?
- Verify LM Studio server is running (check `http://localhost:1234/v1/models` in browser)
- Check backend logs for connection errors
- Ensure firewall is not blocking localhost connections

### Model fails to respond?
- Check LM Studio logs for errors
- Verify model is properly loaded in LM Studio
- Try restarting the LM Studio server

### Performance issues?
- LM Studio models run locally, performance depends on your hardware
- Larger models require more RAM/VRAM
- Consider using quantized models (e.g., Q4, Q5) for better performance

## 📋 Recommended Models

For best performance with AgentBench tasks:

- **DeepSeek-V3-Chat** (excellent reasoning)
- **Qwen2.5-7B/14B** (good balance)
- **Llama-3.1-8B** (fast and capable)
- **Mistral-7B** (good for coding tasks)

## 🔗 API Compatibility

LM Studio exposes an OpenAI-compatible API, so all standard features work:
- ✅ Chat completions
- ✅ Streaming responses
- ✅ Token usage tracking
- ✅ Multiple model support

---

**Note:** LM Studio models appear automatically when the server is running. No manual configuration needed!
