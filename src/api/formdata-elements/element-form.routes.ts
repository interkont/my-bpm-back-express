import { Router } from 'express';
import * as elementFormController from './element-form.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { numericParams, validateBody } from '../middlewares/validate.middleware';
import {
  formLinkInputSchema,
  formLinksBulkSchema,
  formLinkUpdateSchema,
  type FormLinkInput,
  type FormLinkUpdateInput,
} from './element-form.schemas';

type ElementParams = { elementId: string };
type LinkParams = { elementId: string; linkId: string };

export const elementFormRouter = Router();

elementFormRouter.use(protect, isAdmin);

// Campos de formulario de un elemento de proceso.
elementFormRouter
  .route('/:elementId/form-fields')
  .all(numericParams('elementId'))
  .post(
    validateBody(formLinkInputSchema),
    catchAsync<ElementParams, unknown, FormLinkInput>(elementFormController.addFormField),
  )
  .get(catchAsync<ElementParams>(elementFormController.getFormFields))
  // Actualización en bloque: la lista completa de campos del elemento.
  .put(
    validateBody(formLinksBulkSchema),
    catchAsync<ElementParams, unknown, FormLinkInput[]>(elementFormController.updateFormFields),
  );

// Un vínculo concreto, por su propio id.
elementFormRouter
  .route('/:elementId/form-fields/:linkId')
  .all(numericParams('elementId', 'linkId'))
  .put(
    validateBody(formLinkUpdateSchema),
    catchAsync<LinkParams, unknown, FormLinkUpdateInput>(elementFormController.updateFormField),
  )
  .delete(catchAsync<LinkParams>(elementFormController.removeFormField));
