import type { NextFunction, Request, Response } from 'express';
import * as roleService from './role.service';

interface ErrorConEstado {
  statusCode: number;
  message: string;
}

// Un error con `statusCode` truthy se responde directamente con ese estado.
const tieneEstado = (error: unknown): error is ErrorConEstado =>
  typeof error === 'object' && error !== null && 'statusCode' in error && Boolean(error.statusCode);

export const createRole = async (
  req: Request<object, unknown, roleService.RoleCreateInput>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

export const getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await roleService.getRoleById(parseInt(req.params.id));
    if (role) {
      res.json(role);
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: Request<{ id: string }, unknown, roleService.RoleUpdateInput>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const role = await roleService.updateRole(parseInt(req.params.id), req.body);
    res.json(role);
  } catch (error) {
    if (tieneEstado(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};

export const deleteRole = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    await roleService.deleteRole(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    if (tieneEstado(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
