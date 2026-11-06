import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import type { JsonObject } from '../domain/types';
import type { ProcessElement } from './process-element.model';
import type { FieldDefinition } from './field-definition.model';

export class ElementFormLink extends Model<
  InferAttributes<ElementFormLink>,
  InferCreationAttributes<ElementFormLink>
> {
  declare id: CreationOptional<number>;
  declare elementId: number;
  declare fieldDefId: number;
  declare displayOrder: number;
  declare isRequired: CreationOptional<boolean>;
  declare isReadonly: CreationOptional<boolean>;
  declare contextualValidations: CreationOptional<JsonObject | null>;

  // Asociaciones (se pueblan solo con include)
  declare processElement?: NonAttribute<ProcessElement>;
  declare fieldDefinition?: NonAttribute<FieldDefinition>;
}

ElementFormLink.init(
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
    sequelize,
    modelName: 'ElementFormLink',
    tableName: 'element_form_links',
    timestamps: false,
  },
);
