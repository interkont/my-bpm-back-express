import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './user.model';
import { Role } from './role.model';

export class UserRole extends Model<InferAttributes<UserRole>, InferCreationAttributes<UserRole>> {
  declare userId: number;
  declare roleId: number;
  declare created_at: CreationOptional<Date>;
}

UserRole.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: User,
        key: 'id',
      },
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: Role,
        key: 'id',
      },
      primaryKey: true,
    },
    // Lo rellena Sequelize por timestamps/createdAt; se declara para el tipado estricto de init.
    // Sin allowNull: false, porque la validación de bulkCreate (setRoles) corre antes de que
    // Sequelize asigne el timestamp y fallaría con notNull.
    created_at: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
