const fieldService = require('./field.service');
const catchAsync = require('../../utils/catchAsync');

const fieldTypes = [
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

const getFieldTypes = (req, res) => {
  res.status(200).json(fieldTypes);
};

const createField = catchAsync(async (req, res) => {
  const field = await fieldService.createField(req.body);
  res.status(201).json(field);
});

const getFields = catchAsync(async (req, res) => {
  const fields = await fieldService.getFields();
  res.status(200).json(fields);
});

const getField = catchAsync(async (req, res) => {
  const field = await fieldService.getFieldById(req.params.id);
  if (!field) {
    return res.status(404).json({ message: 'Field definition not found' });
  }
  res.status(200).json(field);
});

const updateField = catchAsync(async (req, res) => {
  const field = await fieldService.updateField(req.params.id, req.body);
  res.status(200).json(field);
});

const deleteField = catchAsync(async (req, res) => {
  await fieldService.deleteField(req.params.id);
  res.status(204).send();
});

module.exports = {
  createField,
  getFields,
  getField,
  updateField,
  deleteField,
  getFieldTypes,
};