import { Op } from 'sequelize';
import {
  ElementFormLink,
  FieldDefinition,
  ProcessDefinition,
  ProcessElement,
  ProcessInstance,
  Role,
  TaskInstance,
  User,
} from '../../models';
import { notFound } from '../../domain/errors';
import { attrs } from '../../utils/pick';
import {
  assignableRoleIds,
  toCaseAssignmentData,
  toInboxItem,
  toTaskForm,
  type AssignableRolePlain,
  type InboxItemDto,
  type InboxTaskPlain,
  type TaskFormDto,
  type TaskFormPlain,
} from './task.mappers';

/**
 * Obtiene la bandeja de entrada de un usuario.
 */
export const getMyTasks = async (userId: number, roleIds: number[]): Promise<InboxItemDto[]> => {
  const taskInstances = await TaskInstance.findAll({
    attributes: attrs<TaskInstance>()('id', 'processInstanceId', 'createdAt', 'dueDate'),
    where: {
      status: 'PENDING',
      [Op.or]: [{ assignedToUserId: userId }, { assignedToRoleId: { [Op.in]: roleIds } }],
    },
    include: [
      {
        model: ProcessInstance,
        as: 'processInstance',
        attributes: attrs<ProcessInstance>()('description'),
        include: [
          {
            model: ProcessDefinition,
            as: 'processDefinition',
            attributes: attrs<ProcessDefinition>()('name', 'version'),
          },
          {
            model: User,
            as: 'startedByUser',
            attributes: attrs<User>()('fullName'),
          },
        ],
      },
      {
        model: ProcessElement,
        as: 'processElement',
        attributes: attrs<ProcessElement>()('name'),
      },
    ],
    order: [['createdAt', 'desc']],
  });

  // El `as` es seguro: las proyecciones de `attributes` e `include` coinciden con InboxTaskPlain.
  return taskInstances.map((task) => toInboxItem(task.get({ plain: true }) as InboxTaskPlain));
};

export const getTaskForm = async (taskId: string): Promise<TaskFormDto> => {
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
    throw notFound('Task not found');
  }

  // El `as` es seguro: los includes anidados de arriba coinciden con TaskFormPlain.
  const plain = taskInstance.get({ plain: true }) as TaskFormPlain;
  const formDefinition = toTaskForm(plain);

  // Asignación de casos: la tarea ofrece los usuarios de cada rol asignable.
  const roleIds = assignableRoleIds(plain);
  if (roleIds.length > 0) {
    const roles = await Role.findAll({
      where: { id: { [Op.in]: roleIds } },
      attributes: attrs<Role>()('id', 'name'),
      include: {
        model: User,
        as: 'users',
        attributes: attrs<User>()('id', 'fullName', 'email'),
        through: { attributes: [] },
      },
      // Sin orden en el JS original; se fija para que la respuesta sea estable.
      order: [
        ['id', 'ASC'],
        [{ model: User, as: 'users' }, 'id', 'ASC'],
      ],
    });
    // El `as` es seguro: la proyección de arriba coincide con AssignableRolePlain.
    formDefinition.caseAssignmentData = toCaseAssignmentData(
      roles.map((role) => role.get({ plain: true }) as AssignableRolePlain),
    );
  }

  return formDefinition;
};
