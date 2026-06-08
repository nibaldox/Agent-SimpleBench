# Backend TypeScript - Agent SimpleBench

Este es el backend refactorizado de Agent SimpleBench utilizando TypeScript, Express y WebSocket.

## Características

- ✅ **Express** - Servidor HTTP rápido y minimalista
- ✅ **WebSocket** - Comunicación bidireccional en tiempo real
- ✅ **TypeScript** - Tipado estático para mayor seguridad
- ✅ **API REST** - Endpoints para gestión de tareas, reportes y archivos
- ✅ **Streaming de Chat** - Respuestas de chat en tiempo real
- ✅ **Soporte Multiidioma** - 20+ idiomas soportados

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/          # Configuración de la aplicación
│   ├── models/          # Tipos e interfaces TypeScript
│   ├── routes/          # Rutas REST API
│   ├── services/        # Lógica de negocio
│   ├── utils/           # Funciones auxiliares
│   ├── websockets/      # Manejadores de WebSocket
│   └── server.ts        # Punto de entrada principal
├── dist/                # Código compilado (generado)
├── package.json         # Dependencias y scripts
└── tsconfig.json        # Configuración de TypeScript
```

## Instalación

```bash
cd backend
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del directorio `backend/`:

```env
PORT=8000
OPENROUTER_API_KEY=your_api_key_here
SERPER_API_KEY=your_serper_key_here
DEBUG_MODE=true
LMSTUDIO_BASE_URL=http://localhost:1234/v1
ENABLE_TOON=false
```

## Scripts Disponibles

### Desarrollo

```bash
npm run dev
```

Ejecuta el servidor en modo desarrollo con recarga automática usando `nodemon` y `ts-node`.

### Compilación

```bash
npm run build
```

Compila el código TypeScript a JavaScript en el directorio `dist/`.

### Producción

```bash
npm start
```

Ejecuta el servidor desde el código compilado (requiere haber ejecutado `npm run build` primero).

### Watch Mode

```bash
npm run watch
```

Compila el código TypeScript en modo observación (recompila automáticamente al detectar cambios).

## Endpoints API

### Archivos

- **POST** `/api/files` - Subir archivos
  - Body: `multipart/form-data` con campo `files`

### Benchmark

- **POST** `/api/start` - Iniciar benchmark
  ```json
  {
    "model_id": "deepseek/deepseek-v3.2",
    "difficulty": "Medium",
    "enable_tools": true,
    "task_id": "optional",
    "language": "english"
  }
  ```

- **POST** `/api/stop` - Detener benchmark

### Configuración

- **GET** `/api/config` - Obtener configuración disponible
  - Devuelve: modelos, roles, dificultades, categorías y tareas

### Tareas

- **GET** `/api/tasks/:task_id` - Obtener detalles de una tarea
- **POST** `/api/tasks` - Crear nueva tarea
  ```json
  {
    "name": "Nombre de la tarea",
    "prompt": "Descripción del prompt",
    "expected_criteria": ["criterio1", "criterio2"],
    "difficulty": "Medium"
  }
  ```

### Reportes

- **GET** `/api/reports` - Listar reportes disponibles
- **GET** `/api/reports/:filename` - Obtener reporte específico

## WebSocket

### Benchmark Streaming

Conectar a: `ws://localhost:8000/ws`

### Chat

Conectar a: `ws://localhost:8000/ws/chat`

Mensaje de ejemplo:
```json
{
  "message": "Hola, ¿cómo estás?",
  "model": "deepseek/deepseek-v3.2",
  "enable_tools": true,
  "language": "spanish",
  "session_id": "user123",
  "trace": false
}
```

Respuesta:
```json
{
  "type": "chat_chunk",
  "content": "palabra ",
  "mode": "append",
  "is_tool": false
}
```

Fin de chat:
```json
{
  "type": "chat_end",
  "metrics": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350,
    "duration_seconds": 2.5,
    "tokens_per_second": 140
  }
}
```

## Idiomas Soportados

- English, Spanish, French, German, Italian
- Portuguese, Dutch, Polish, Turkish, Swedish
- Arabic, Hindi, Chinese, Japanese, Korean
- Russian, Greek, Danish, Norwegian, Finnish

## Próximos Pasos

- [ ] Integrar con el sistema de agentes existente (Python)
- [ ] Implementar streaming real con modelos LLM
- [ ] Agregar sistema de logging
- [ ] Implementar rate limiting
- [ ] Agregar tests unitarios y de integración
- [ ] Documentación API con Swagger/OpenAPI

## Migración desde Python

Este backend mantiene compatibilidad con el frontend existente, replicando todos los endpoints de la versión Python/FastAPI. La funcionalidad principal incluye:

1. Subida de archivos
2. Gestión de tareas de benchmark
3. Streaming de chat con WebSocket
4. Gestión de reportes
5. Configuración dinámica de modelos

## Desarrollo

Para contribuir al desarrollo:

1. Asegúrate de tener Node.js 18+ instalado
2. Instala las dependencias: `npm install`
3. Ejecuta en modo desarrollo: `npm run dev`
4. Realiza tus cambios
5. Compila el código: `npm run build`
6. Verifica que todo funcione: `npm start`

## Licencia

MIT
