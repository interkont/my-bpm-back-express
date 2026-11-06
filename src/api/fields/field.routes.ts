import { Router } from 'express';
import * as fieldController from './field.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { idParam, validateBody } from '../middlewares/validate.middleware';
import {
  fieldCreateSchema,
  fieldUpdateSchema,
  type FieldCreateInput,
  type FieldUpdateInput,
} from './field.schemas';

export const fieldRouter = Router();

// Biblioteca de campos: solo administradores.
fieldRouter.use(protect, isAdmin);

fieldRouter.get('/types', fieldController.getFieldTypes);

fieldRouter.post(
  '/',
  validateBody(fieldCreateSchema),
  catchAsync<object, unknown, FieldCreateInput>(fieldController.createField),
);
fieldRouter.get('/', catchAsync(fieldController.getFields));

fieldRouter.get('/:id', idParam, catchAsync<{ id: string }>(fieldController.getField));
fieldRouter.put(
  '/:id',
  idParam,
  validateBody(fieldUpdateSchema),
  catchAsync<{ id: string }, unknown, FieldUpdateInput>(fieldController.updateField),
);
fieldRouter.delete('/:id', idParam, catchAsync<{ id: string }>(fieldController.deleteField));
