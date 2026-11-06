import { Router } from 'express';
import * as instanceController from './processInstance.controller';
import { protect } from '../middlewares/auth.middleware';

export const processInstanceRouter = Router();

// Proteger todas las rutas de este módulo
processInstanceRouter.use(protect);

processInstanceRouter
  .route('/')
  .post(instanceController.createProcessInstance) // Ruta principal que usa el motor
  .get(instanceController.getAllProcessInstances);

// Ruta administrativa para crear un registro directamente
processInstanceRouter.post('/record', instanceController.createProcessInstanceRecord);

processInstanceRouter
  .route('/:id')
  .get(instanceController.getProcessInstanceById)
  .put(instanceController.updateProcessInstance)
  .delete(instanceController.deleteProcessInstance);
