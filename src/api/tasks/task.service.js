const {
  TaskInstance,
  ProcessInstance,
  ProcessDefinition,
  User,
  ProcessElement,
  ElementFormLink,
  FieldDefinition,
} = require('../../models');
const { Op } = require('sequelize');

/**
 * Obtiene la bandeja de entrada de un usuario.
 * Consulta las tareas pendientes asignadas directamente al usuario o a su rol.
 *
 * @param {number} userId - El ID del usuario autenticado.
 * @param {number} roleId - El ID del rol del usuario autenticado.
 * @returns {Promise<Array>} - Una promesa que resuelve a un array de tareas formateadas.
 */
const getMyTasks = async (userId, roleId) => {
  const taskInstances = await TaskInstance.findAll({
    where: {
      status: 'PENDING',
      [Op.or]: [{ assignedToUserId: userId }, { assignedToRoleId: roleId }],
    },
    include: [
      {
        model: ProcessInstance,
        as: 'processInstance',
        include: [
          {
            model: ProcessDefinition,
            as: 'processDefinition',
          },
          {
            model: User,
            as: 'startedByUser',
          },
        ],
      },
      {
        model: ProcessElement,
        as: 'processElement',
      },
    ],
    order: [['createdAt', 'desc']],
  });

  const formattedTasks = taskInstances.map((task) => ({
    taskId: task.id,
    taskName: task.processElement?.name ?? 'Unnamed Task',
    processInstanceId: task.processInstanceId,
    processName: task.processInstance?.processDefinition?.name ?? 'Unknown Process',
    processStartedBy: task.processInstance?.startedByUser?.fullName ?? 'Unknown User',
    createdAt: task.createdAt,
    dueDate: task.dueDate,
  }));

  return formattedTasks;
};

/**
 * Obtiene la definición del formulario para una tarea específica.
 *
 * @param {number} taskId - El ID de la instancia de la tarea.
 * @returns {Promise<object>} - Una promesa que resuelve a la definición del formulario.
 */
const getTaskForm = async (taskId) => {
  const taskInstance = await TaskInstance.findByPk(parseInt(taskId, 10), {
    include: [
      {
        model: ProcessElement,
        as: 'processElement',
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
      },
      {
        model: ProcessInstance,
        as: 'processInstance',
      },
    ],
    order: [
      [
        { model: ProcessElement, as: 'processElement' },
        { model: ElementFormLink, as: 'elementFormLinks' },
        'displayOrder',
        'ASC',
      ],
    ],
  });

  if (!taskInstance) {
    // En un caso real, podríamos lanzar un error personalizado
    throw new Error('Task not found');
  }

  const businessData = taskInstance.processInstance?.businessData || {};

  const formFields = taskInstance.processElement.elementFormLinks.map((link) => {
    return {
      name: link.fieldDefinition.name,
      label: link.fieldDefinition.label,
      fieldType: link.fieldDefinition.fieldType,
      value: businessData[link.fieldDefinition.name] || null, // Pre-poblar valor si existe
      validations: {
        ...(link.fieldDefinition.validations || {}), // Asegurarse que validations no sea null
        isRequired: link.isRequired,
        isReadonly: link.isReadonly,
        ...(link.contextualValidations || {}), // Asegurarse que contextualValidations no sea null
      },
    };
  });

  const formDefinition = {
    taskName: taskInstance.processElement.name,
    fields: formFields,
    actions: taskInstance.processElement.actions || ['complete'], // Acciones posibles (botones)
  };

  return formDefinition;
};

module.exports = {
  getMyTasks,
  getTaskForm, // Exportar la nueva función
};
