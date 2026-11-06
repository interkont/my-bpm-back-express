import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { SystemRole } from '../domain/constants';

export class SystemRoleModule extends Model<
  InferAttributes<SystemRoleModule>,
  InferCreationAttributes<SystemRoleModule>
> {
  declare id: CreationOptional<number>;
  declare systemRole: SystemRole;
  declare moduleName: string;
}

SystemRoleModule.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    systemRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'system_role',
    },
    moduleName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'module_name',
    },
  },
  {
    sequelize,
    modelName: 'SystemRoleModule',
    tableName: 'system_role_modules',
    timestamps: false,
  },
);
