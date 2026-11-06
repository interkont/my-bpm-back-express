import type { ParamsDictionary } from 'express-serve-static-core';
import * as authService from './auth.service';
import type { LoginInput, UpdateProfileInput } from './auth.schemas';
import { catchAsync } from '../../utils/catchAsync';

export const login = catchAsync<ParamsDictionary, unknown, LoginInput>(async (req, res) => {
  const { email, password } = req.body;
  const { user, token, modules } = await authService.login(email, password);
  res.json({ user, token, modules });
});

export const updateProfile = catchAsync<ParamsDictionary, unknown, UpdateProfileInput>(
  async (req, res) => {
    // `protect` garantiza que `req.user` existe antes de llegar a este handler.
    const authUser = req.user as Express.User;
    const user = await authService.updateProfile(authUser.id, req.body);
    res.json(user);
  },
);
