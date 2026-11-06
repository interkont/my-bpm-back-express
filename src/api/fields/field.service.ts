import type { InferCreationAttributes } from 'sequelize';
import { FieldDefinition } from '../../models';
import { notFound } from '../../domain/errors';
import { pick } from '../../utils/pick';
import { toFieldDefinitionDto, type FieldDefinitionDto } from './field.mappers';
import type { FieldCreateInput, FieldUpdateInput } from './field.schemas';

type FieldCreation = InferCreationAttributes<FieldDefinition>;

// Lista blanca de escritura (FR-029): `id` nunca se toma del cuerpo.
const FIELD_KEYS = [
  'name',
  'label',
  'fieldType',
  'validations',
] as const satisfies readonly (keyof FieldCreation)[];

const fieldNotFound = (): Error => notFound('Field definition not found');

const findField = async (id: number): Promise<FieldDefinition> => {
  const field = await FieldDefinition.findByPk(id);
  if (!field) throw fieldNotFound();
  return field;
};

export const createField = async (body: FieldCreateInput): Promise<FieldDefinitionDto> => {
  // El esquema ya exige name, label y fieldType.
  const field = await FieldDefinition.create(
    pick(body as Partial<FieldCreation>, FIELD_KEYS) as FieldCreation,
  );
  return toFieldDefinitionDto(field);
};

export const getFields = async (): Promise<FieldDefinitionDto[]> => {
  // Sin orden en el JS original; se fija por id para que el listado sea estable.
  const fields = await FieldDefinition.findAll({ order: [['id', 'ASC']] });
  return fields.map(toFieldDefinitionDto);
};

export const getFieldById = async (id: number): Promise<FieldDefinitionDto> =>
  toFieldDefinitionDto(await findField(id));

export const updateField = async (
  id: number,
  body: FieldUpdateInput,
): Promise<FieldDefinitionDto> => {
  const field = await findField(id);
  field.set(pick(body as Partial<FieldCreation>, FIELD_KEYS));
  await field.save();
  return toFieldDefinitionDto(field);
};

export const deleteField = async (id: number): Promise<void> => {
  const field = await findField(id);
  await field.destroy();
};
