import type { Request, Response } from 'express';
import * as roleService from './role.service';
import { notFound } from '../../domain/errors';
import type { RoleCreateInput, RoleUpdateInput } from './role.schemas';

export const createRole = async (
  req: Request<object, unknown, RoleCreateInput>,
  res: Response,
): Promise<void> => {
  const role = await roleService.createRole(req.body);
  res.status(201).json(role);
};

export const getAllRoles = async (_req: Request, res: Response): Promise<void> => {
  const roles = await roleService.getAllRoles();
  res.json(roles);
};

export const getRoleById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const role = await roleService.getRoleById(parseInt(req.params.id));
  if (!role) {
    throw notFound('Role not found');
  }
  res.json(role);
};

export const updateRole = async (
  req: Request<{ id: string }, unknown, RoleUpdateInput>,
  res: Response,
): Promise<void> => {
  const role = await roleService.updateRole(parseInt(req.params.id), req.body);
  res.json(role);
};

export const deleteRole = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await roleService.deleteRole(parseInt(req.params.id));
  res.status(204).send();
};
