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
import type { ElementFormLink } from './element-form-link.model';
import type { DocumentInstance } from './document-instance.model';

export class FieldDefinition extends Model<
  InferAttributes<FieldDefinition>,
  InferCreationAttributes<FieldDefinition>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare label: string;
  declare fieldType: string;
  declare validations: CreationOptional<JsonObject | null>;

  // Asociaciones (se pueblan solo con include)
  declare elementFormLinks?: NonAttribute<ElementFormLink[]>;
  declare documentInstances?: NonAttribute<DocumentInstance[]>;
}

FieldDefinition.init(
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
    sequelize,
    modelName: 'FieldDefinition',
    tableName: 'field_definitions',
    timestamps: false,
  },
);
