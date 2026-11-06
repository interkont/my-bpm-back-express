import type { NextFunction, Request, Response } from 'express';
import * as userService from './user.service';
import type { CreateUserInput, UpdateUserInput, UserIdParams } from './user.schemas';

export const createUser = async (
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request<UserIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id));
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request<UserIdParams, unknown, UpdateUserInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.updateUser(parseInt(req.params.id), req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request<UserIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await userService.deleteUser(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
