import { z } from 'zod';

// Mensaje 400 vigente (FR-025): se conserva literal y bajo la clave `error`.
export const DECIDE_NEXT_TASK_REQUIRED_MESSAGE =
  'businessProcessKey, currentBpmnElementId, and contextData are required.';

// Cuerpo de POST /engine/decide-next-task. Los tres campos deben tener valor verdadero, igual que
// la comprobación manual que existía en el controller.
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
  .catchall(z.json())
  .refine((body) =>
    Boolean(body.businessProcessKey && body.currentBpmnElementId && body.contextData),
  );

export type DecideNextTaskInput = z.infer<typeof decideNextTaskSchema>;
