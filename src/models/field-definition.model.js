const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FieldDefinition = sequelize.define(
  'FieldDefinition',
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
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fieldType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'field_type',
    },
    validations: {
      type: DataTypes.JSONB,
    },
  },
  {
    tableName: 'field_definitions',
    timestamps: false,
  }
);

module.exports = FieldDefinition;
