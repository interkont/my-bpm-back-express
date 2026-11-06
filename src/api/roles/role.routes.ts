import { Router } from 'express';
import * as roleController from './role.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { idParam, validateBody } from '../middlewares/validate.middleware';
import {
  roleCreateSchema,
  roleUpdateSchema,
  type RoleCreateInput,
  type RoleUpdateInput,
} from './role.schemas';

export const roleRouter = Router();

// Aplicar middleware de autenticación y autorización a todas las rutas de roles
roleRouter.use(protect, isAdmin);

roleRouter.post(
  '/',
  validateBody(roleCreateSchema),
  catchAsync<object, unknown, RoleCreateInput>(roleController.createRole),
);
roleRouter.get('/', catchAsync(roleController.getAllRoles));
roleRouter.get('/:id', idParam, catchAsync<{ id: string }>(roleController.getRoleById));
roleRouter.put(
  '/:id',
  idParam,
  validateBody(roleUpdateSchema),
  catchAsync<{ id: string }, unknown, RoleUpdateInput>(roleController.updateRole),
);
roleRouter.delete('/:id', idParam, catchAsync<{ id: string }>(roleController.deleteRole));
