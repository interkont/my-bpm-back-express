const taskService = require('../services/task.service');
const catchAsync = require('../../utils/catchAsync');

/**
 * Controlador para obtener la bandeja de entrada del usuario autenticado.
 */
const getMyTasks = catchAsync(async (req, res) => {
  // El middleware de autenticación debería haber añadido el objeto 'user' a 'req'
  const { id: userId, roleId } = req.user;

  if (!userId || !roleId) {
    return res.status(401).json({ error: 'User authentication data is missing.' });
  }

  const tasks = await taskService.getMyTasks(userId, roleId);
  res.status(200).json(tasks);
});

module.exports = {
  getMyTasks,
};
