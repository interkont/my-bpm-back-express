const prisma = require('../../utils/prisma');

/**
 * Crea una nueva instancia de proceso.
 * @param {object} data - Los datos para la nueva instancia.
 * @returns {Promise<object>} La instancia de proceso creada.
 */
const createProcessInstance = async (data) => {
  return prisma.processInstance.create({ data });
};

// Define los campos a seleccionar de ProcessDefinition para evitar cargar el XML.
const processDefinitionSelect = {
  id: true,
  businessProcessKey: true,
  name: true,
  description: true,
  version: true,
  category: true,
  status: true,
  bpmnProcessId: true,
};

/**
 * Obtiene todas las instancias de proceso.
 * @returns {Promise<Array>} Un array con todas las instancias.
 */
const getAllProcessInstances = async () => {
  return prisma.processInstance.findMany({
    orderBy: { startTime: 'desc' },
    include: {
      processDefinition: {
        select: processDefinitionSelect // CORREGIDO: Usar el selector enriquecido
      },
      startedByUser: {
        select: { id: true, fullName: true, email: true }
      },
    }
  });
};

/**
 * Obtiene una instancia de proceso por su ID.
 * @param {number} id - El ID de la instancia.
 * @returns {Promise<object|null>} La instancia encontrada o null.
 */
const getProcessInstanceById = async (id) => {
  return prisma.processInstance.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      processDefinition: {
        select: processDefinitionSelect // CORREGIDO: Usar el selector para excluir bpmnXml
      },
      startedByUser: {
        select: { id: true, fullName: true, email: true }
      },
      taskInstances: true,
    }
  });
};

/**
 * Actualiza una instancia de proceso.
 * @param {number} id - El ID de la instancia a actualizar.
 * @param {object} data - Los datos a actualizar.
 * @returns {Promise<object>} La instancia actualizada.
 */
const updateProcessInstance = async (id, data) => {
  return prisma.processInstance.update({
    where: { id: parseInt(id, 10) },
    data,
  });
};

/**
 * Elimina una instancia de proceso.
 * @param {number} id - El ID de la instancia a eliminar.
 * @returns {Promise<object>} La instancia eliminada.
 */
const deleteProcessInstance = async (id) => {
  return prisma.processInstance.delete({ where: { id: parseInt(id, 10) } });
};

module.exports = {
  createProcessInstance,
  getAllProcessInstances,
  getProcessInstanceById,
  updateProcessInstance,
  deleteProcessInstance,
};
