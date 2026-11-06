import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { ProcessInstance } from './process-instance.model';
import type { Role } from './role.model';
import type { User } from './user.model';

export class CaseAssignment extends Model<
  InferAttributes<CaseAssignment>,
  InferCreationAttributes<CaseAssignment>
> {
  declare id: CreationOptional<number>;
  declare processInstanceId: number;
  declare roleId: number;
  declare assignedUserId: number;

  declare processInstance?: NonAttribute<ProcessInstance>;
  declare assignedUser?: NonAttribute<User>;
  declare role?: NonAttribute<Role>;
}

CaseAssignment.init(
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
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
    },
    assignedUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assigned_user_id',
    },
  },
  {
    sequelize,
    modelName: 'CaseAssignment',
    tableName: 'case_assignments',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['process_instance_id', 'role_id'],
      },
    ],
  },
);
