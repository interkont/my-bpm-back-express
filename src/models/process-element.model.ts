import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { ElementType } from '../domain/constants';
import type { JsonObject, JsonValue } from '../domain/types';
import type { ProcessDefinition } from './process-definition.model';
import type { ElementFormLink } from './element-form-link.model';
import type { TaskInstance } from './task-instance.model';
import type { Role } from './role.model';

export class ProcessElement extends Model<
  InferAttributes<ProcessElement>,
  InferCreationAttributes<ProcessElement>
> {
  declare id: CreationOptional<number>;
  declare processDefId: number;
  declare bpmnElementId: string;
  declare name: CreationOptional<string | null>;
  declare description: CreationOptional<string | null>;
  declare type: ElementType;
  declare assignedRoleId: CreationOptional<number | null>;
  declare webhookTarget: CreationOptional<string | null>;
  declare slaDefinition: CreationOptional<JsonValue | null>;
  declare actions: CreationOptional<JsonValue | null>;
  // Llega sin validar desde el modelador (p. ej. { isCaseAssignment: true, assignableRoles: [1, 5] }).
  declare caseAssignmentConfig: CreationOptional<JsonObject | null>;

  // Asociaciones (se pueblan solo con include)
  declare processDefinition?: NonAttribute<ProcessDefinition>;
  declare elementFormLinks?: NonAttribute<ElementFormLink[]>;
  declare taskInstances?: NonAttribute<TaskInstance[]>;
  declare assignedRole?: NonAttribute<Role>;
}

ProcessElement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    processDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'process_def_id',
    },
    bpmnElementId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'bpmn_element_id',
    },
    name: {
      type: DataTypes.STRING(255),
    },
    description: {
      type: DataTypes.TEXT,
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    assignedRoleId: {
      type: DataTypes.INTEGER,
      field: 'assigned_role_id',
    },
    webhookTarget: {
      type: DataTypes.TEXT,
      field: 'webhook_target',
    },
    slaDefinition: {
      type: DataTypes.JSONB,
      field: 'sla_definition',
    },
    // Nulo en los elementos que no son USER_TASK.
    actions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Configuración de asignación de casos; nula en las tareas que no la usan.
    caseAssignmentConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'case_assignment_config',
    },
  },
  {
    sequelize,
    modelName: 'ProcessElement',
    tableName: 'process_elements',
    timestamps: false,
  },
);
