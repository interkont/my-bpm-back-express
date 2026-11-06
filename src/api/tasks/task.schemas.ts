import { z } from 'zod';

// Cuerpo de POST /:id/complete. Permisivo (catchall JSON equivale a looseObject; sin campos
// obligatorios nuevos): en US2 solo aporta el tipo; la validación en runtime se cablea en US3.
export const completeTaskSchema = z
  .object({
    action: z.string().optional(),
    formData: z.record(z.string(), z.json()).optional(),
    comments: z.string().optional(),
  })
  .catchall(z.json());

export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
