const {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
  Role, // <-- Añadido el modelo Role para poder incluirlo
} = require('../../models');

// ... (createProcessInstanceRecord y getAllProcessInstances sin cambios)
const createProcessInstanceRecord = async (data) => {
    return ProcessInstance.create(data);
};
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
 * --- MODIFICADO ---
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
      {
        model: TaskInstance,
        as: 'taskInstances',
        order: [['createdAt', 'ASC']],
        include: [
          // --- INICIO DE LA CORRECCIÓN QUIRÚRGICA ---
          {
            model: ProcessElement,
            as: 'processElement',
            attributes: ['name', 'bpmnElementId'],
          },
          {
            model: Role,
            as: 'assignedRole',
            attributes: ['name'],
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['fullName'],
          },
          {
            model: User,
            as: 'completedByUser',
            attributes: ['fullName'],
          },
          // --- FIN DE LA CORRECCIÓN QUIRÚRGICA ---
        ],
      },
    ],
  });
};

// ... (updateProcessInstance y deleteProcessInstance sin cambios)
const updateProcessInstance = async (id, data) => {
    return ProcessInstance.update(data, {
      where: { id: parseInt(id, 10) },
    });
};
const deleteProcessInstance = async (id) => {
    return ProcessInstance.destroy({ where: { id: parseInt(id, 10) } });
};
  
module.exports = {
  createProcessInstanceRecord,
  getAllProcessInstances,
  getProcessInstanceById,
  updateProcessInstance,
  deleteProcessInstance,
};
