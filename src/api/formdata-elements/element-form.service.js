const { sequelize, ElementFormLink, FieldDefinition } = require('../../models');
const { Op } = require('sequelize');


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

/**
 * Update all form fields for a process element in bulk.
 * This will create, update, or delete links as necessary.
 * Can run within an existing transaction or create its own.
 * @param {Number} elementId
 * @param {Array<Object>} linksPayload The full list of form fields for the element.
 * @param {Object} [options={}] Optional settings.
 * @param {import('sequelize').Transaction} [options.transaction] An existing Sequelize transaction.
 * @returns {Promise<ElementFormLink[]>}
 */
const updateFormFieldsInBulk = async (elementId, linksPayload, options = {}) => {
  // Determina si esta función debe gestionar la transacción o si es parte de una más grande.
  const manageTransaction = !options.transaction;
  const transaction = options.transaction || (await sequelize.transaction());

  try {
      const existingLinks = await ElementFormLink.findAll({
          where: { elementId },
          transaction,
      });
      const existingLinkIds = existingLinks.map(link => link.id);
      const payloadLinkIds = linksPayload.map(link => link.id).filter(id => id);

      const idsToDelete = existingLinkIds.filter(id => !payloadLinkIds.includes(id));
      if (idsToDelete.length > 0) {
          await ElementFormLink.destroy({
              where: { id: { [Op.in]: idsToDelete } },
              transaction,
          });
      }

      const linksToCreate = [];
      const linksToUpdate = [];
      for (const linkData of linksPayload) {
          const newLinkData = { ...linkData };
          delete newLinkData.id; // Limpiamos el id para evitar conflictos en la creación/actualización

          if (linkData.id && existingLinkIds.includes(linkData.id)) {
              linksToUpdate.push({ id: linkData.id, data: newLinkData });
          } else {
              linksToCreate.push({ ...newLinkData, elementId });
          }
      }
      
      for (const link of linksToUpdate) {
          await ElementFormLink.update(link.data, { where: { id: link.id }, transaction });
      }

      if (linksToCreate.length > 0) {
          await ElementFormLink.bulkCreate(linksToCreate, { transaction });
      }

      // Si esta función inició la transacción, debe cerrarla.
      if (manageTransaction) {
          await transaction.commit();
      }

      return getFormFieldsForElement(elementId);

  } catch (error) {
      if (manageTransaction) {
          await transaction.rollback();
      }
      console.error('Bulk form field update failed:', error);
      // Re-lanza el error para que la transacción padre (si existe) pueda hacer rollback.
      throw new Error('Failed to update form fields in bulk.');
  }
};


module.exports = {
  addFormFieldToElement,
  getFormFieldsForElement,
  updateFormField,
  removeFormField,
  updateFormFieldsInBulk,
};
