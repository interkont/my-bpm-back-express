import type { FieldDefinition } from '../../models';
import type { JsonObject } from '../../domain/types';

export interface FieldDefinitionDto {
  id: number;
  name: string;
  label: string;
  fieldType: string;
  validations: JsonObject | null;
}

// Tras un `create` sin `validations`, la clave queda sin definir y no se serializa, igual que antes.
export const toFieldDefinitionDto = (field: FieldDefinition): FieldDefinitionDto => {
  const row = field.get({ plain: true });
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    fieldType: row.fieldType,
    validations: row.validations,
  };
};
