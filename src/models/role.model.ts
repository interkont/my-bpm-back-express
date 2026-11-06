import {
  DataTypes,
  type BelongsToManyCountAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { User } from './user.model';
import type { UserRole } from './userRole.model';
import type { ProcessElement } from './process-element.model';
import type { TaskInstance } from './task-instance.model';
import type { CaseAssignment } from './case-assignment.model';

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string;

  // Asociaciones (alias definidos en src/models/index)
  declare users?: NonAttribute<User[]>;
  declare UserRole?: NonAttribute<UserRole>;
  declare processElements?: NonAttribute<ProcessElement[]>;
  declare taskInstances?: NonAttribute<TaskInstance[]>;
  declare caseAssignments?: NonAttribute<CaseAssignment[]>;

  // Mixins de Role.belongsToMany(User, { as: 'users' }) (definido en src/models/index)
  declare setUsers: BelongsToManySetAssociationsMixin<User, number>;
  declare countUsers: BelongsToManyCountAssociationsMixin;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    timestamps: false,
  },
);
