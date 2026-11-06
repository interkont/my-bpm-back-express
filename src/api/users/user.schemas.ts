import { z } from 'zod';

// Objetos abiertos que solo rechazan lo que hoy ya falla (FR-023).
// `status` y `systemRole` son texto libre: la columna es VARCHAR sin restricción.
export const createUserSchema = z.looseObject({
  fullName: z.string(),
  email: z.string(),
  password: z.string(),
  status: z.string().optional(),
  systemRole: z.string().optional(),
  roleIds: z.array(z.number()).optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.looseObject({
  fullName: z.string().optional(),
  email: z.string().optional(),
  status: z.string().optional(),
  systemRole: z.string().optional(),
  password: z.string().optional(),
  roleIds: z.array(z.number()).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Los params de ruta llevan solo `id`; tipo plano para encajar con ParamsDictionary.
export const userIdParamsSchema = z.object({ id: z.string() });
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
