const { ElementFormLink, FieldDefinition } = require('../../models');

/**
 * Add a field to a process element (create a link)
 * @param {Number} elementId
 * @param {Object} body
 * @returns {Promise<ElementFormLink>}
 */
const addFormFieldToElement = async (elementId, body) => {
  const linkBody = { ...body, elementId };
  return ElementFormLink.create(linkBody);
};

/**
 * Get all form fields for a process element
 * @param {Number} elementId
 * @returns {Promise<ElementFormLink[]>}
 */
const getFormFieldsForElement = async (elementId) => {
  // Incluimos el modelo FieldDefinition para traer la información completa del campo
  return ElementFormLink.findAll({
    where: { elementId },
    include: [{ model: FieldDefinition, as: 'fieldDefinition' }],
    order: [['displayOrder', 'ASC']],
  });
};

/**
 * Get a single form link by its ID
 * @param {Number} linkId
 * @returns {Promise<ElementFormLink>}
 */
const getFormFieldById = async (linkId) => {
    return ElementFormLink.findByPk(linkId);
}

/**
 * Update a form field link
 * @param {Number} linkId
 * @param {Object} updateBody
 * @returns {Promise<ElementFormLink>}
 */
const updateFormField = async (linkId, updateBody) => {
  const link = await getFormFieldById(linkId);
  if (!link) {
    throw new Error('Element form link not found');
  }
  Object.assign(link, updateBody);
  await link.save();
  return link;
};

/**
 * Remove a field from a process element (delete a link)
 * @param {Number} linkId
 * @returns {Promise<void>}
 */
const removeFormField = async (linkId) => {
  const link = await getFormFieldById(linkId);
  if (!link) {
    throw new Error('Element form link not found');
  }
  await link.destroy();
};

module.exports = {
  addFormFieldToElement,
  getFormFieldsForElement,
  updateFormField,
  removeFormField,
};
