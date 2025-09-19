
const prisma = require('../../utils/prisma'); // Corregido

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

  // Mapeamos el resultado al formato de respuesta deseado para el API
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

module.exports = {
  getMyTasks,
};
