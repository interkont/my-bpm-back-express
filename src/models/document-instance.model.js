const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentInstance = sequelize.define(
  'DocumentInstance',
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
    taskInstanceId: {
      type: DataTypes.INTEGER,
      field: 'task_instance_id',
    },
    fieldDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'field_def_id',
    },
    storageKey: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
      field: 'storage_key',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'ACTIVE',
    },
    uploadedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'uploaded_by_user_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    tableName: 'document_instances',
    timestamps: false,
    indexes: [
      {
        fields: ['process_instance_id'],
      },
    ],
  }
);

module.exports = DocumentInstance;
