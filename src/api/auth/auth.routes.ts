import express from 'express';
import * as authController from './auth.controller';
import { catchAsync } from '../../utils/catchAsync';
import { protect } from '../middlewares/auth.middleware';

export const authRouter = express.Router();

authRouter.post('/login', authController.login);
authRouter.put('/profile', protect, catchAsync(authController.updateProfile));
