import { z } from 'zod';

// Esquemas permisivos: en US2 solo aportan tipos (no se usan aún como validación).
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
