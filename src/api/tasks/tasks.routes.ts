import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { parseIntIdParam } from '../middlewares/validate.middleware';
import { completeTask, getMyTasks, getTaskForm } from './task.controller';

export const taskRouter = Router();

taskRouter.use(protect);

taskRouter.get('/my-tasks', getMyTasks);
taskRouter.get('/:id/form', parseIntIdParam, getTaskForm);

// Endpoint para completar una tarea
taskRouter.post('/:id/complete', parseIntIdParam, completeTask);
