import { z } from 'zod';

// Esquemas PERMISIVOS (solo tipos en US2; no se conectan como validación todavía).
// `looseObject` conserva las claves desconocidas, igual que hoy (asignación masiva).

// POST /process-instances (motor).
export const startProcessInstanceSchema = z.looseObject({
  businessProcessKey: z.string(),
  businessData: z.record(z.string(), z.json()),
  description: z.string().nullable().optional(),
});
export type StartProcessInstanceInput = z.infer<typeof startProcessInstanceSchema>;

// Atributos del modelo ProcessInstance, todos opcionales (sin restricciones nuevas).
const processInstanceFields = {
  id: z.number().optional(),
  processDefId: z.number().optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  businessData: z.record(z.string(), z.json()).nullable().optional(),
  startedByUserId: z.number().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().nullable().optional(),
};

// POST /process-instances/record (ruta administrativa).
export const createProcessInstanceRecordSchema = z.looseObject(processInstanceFields);
export type CreateProcessInstanceRecordInput = z.infer<typeof createProcessInstanceRecordSchema>;

// PUT /process-instances/:id
export const updateProcessInstanceSchema = z.looseObject(processInstanceFields);
export type UpdateProcessInstanceInput = z.infer<typeof updateProcessInstanceSchema>;
