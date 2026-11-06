import express from 'express';
import * as processController from './process.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { idParam, parseIntIdParam, validateBody } from '../middlewares/validate.middleware';
import { patchStatusSchema, saveFormFieldsSchema } from './process.schemas';

const router = express.Router();

// Proteger todas las rutas de este módulo
router.use(protect);

router
  .route('/')
  .post(validateBody(saveFormFieldsSchema), processController.saveProcessDefinition)
  .get(processController.getAllProcessDefinitions);

router.get('/all', isAdmin, processController.getAllProcessDefinitionsAdmin);

// Los ids que hoy se leen con parseInt conservan esa semántica ("12abc" -> 12, FR-023); PUT pasa el texto a Postgres y exige `^\d+$` (R-13).
router.get('/:id/start-form', parseIntIdParam, processController.getStartForm);

// Nueva ruta para el análisis de guardado
router.get('/:id/save-ask', parseIntIdParam, processController.getSaveAnalysis);

router
  .route('/:id')
  .get(parseIntIdParam, processController.getProcessDefinitionById)
  .put(idParam, validateBody(saveFormFieldsSchema), processController.saveProcessDefinition)
  .patch(
    parseIntIdParam,
    validateBody(patchStatusSchema),
    processController.updateProcessDefinitionMetadata,
  )
  .delete(parseIntIdParam, processController.deleteProcessDefinition);

export const processRouter = router;
