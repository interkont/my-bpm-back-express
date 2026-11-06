import express from 'express';
import * as userController from './user.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

export const userRouter = express.Router();

userRouter.post('/', protect, isAdmin, catchAsync(userController.createUser));
userRouter.get('/', protect, isAdmin, catchAsync(userController.getAllUsers));
userRouter.get('/:id', protect, isAdmin, catchAsync(userController.getUserById));
userRouter.put('/:id', protect, isAdmin, catchAsync(userController.updateUser));
userRouter.delete('/:id', protect, isAdmin, catchAsync(userController.deleteUser));
