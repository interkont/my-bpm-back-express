import { missingAuthData } from '../../domain/errors';
import { catchAsync } from '../../utils/catchAsync';
import { completeTask as completeTaskInEngine } from '../engine/execution.service';
import type { CompleteTaskInput } from './task.schemas';
import * as taskService from './task.service';

/**
 * Controlador para obtener la bandeja de entrada del usuario autenticado.
 */
export const getMyTasks = catchAsync(async (req, res) => {
  // `protect` siempre puebla `req.user` antes de llegar aquí; si faltara, el JS original
  // también fallaba al desestructurar `undefined`.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { id: userId, roleIds } = req.user!;

  if (!userId || !roleIds) {
    throw missingAuthData('User authentication data is missing.');
  }

  const tasks = await taskService.getMyTasks(userId, roleIds);
  res.status(200).json(tasks);
});

/**
 * Controlador para obtener la definición del formulario de una tarea.
 */
export const getTaskForm = catchAsync<{ id: string }>(async (req, res) => {
  const { id } = req.params;
  const formDefinition = await taskService.getTaskForm(id);
  res.status(200).json(formDefinition);
});

/**
 * Completa una tarea y avanza el proceso.
 */
export const completeTask = catchAsync<{ id: string }, unknown, CompleteTaskInput>(
  async (req, res) => {
    const { id: taskId } = req.params;
    const completionData = req.body;
    // `protect` siempre puebla `req.user` antes de llegar aquí (ver getMyTasks).
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: userId, roleIds } = req.user!;

    const result = await completeTaskInEngine(parseInt(taskId), completionData, userId, roleIds);

    res.status(200).json(result);
  },
);
