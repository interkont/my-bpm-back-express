/**
 * Enriches the value of a form field based on its type and definition.
 * @param {object} fieldDefinition - The full field definition from the model.
 * @param {*} rawValue - The raw value stored in businessData.
 * @returns {object} - An object containing the value (potentially enriched) and validation metadata.
 */
const enrichFieldValue = (fieldDefinition, rawValue) => {
  const enriched = {
    value: rawValue,
    // The validation metadata is always added so the frontend can render correctly
    validations: fieldDefinition.validations || {},
  };

  if (rawValue === null || rawValue === undefined) {
    return enriched;
  }

  // Enrichment for SELECT type: add the label
  if (fieldDefinition.fieldType === 'SELECT' && fieldDefinition.validations?.options) {
    const selectedOption = fieldDefinition.validations.options.find(
      (opt) => opt.value === rawValue
    );
    if (selectedOption) {
      // Return the full object so the frontend has both the value and the label
      enriched.value = selectedOption;
    }
  }

  // For GRID types, the value is already the array of rows. 
  // The key is that the 'validations' object with the 'columns' is already included.
  if (fieldDefinition.fieldType === 'GRID' && fieldDefinition.validations?.columns) {
    // No transformation needed for the value itself.
  }

  return enriched;
};

module.exports = {
  enrichFieldValue,
};
