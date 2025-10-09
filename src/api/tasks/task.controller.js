const taskService = require('./task.service');
const processEngineService = require('../engine/processEngine.service');
const catchAsync = require('../../utils/catchAsync');

/**
 * Controlador para obtener la bandeja de entrada del usuario autenticado.
 * (Función existente)
 */
const getMyTasks = catchAsync(async (req, res) => {
  // --- CAMBIO QUIRÚRGICO ---
  const { id: userId, roleIds } = req.user; // Ahora extraemos 'roleIds' (plural)

  if (!userId || !roleIds) { // Validamos 'roleIds'
    return res.status(401).json({ error: 'User authentication data is missing.' });
  }

  const tasks = await taskService.getMyTasks(userId, roleIds); // Pasamos el array de IDs
  // --- FIN CAMBIO QUIRÚRGICO ---
  res.status(200).json(tasks);
});

/**
 * Controlador para obtener la definición del formulario de una tarea.
 * (Función existente)
 */
const getTaskForm = catchAsync(async (req, res) => {
  const { id } = req.params;
  const formDefinition = await taskService.getTaskForm(id);
  res.status(200).json(formDefinition);
});

/**
 * Completa una tarea y avanza el proceso.
 */
const completeTask = catchAsync(async (req, res) => {
  const { id: taskId } = req.params;
  const completionData = req.body;
  // --- CAMBIO QUIRÚRGICO ---
  const { id: userId, roleIds } = req.user; // También usamos 'roleIds' aquí

  const result = await processEngineService.completeTask(parseInt(taskId), completionData, userId, roleIds);
  // --- FIN CAMBIO QUIRÚRGICO ---
  
  res.status(200).json(result);
});


module.exports = {
  getMyTasks,
  getTaskForm,
  completeTask,
};
