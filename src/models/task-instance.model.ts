import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { TaskStatus } from '../domain/constants';
import type { JsonValue } from '../domain/types';
import type { DocumentInstance } from './document-instance.model';
import type { ProcessElement } from './process-element.model';
import type { ProcessInstance } from './process-instance.model';
import type { Role } from './role.model';
import type { User } from './user.model';

export class TaskInstance extends Model<
  InferAttributes<TaskInstance>,
  InferCreationAttributes<TaskInstance>
> {
  declare id: CreationOptional<number>;
  declare processInstanceId: number;
  declare elementDefId: number;
  declare status: TaskStatus;
  declare comments: CreationOptional<string | null>;
  declare assignedToRoleId: CreationOptional<number | null>;
  declare assignedToUserId: CreationOptional<number | null>;
  declare dueDate: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare completedByUserId: CreationOptional<number | null>;
  declare completionTime: CreationOptional<Date | null>;
  declare completionPayload: CreationOptional<JsonValue | null>;

  declare processInstance?: NonAttribute<ProcessInstance>;
  declare processElement?: NonAttribute<ProcessElement>;
  declare completedByUser?: NonAttribute<User>;
  declare assignedUser?: NonAttribute<User>;
  declare assignedRole?: NonAttribute<Role>;
  declare documentInstances?: NonAttribute<DocumentInstance[]>;
}

TaskInstance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    processInstanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'process_instance_id',
    },
    elementDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'element_def_id',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    comments: {
      type: DataTypes.TEXT,
    },
    assignedToRoleId: {
      type: DataTypes.INTEGER,
      field: 'assigned_to_role_id',
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      field: 'assigned_to_user_id',
    },
    dueDate: {
      type: DataTypes.DATE,
      field: 'due_date',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    completedByUserId: {
      type: DataTypes.INTEGER,
      field: 'completed_by_user_id',
    },
    completionTime: {
      type: DataTypes.DATE,
      field: 'completion_time',
    },
    completionPayload: {
      type: DataTypes.JSONB,
      field: 'completion_payload',
    },
  },
  {
    sequelize,
    modelName: 'TaskInstance',
    tableName: 'task_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['assigned_to_role_id'],
      },
      {
        fields: ['assigned_to_user_id'],
      },
    ],
  },
);
