import type { JsonObject } from '../../domain/types';

export interface FieldTypeDescriptor {
  type: string;
  label: string;
  description: string;
  // Plantilla de `validations` con la que el modelador crea un campo de este tipo.
  scaffold: JsonObject;
}

// Catálogo estático de tipos de campo que ofrece la biblioteca de datos.
export const FIELD_TYPES: readonly FieldTypeDescriptor[] = [
  {
    type: 'TEXT',
    label: 'Campo de Texto',
    description: 'Para entradas de texto cortas.',
    scaffold: {
      maxLength: 100,
    },
  },
  {
    type: 'TEXTAREA',
    label: 'Área de Texto',
    description: 'Para entradas de texto largas.',
    scaffold: {
      maxLength: 500,
    },
  },
  {
    type: 'NUMBER',
    label: 'Número',
    description: 'Para valores numéricos.',
    scaffold: {
      minValue: 0,
      maxValue: 1000,
    },
  },
  {
    type: 'SELECT',
    label: 'Selector (Dropdown)',
    description: 'Para seleccionar una opción de una lista.',
    scaffold: {
      options: [{ label: 'Etiqueta de Opción 1', value: 'valor1' }],
    },
  },
  {
    type: 'GRID',
    label: 'Grilla de Datos',
    description: 'Define la estructura de una lista de datos.',
    scaffold: {
      dataSource: '',
      columns: [
        {
          name: 'columnaEjemplo',
          label: 'Columna de Ejemplo',
          type: 'SELECT',
          scaffold: {
            options: [{ label: 'Opción A', value: 'A' }],
          },
        },
      ],
    },
  },
  {
    type: 'FILE',
    label: 'Archivo',
    description: 'Para subir un archivo.',
    scaffold: {
      maxSizeMB: 5,
      allowedFormats: '.pdf,.docx,.jpg',
    },
  },
  {
    type: 'DATE',
    label: 'Fecha',
    description: 'Para seleccionar una fecha.',
    scaffold: {},
  },
];
