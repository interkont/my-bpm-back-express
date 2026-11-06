import express from 'express';
import * as userController from './user.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { idParam, validateBody } from '../middlewares/validate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserIdParams,
} from './user.schemas';

export const userRouter = express.Router();

userRouter.post(
  '/',
  protect,
  isAdmin,
  validateBody(createUserSchema),
  catchAsync<unknown, unknown, CreateUserInput>(userController.createUser),
);
userRouter.get('/', protect, isAdmin, catchAsync(userController.getAllUsers));
userRouter.get(
  '/:id',
  protect,
  isAdmin,
  idParam,
  catchAsync<UserIdParams>(userController.getUserById),
);
userRouter.put(
  '/:id',
  protect,
  isAdmin,
  idParam,
  validateBody(updateUserSchema),
  catchAsync<UserIdParams, unknown, UpdateUserInput>(userController.updateUser),
);
userRouter.delete(
  '/:id',
  protect,
  isAdmin,
  idParam,
  catchAsync<UserIdParams>(userController.deleteUser),
);
