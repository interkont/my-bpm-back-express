// CORRECCIÓN FINAL BASADA EN LA LIBRERÍA CORRECTA (`expr-eval`)
const { Parser } = require('expr-eval');

/**
 * Evalúa de forma segura una expresión de cadena contra un objeto de contexto.
 * @param {string} expression - La expresión a evaluar (ej: "purchaseAmount > 1000").
 * @param {object} context - El objeto JSON contra el cual se evalúa la expresión.
 * @returns {boolean} - El resultado de la evaluación.
 */
const evaluateExpression = (expression, context) => {
  if (!expression) {
    return false;
  }
  try {
    console.log('[ExpressionEngine] Evaluating condition:');
    console.log(`  - Expression: "${expression}"`);
    console.log('  - Context:', JSON.stringify(context, null, 2));

    // La forma correcta de usar `expr-eval` es instanciando un Parser.
    const parser = new Parser();
    const result = !!parser.evaluate(expression, context);

    console.log(`  - Result: ${result}`);
    return result;

  } catch (error) {
    console.error(`Error evaluating expression: "${expression}"`, error);
    return false;
  }
};

module.exports = {
  evaluateExpression,
};
