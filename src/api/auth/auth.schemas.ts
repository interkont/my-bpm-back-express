import { z } from 'zod';

// Esquemas permisivos (FR-023): login exige email y password como string (vacio permitido).
export const loginSchema = z.looseObject({
  email: z.string(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.looseObject({
  fullName: z.string().optional(),
  email: z.string().optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
