import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Config } from '../config/config';
import {
  StartRequest,
  CreateTaskRequest,
  FileUploadResponse,
  BenchmarkTask
} from '../models/types';

export const apiRouter = express.Router();

// Configure multer for file uploads
const UPLOAD_DIR = path.join(process.cwd(), 'workspace', 'uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const safeName = file.originalname
        .replace(/\.\./g, '_')
        .replace(/[/\\]/g, '_');
      const timestamp = Date.now();
      cb(null, `${timestamp}_${safeName}`);
    }
  })
});

// Upload files endpoint
apiRouter.post('/files', upload.array('files'), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' });
    return;
  }

  const savedFiles = files.map(file => ({
    file_id: file.filename,
    name: file.originalname,
    size: file.size,
    path: file.path
  }));

  const response: FileUploadResponse = { files: savedFiles };
  res.json(response);
});

// Start benchmark endpoint
apiRouter.post('/start', async (req: Request, res: Response) => {
  const request: StartRequest = req.body;

  console.log('DEBUG: Received start request:', request);

  const targetModel = request.model_id || Config.DEFAULT_MODEL_ID;
  const difficulty = request.difficulty || 'Medium';
  const enableTools = request.enable_tools !== false;
  const language = request.language || 'english';

  console.log(`DEBUG: Would start benchmark with ${targetModel}, difficulty=${difficulty}, language=${language}`);

  // TODO: Implement benchmark runner integration
  res.json({
    status: 'started',
    message: `Benchmark started with ${targetModel} (${difficulty})`
  });
});

// Stop benchmark endpoint
apiRouter.post('/stop', (req: Request, res: Response) => {
  console.log('DEBUG: Received STOP request');

  // TODO: Implement stop signal
  res.json({
    status: 'stopping',
    message: 'Benchmark stop signal sent.'
  });
});

// Get config endpoint
apiRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const models = await Config.getAvailableModels();

    // TODO: Load actual tasks and roles from benchmark data
    const tasks: any[] = [];
    const roles: any[] = [];
    const categories: string[] = ['All'];

    res.json({
      models: Object.values(models),
      roles,
      difficulties: ['All', ...Config.DIFFICULTY_LEVELS],
      categories,
      tasks
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Get specific task endpoint
apiRouter.get('/tasks/:task_id', (req: Request, res: Response) => {
  const taskId = req.params.task_id;

  // TODO: Load actual tasks from benchmark data
  console.log(`DEBUG: Looking for task ${taskId}`);

  res.status(404).json({ error: 'Task not found' });
});

// List reports endpoint
apiRouter.get('/reports', (req: Request, res: Response) => {
  const resultsDir = Config.RESULTS_DIR || 'benchmarks/results';

  if (!fs.existsSync(resultsDir)) {
    res.json({ reports: [] });
    return;
  }

  try {
    const files = fs.readdirSync(resultsDir)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filepath = path.join(resultsDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          timestamp: stats.mtimeMs,
          date: new Date(stats.mtimeMs).toISOString()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({ reports: files });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

// Get specific report endpoint
apiRouter.get('/reports/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const resultsDir = Config.RESULTS_DIR || 'benchmarks/results';
  const filepath = path.join(resultsDir, filename);

  // Security check: prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading report:', error);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// Create task endpoint
apiRouter.post('/tasks', (req: Request, res: Response) => {
  const taskRequest: CreateTaskRequest = req.body;

  try {
    const userTasksPath = path.join(
      process.cwd(),
      'benchmarks',
      'data',
      'user_tasks.json'
    );

    const userTasksDir = path.dirname(userTasksPath);
    if (!fs.existsSync(userTasksDir)) {
      fs.mkdirSync(userTasksDir, { recursive: true });
    }

    let currentTasks: any[] = [];
    if (fs.existsSync(userTasksPath)) {
      try {
        currentTasks = JSON.parse(fs.readFileSync(userTasksPath, 'utf-8'));
      } catch {
        currentTasks = [];
      }
    }

    const newTask = {
      id: `USER-${Date.now()}`,
      name: taskRequest.name,
      prompt: taskRequest.prompt,
      expected_criteria: taskRequest.expected_criteria,
      category: 'user-defined',
      difficulty: taskRequest.difficulty
    };

    currentTasks.push(newTask);

    fs.writeFileSync(userTasksPath, JSON.stringify(currentTasks, null, 4));

    res.json({
      status: 'success',
      task_id: newTask.id,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      status: 'error',
      message: String(error)
    });
  }
});
