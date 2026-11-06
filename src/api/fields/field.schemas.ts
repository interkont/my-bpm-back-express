import { z } from 'zod';

// Objetos abiertos que solo rechazan lo que hoy ya falla (FR-023): name, label y fieldType son
// NOT NULL en la base.
export const fieldCreateSchema = z.looseObject({
  name: z.string(),
  label: z.string(),
  fieldType: z.string(),
  validations: z.record(z.string(), z.json()).nullable().optional(),
});

export const fieldUpdateSchema = z.looseObject({
  name: z.string().optional(),
  label: z.string().optional(),
  fieldType: z.string().optional(),
  validations: z.record(z.string(), z.json()).nullable().optional(),
});

export type FieldCreateInput = z.infer<typeof fieldCreateSchema>;
export type FieldUpdateInput = z.infer<typeof fieldUpdateSchema>;
