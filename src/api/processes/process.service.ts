import {
  Op,
  type InferAttributes,
  type InferCreationAttributes,
  type Transaction,
  type WhereOptions,
} from 'sequelize';
import {
  sequelize,
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  ProcessInstance,
  ElementFormLink,
  FieldDefinition,
} from '../../models';
import { attrs, pick } from '../../utils/pick';
import { activeVersionConflict, modelError, notFound } from '../../domain/errors';
import { toFormField, type FormFieldDto } from '../../utils/formFields';
import { syncFormFields } from '../formdata-elements/element-form.service';
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
// Listas blancas de escritura (FR-029, data-model §9): id, version, createdAt y processDefId nunca se aplican desde el cuerpo.
const DEFINITION_KEYS = [
  'businessProcessKey',
  'name',
  'description',
  'category',
  'status',
  'bpmnProcessId',
] as const satisfies readonly (keyof ProcessDefinitionCreation)[];
const ELEMENT_KEYS = [
  'bpmnElementId',
  'name',
  'description',
  'type',
  'assignedRoleId',
  'webhookTarget',
  'slaDefinition',
  'actions',
  'caseAssignmentConfig',
] as const satisfies readonly (keyof ProcessElementCreation)[];
const SEQUENCE_KEYS = [
  'sourceElementBpmnId',
  'targetElementBpmnId',
  'conditionExpression',
] as const satisfies readonly (keyof ProcessSequenceCreation)[];

// El cuerpo llega sin validar en profundidad (FR-023); `pick` descarta todo lo que no esté en la lista blanca.
const pickDefinition = (data: SaveProcessInput): Partial<ProcessDefinitionCreation> => ({
  ...pick(data as Partial<ProcessDefinitionCreation>, DEFINITION_KEYS),
  bpmnXml: JSON.stringify(data.diagramJson),
});
const pickElement = (el: IncomingElement): Partial<ProcessElementCreation> =>
  pick(el as Partial<ProcessElementCreation>, ELEMENT_KEYS);
const pickSequence = (seq: IncomingSequence): Partial<ProcessSequenceCreation> =>
  pick(seq as Partial<ProcessSequenceCreation>, SEQUENCE_KEYS);

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
    throw activeVersionConflict(
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
      existing.set(pickElement(incomingEl));
      toUpdate.push(existing);
    } else {
      toCreate.push({ ...pickElement(incomingEl), processDefId } as ProcessElementCreation);
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

/**
 * Sincroniza los campos de formulario de cada elemento que trae `formFields` en el payload
 * (`elementIds`: bpmnElementId → id del elemento guardado). Sin `formFields`, no se tocan.
 */
async function syncElementFormFields(
  elementIds: ReadonlyMap<string, number>,
  incomingElements: IncomingElement[],
  t: Transaction,
): Promise<void> {
  for (const incomingEl of incomingElements) {
    const elementId = elementIds.get(incomingEl.bpmnElementId);
    if (incomingEl.formFields && elementId !== undefined) {
      await syncFormFields(elementId, incomingEl.formFields, t);
    }
  }
}

async function syncSequences(
  processDefId: number,
  incomingSequences: IncomingSequence[] | undefined,
  t: Transaction,
): Promise<void> {
  await ProcessSequence.destroy({ where: { processDefId }, transaction: t });
  if (incomingSequences && incomingSequences.length > 0) {
    const sequencesToCreate = incomingSequences.map(
      (seq) => ({ ...pickSequence(seq), processDefId }) as ProcessSequenceCreation,
    );
    await ProcessSequence.bulkCreate(sequencesToCreate, { transaction: t });
  }
}

export const getSaveAnalysis = async (id: string): Promise<SaveAnalysisDto> => {
  const definition = await ProcessDefinition.findByPk(parseInt(id, 10), {
    attributes: attrs<ProcessDefinition>()('id', 'status'),
  });
  if (!definition) {
    throw notFound('Process definition not found.');
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
  const { elements = [], sequences = [] } = data;
  const definitionData = pickDefinition(data);

  return sequelize.transaction(async (t) => {
    const definitionToUpdate = id ? await ProcessDefinition.findByPk(id, { transaction: t }) : null;
    // N-01: un id inexistente en PUT es 404 y nunca cae en la rama de alta.
    if (id && !definitionToUpdate) {
      throw notFound('Process definition not found.');
    }
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
      // FR-028: la nueva versión es MAX(version) de la clave + 1, calculado dentro de la transacción.
      const maxVersion = await ProcessDefinition.max<number, ProcessDefinition>('version', {
        where: { businessProcessKey: definitionToUpdate.businessProcessKey },
        transaction: t,
      });
      const newDefinition = await ProcessDefinition.create(
        {
          ...definitionData,
          businessProcessKey: definitionToUpdate.businessProcessKey,
          version: maxVersion + 1,
          status: 'DRAFT',
        } as ProcessDefinitionCreation,
        { transaction: t },
      );

      const newProcessDefId = newDefinition.id;

      const newElements = await ProcessElement.bulkCreate(
        elements.map(
          (el) => ({ ...pickElement(el), processDefId: newProcessDefId }) as ProcessElementCreation,
        ),
        { transaction: t, returning: true },
      );
      await ProcessSequence.bulkCreate(
        sequences.map(
          (seq) =>
            ({ ...pickSequence(seq), processDefId: newProcessDefId }) as ProcessSequenceCreation,
        ),
        { transaction: t },
      );

      // Los campos de la nueva versión salen del payload (el modelador envía la lista completa).
      await syncElementFormFields(
        new Map(newElements.map((el) => [el.bpmnElementId, el.id])),
        elements,
        t,
      );

      return toDefinitionRow(newDefinition);
    } else {
      let processDefinition: ProcessDefinition;
      const finalDefinitionData = definitionData;

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
        await definitionToUpdate.update(finalDefinitionData, { transaction: t });
        processDefinition = definitionToUpdate;
      } else {
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

      const savedElements = await ProcessElement.findAll({
        where: { processDefId },
        attributes: attrs<ProcessElement>()('id', 'bpmnElementId'),
        transaction: t,
      });
      await syncElementFormFields(
        new Map(savedElements.map((el) => [el.bpmnElementId, el.id])),
        elements,
        t,
      );

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
      throw notFound('Process definition not found.');
    }

    if (data.status === 'ACTIVE' && definitionToActivate.status !== 'ACTIVE') {
      await validateSingleActiveVersion(processDefId, definitionToActivate.businessProcessKey, t);
      // validateSingleActiveVersion ya lanza si existe otra ACTIVE: no queda nada que pasar a DEPRECATED (AP-05).
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
        throw notFound('Process definition not found.');
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
      { model: ProcessSequence, as: 'processSequences' },
      {
        model: ProcessElement,
        as: 'processElements',
        include: [
          {
            model: ElementFormLink,
            as: 'elementFormLinks',
            // La definición completa del campo acompaña a cada vínculo.
            include: [{ model: FieldDefinition, as: 'fieldDefinition' }],
          },
        ],
      },
    ],
    order: [
      [{ model: ProcessElement, as: 'processElements' }, 'id', 'ASC'],
      [
        { model: ProcessElement, as: 'processElements' },
        { model: ElementFormLink, as: 'elementFormLinks' },
        'displayOrder',
        'ASC',
      ],
    ],
  });

  return processDefinition ? toDefinitionDetail(processDefinition) : null;
};

export const deleteProcessDefinition = async (id: string): Promise<{ message: string }> => {
  const processDefId = parseInt(id, 10);
  return sequelize.transaction(async (t) => {
    const definition = await ProcessDefinition.findByPk(processDefId, { transaction: t });
    if (!definition) {
      throw notFound('Process definition not found.');
    }

    await ProcessSequence.destroy({ where: { processDefId }, transaction: t });
    // Los vínculos de formulario se borran antes que sus elementos.
    const elementIds = (
      await ProcessElement.findAll({
        where: { processDefId },
        attributes: attrs<ProcessElement>()('id'),
        transaction: t,
      })
    ).map((el) => el.id);
    await ElementFormLink.destroy({
      where: { elementId: { [Op.in]: elementIds } },
      transaction: t,
    });
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
    throw notFound('Start form definition not found for this process.');
  }

  // elementFormLinks se pobla con el include de arriba (siempre es un arreglo, posiblemente vacío).
  const links = startEventElement.elementFormLinks ?? [];
  const formFields = links.map((link) => {
    // FR-027: un vínculo que apunta a una FieldDefinition inexistente es un error del modelo (422).
    if (!link.fieldDefinition) {
      throw modelError(`Field definition ${link.fieldDefId} not found for start form link.`);
    }
    return toFormField(link.fieldDefinition, link, null);
  });

  const formDefinition: StartFormDefinition = {
    // Se conserva `||` (no `??`): un nombre vacío cae al valor por defecto como en el JS original.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    taskName: startEventElement.name || 'Iniciar Proceso',
    fields: formFields,
    actions: ['start'],
  };

  return formDefinition;
};
