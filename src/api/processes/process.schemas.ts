import { z } from 'zod';
import { PROCESS_DEFINITION_STATUS } from '../../domain/constants';
import { formLinkInputSchema } from '../formdata-elements/element-form.schemas';

// Esquemas PERMISIVOS (US2: solo tipos; no se usan como validación hasta US3).
// `looseObject` conserva las claves desconocidas, igual que hoy.

// Elemento entrante del diagrama; `formFields` son los vínculos de formulario del elemento.
export const incomingElementSchema = z.looseObject({
  bpmnElementId: z.string(),
  formFields: z.array(formLinkInputSchema).nullable().optional(),
});

// Secuencia entrante del diagrama; sus claves se reenvían tal cual.
export const incomingSequenceSchema = z.looseObject({});

// Carga de guardado (req.body): el resto de claves se reenvía a Sequelize sin filtrar (US3 añade lista blanca).
export const saveProcessSchema = z.looseObject({
  elements: z.array(incomingElementSchema).optional(),
  sequences: z.array(incomingSequenceSchema).optional(),
  diagramJson: z.unknown().optional(),
  status: z.enum(PROCESS_DEFINITION_STATUS).optional(),
  businessProcessKey: z.string().optional(),
});

export const metadataSchema = z.looseObject({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(PROCESS_DEFINITION_STATUS).optional(),
});

// Validación en runtime de POST/PUT (FR-023): solo los `formFields` de cada elemento, que sin
// fieldDefId/displayOrder hoy acaban en un 500 al crear los vínculos.
export const saveFormFieldsSchema = z.looseObject({
  elements: z
    .array(z.looseObject({ formFields: incomingElementSchema.shape.formFields }))
    .optional(),
});

// Validación del PATCH (FR-033): solo `status` se restringe a la unión; el resto del cuerpo se tolera como hoy.
export const patchStatusSchema = z.looseObject({
  status: z.enum(PROCESS_DEFINITION_STATUS).optional(),
});

export type IncomingElement = z.infer<typeof incomingElementSchema>;
export type IncomingSequence = z.infer<typeof incomingSequenceSchema>;
export type SaveProcessInput = z.infer<typeof saveProcessSchema>;
export type MetadataInput = z.infer<typeof metadataSchema>;
