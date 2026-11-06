import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import * as authService from './auth.service';
import type { LoginInput, UpdateProfileInput } from './auth.schemas';
import { catchAsync } from '../../utils/catchAsync';

interface ErrorWithStatus extends Error {
  statusCode?: number;
}

export const login = catchAsync<ParamsDictionary, unknown, LoginInput>(async (req, res) => {
  const { email, password } = req.body;
  const { user, token, modules } = await authService.login(email, password);
  res.json({ user, token, modules });
});

export const updateProfile = async (
  req: Request<ParamsDictionary, unknown, UpdateProfileInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // `protect` garantiza que `req.user` existe antes de llegar a este handler.
    const authUser = req.user as Express.User;
    const user = await authService.updateProfile(authUser.id, req.body);
    res.json(user);
  } catch (err) {
    // Los errores de servicio pueden llevar `statusCode` adjunto (ver auth.service).
    const error = err as ErrorWithStatus;
    if (error.statusCode) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    next(error);
  }
};
