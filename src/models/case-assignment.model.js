const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CaseAssignment = sequelize.define(
  'CaseAssignment',
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
      references: {
        model: 'process_instances', // Nombre de la tabla referenciada
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'roles', // Nombre de la tabla referenciada
        key: 'id',
      },
    },
    assignedUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assigned_user_id',
      references: {
        model: 'users', // Nombre de la tabla referenciada
        key: 'id',
      },
    },
  },
  {
    tableName: 'case_assignments',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['process_instance_id', 'role_id'],
      },
    ],
  }
);

module.exports = CaseAssignment;
