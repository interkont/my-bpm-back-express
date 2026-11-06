import type { Request, Response } from 'express';
import * as userService from './user.service';
import { notFound } from '../../domain/errors';
import type { CreateUserInput, UpdateUserInput, UserIdParams } from './user.schemas';

export const createUser = async (
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response,
): Promise<void> => {
  const user = await userService.createUser(req.body);
  res.status(201).json(user);
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await userService.getAllUsers();
  res.json(users);
};

export const getUserById = async (req: Request<UserIdParams>, res: Response): Promise<void> => {
  const user = await userService.getUserById(parseInt(req.params.id));
  if (!user) {
    throw notFound('User not found');
  }
  res.json(user);
};

export const updateUser = async (
  req: Request<UserIdParams, unknown, UpdateUserInput>,
  res: Response,
): Promise<void> => {
  const user = await userService.updateUser(parseInt(req.params.id), req.body);
  res.json(user);
};

export const deleteUser = async (req: Request<UserIdParams>, res: Response): Promise<void> => {
  await userService.deleteUser(parseInt(req.params.id));
  res.status(204).send();
};
