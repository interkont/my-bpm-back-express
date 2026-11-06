import { Op, type InferCreationAttributes, type Transaction } from 'sequelize';
import { sequelize, ElementFormLink, FieldDefinition } from '../../models';
import { notFound } from '../../domain/errors';
import { pick } from '../../utils/pick';
import { toFormLinkDto, type FormLinkDto } from './element-form.mappers';
import type { FormLinkInput, FormLinkUpdateInput } from './element-form.schemas';

type FormLinkCreation = InferCreationAttributes<ElementFormLink>;

// Lista blanca de escritura (FR-029): `id` y `elementId` nunca se toman del cuerpo.
const LINK_KEYS = [
  'fieldDefId',
  'displayOrder',
  'isRequired',
  'isReadonly',
  'contextualValidations',
] as const satisfies readonly (keyof FormLinkCreation)[];

// El cuerpo ya pasó el esquema; `pick` descarta lo que no está en la lista blanca.
const pickLink = (body: FormLinkInput | FormLinkUpdateInput): Partial<FormLinkCreation> =>
  pick(body as Partial<FormLinkCreation>, LINK_KEYS);

const linkNotFound = (): Error => notFound('Element form link not found');

const findLinksForElement = (elementId: number, t?: Transaction): Promise<ElementFormLink[]> =>
  ElementFormLink.findAll({
    where: { elementId },
    include: [{ model: FieldDefinition, as: 'fieldDefinition' }],
    order: [
      ['displayOrder', 'ASC'],
      // Desempate estable entre campos con el mismo orden.
      ['id', 'ASC'],
    ],
    transaction: t,
  });

/** Agrega un campo a un elemento de proceso (crea el vínculo). */
export const addFormFieldToElement = async (
  elementId: number,
  body: FormLinkInput,
): Promise<FormLinkDto> => {
  const link = await ElementFormLink.create({ ...pickLink(body), elementId } as FormLinkCreation);
  return toFormLinkDto(link);
};

/** Campos de formulario de un elemento, con su definición y en orden de presentación. */
export const getFormFieldsForElement = async (elementId: number): Promise<FormLinkDto[]> =>
  (await findLinksForElement(elementId)).map(toFormLinkDto);

export const updateFormField = async (
  linkId: number,
  body: FormLinkUpdateInput,
): Promise<FormLinkDto> => {
  const link = await ElementFormLink.findByPk(linkId);
  if (!link) throw linkNotFound();
  link.set(pickLink(body));
  await link.save();
  return toFormLinkDto(link);
};

export const removeFormField = async (linkId: number): Promise<void> => {
  const link = await ElementFormLink.findByPk(linkId);
  if (!link) throw linkNotFound();
  await link.destroy();
};

/**
 * Deja los vínculos del elemento exactamente como `links`: borra los que no vienen, actualiza los
 * que traen un `id` existente del elemento y crea el resto. Corre dentro de `t` (guardado de un
 * proceso) o en una transacción propia.
 */
export const syncFormFields = async (
  elementId: number,
  links: FormLinkInput[],
  t: Transaction,
): Promise<void> => {
  const existingIds = new Set(
    (
      await ElementFormLink.findAll({ where: { elementId }, attributes: ['id'], transaction: t })
    ).map((link) => link.id),
  );
  // Ids que llegan como texto se comparan como número; los que no son del elemento se crean de nuevo.
  const idOf = (link: FormLinkInput): number | null => (link.id ? Number(link.id) : null);
  const keptIds = new Set(links.map(idOf).filter((id): id is number => id !== null));

  const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (idsToDelete.length > 0) {
    await ElementFormLink.destroy({ where: { id: { [Op.in]: idsToDelete } }, transaction: t });
  }

  const toCreate: FormLinkCreation[] = [];
  for (const link of links) {
    const id = idOf(link);
    if (id !== null && existingIds.has(id)) {
      await ElementFormLink.update(pickLink(link), { where: { id }, transaction: t });
    } else {
      toCreate.push({ ...pickLink(link), elementId } as FormLinkCreation);
    }
  }

  if (toCreate.length > 0) {
    await ElementFormLink.bulkCreate(toCreate, { transaction: t });
  }
};

/** PUT en bloque: sincroniza y devuelve la lista resultante. */
export const updateFormFieldsInBulk = async (
  elementId: number,
  links: FormLinkInput[],
): Promise<FormLinkDto[]> => {
  await sequelize.transaction((t) => syncFormFields(elementId, links, t));
  return getFormFieldsForElement(elementId);
};
