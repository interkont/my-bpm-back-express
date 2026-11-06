import type { ElementFormLink } from '../../models';
import type { JsonObject } from '../../domain/types';
import { toFieldDefinitionDto, type FieldDefinitionDto } from '../fields/field.mappers';

export interface FormLinkDto {
  id: number;
  elementId: number;
  fieldDefId: number;
  displayOrder: number;
  isRequired: boolean;
  isReadonly: boolean;
  contextualValidations: JsonObject | null;
  // Solo cuando la consulta incluye la definición del campo.
  fieldDefinition?: FieldDefinitionDto;
}

// Tras un `create`, los atributos que no se enviaron y no tienen valor por defecto quedan sin
// definir y no se serializan, igual que antes.
export const toFormLinkDto = (link: ElementFormLink): FormLinkDto => {
  const row = link.get({ plain: true });
  return {
    id: row.id,
    elementId: row.elementId,
    fieldDefId: row.fieldDefId,
    displayOrder: row.displayOrder,
    isRequired: row.isRequired,
    isReadonly: row.isReadonly,
    contextualValidations: row.contextualValidations,
    ...(link.fieldDefinition === undefined
      ? {}
      : { fieldDefinition: toFieldDefinitionDto(link.fieldDefinition) }),
  };
};
