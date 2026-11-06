import { z } from 'zod';

// Cuerpo de POST /engine/decide-next-task. Permisivo y solo de tipo: la regla 400 vigente se
// mantiene en el controller hasta US4; la validación en runtime no se cablea todavía.
export const decideNextTaskSchema = z
  .object({
    businessProcessKey: z.string().optional(),
    currentBpmnElementId: z.string().optional(),
    contextData: z
      .object({
        instance: z.record(z.string(), z.json()).optional(),
        task: z.record(z.string(), z.json()).optional(),
      })
      .catchall(z.json())
      .optional(),
  })
  .catchall(z.json());

export type DecideNextTaskInput = z.infer<typeof decideNextTaskSchema>;
