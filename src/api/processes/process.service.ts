import {
  Op,
  type InferAttributes,
  type InferCreationAttributes,
  type Transaction,
  type WhereOptions,
} from 'sequelize';
import type { MakeNullishOptional } from 'sequelize/types/utils';
import {
  sequelize,
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  ProcessInstance,
  ElementFormLink,
  FieldDefinition,
} from '../../models';
import { attrs } from '../../utils/pick';
import { toFormField, type FormFieldDto } from '../../utils/formFields';
import type {
  IncomingElement,
  IncomingSequence,
  MetadataInput,
  SaveProcessInput,
} from './process.schemas';
import {
  toDefinitionDetail,
  toDefinitionListItem,
  toDefinitionRow,
  toSaveAnalysis,
  type ProcessDefinitionDetailDto,
  type ProcessDefinitionListItemDto,
  type ProcessDefinitionRowDto,
  type SaveAnalysisDto,
} from './process.mappers';

type ProcessDefinitionCreation = InferCreationAttributes<ProcessDefinition>;
type ProcessElementCreation = InferCreationAttributes<ProcessElement>;
type ProcessSequenceCreation = InferCreationAttributes<ProcessSequence>;
type ElementFormLinkCreation = MakeNullishOptional<InferCreationAttributes<ElementFormLink>>;
type FormLinkData = Pick<
  ElementFormLink,
  'fieldDefId' | 'displayOrder' | 'isRequired' | 'isReadonly' | 'contextualValidations'
>;

export interface StartFormDefinition {
  taskName: string;
  fields: FormFieldDto[];
  actions: string[];
}

/**
 * Valida que no exista otra versión activa para un process key.
 * @param processDefId - El ID de la definición que se está actualizando (o undefined si es nueva).
 * @param businessProcessKey - El ID de negocio del proceso.
 * @param t - La transacción de Sequelize.
 */
async function validateSingleActiveVersion(
  processDefId: string | number | undefined,
  businessProcessKey: string,
  t: Transaction,
): Promise<void> {
  const whereClause: WhereOptions<InferAttributes<ProcessDefinition>> = {
    businessProcessKey,
    status: 'ACTIVE',
    // El JS original pasa el id tal cual (string desde la ruta); Postgres lo coerciona (equivalencia 1:1).
    ...(processDefId ? { id: { [Op.not]: processDefId as number } } : {}),
  };

  const activeVersion = await ProcessDefinition.findOne({ where: whereClause, transaction: t });

  if (activeVersion) {
    throw new Error(
      `An active version already exists for this process (Version: ${activeVersion.version}, ID: ${activeVersion.id}). Please deactivate it before activating another one.`,
    );
  }
}

async function syncElements(
  processDefId: number,
  incomingElements: IncomingElement[],
  t: Transaction,
): Promise<void> {
  const existingElements = await ProcessElement.findAll({
    where: { processDefId },
    transaction: t,
  });
  const existingElementsMap = new Map(existingElements.map((el) => [el.bpmnElementId, el]));
  const incomingElementIds = new Set(incomingElements.map((el) => el.bpmnElementId));

  const toCreate: ProcessElementCreation[] = [];
  const toUpdate: ProcessElement[] = [];

  for (const incomingEl of incomingElements) {
    const existing = existingElementsMap.get(incomingEl.bpmnElementId);
    if (existing) {
      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      existing.set(incomingEl as Partial<InferAttributes<ProcessElement>>);
      toUpdate.push(existing);
    } else {
      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      toCreate.push({ ...incomingEl, processDefId } as ProcessElementCreation);
    }
  }

  const toDeleteIds = existingElements
    .filter((el) => !incomingElementIds.has(el.bpmnElementId))
    .map((el) => el.id);

  // Secuencial y determinista: primero las altas (los ids se asignan como antes), luego las
  // actualizaciones en el orden de entrada y al final las bajas (A-12).
  await ProcessElement.bulkCreate(toCreate, { transaction: t });
  for (const element of toUpdate) {
    await element.save({ transaction: t });
  }
  await ProcessElement.destroy({ where: { id: toDeleteIds }, transaction: t });
}

async function syncSequences(
  processDefId: number,
  incomingSequences: IncomingSequence[] | undefined,
  t: Transaction,
): Promise<void> {
  await ProcessSequence.destroy({ where: { processDefId }, transaction: t });
  if (incomingSequences && incomingSequences.length > 0) {
    // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
    const sequencesToCreate = incomingSequences.map(
      (seq) => ({ ...seq, processDefId }) as ProcessSequenceCreation,
    );
    await ProcessSequence.bulkCreate(sequencesToCreate, { transaction: t });
  }
}

export const getSaveAnalysis = async (id: string): Promise<SaveAnalysisDto> => {
  const definition = await ProcessDefinition.findByPk(parseInt(id, 10), {
    attributes: attrs<ProcessDefinition>()('id', 'status'),
  });
  if (!definition) {
    throw new Error('Process definition not found.');
  }

  // El JS original pasa el id como string; Postgres lo coerciona (equivalencia 1:1).
  const instancesCount = await ProcessInstance.count({
    where: { processDefId: id as unknown as number },
  });

  return toSaveAnalysis(definition.status, instancesCount);
};

export const saveProcessDefinition = async (
  id: string | undefined,
  data: SaveProcessInput,
): Promise<ProcessDefinitionRowDto> => {
  const { elements = [], sequences = [], ...definitionData } = data;

  return sequelize.transaction(async (t) => {
    const definitionToUpdate = id ? await ProcessDefinition.findByPk(id, { transaction: t }) : null;
    let mustCreateNewVersion = false;

    if (definitionToUpdate) {
      // El JS original pasa el id como string; Postgres lo coerciona (equivalencia 1:1).
      const instanceCount = await ProcessInstance.count({
        where: { processDefId: id as unknown as number },
        transaction: t,
      });

      if (definitionToUpdate.status === 'ACTIVE' || instanceCount > 0) {
        mustCreateNewVersion = true;
      }
    }

    if (definitionToUpdate && mustCreateNewVersion) {
      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      const newDefinition = await ProcessDefinition.create(
        {
          ...definitionData,
          businessProcessKey: definitionToUpdate.businessProcessKey,
          version: definitionToUpdate.version + 1,
          status: 'DRAFT',
          bpmnXml: JSON.stringify(data.diagramJson),
        } as ProcessDefinitionCreation,
        { transaction: t },
      );

      const newProcessDefId = newDefinition.id;

      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      const newElements = await ProcessElement.bulkCreate(
        elements.map((el) => ({ ...el, processDefId: newProcessDefId }) as ProcessElementCreation),
        { transaction: t, returning: true },
      );
      await ProcessSequence.bulkCreate(
        sequences.map(
          (seq) => ({ ...seq, processDefId: newProcessDefId }) as ProcessSequenceCreation,
        ),
        { transaction: t },
      );

      const oldElementsWithForms = await ProcessElement.findAll({
        where: { processDefId: definitionToUpdate.id },
        include: [{ model: ElementFormLink, as: 'elementFormLinks' }],
        transaction: t,
      });

      const formLinksMap = new Map<string, FormLinkData[]>();
      oldElementsWithForms.forEach((oldEl) => {
        if (oldEl.elementFormLinks && oldEl.elementFormLinks.length > 0) {
          formLinksMap.set(
            oldEl.bpmnElementId,
            oldEl.elementFormLinks.map((link) => ({
              fieldDefId: link.fieldDefId,
              displayOrder: link.displayOrder,
              isRequired: link.isRequired,
              isReadonly: link.isReadonly,
              contextualValidations: link.contextualValidations,
            })),
          );
        }
      });

      const newFormLinksToCreate: ElementFormLinkCreation[] = [];
      const newElementsMap = new Map<string, number>(
        newElements.map((el) => [el.bpmnElementId, el.id]),
      );

      for (const [bpmnId, links] of formLinksMap.entries()) {
        const newElementId = newElementsMap.get(bpmnId);
        if (newElementId) {
          links.forEach((linkData) => {
            newFormLinksToCreate.push({ ...linkData, elementId: newElementId });
          });
        }
      }

      if (newFormLinksToCreate.length > 0) {
        await ElementFormLink.bulkCreate(newFormLinksToCreate, { transaction: t });
      }

      return toDefinitionRow(newDefinition);
    } else {
      let processDefinition: ProcessDefinition;
      const finalDefinitionData = {
        ...definitionData,
        bpmnXml: JSON.stringify(data.diagramJson),
      };

      if (finalDefinitionData.status === 'ACTIVE') {
        // La clave llega sin validar; si falta, Sequelize rechaza el valor undefined igual que en el JS original.
        const key = (
          definitionToUpdate
            ? definitionToUpdate.businessProcessKey
            : finalDefinitionData.businessProcessKey
        ) as string;
        await validateSingleActiveVersion(id, key, t);
      }

      if (definitionToUpdate) {
        // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
        await definitionToUpdate.update(
          finalDefinitionData as Partial<InferAttributes<ProcessDefinition>>,
          { transaction: t },
        );
        processDefinition = definitionToUpdate;
      } else {
        // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
        processDefinition = await ProcessDefinition.create(
          {
            ...finalDefinitionData,
            version: 1,
            // Se conserva `||` (no `??`): una cadena vacía cae a DRAFT como en el JS original.
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            status: finalDefinitionData.status || 'DRAFT',
          } as ProcessDefinitionCreation,
          { transaction: t },
        );
      }

      const processDefId = processDefinition.id;

      await syncElements(processDefId, elements, t);
      await syncSequences(processDefId, sequences, t);

      return toDefinitionRow(processDefinition);
    }
  });
};

export const updateProcessDefinitionMetadata = async (
  id: string,
  data: MetadataInput,
): Promise<ProcessDefinitionRowDto | null> => {
  const processDefId = parseInt(id, 10);

  return sequelize.transaction(async (t) => {
    const definitionToActivate = await ProcessDefinition.findByPk(processDefId, { transaction: t });
    if (!definitionToActivate) {
      throw new Error('Process definition not found.');
    }

    if (data.status === 'ACTIVE' && definitionToActivate.status !== 'ACTIVE') {
      await validateSingleActiveVersion(processDefId, definitionToActivate.businessProcessKey, t);

      const currentActive = await ProcessDefinition.findOne({
        where: {
          businessProcessKey: definitionToActivate.businessProcessKey,
          status: 'ACTIVE',
          id: { [Op.not]: processDefId },
        },
        transaction: t,
      });

      if (currentActive) {
        await currentActive.update({ status: 'DEPRECATED' }, { transaction: t });
      }
    }

    const allowedUpdates: MetadataInput = {
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
    };

    if (allowedUpdates.name === undefined) delete allowedUpdates.name;
    if (allowedUpdates.description === undefined) delete allowedUpdates.description;
    if (allowedUpdates.category === undefined) delete allowedUpdates.category;
    if (allowedUpdates.status === undefined) delete allowedUpdates.status;

    const [updateCount] = await ProcessDefinition.update(allowedUpdates, {
      where: { id: processDefId },
      transaction: t,
    });

    if (updateCount === 0) {
      const definitionExists = await ProcessDefinition.findByPk(processDefId, {
        transaction: t,
        attributes: ['id'],
      });
      if (!definitionExists) {
        throw new Error('Process definition not found.');
      }
    }

    const updated = await ProcessDefinition.findByPk(processDefId, { transaction: t });
    return updated ? toDefinitionRow(updated) : null;
  });
};

export const getAllProcessDefinitions = async (): Promise<ProcessDefinitionListItemDto[]> => {
  const definitions = await ProcessDefinition.findAll({
    attributes: {
      exclude: ['bpmnXml'],
    },
    where: {
      status: 'ACTIVE',
    },
    order: [['createdAt', 'desc']],
  });
  return definitions.map(toDefinitionListItem);
};

export const getAllProcessDefinitionsAdmin = async (): Promise<ProcessDefinitionListItemDto[]> => {
  const definitions = await ProcessDefinition.findAll({
    attributes: {
      exclude: ['bpmnXml'],
    },
    order: [['createdAt', 'desc']],
  });
  return definitions.map(toDefinitionListItem);
};

export const getProcessDefinitionById = async (
  id: string,
): Promise<ProcessDefinitionDetailDto | null> => {
  const processDefinition = await ProcessDefinition.findByPk(parseInt(id, 10), {
    include: [
      { model: ProcessElement, as: 'processElements' },
      { model: ProcessSequence, as: 'processSequences' },
    ],
  });

  return processDefinition ? toDefinitionDetail(processDefinition) : null;
};

export const deleteProcessDefinition = async (id: string): Promise<{ message: string }> => {
  const processDefId = parseInt(id, 10);
  return sequelize.transaction(async (t) => {
    const definition = await ProcessDefinition.findByPk(processDefId, { transaction: t });
    if (!definition) {
      throw new Error('Process definition not found.');
    }

    await ProcessSequence.destroy({ where: { processDefId }, transaction: t });
    await ProcessElement.destroy({ where: { processDefId }, transaction: t });
    await definition.destroy({ transaction: t });

    return { message: 'Process definition and all associated elements deleted successfully.' };
  });
};

export const getStartForm = async (processDefId: string): Promise<StartFormDefinition> => {
  const startEventElement = await ProcessElement.findOne({
    where: {
      processDefId: parseInt(processDefId, 10),
      type: 'START_EVENT',
    },
    include: [
      {
        model: ElementFormLink,
        as: 'elementFormLinks',
        include: [
          {
            model: FieldDefinition,
            as: 'fieldDefinition',
          },
        ],
      },
    ],
    order: [[{ model: ElementFormLink, as: 'elementFormLinks' }, 'displayOrder', 'ASC']],
  });

  if (!startEventElement) {
    throw new Error('Start form definition not found for this process.');
  }

  // elementFormLinks se pobla con el include de arriba (siempre es un arreglo, posiblemente vacío).
  const links = startEventElement.elementFormLinks ?? [];
  const formFields = links.map((link) =>
    // fieldDefinition se pobla con el include anidado; field_def_id es NOT NULL, por lo que siempre existe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    toFormField(link.fieldDefinition!, link, null),
  );

  const formDefinition: StartFormDefinition = {
    // Se conserva `||` (no `??`): un nombre vacío cae al valor por defecto como en el JS original.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    taskName: startEventElement.name || 'Iniciar Proceso',
    fields: formFields,
    actions: ['start'],
  };

  return formDefinition;
};
