import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { ProcessInstanceStatus } from '../domain/constants';
import type { BusinessData } from '../domain/types';
import type { CaseAssignment } from './case-assignment.model';
import type { DocumentInstance } from './document-instance.model';
import type { ProcessDefinition } from './process-definition.model';
import type { TaskInstance } from './task-instance.model';
import type { User } from './user.model';

export class ProcessInstance extends Model<
  InferAttributes<ProcessInstance>,
  InferCreationAttributes<ProcessInstance>
> {
  declare id: CreationOptional<number>;
  declare processDefId: number;
  declare description: CreationOptional<string | null>;
  declare status: ProcessInstanceStatus;
  declare businessData: CreationOptional<BusinessData | null>;
  declare startedByUserId: number;
  declare startTime: CreationOptional<Date>;
  declare endTime: CreationOptional<Date | null>;

  declare taskInstances?: NonAttribute<TaskInstance[]>;
  declare documentInstances?: NonAttribute<DocumentInstance[]>;
  declare caseAssignments?: NonAttribute<CaseAssignment[]>;
  declare processDefinition?: NonAttribute<ProcessDefinition>;
  declare startedByUser?: NonAttribute<User>;
}

ProcessInstance.init(
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
    description: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    businessData: {
      type: DataTypes.JSONB,
      field: 'business_data',
    },
    startedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'started_by_user_id',
    },
    startTime: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.DATE,
      field: 'end_time',
    },
  },
  {
    sequelize,
    modelName: 'ProcessInstance',
    tableName: 'process_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['status'],
      },
    ],
  },
);
