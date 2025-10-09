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
 * (Función existente)
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
    // --- INICIO DE LA CORRECCIÓN QUIRÚRGICA ---
    processDescription: task.processInstance?.description, // <-- CAMBIO 1: Añadir descripción de la instancia
    processVersion: task.processInstance?.processDefinition?.version, // <-- CAMBIO 2: Añadir versión de la definición
    // --- FIN DE LA CORRECCIÓN QUIRÚRGICA ---
    processName: task.processInstance?.processDefinition?.name ?? 'Unknown Process',
    processStartedBy: task.processInstance?.startedByUser?.fullName ?? 'Unknown User',
    createdAt: task.createdAt,
    dueDate: task.dueDate,
  }));

  return formattedTasks;
};

// ... (El resto del archivo permanece intacto)
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
      throw new Error('Task not found');
    }
  
    const businessData = taskInstance.processInstance?.businessData || {};
  
    const formFields = taskInstance.processElement.elementFormLinks.map((link) => {
      return {
        name: link.fieldDefinition.name,
        label: link.fieldDefinition.label,
        fieldType: link.fieldDefinition.fieldType,
        value: businessData[link.fieldDefinition.name] || null,
        validations: {
          ...(link.fieldDefinition.validations || {}),
          isRequired: link.isRequired,
          isReadonly: link.isReadonly,
          ...(link.contextualValidations || {}),
        },
      };
    });
  
    const formDefinition = {
      taskName: taskInstance.processElement.name,
      fields: formFields,
      actions: taskInstance.processElement.actions || ['complete'],
    };
  
    return formDefinition;
  };
  
  module.exports = {
    getMyTasks,
    getTaskForm,
  };
