import { z } from 'zod';

// Id u orden entero; Postgres también acepta el número como texto ("5").
const integerLike = z.union([z.number().int(), z.string().regex(/^\d+$/)]);

// Vínculo campo ↔ elemento tal como lo envía el modelador. Solo se exige lo que hoy ya falla
// sin él (FR-023): `fieldDefId` y `displayOrder` son NOT NULL en la base.
export const formLinkInputSchema = z.looseObject({
  id: integerLike.nullable().optional(),
  fieldDefId: integerLike,
  displayOrder: integerLike,
  contextualValidations: z.record(z.string(), z.json()).nullable().optional(),
});

// Actualización parcial de un vínculo: lo que llega no puede anular columnas NOT NULL.
export const formLinkUpdateSchema = z.looseObject({
  fieldDefId: integerLike.optional(),
  displayOrder: integerLike.optional(),
  contextualValidations: z.record(z.string(), z.json()).nullable().optional(),
});

// PUT en bloque: la lista completa de campos del elemento.
export const formLinksBulkSchema = z.array(formLinkInputSchema);

export type FormLinkInput = z.infer<typeof formLinkInputSchema>;
export type FormLinkUpdateInput = z.infer<typeof formLinkUpdateSchema>;
