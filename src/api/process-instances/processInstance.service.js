const {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
} = require('../../models');

/**
 * Crea un registro de instancia de proceso directamente en la base de datos (función administrativa).
 * @param {object} data - Los datos para la nueva instancia.
 * @returns {Promise<object>} La instancia de proceso creada.
 */
const createProcessInstanceRecord = async (data) => {
  return ProcessInstance.create(data);
};

// ... (El resto de las funciones: getAllProcessInstances, getProcessInstanceById, etc. permanecen sin cambios)
// Define los campos a seleccionar de ProcessDefinition para evitar cargar el XML.
const processDefinitionAttributes = [
  'id',
  'businessProcessKey',
  'name',
  'description',
  'version',
  'category',
  'status',
  'bpmnProcessId',
];

/**
 * Obtiene todas las instancias de proceso.
 * @returns {Promise<Array>} Un array con todas las instancias.
 */
const getAllProcessInstances = async () => {
  return ProcessInstance.findAll({
    order: [['startTime', 'desc']],
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: ['id', 'fullName', 'email'],
      },
    ],
  });
};

/**
 * Obtiene una instancia de proceso por su ID.
 * @param {number} id - El ID de la instancia.
 * @returns {Promise<object|null>} La instancia encontrada o null.
 */
const getProcessInstanceById = async (id) => {
  return ProcessInstance.findByPk(parseInt(id, 10), {
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: ['id', 'fullName', 'email'],
      },
      // --- INICIO DE LA CORRECCIÓN QUIRÚRGICA ---
      {
        model: TaskInstance,
        as: 'taskInstances',
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: ProcessElement,
            as: 'processElement',
            attributes: ['name', 'bpmnElementId'],
          },
        ],
      },
      //
    ],
  });
};

/**
 * Actualiza una instancia de proceso.
 * @param {number} id - El ID de la instancia a actualizar.
 * @param {object} data - Los datos a actualizar.
 * @returns {Promise<object>} La instancia actualizada.
 */
const updateProcessInstance = async (id, data) => {
  return ProcessInstance.update(data, {
    where: { id: parseInt(id, 10) },
  });
};

/**
 * Elimina una instancia de proceso.
 * @param {number} id - El ID de la instancia a eliminar.
 * @returns {Promise<object>} La instancia eliminada.
 */
const deleteProcessInstance = async (id) => {
  return ProcessInstance.destroy({ where: { id: parseInt(id, 10) } });
};

module.exports = {
  createProcessInstanceRecord, // Exportar con el nuevo nombre
  getAllProcessInstances,
  getProcessInstanceById,
  updateProcessInstance,
  deleteProcessInstance,
};
