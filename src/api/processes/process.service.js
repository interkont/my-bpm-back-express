const prisma = require('../../utils/prisma'); // Corregido

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

module.exports = {
  createProcessDefinition,
  getAllProcessDefinitions,
  getProcessDefinitionById,
  updateProcessDefinition,
  deleteProcessDefinition,
};
