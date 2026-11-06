import { Router } from 'express';
import * as decisionController from './decision.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { DECIDE_NEXT_TASK_REQUIRED_MESSAGE, decideNextTaskSchema } from './decision.schemas';

export const decisionRouter = Router();

// Proteger todas las rutas de este módulo
decisionRouter.use(protect);

decisionRouter.post(
  '/decide-next-task',
  validateBody(decideNextTaskSchema, {
    message: DECIDE_NEXT_TASK_REQUIRED_MESSAGE,
    legacyErrorKey: true,
  }),
  decisionController.decideNextTask,
);

// Ruta para consultar los logs, solo para administradores
decisionRouter.get('/decision-logs', isAdmin, decisionController.getDecisionLogs);
