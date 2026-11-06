/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- port 1:1: `||` trata también valores falsy como ausentes, igual que el JS original */
// Cáscara de ejecución del motor (T054): carga el grafo una sola vez por operación, recorre con la
// semántica pura de `NODE_SEMANTICS` y aplica los efectos en la base dentro de la transacción.
import { Op, type Transaction } from 'sequelize';
import {
  sequelize,
  ProcessDefinition,
  ProcessInstance,
  ProcessElement,
  ProcessSequence,
  TaskInstance,
} from '../../models';
import type { BusinessData, JsonValue } from '../../domain/types';
import { logger } from '../../utils/logger';
import { modelError, notFound } from '../../domain/errors';
import { buildGraph, outgoingOf, type ElementNode, type ProcessGraph } from './graph';
import { buildEvaluationContext, chooseExclusiveRoute } from './context';
import { NODE_SEMANTICS } from './semantics';
import { enterNode, resolveTarget, type TraversalPath } from './traversal';

// Datos que el cliente envía al completar una tarea.
export type CompletionData = {
  [key: string]: JsonValue | undefined;
  action?: string;
  formData?: BusinessData;
  comments?: string;
};

// Contexto de la tarea que se agrega a la evaluación de condiciones (`task`).
export interface TaskContext {
  bpmnElementId?: string;
  action?: string;
  formData?: BusinessData;
  comments?: string;
  completedBy?: { id: number; roleIds: number[] | undefined };
}

// Carga elementos y secuencias de la definición una sola vez (sin N+1) y arma el grafo.
const loadGraph = async (processDefId: number, t: Transaction): Promise<ProcessGraph> => {
  const elements = await ProcessElement.findAll({ where: { processDefId }, transaction: t });
  const sequences = await ProcessSequence.findAll({ where: { processDefId }, transaction: t });
  return buildGraph(elements, sequences);
};

const createTaskInstance = async (
  element: ElementNode,
  processInstance: ProcessInstance,
  t: Transaction,
): Promise<TaskInstance> => {
  logger.debug(`[Engine] > Creating USER_TASK for element: ${element.bpmnElementId}`);
  return TaskInstance.create(
    {
      processInstanceId: processInstance.id,
      elementDefId: element.id,
      status: 'PENDING',
      assignedToRoleId: element.assignedRoleId,
    },
    { transaction: t },
  );
};

const processElement = async (
  graph: ProcessGraph,
  node: ElementNode,
  path: TraversalPath,
  processInstance: ProcessInstance,
  t: Transaction,
  taskContext: TaskContext = {},
): Promise<void> => {
  // Camino de ancestros de esta rama: cada rama del fork recibe su propia copia (los diamantes no son ciclos).
  const here = enterNode(path, node);
  logger.debug(`[Engine] Processing element: ${node.bpmnElementId} | Type: ${node.type}`);
  const behavior = NODE_SEMANTICS[node.type].execution;
  switch (behavior.kind) {
    case 'FOLLOW_ALL': {
      const edges = outgoingOf(graph, node.bpmnElementId);
      logger.debug(`[Engine] | Found ${edges.length} outgoing sequence(s). Following all.`);
      // Secuencial y en orden de arista (reemplaza Promise.all dentro de una sola transacción).
      for (const edge of edges) {
        await processElement(
          graph,
          resolveTarget(graph, edge),
          here,
          processInstance,
          t,
          taskContext,
        );
      }
      break;
    }
    case 'CREATE_TASK': {
      await createTaskInstance(node, processInstance, t);
      break;
    }
    case 'EXCLUSIVE': {
      const { businessData, ...instanceData } = processInstance.get({ plain: true });
      const context = buildEvaluationContext(businessData, instanceData, taskContext);
      const chosen = chooseExclusiveRoute(outgoingOf(graph, node.bpmnElementId), context);
      if (!chosen) {
        throw modelError(
          `No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${node.bpmnElementId}.`,
        );
      }
      logger.debug(`[Engine] | Chosen route: -> ${chosen.target}`);
      await processElement(
        graph,
        resolveTarget(graph, chosen),
        here,
        processInstance,
        t,
        taskContext,
      );
      break;
    }
    case 'COMPLETE_INSTANCE': {
      logger.info(
        `[Engine] > Reached END_EVENT. Completing process instance ${processInstance.id}.`,
      );
      await ProcessInstance.update(
        { status: 'COMPLETED', endTime: new Date() },
        { where: { id: processInstance.id }, transaction: t },
      );
      break;
    }
    case 'UNSUPPORTED':
      throw modelError(`Unsupported element type: ${node.type}`);
  }
};

export const startProcess = async (
  businessProcessKey: string,
  startedByUserId: number,
  businessData: BusinessData,
  description?: string | null,
): Promise<ProcessInstance> => {
  logger.info(`[Engine] Starting process with key: ${businessProcessKey}`);
  return sequelize.transaction(async (t) => {
    const processDefinition = await ProcessDefinition.findOne({
      where: { businessProcessKey, status: 'ACTIVE' },
      order: [['version', 'DESC']],
      transaction: t,
    });
    if (!processDefinition)
      throw notFound(`Process with key '${businessProcessKey}' not found or is not active.`);
    const processInstance = await ProcessInstance.create(
      {
        processDefId: processDefinition.id,
        status: 'RUNNING',
        startedByUserId,
        businessData,
        description,
      },
      { transaction: t },
    );
    logger.info(`[Engine] | Created process instance ID: ${processInstance.id}`);
    const graph = await loadGraph(processDefinition.id, t);
    const startEvent = await ProcessElement.findOne({
      where: { processDefId: processDefinition.id, type: 'START_EVENT' },
      transaction: t,
    });
    const startNode = startEvent && graph.elements.get(startEvent.bpmnElementId);
    if (!startNode) throw modelError('Process is invalid: No START_EVENT found.');
    await processElement(graph, startNode, [], processInstance, t, {});
    // Se recarga dentro de la transacción para devolver el estado real (p. ej. COMPLETED si el fin está tras el inicio, FR-032).
    const reloaded = await ProcessInstance.findByPk(processInstance.id, { transaction: t });
    return reloaded ?? processInstance;
  });
};

export const completeTask = async (
  taskId: number,
  completionData: CompletionData,
  userId: number,
  // Puede faltar si el token no trae `roleIds`; se pasa tal cual, como en el JS original.
  roleIds: number[] | undefined,
): Promise<{ message: string }> => {
  logger.info(`[Engine] Completing task ID: ${taskId}`);
  return sequelize.transaction(async (t) => {
    const task = await TaskInstance.findOne({
      where: {
        id: taskId,
        status: 'PENDING',
        [Op.or]: [{ assignedToUserId: userId }, { assignedToRoleId: { [Op.in]: roleIds } }],
      },
      include: [
        { model: ProcessElement, as: 'processElement' },
        { model: ProcessInstance, as: 'processInstance' },
      ],
      transaction: t,
    });
    if (!task) throw notFound('Task not found, not pending, or not authorized.');
    // El elemento puede haber desaparecido del modelo (tarea huérfana): error de modelado, no 500.
    const taskElement = task.processElement;
    if (!taskElement) {
      throw modelError(`Process modelling error: element ${task.elementDefId} no longer exists.`);
    }
    // La instancia se carga con el `include` de arriba (FK obligatoria).
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const taskProcessInstance = task.processInstance!;
    await TaskInstance.update(
      {
        status: 'COMPLETED',
        completedByUserId: userId,
        completionTime: new Date(),
        // El payload llega como JSON del cliente: solo contiene valores JSON (las claves opcionales ausentes no se serializan).
        completionPayload: completionData as JsonValue,
        comments: completionData.comments,
      },
      { where: { id: taskId }, transaction: t },
    );
    const updatedBusinessData: BusinessData = {
      ...(taskProcessInstance.businessData || {}),
      ...(completionData.formData || {}),
    };
    await ProcessInstance.update(
      { businessData: updatedBusinessData },
      { where: { id: task.processInstanceId }, transaction: t },
    );
    // Recargamos la instancia para obtener los datos actualizados
    const updatedProcessInstance = await ProcessInstance.findByPk(task.processInstanceId, {
      transaction: t,
    });

    const taskContext: TaskContext = {
      bpmnElementId: taskElement.bpmnElementId,
      action: completionData.action,
      formData: completionData.formData || {},
      comments: completionData.comments,
      completedBy: { id: userId, roleIds },
    };

    const graph = await loadGraph(taskElement.processDefId, t);

    // Una sola secuencia de salida por tarea: la primera por id (las aristas ya vienen ordenadas).
    const outgoingSequence = outgoingOf(graph, taskElement.bpmnElementId)[0];
    if (!outgoingSequence) {
      throw modelError(
        `Process modelling error: No outgoing sequence for ${taskElement.bpmnElementId}`,
      );
    }

    const nextElement = graph.elements.get(outgoingSequence.target);
    if (!nextElement) {
      throw modelError(`Process modelling error: Next element not found.`);
    }
    // La tarea completada es el ancestro inicial del camino de esta continuación.
    const path: TraversalPath = [taskElement.bpmnElementId];

    // La instancia se acaba de actualizar en esta misma transacción, por lo que existe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reloadedInstance = updatedProcessInstance!;

    if (nextElement.type === 'PARALLEL_GATEWAY') {
      logger.debug(`[Engine] | Reached a PARALLEL_GATEWAY join. Checking for completion...`);
      const incomingSequences = graph.incoming.get(nextElement.bpmnElementId) ?? [];
      // Elementos fuente de las secuencias entrantes del join (los ausentes del grafo se omiten).
      const sourceElementIds: number[] = [];
      for (const sourceBpmnId of new Set(incomingSequences.map((edge) => edge.source))) {
        const source = graph.elements.get(sourceBpmnId);
        if (source) sourceElementIds.push(source.id);
      }

      const completedTaskCountForJoin = await TaskInstance.count({
        where: {
          processInstanceId: task.processInstanceId,
          status: 'COMPLETED',
          elementDefId: { [Op.in]: sourceElementIds },
        },
        transaction: t,
      });

      logger.debug(
        `[Engine] | ${completedTaskCountForJoin}/${incomingSequences.length} parallel tasks completed.`,
      );
      if (completedTaskCountForJoin === incomingSequences.length) {
        logger.debug(`[Engine] | All parallel tasks complete. Continuing from gateway.`);
        await processElement(graph, nextElement, path, reloadedInstance, t, taskContext);
      }
    } else {
      await processElement(graph, nextElement, path, reloadedInstance, t, taskContext);
    }

    return { message: 'Task completed successfully.' };
  });
};
