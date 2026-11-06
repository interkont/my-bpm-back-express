import { z } from 'zod';

// Esquemas permisivos (solo tipos en US2; aún no se usan para validar).
// `name` y `description` ya son obligatorios en el modelo (allowNull: false).
export const roleCreateSchema = z.looseObject({
  name: z.string(),
  description: z.string(),
});

export const roleUpdateSchema = z.looseObject({
  name: z.string().optional(),
  description: z.string().optional(),
  userIds: z.array(z.number()).optional(),
});

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
