const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ElementFormLink = sequelize.define(
  'ElementFormLink',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    elementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'element_id',
    },
    fieldDefId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'field_def_id',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'display_order',
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_required',
    },
    isReadonly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_readonly',
    },
    contextualValidations: {
      type: DataTypes.JSONB,
      field: 'contextual_validations',
    },
  },
  {
    tableName: 'element_form_links',
    timestamps: false,
  }
);

module.exports = ElementFormLink;
