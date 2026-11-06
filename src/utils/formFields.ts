import type { JsonObject, JsonValue } from '../domain/types';

// Formas mínimas que necesita el mapeo; se declaran aquí porque utils no depende de los modelos.
export interface FormFieldDefinitionLike {
  readonly name: string;
  readonly label: string;
  readonly fieldType: string;
  readonly validations: JsonObject | null;
}

export interface FormLinkLike {
  readonly isRequired: boolean;
  readonly isReadonly: boolean;
  readonly contextualValidations: JsonObject | null;
}

export interface FormFieldDto {
  name: string;
  label: string;
  fieldType: string;
  value: JsonValue | null;
  validations: JsonObject;
}

/**
 * Campo de formulario compartido por start-form y task-form (N-08, A-14). El orden de las claves
 * y la mezcla de `validations` son los de hoy; `value` lo decide quien llama (null en start-form,
 * el dato de negocio en task-form).
 */
export const toFormField = (
  fieldDefinition: FormFieldDefinitionLike,
  link: FormLinkLike,
  value: JsonValue | null,
): FormFieldDto => ({
  name: fieldDefinition.name,
  label: fieldDefinition.label,
  fieldType: fieldDefinition.fieldType,
  value,
  validations: {
    ...fieldDefinition.validations,
    isRequired: link.isRequired,
    isReadonly: link.isReadonly,
    ...link.contextualValidations,
  },
});
