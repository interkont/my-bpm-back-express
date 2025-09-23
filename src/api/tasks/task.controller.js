const taskService = require('./task.service');
const processEngineService = require('../engine/processEngine.service'); // Importar el motor
const catchAsync = require('../../utils/catchAsync');

/**
 * Controlador para obtener la bandeja de entrada del usuario autenticado.
 * (Función existente)
 */
const getMyTasks = catchAsync(async (req, res) => {
  const { id: userId, roleId } = req.user;

  if (!userId || !roleId) {
    return res.status(401).json({ error: 'User authentication data is missing.' });
  }

  const tasks = await taskService.getMyTasks(userId, roleId);
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
  const completionData = req.body; // { action: 'approve', formData: { ... } }
  const { id: userId, roleId } = req.user;

  const result = await processEngineService.completeTask(parseInt(taskId), completionData, userId, roleId);
  
  res.status(200).json(result);
});


module.exports = {
  getMyTasks,
  getTaskForm,
  completeTask, // Exportar la nueva función
};
