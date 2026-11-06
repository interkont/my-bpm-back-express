import { Router } from 'express';
import * as decisionController from './decision.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

export const decisionRouter = Router();

// Proteger todas las rutas de este módulo
decisionRouter.use(protect);

decisionRouter.post('/decide-next-task', decisionController.decideNextTask);

// Ruta para consultar los logs, solo para administradores
decisionRouter.get('/decision-logs', isAdmin, decisionController.getDecisionLogs);
