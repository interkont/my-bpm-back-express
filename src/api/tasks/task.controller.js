const taskService = require('./task.service');
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
 */
const getTaskForm = catchAsync(async (req, res) => {
  const { id } = req.params;
  const formDefinition = await taskService.getTaskForm(id);
  res.status(200).json(formDefinition);
});

module.exports = {
  getMyTasks,
  getTaskForm, // Exportar la nueva función
};
