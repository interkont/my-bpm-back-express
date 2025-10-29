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
const { enrichFieldValue } = require('../../utils/formUtils'); // Importar función centralizada

/**
 * Obtiene la bandeja de entrada de un usuario.
 * (Función existente)
 */
const getMyTasks = async (userId, roleIds) => { 
  const taskInstances = await TaskInstance.findAll({
    where: {
      status: 'PENDING',
      [Op.or]: [
        { assignedToUserId: userId }, 
        { assignedToRoleId: { [Op.in]: roleIds } }
      ],
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
    processDescription: task.processInstance?.description,
    processVersion: task.processInstance?.processDefinition?.version,
    processName: task.processInstance?.processDefinition?.name ?? 'Unknown Process',
    processStartedBy: task.processInstance?.startedByUser?.fullName ?? 'Unknown User',
    createdAt: task.createdAt,
    dueDate: task.dueDate,
  }));

  return formattedTasks;
};

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
      const fieldDef = link.fieldDefinition;
      const rawValue = businessData[fieldDef.name] || null;
      const enriched = enrichFieldValue(fieldDef, rawValue);

      return {
        name: fieldDef.name,
        label: fieldDef.label,
        fieldType: fieldDef.fieldType,
        value: enriched.value,
        validations: {
          ...enriched.validations,
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
