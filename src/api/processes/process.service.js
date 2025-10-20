const {
  sequelize,
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  ProcessInstance,
  ElementFormLink,
  FieldDefinition,
} = require('../../models');
const { Op } = require('sequelize');

/**
 * Valida que no exista otra versión activa para un process key.
 * @param {number} processDefId - El ID de la definición que se está actualizando (o null si es nueva).
 * @param {string} businessProcessKey - El ID de negocio del proceso.
 * @param {object} transaction - La transacción de Sequelize.
 */
async function validateSingleActiveVersion(processDefId, businessProcessKey, transaction) {
  const whereClause = {
    businessProcessKey,
    status: 'ACTIVE',
  };
  if (processDefId) {
    whereClause.id = { [Op.not]: processDefId };
  }

  const activeVersion = await ProcessDefinition.findOne({ where: whereClause, transaction });

  if (activeVersion) {
    throw new Error(`An active version already exists for this process (Version: ${activeVersion.version}, ID: ${activeVersion.id}). Please deactivate it before activating another one.`);
  }
}

async function syncElements(processDefId, incomingElements, transaction) {
  const existingElements = await ProcessElement.findAll({ where: { processDefId }, transaction });
  const existingElementsMap = new Map(existingElements.map(el => [el.bpmnElementId, el]));
  const incomingElementIds = new Set(incomingElements.map(el => el.bpmnElementId));

  const toCreate = [];
  const toUpdate = [];

  for (const incomingEl of incomingElements) {
    const existing = existingElementsMap.get(incomingEl.bpmnElementId);
    if (existing) {
      existing.set(incomingEl);
      toUpdate.push(existing.save({ transaction }));
    } else {
      toCreate.push({ ...incomingEl, processDefId });
    }
  }

  const toDeleteIds = existingElements
    .filter(el => !incomingElementIds.has(el.bpmnElementId))
    .map(el => el.id);

  await Promise.all([
    ProcessElement.bulkCreate(toCreate, { transaction }),
    ...toUpdate,
    ProcessElement.destroy({ where: { id: toDeleteIds }, transaction })
  ]);
}

async function syncSequences(processDefId, incomingSequences, transaction) {
  await ProcessSequence.destroy({ where: { processDefId }, transaction });
  if (incomingSequences && incomingSequences.length > 0) {
      const sequencesToCreate = incomingSequences.map(seq => ({ ...seq, processDefId }));
      await ProcessSequence.bulkCreate(sequencesToCreate, { transaction });
  }
}

const saveProcessDefinition = async (id, data) => {
  const { elements = [], sequences = [], ...definitionData } = data;
  
  return sequelize.transaction(async (t) => {
    let definitionToUpdate = id ? await ProcessDefinition.findByPk(id, { transaction: t }) : null;
    let mustCreateNewVersion = false;

    // --- LÓGICA CORREGIDA ---
    if (definitionToUpdate) { // Si estamos actualizando un proceso existente...
      const runningInstancesCount = await ProcessInstance.count({
        where: { processDefId: id, status: { [Op.in]: ['RUNNING', 'PENDING'] } },
        transaction: t
      });

      // Si está ACTIVO o tiene instancias corriendo, cualquier PUT debe generar una nueva versión.
      if (definitionToUpdate.status === 'ACTIVE' || runningInstancesCount > 0) {
        mustCreateNewVersion = true;
      }
    }

    if (mustCreateNewVersion) {
      await definitionToUpdate.update({ status: 'DEPRECATED' }, { transaction: t });

      const newDefinition = await ProcessDefinition.create({
        ...definitionData,
        businessProcessKey: definitionToUpdate.businessProcessKey,
        version: definitionToUpdate.version + 1,
        status: 'ACTIVE',
        bpmnXml: JSON.stringify(data.diagramJson)
      }, { transaction: t });
      
      const newProcessDefId = newDefinition.id;

      const elementsToCreate = elements.map(el => ({ ...el, processDefId: newProcessDefId }));
      const sequencesToCreate = sequences.map(seq => ({ ...seq, processDefId: newProcessDefId }));

      await ProcessElement.bulkCreate(elementsToCreate, { transaction: t });
      await ProcessSequence.bulkCreate(sequencesToCreate, { transaction: t });
      
      return newDefinition;

    } else {
      // Esta rama ahora solo se ejecuta para crear un nuevo proceso o para actualizar un DRAFT.
      let processDefinition;
      const finalDefinitionData = { 
          ...definitionData, 
          bpmnXml: JSON.stringify(data.diagramJson) 
      };

      if (finalDefinitionData.status === 'ACTIVE') {
        const key = definitionToUpdate ? definitionToUpdate.businessProcessKey : finalDefinitionData.businessProcessKey;
        await validateSingleActiveVersion(id, key, t);
      }

      if (definitionToUpdate) {
        await definitionToUpdate.update(finalDefinitionData, { transaction: t });
        processDefinition = definitionToUpdate;
      } else {
        processDefinition = await ProcessDefinition.create({
            ...finalDefinitionData,
            version: 1,
            status: finalDefinitionData.status || 'DRAFT'
        }, { transaction: t });
      }

      const processDefId = processDefinition.id;

      await syncElements(processDefId, elements, t);
      await syncSequences(processDefId, sequences, t);
      
      return processDefinition;
    }
  });
};

const updateProcessDefinitionMetadata = async (id, data) => {
  const processDefId = parseInt(id, 10);
  
  return sequelize.transaction(async (t) => {
    if (data.status === 'ACTIVE') {
      const definition = await ProcessDefinition.findByPk(processDefId, { transaction: t });
      if (!definition) {
        throw new Error('Process definition not found.');
      }
      await validateSingleActiveVersion(processDefId, definition.businessProcessKey, t);
    }
    
    const allowedUpdates = {
      name: data.name,
      description: data.description,
      category: data.category,
      status: data.status,
    };

    Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

    const [updateCount] = await ProcessDefinition.update(allowedUpdates, {
      where: { id: processDefId },
      transaction: t,
    });

    if (updateCount === 0) {
      const definitionExists = await ProcessDefinition.findByPk(processDefId, { transaction: t, attributes: ['id'] });
      if (!definitionExists) {
        throw new Error('Process definition not found.');
      }
    }

    return ProcessDefinition.findByPk(processDefId, { transaction: t });
  });
};

const getAllProcessDefinitions = async () => {
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

const getAllProcessDefinitionsAdmin = async () => {
  return ProcessDefinition.findAll({
    attributes: {
      exclude: ['bpmnXml'],
    },
    order: [['createdAt', 'desc']],
  });
};

const getProcessDefinitionById = async (id) => {
  const processDefinition = await ProcessDefinition.findByPk(parseInt(id, 10), {
      include: [
          { model: ProcessElement, as: 'processElements' },
          { model: ProcessSequence, as: 'processSequences' }
      ]
  });

  if (!processDefinition) return null;

  const result = processDefinition.toJSON();
  
  result.elements = result.processElements;
  result.sequences = result.processSequences;
  delete result.processElements;
  delete result.processSequences;

  try {
    result.diagramJson = result.bpmnXml ? JSON.parse(result.bpmnXml) : {};
  } catch (error) {
    result.diagramJson = {};
  }
  delete result.bpmnXml;

  return result;
};

const deleteProcessDefinition = async (id) => {
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

const getStartForm = async (processDefId) => {
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

  const formFields = startEventElement.elementFormLinks.map((link) => {
    return {
      name: link.fieldDefinition.name,
      label: link.fieldDefinition.label,
      fieldType: link.fieldDefinition.fieldType,
      value: null,
      validations: {
        ...link.fieldDefinition.validations,
        isRequired: link.isRequired,
        isReadonly: link.isReadonly,
        ...link.contextualValidations,
      },
    };
  });

  const formDefinition = {
    taskName: startEventElement.name || 'Iniciar Proceso',
    fields: formFields,
    actions: ['start'],
  };

  return formDefinition;
};

module.exports = {
  saveProcessDefinition,
  updateProcessDefinitionMetadata,
  getAllProcessDefinitions,
  getAllProcessDefinitionsAdmin,
  getProcessDefinitionById,
  deleteProcessDefinition,
  getStartForm,
};
