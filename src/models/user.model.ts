import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { SystemRole } from '../domain/constants';
import type { Role } from './role.model';
import type { UserRole } from './userRole.model';
import type { ProcessInstance } from './process-instance.model';
import type { TaskInstance } from './task-instance.model';
import type { DocumentInstance } from './document-instance.model';
import type { CaseAssignment } from './case-assignment.model';
import type { DecisionLog } from './decision-log.model';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare fullName: string;
  declare email: string;
  declare passwordHash: string;
  declare status: CreationOptional<string>;
  declare systemRole: CreationOptional<SystemRole>;
  declare createdAt: CreationOptional<Date>;

  // Asociaciones (alias definidos en src/models/index)
  declare roles?: NonAttribute<Role[]>;
  declare UserRole?: NonAttribute<UserRole>;
  declare startedProcessInstances?: NonAttribute<ProcessInstance[]>;
  declare completedTasks?: NonAttribute<TaskInstance[]>;
  declare assignedTasks?: NonAttribute<TaskInstance[]>;
  declare uploadedDocuments?: NonAttribute<DocumentInstance[]>;
  declare caseAssignments?: NonAttribute<CaseAssignment[]>;
  declare decisionLogs?: NonAttribute<DecisionLog[]>;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name',
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'password_hash',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    systemRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'USER',
      field: 'system_role',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false,
  },
);
