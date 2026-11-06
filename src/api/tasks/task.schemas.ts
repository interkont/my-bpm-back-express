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

// Id entero; Postgres también acepta el número como texto ("5").
const integerLike = z.union([z.number().int(), z.string().regex(/^\d+$/)]);

// Asignación de casos: rol → usuario que atenderá las tareas de ese rol en la instancia.
export const caseAssignmentInputSchema = z.looseObject({
  roleId: integerLike,
  userId: integerLike,
});
export type CaseAssignmentInput = z.infer<typeof caseAssignmentInputSchema>;

// Validación en runtime del complete (FR-023): solo se restringe `caseAssignments`, que sin
// roleId/userId hoy acaba en un 500 por la restricción NOT NULL de la base.
export const completeTaskBodySchema = z.looseObject({
  caseAssignments: z.array(caseAssignmentInputSchema).nullable().optional(),
});
