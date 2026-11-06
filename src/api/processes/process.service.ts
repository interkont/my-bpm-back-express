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
import type { ProcessDefinitionStatus } from '../../domain/constants';

type ProcessDefinitionCreation = InferCreationAttributes<ProcessDefinition>;
type ProcessElementCreation = InferCreationAttributes<ProcessElement>;
type ProcessSequenceCreation = InferCreationAttributes<ProcessSequence>;
type ElementFormLinkCreation = MakeNullishOptional<InferCreationAttributes<ElementFormLink>>;
type FormLinkData = Pick<
  ElementFormLink,
  'fieldDefId' | 'displayOrder' | 'isRequired' | 'isReadonly' | 'contextualValidations'
>;

// Elemento entrante del diagrama; el resto de claves (p. ej. formFields) se reenvía tal cual.
export interface IncomingElement {
  bpmnElementId: string;
  [key: string]: unknown;
}

// Secuencia entrante del diagrama; sus claves se reenvían tal cual.
export interface IncomingSequence {
  [key: string]: unknown;
}

// Carga libre de guardado (req.body): el resto de claves se reenvía a Sequelize sin filtrar (US3 añade lista blanca).
export interface SaveProcessPayload {
  elements?: IncomingElement[];
  sequences?: IncomingSequence[];
  diagramJson?: unknown;
  status?: ProcessDefinitionStatus;
  businessProcessKey?: string;
  [key: string]: unknown;
}

export interface MetadataPayload {
  name?: string;
  description?: string | null;
  category?: string | null;
  status?: ProcessDefinitionStatus;
}

export interface SaveAnalysis {
  state: ProcessDefinitionStatus;
  instancesCount: number;
  action: 'UPDATE_IN_PLACE' | 'CREATE_NEW_VERSION';
}

export interface StartFormField {
  name: string;
  label: string;
  fieldType: string;
  value: null;
  validations: Record<string, unknown>;
}

export interface StartFormDefinition {
  taskName: string;
  fields: StartFormField[];
  actions: string[];
}

/**
 * Valida que no exista otra versión activa para un process key.
 * @param processDefId - El ID de la definición que se está actualizando (o undefined si es nueva).
 * @param businessProcessKey - El ID de negocio del proceso.
 * @param transaction - La transacción de Sequelize.
 */
async function validateSingleActiveVersion(
  processDefId: string | number | undefined,
  businessProcessKey: string,
  transaction: Transaction,
): Promise<void> {
  const whereClause: WhereOptions<InferAttributes<ProcessDefinition>> = {
    businessProcessKey,
    status: 'ACTIVE',
    // El JS original pasa el id tal cual (string desde la ruta); Postgres lo coerciona (equivalencia 1:1).
    ...(processDefId ? { id: { [Op.not]: processDefId as number } } : {}),
  };

  const activeVersion = await ProcessDefinition.findOne({ where: whereClause, transaction });

  if (activeVersion) {
    throw new Error(
      `An active version already exists for this process (Version: ${activeVersion.version}, ID: ${activeVersion.id}). Please deactivate it before activating another one.`,
    );
  }
}

async function syncElements(
  processDefId: number,
  incomingElements: IncomingElement[],
  transaction: Transaction,
): Promise<void> {
  const existingElements = await ProcessElement.findAll({ where: { processDefId }, transaction });
  const existingElementsMap = new Map(existingElements.map((el) => [el.bpmnElementId, el]));
  const incomingElementIds = new Set(incomingElements.map((el) => el.bpmnElementId));

  const toCreate: ProcessElementCreation[] = [];
  const toUpdate: Promise<ProcessElement>[] = [];

  for (const incomingEl of incomingElements) {
    const existing = existingElementsMap.get(incomingEl.bpmnElementId);
    if (existing) {
      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      existing.set(incomingEl as Partial<InferAttributes<ProcessElement>>);
      toUpdate.push(existing.save({ transaction }));
    } else {
      // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
      toCreate.push({ ...incomingEl, processDefId } as ProcessElementCreation);
    }
  }

  const toDeleteIds = existingElements
    .filter((el) => !incomingElementIds.has(el.bpmnElementId))
    .map((el) => el.id);

  await Promise.all([
    ProcessElement.bulkCreate(toCreate, { transaction }),
    ...toUpdate,
    ProcessElement.destroy({ where: { id: toDeleteIds }, transaction }),
  ]);
}

async function syncSequences(
  processDefId: number,
  incomingSequences: IncomingSequence[] | undefined,
  transaction: Transaction,
): Promise<void> {
  await ProcessSequence.destroy({ where: { processDefId }, transaction });
  if (incomingSequences && incomingSequences.length > 0) {
    // Sequelize ignora claves que no son atributos; equivalencia 1:1, la lista blanca llega en US3 (FR-029).
    const sequencesToCreate = incomingSequences.map(
      (seq) => ({ ...seq, processDefId }) as ProcessSequenceCreation,
    );
    await ProcessSequence.bulkCreate(sequencesToCreate, { transaction });
  }
}

export const getSaveAnalysis = async (id: string): Promise<SaveAnalysis> => {
  const definition = await ProcessDefinition.findByPk(parseInt(id, 10), {
    attributes: ['id', 'status'],
  });
  if (!definition) {
    throw new Error('Process definition not found.');
  }

  // El JS original pasa el id como string; Postgres lo coerciona (equivalencia 1:1).
  const instancesCount = await ProcessInstance.count({
    where: { processDefId: id as unknown as number },
  });

  const response: SaveAnalysis = {
    state: definition.status,
    instancesCount,
    action: 'UPDATE_IN_PLACE',
  };

  if (definition.status === 'ACTIVE' || instancesCount > 0) {
    response.action = 'CREATE_NEW_VERSION';
  }

  return response;
};

export const saveProcessDefinition = async (
  id: string | undefined,
  data: SaveProcessPayload,
): Promise<ProcessDefinition> => {
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

      return newDefinition;
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
            // Se conserva `||` (no `??`): una cadena vac�a cae a DRAFT como en el JS original.
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            status: finalDefinitionData.status || 'DRAFT',
          } as ProcessDefinitionCreation,
          { transaction: t },
        );
      }

      const processDefId = processDefinition.id;

      await syncElements(processDefId, elements, t);
      await syncSequences(processDefId, sequences, t);

      return processDefinition;
    }
  });
};

export const updateProcessDefinitionMetadata = async (
  id: string,
  data: MetadataPayload,
): Promise<ProcessDefinition | null> => {
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

    const allowedUpdates: MetadataPayload = {
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

    return ProcessDefinition.findByPk(processDefId, { transaction: t });
  });
};

export const getAllProcessDefinitions = async (): Promise<ProcessDefinition[]> => {
  return ProcessDefinition.findAll({
    attributes: {
      exclude: ['bpmnXml'],
    },
    where: {
      status: 'ACTIVE',
    },
    order: [['createdAt', 'desc']],
  });
};

export const getAllProcessDefinitionsAdmin = async (): Promise<ProcessDefinition[]> => {
  return ProcessDefinition.findAll({
    attributes: {
      exclude: ['bpmnXml'],
    },
    order: [['createdAt', 'desc']],
  });
};

export const getProcessDefinitionById = async (
  id: string,
): Promise<Record<string, unknown> | null> => {
  const processDefinition = await ProcessDefinition.findByPk(parseInt(id, 10), {
    include: [
      { model: ProcessElement, as: 'processElements' },
      { model: ProcessSequence, as: 'processSequences' },
    ],
  });

  if (!processDefinition) return null;

  // Mismo orden de claves que el JS: toJSON() + elements/sequences/diagramJson, sin processElements/processSequences/bpmnXml.
  const result: Record<string, unknown> = { ...processDefinition.toJSON() };

  result.elements = result.processElements;
  result.sequences = result.processSequences;
  delete result.processElements;
  delete result.processSequences;

  try {
    const diagramJson: unknown = processDefinition.bpmnXml
      ? JSON.parse(processDefinition.bpmnXml)
      : {};
    result.diagramJson = diagramJson;
  } catch {
    result.diagramJson = {};
  }
  delete result.bpmnXml;

  return result;
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
  const formFields = links.map((link): StartFormField => {
    // fieldDefinition se pobla con el include anidado; field_def_id es NOT NULL, por lo que siempre existe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fieldDefinition = link.fieldDefinition!;
    return {
      name: fieldDefinition.name,
      label: fieldDefinition.label,
      fieldType: fieldDefinition.fieldType,
      value: null,
      validations: {
        ...fieldDefinition.validations,
        isRequired: link.isRequired,
        isReadonly: link.isReadonly,
        ...link.contextualValidations,
      },
    };
  });

  const formDefinition: StartFormDefinition = {
    // Se conserva `||` (no `??`): un nombre vac�o cae al valor por defecto como en el JS original.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    taskName: startEventElement.name || 'Iniciar Proceso',
    fields: formFields,
    actions: ['start'],
  };

  return formDefinition;
};
