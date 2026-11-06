/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- port 1:1: `||` trata también valores falsy como ausentes, igual que el JS original */
import {
  ProcessDefinition,
  ProcessElement,
  ProcessSequence,
  DecisionLog,
  User,
} from '../../models';
import { isElementType } from '../../domain/constants';
import type { BusinessData, JsonObject, JsonValue } from '../../domain/types';
import { buildEvaluationContext, chooseExclusiveRoute, type EvaluationContext } from './context';
import { buildGraph, outgoingOf, type ElementNode, type ProcessGraph } from './graph';
import { NODE_SEMANTICS } from './semantics';
import { toNextTask, type NextTaskDto } from './decision.mappers';

// Contexto que envía el cliente: la instancia (con su `businessData`) y la tarea actual.
export type DecisionContext = {
  instance?: { [key: string]: JsonValue | undefined; businessData?: BusinessData | null };
  task?: JsonObject;
};

export type NextTask = NextTaskDto;

export type DecisionResponse = {
  nextTasks: NextTask[];
};

/**
 * Elementos destino de una lista de aristas, como los devolvía `findAll ... IN (...)`: sin
 * duplicados, ignorando destinos inexistentes y en orden de `id` de elemento (orden de inserción).
 */
const targetsOf = (graph: ProcessGraph, edges: readonly { target: string }[]): ElementNode[] => {
  const unique = new Set(edges.map((edge) => edge.target));
  const found: ElementNode[] = [];
  for (const bpmnId of unique) {
    const node = graph.elements.get(bpmnId);
    if (node) found.push(node);
  }
  return found.sort((a, b) => a.id - b.id);
};

/**
 * Recorre el grafo (puro, ya cargado) para encontrar las siguientes tareas o eventos de fin.
 */
const findNextBlockingElements = (
  element: ElementNode,
  graph: ProcessGraph,
  evaluationContext: EvaluationContext,
): ElementNode[] => {
  // Tipo ajeno a `ELEMENT_TYPE` (dato corrupto): como antes, sin salidas es callejón y con salidas falla.
  if (!isElementType(element.type)) {
    if (outgoingOf(graph, element.bpmnElementId).length === 0) return [];
    throw new Error(`Unsupported element type for decision traversal: ${String(element.type)}`);
  }

  const behavior = NODE_SEMANTICS[element.type].decision;
  switch (behavior.kind) {
    case 'BLOCK':
      return [element];
    case 'FOLLOW_ALL': {
      const outgoing = outgoingOf(graph, element.bpmnElementId);
      return targetsOf(graph, outgoing).flatMap((next) =>
        findNextBlockingElements(next, graph, evaluationContext),
      );
    }
    case 'EXCLUSIVE': {
      const outgoing = outgoingOf(graph, element.bpmnElementId);
      if (outgoing.length === 0) return []; // Callejón sin salida
      const chosen = chooseExclusiveRoute(outgoing, evaluationContext);
      if (!chosen) {
        throw new Error(
          `No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${element.bpmnElementId}.`,
        );
      }
      const next = graph.elements.get(chosen.target);
      return next ? findNextBlockingElements(next, graph, evaluationContext) : [];
    }
  }
};

/**
 * Servicio principal para decidir la siguiente tarea en un flujo de proceso.
 */
export const decideNextTask = async (
  businessProcessKey: string,
  currentBpmnElementId: string,
  contextData: DecisionContext,
  userId: number,
): Promise<DecisionResponse> => {
  // Crear el registro de log inicial
  const log = await DecisionLog.create({
    businessProcessKey,
    currentBpmnElementId,
    // `contextData` proviene del JSON del body, por lo que solo contiene valores JSON.
    requestPayload: {
      businessProcessKey,
      currentBpmnElementId,
      contextData: contextData as JsonValue,
    },
    executedByUserId: userId,
  });

  try {
    // 1. Encontrar la definición de proceso activa.
    const processDefinition = await ProcessDefinition.findOne({
      where: { businessProcessKey, status: 'ACTIVE' },
      order: [['version', 'DESC']],
    });
    if (!processDefinition) {
      throw new Error(`Process with key '${businessProcessKey}' not found or is not active.`);
    }

    // 2. Cargar elementos y secuencias una sola vez y construir el grafo.
    const [elements, sequences] = await Promise.all([
      ProcessElement.findAll({ where: { processDefId: processDefinition.id } }),
      ProcessSequence.findAll({ where: { processDefId: processDefinition.id } }),
    ]);
    const graph = buildGraph(elements, sequences);

    // 3. Encontrar el elemento de partida.
    const startElement = graph.elements.get(currentBpmnElementId);
    if (!startElement) {
      throw new Error(
        `Element with BPMN ID '${currentBpmnElementId}' not found in process '${businessProcessKey}'.`,
      );
    }

    // 4. Primer paso: todas las salidas del elemento actual, sin evaluar condiciones.
    const initialOutgoing = outgoingOf(graph, startElement.bpmnElementId);
    if (initialOutgoing.length === 0) {
      // Si no hay salida, la respuesta es vacía, pero la llamada fue exitosa.
      const emptyResponse: DecisionResponse = { nextTasks: [] };
      await log.update({ responsePayload: { nextTasks: [] } });
      return emptyResponse;
    }

    // Mismo contexto de evaluación que el motor principal.
    const { businessData, ...instanceData } = contextData.instance ?? {};
    const evaluationContext = buildEvaluationContext(
      businessData,
      instanceData,
      contextData.task || {},
    );

    // 5. Búsqueda DESDE LOS SIGUIENTES elementos.
    const blockingElements = targetsOf(graph, initialOutgoing).flatMap((nextEl) =>
      findNextBlockingElements(nextEl, graph, evaluationContext),
    );

    // 6. Formatear la respuesta para el cliente.
    const nextTasks: NextTask[] = blockingElements.map(toNextTask);
    const response: DecisionResponse = { nextTasks };

    // Actualizar el log con la respuesta exitosa
    await log.update({ responsePayload: { nextTasks } });

    return response;
  } catch (error) {
    // Actualizar el log con el mensaje de error
    await log.update({ errorMessage: error instanceof Error ? error.message : String(error) });
    // Relanzar el error para que el controlador lo maneje
    throw error;
  }
};

export const getDecisionLogs = async (): Promise<DecisionLog[]> => {
  // Opcional: Implementar filtros si es necesario en el futuro
  return DecisionLog.findAll({
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'executedByUser',
        attributes: ['id', 'username', 'email'],
      },
    ],
  });
};
