import express from 'express';
import * as processController from './process.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(processController.saveProcessDefinition)
  .get(processController.getAllProcessDefinitions);

router.get('/all', isAdmin, processController.getAllProcessDefinitionsAdmin);

router.get('/:id/start-form', processController.getStartForm);

// Nueva ruta para el análisis de guardado
router.get('/:id/save-ask', processController.getSaveAnalysis);

router
  .route('/:id')
  .get(processController.getProcessDefinitionById)
  .put(processController.saveProcessDefinition)
  .patch(processController.updateProcessDefinitionMetadata)
  .delete(processController.deleteProcessDefinition);

export const processRouter = router;
