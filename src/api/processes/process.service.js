const prisma = require('../../utils/prisma');

/**
 * Crea una nueva definición de proceso.
 * @param {object} data - Los datos para la nueva definición.
 * @returns {Promise<object>} La definición de proceso creada.
 */
const createProcessDefinition = async (data) => {
  return prisma.processDefinition.create({ data });
};

/**
 * Obtiene todas las definiciones de proceso, excluyendo el campo bpmnXml.
 * @returns {Promise<Array>} Un array con todas las definiciones.
 */
const getAllProcessDefinitions = async () => {
  return prisma.processDefinition.findMany({
    select: {
      id: true,
      businessProcessKey: true,
      name: true,
      description: true,
      version: true,
      category: true,
      status: true,
      bpmnProcessId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
};

/**
 * Obtiene una definición de proceso por su ID.
 * @param {number} id - El ID de la definición.
 * @returns {Promise<object|null>} La definición encontrada o null.
 */
const getProcessDefinitionById = async (id) => {
  return prisma.processDefinition.findUnique({ where: { id: parseInt(id, 10) } });
};

/**
 * Actualiza una definición de proceso.
 * @param {number} id - El ID de la definición a actualizar.
 * @param {object} data - Los datos a actualizar.
 * @returns {Promise<object>} La definición actualizada.
 */
const updateProcessDefinition = async (id, data) => {
  return prisma.processDefinition.update({
    where: { id: parseInt(id, 10) },
    data,
  });
};

/**
 * Elimina una definición de proceso.
 * @param {number} id - El ID de la definición a eliminar.
 * @returns {Promise<object>} La definición eliminada.
 */
const deleteProcessDefinition = async (id) => {
  return prisma.processDefinition.delete({ where: { id: parseInt(id, 10) } });
};

/**
 * Obtiene la definición del formulario para el evento de inicio de un proceso.
 * @param {number} processDefId - El ID de la definición del proceso.
 * @returns {Promise<object>} La definición del formulario de inicio.
 */
const getStartForm = async (processDefId) => {
  const startEventElement = await prisma.processElement.findFirst({
    where: {
      processDefId: parseInt(processDefId, 10),
      type: 'START_EVENT', // Buscamos el elemento de inicio
    },
    include: {
      elementFormLinks: {
        orderBy: { displayOrder: 'asc' },
        include: {
          fieldDefinition: true,
        },
      },
    },
  });

  if (!startEventElement) {
    throw new Error('Start form definition not found for this process.');
  }

  const formFields = startEventElement.elementFormLinks.map(link => {
    return {
      name: link.fieldDefinition.name,
      label: link.fieldDefinition.label,
      fieldType: link.fieldDefinition.fieldType,
      value: null, // El formulario de inicio nunca tiene valores pre-poblados
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
  createProcessDefinition,
  getAllProcessDefinitions,
  getProcessDefinitionById,
  updateProcessDefinition,
  deleteProcessDefinition,
  getStartForm, // Exportar la nueva función
};
