import type { NextFunction, Request, Response } from 'express';
// El hash en el controlador se conserva 1:1 y se mueve al servicio en US2 (AP-04).
// eslint-disable-next-line no-restricted-imports
import bcrypt from 'bcryptjs';
import * as userService from './user.service';
import type { CreateUserData, UpdateUserData } from './user.service';

type CreateUserBody = Omit<CreateUserData, 'passwordHash'> & { password: string };

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { password, ...userData } = req.body as CreateUserBody;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userService.createUser({ ...userData, passwordHash: hashedPassword });
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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.getUserById(parseInt(req.params.id as string));
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
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.updateUser(
      parseInt(req.params.id as string),
      req.body as UpdateUserData,
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await userService.deleteUser(parseInt(req.params.id as string));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
