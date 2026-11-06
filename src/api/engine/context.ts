// Contexto de evaluación y elección de ruta exclusiva (data-model §6.2). Puro.
import type { BusinessData } from '../../domain/types';
import { evaluateExpression } from '../../utils/expressionEngine';
import type { SequenceEdge } from './graph';

export type EvaluationContext = Record<string, unknown>;

/**
 * Devuelve exactamente `{ ...businessData, instance, task }`. Las claves `instance` y `task`
 * siempre prevalecen sobre las homónimas de `businessData` (orden del spread, como hoy).
 * `businessData` ausente (null/undefined) equivale a `{}`.
 * Cada motor prepara sus entradas como hoy: ejecución separa `businessData` de la instancia plana
 * y pasa su `taskContext`; decisión separa `contextData.instance.businessData` y pasa
 * `contextData.task || {}`.
 */
export const buildEvaluationContext = (
  businessData: BusinessData | null | undefined,
  instance: object,
  task: object,
): EvaluationContext => ({
  ...(businessData ?? {}),
  instance,
  task,
});

/**
 * Primera arista cuya condición evalúa verdadera; si ninguna, la primera sin condición
 * (`null`, `undefined` o cadena vacía: se decide por falsedad, como hoy); si no, `null` ("sin ruta").
 * Una condición que falla al evaluarse cuenta como falsa y no es ruta por defecto.
 */
export const chooseExclusiveRoute = (
  edges: readonly SequenceEdge[],
  context: EvaluationContext,
): SequenceEdge | null => {
  for (const edge of edges) {
    if (edge.condition && evaluateExpression(edge.condition, context)) return edge;
  }
  return edges.find((edge) => !edge.condition) ?? null;
};
