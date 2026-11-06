import { Op, type CreationAttributes } from 'sequelize';
import {
  ProcessInstance,
  ProcessDefinition,
  User,
  TaskInstance,
  ProcessElement,
  Role,
  FieldDefinition,
} from '../../models';
import { attrs } from '../../utils/pick';
import {
  toInstanceDetail,
  toInstanceListItem,
  toInstanceRow,
  type InstanceDetailDto,
  type InstanceListItemDto,
  type InstanceRowDto,
} from './processInstance.mappers';
import type {
  CreateProcessInstanceRecordInput,
  UpdateProcessInstanceInput,
} from './processInstance.schemas';

const processDefinitionAttributes = attrs<ProcessDefinition>()(
  'id',
  'businessProcessKey',
  'name',
  'description',
  'version',
  'category',
  'status',
  'bpmnProcessId',
);
const userSummaryAttributes = attrs<User>()('id', 'fullName', 'email');
const processElementAttributes = attrs<ProcessElement>()('name', 'bpmnElementId');
const roleNameAttributes = attrs<Role>()('name');
const userNameAttributes = attrs<User>()('fullName');
const fieldDefinitionAttributes = attrs<FieldDefinition>()('name', 'label', 'fieldType');

export const createProcessInstanceRecord = async (
  data: CreateProcessInstanceRecordInput & { startedByUserId: number },
): Promise<InstanceRowDto> => {
  // Aserción: la entrada aún no se valida (US3); Sequelize/BD rechazan los faltantes
  // igual que antes y las claves extra se ignoran (asignación masiva conservada).
  const instance = await ProcessInstance.create(data as CreationAttributes<ProcessInstance>);
  return toInstanceRow(instance);
};

export const getAllProcessInstances = async (): Promise<InstanceListItemDto[]> => {
  const instances = await ProcessInstance.findAll({
    order: [['startTime', 'desc']],
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: userSummaryAttributes,
      },
    ],
  });
  return instances.map(toInstanceListItem);
};

/**
 * Obtiene una instancia de proceso por su ID, enriqueciendo los datos de negocio.
 */
export const getProcessInstanceById = async (id: string): Promise<InstanceDetailDto | null> => {
  const instance = await ProcessInstance.findByPk(parseInt(id, 10), {
    include: [
      {
        model: ProcessDefinition,
        as: 'processDefinition',
        attributes: processDefinitionAttributes,
      },
      {
        model: User,
        as: 'startedByUser',
        attributes: userSummaryAttributes,
      },
      {
        model: TaskInstance,
        as: 'taskInstances',
        order: [['createdAt', 'ASC']],
        include: [
          { model: ProcessElement, as: 'processElement', attributes: processElementAttributes },
          { model: Role, as: 'assignedRole', attributes: roleNameAttributes },
          { model: User, as: 'assignedUser', attributes: userNameAttributes },
          { model: User, as: 'completedByUser', attributes: userNameAttributes },
        ],
      },
    ],
  });

  if (!instance) {
    return null;
  }

  // Biblioteca de campos: metadatos (etiqueta, tipo) de cada clave de negocio.
  // Sin datos de negocio no se consulta nada.
  const businessDataKeys = Object.keys(instance.businessData ?? {});
  const fieldDefs =
    businessDataKeys.length === 0
      ? []
      : await FieldDefinition.findAll({
          where: { name: { [Op.in]: businessDataKeys } },
          attributes: fieldDefinitionAttributes,
        });

  return toInstanceDetail(instance, fieldDefs);
};

export const updateProcessInstance = async (
  id: string,
  data: UpdateProcessInstanceInput,
): Promise<[affectedCount: number]> => {
  // Aserción: la entrada aún no se valida (US3); se conserva la asignación masiva.
  return ProcessInstance.update(data as Partial<CreationAttributes<ProcessInstance>>, {
    where: { id: parseInt(id, 10) },
  });
};

export const deleteProcessInstance = async (id: string): Promise<number> => {
  return ProcessInstance.destroy({ where: { id: parseInt(id, 10) } });
};
