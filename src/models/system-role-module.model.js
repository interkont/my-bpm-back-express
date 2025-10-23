const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemRoleModule = sequelize.define(
  'SystemRoleModule',
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
    tableName: 'system_role_modules',
    timestamps: false,
  }
);

module.exports = SystemRoleModule;
