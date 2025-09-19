
const prisma = require('../../utils/prisma');

/**
 * Obtiene la bandeja de entrada de un usuario.
 * Consulta las tareas pendientes asignadas directamente al usuario o a su rol.
 *
 * @param {number} userId - El ID del usuario autenticado.
 * @param {number} roleId - El ID del rol del usuario autenticado.
 * @returns {Promise<Array>} - Una promesa que resuelve a un array de tareas formateadas.
 */
const getMyTasks = async (userId, roleId) => {
  const taskInstances = await prisma.taskInstance.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { assignedToUserId: userId },
        { assignedToRoleId: roleId },
      ],
    },
    include: {
      processInstance: {
        include: {
          processDefinition: true,
          startedByUser: true,
        },
      },
      processElement: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedTasks = taskInstances.map(task => ({
    taskId: task.id,
    taskName: task.processElement.name,
    processInstanceId: task.processInstanceId,
    processName: task.processInstance.processDefinition.name,
    processStartedBy: task.processInstance.startedByUser.name,
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
  const taskInstance = await prisma.taskInstance.findUnique({
    where: { id: parseInt(taskId, 10) },
    include: {
      processElement: {
        include: {
          elementFormLinks: {
            orderBy: { displayOrder: 'asc' }, // Ordenar campos por displayOrder
            include: {
              fieldDefinition: true,
            },
          },
        },
      },
      processInstance: true,
    },
  });

  if (!taskInstance) {
    // En un caso real, podríamos lanzar un error personalizado
    throw new Error('Task not found');
  }

  const businessData = taskInstance.processInstance.businessData || {};

  const formFields = taskInstance.processElement.elementFormLinks.map(link => {
    return {
      name: link.fieldDefinition.name,
      label: link.fieldDefinition.label,
      fieldType: link.fieldDefinition.fieldType,
      value: businessData[link.fieldDefinition.name] || null, // Pre-poblar valor si existe
      validations: {
        ...link.fieldDefinition.validations, // Validaciones globales
        isRequired: link.isRequired,
        isReadonly: link.isReadonly,
        ...link.contextualValidations, // Validaciones específicas de esta tarea
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
