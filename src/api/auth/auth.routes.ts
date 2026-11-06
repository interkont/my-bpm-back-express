import express from 'express';
import * as authController from './auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { loginSchema } from './auth.schemas';

export const authRouter = express.Router();

authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.put('/profile', protect, authController.updateProfile);
