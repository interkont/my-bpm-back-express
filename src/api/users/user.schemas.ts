import { z } from 'zod';
import { SYSTEM_ROLE } from '../../domain/constants';

// Esquemas permisivos (objetos abiertos, sin restricciones nuevas): en US2 solo aportan tipos.
export const createUserSchema = z.looseObject({
  fullName: z.string(),
  email: z.string(),
  password: z.string(),
  status: z.string().optional(),
  systemRole: z.enum(SYSTEM_ROLE).optional(),
  roleIds: z.array(z.number()).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.looseObject({
  fullName: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  systemRole: z.enum(SYSTEM_ROLE).optional(),
  password: z.string().optional(),
  roleIds: z.array(z.number()).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Los params de ruta llevan solo `id`; tipo plano para encajar con ParamsDictionary.
export const userIdParamsSchema = z.object({ id: z.string() });
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
