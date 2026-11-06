import express from 'express';
import * as userController from './user.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import type { CreateUserInput, UpdateUserInput, UserIdParams } from './user.schemas';

export const userRouter = express.Router();

userRouter.post(
  '/',
  protect,
  isAdmin,
  catchAsync<unknown, unknown, CreateUserInput>(userController.createUser),
);
userRouter.get('/', protect, isAdmin, catchAsync(userController.getAllUsers));
userRouter.get('/:id', protect, isAdmin, catchAsync<UserIdParams>(userController.getUserById));
userRouter.put(
  '/:id',
  protect,
  isAdmin,
  catchAsync<UserIdParams, unknown, UpdateUserInput>(userController.updateUser),
);
userRouter.delete('/:id', protect, isAdmin, catchAsync<UserIdParams>(userController.deleteUser));
