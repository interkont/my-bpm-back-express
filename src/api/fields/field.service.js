const { FieldDefinition } = require('../../models');

/**
 * Create a field definition
 * @param {Object} fieldBody
 * @returns {Promise<FieldDefinition>}
 */
const createField = async (fieldBody) => {
  // Aquí podríamos añadir validación específica para el JSON de 'validations' si es necesario
  return FieldDefinition.create(fieldBody);
};

/**
 * Get all field definitions
 * @returns {Promise<FieldDefinition[]>}
 */
const getFields = async () => {
  return FieldDefinition.findAll();
};

/**
 * Get field definition by ID
 * @param {Number} id
 * @returns {Promise<FieldDefinition>}
 */
const getFieldById = async (id) => {
  return FieldDefinition.findByPk(id);
};

/**
 * Update field definition by ID
 * @param {Number} id
 * @param {Object} updateBody
 * @returns {Promise<FieldDefinition>}
 */
const updateField = async (id, updateBody) => {
  const field = await getFieldById(id);
  if (!field) {
    throw new Error('Field definition not found');
  }
  Object.assign(field, updateBody);
  await field.save();
  return field;
};

/**
 * Delete field definition by ID
 * @param {Number} id
 * @returns {Promise<void>}
 */
const deleteField = async (id) => {
  const field = await getFieldById(id);
  if (!field) {
    throw new Error('Field definition not found');
  }
  await field.destroy();
};

module.exports = {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField,
};
