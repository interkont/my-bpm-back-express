import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { parseIntIdParam, validateBody } from '../middlewares/validate.middleware';
import { completeTask, getMyTasks, getTaskForm } from './task.controller';
import { completeTaskBodySchema } from './task.schemas';

export const taskRouter = Router();

taskRouter.use(protect);

taskRouter.get('/my-tasks', getMyTasks);
taskRouter.get('/:id/form', parseIntIdParam, getTaskForm);

// Endpoint para completar una tarea
taskRouter.post(
  '/:id/complete',
  parseIntIdParam,
  validateBody(completeTaskBodySchema),
  completeTask,
);
