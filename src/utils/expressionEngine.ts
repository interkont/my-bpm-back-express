import { Parser } from 'expr-eval';
import { logger } from './logger';

/**
 * Evalúa una condición contra el contexto. Una expresión vacía o que falla se considera falsa
 * (FR-008). El contexto no se registra en logs: contiene datos de negocio (Principio VIII).
 */
export const evaluateExpression = (expression: unknown, context: object): boolean => {
  if (!expression || typeof expression !== 'string') {
    return false;
  }
  try {
    const result = Boolean(new Parser().evaluate(expression, context));
    logger.debug(`[ExpressionEngine] "${expression}" => ${String(result)}`);
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`[ExpressionEngine] Error evaluating "${expression}": ${reason}`);
    return false;
  }
};
