import { Router } from 'express';
import * as roleController from './role.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

export const roleRouter = Router();

// Aplicar middleware de autenticación y autorización a todas las rutas de roles
roleRouter.use(protect, isAdmin);

roleRouter.post('/', catchAsync(roleController.createRole));
roleRouter.get('/', catchAsync(roleController.getAllRoles));
roleRouter.get('/:id', catchAsync(roleController.getRoleById));
roleRouter.put('/:id', catchAsync(roleController.updateRole));
roleRouter.delete('/:id', catchAsync(roleController.deleteRole));
