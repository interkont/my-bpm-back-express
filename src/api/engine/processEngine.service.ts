/* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- port 1:1: `||` trata también valores falsy como ausentes, igual que el JS original */
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
import { evaluateExpression } from '../../utils/expressionEngine';
import { logger } from '../../utils/logger';

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

const createTaskInstance = async (
  elementDefinition: ProcessElement,
  processInstance: ProcessInstance,
  t: Transaction,
): Promise<TaskInstance> => {
  logger.debug(`[Engine] > Creating USER_TASK for element: ${elementDefinition.bpmnElementId}`);
  return TaskInstance.create(
    {
      processInstanceId: processInstance.id,
      elementDefId: elementDefinition.id,
      status: 'PENDING',
      assignedToRoleId: elementDefinition.assignedRoleId,
    },
    { transaction: t },
  );
};

const processElement = async (
  elementToProcess: ProcessElement,
  processInstance: ProcessInstance,
  t: Transaction,
  taskContext: TaskContext = {},
): Promise<void> => {
  logger.debug(
    `[Engine] Processing element: ${elementToProcess.bpmnElementId} | Type: ${elementToProcess.type}`,
  );
  switch (elementToProcess.type) {
    case 'START_EVENT':
    case 'PARALLEL_GATEWAY': {
      const outgoingSequences = await ProcessSequence.findAll({
        where: {
          processDefId: elementToProcess.processDefId,
          sourceElementBpmnId: elementToProcess.bpmnElementId,
        },
        transaction: t,
      });
      logger.debug(
        `[Engine] | Found ${outgoingSequences.length} outgoing sequence(s). Following all.`,
      );
      await Promise.all(
        outgoingSequences.map(async (sequence) => {
          const nextElement = await ProcessElement.findOne({
            where: {
              processDefId: elementToProcess.processDefId,
              bpmnElementId: sequence.targetElementBpmnId,
            },
            transaction: t,
          });
          // Comportamiento heredado 1:1: si el destino de la secuencia no existe, la llamada
          // recursiva falla igual que en el JS original (se corrige en una fase posterior).
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await processElement(nextElement!, processInstance, t, taskContext);
        }),
      );
      break;
    }
    case 'USER_TASK': {
      await createTaskInstance(elementToProcess, processInstance, t);
      break;
    }
    case 'EXCLUSIVE_GATEWAY': {
      const outgoingSequences = await ProcessSequence.findAll({
        where: {
          processDefId: elementToProcess.processDefId,
          sourceElementBpmnId: elementToProcess.bpmnElementId,
        },
        transaction: t,
      });
      const { businessData, ...instanceData } = processInstance.get({ plain: true });
      const fullContext = {
        ...(businessData || {}),
        instance: instanceData,
        task: taskContext,
      };
      let chosenSequence: ProcessSequence | null | undefined = null;
      for (const seq of outgoingSequences) {
        if (seq.conditionExpression && evaluateExpression(seq.conditionExpression, fullContext)) {
          chosenSequence = seq;
          break;
        }
      }
      if (!chosenSequence) {
        chosenSequence ??= outgoingSequences.find((seq) => !seq.conditionExpression);
      }
      if (chosenSequence) {
        logger.debug(`[Engine] | Chosen route: -> ${chosenSequence.targetElementBpmnId}`);
        const nextElement = await ProcessElement.findOne({
          where: {
            processDefId: elementToProcess.processDefId,
            bpmnElementId: chosenSequence.targetElementBpmnId,
          },
          transaction: t,
        });
        // Comportamiento heredado 1:1: destino inexistente falla en la llamada recursiva.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await processElement(nextElement!, processInstance, t, taskContext);
      } else {
        throw new Error(
          `No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${elementToProcess.bpmnElementId}.`,
        );
      }
      break;
    }
    case 'END_EVENT': {
      logger.info(
        `[Engine] > Reached END_EVENT. Completing process instance ${processInstance.id}.`,
      );
      await ProcessInstance.update(
        { status: 'COMPLETED', endTime: new Date() },
        {
          where: { id: processInstance.id },
          transaction: t,
        },
      );
      break;
    }
    case 'AUTO_TASK':
    default:
      throw new Error(`Unsupported element type: ${elementToProcess.type}`);
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
      throw new Error(`Process with key '${businessProcessKey}' not found or is not active.`);
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
    const startEvent = await ProcessElement.findOne({
      where: { processDefId: processDefinition.id, type: 'START_EVENT' },
      transaction: t,
    });
    if (!startEvent) throw new Error('Process is invalid: No START_EVENT found.');
    await processElement(startEvent, processInstance, t, {});
    return processInstance;
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
    if (!task) throw new Error('Task not found, not pending, or not authorized.');
    // Ambas asociaciones se cargan con el `include` de arriba, por lo que nunca son undefined.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const taskElement = task.processElement!;
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

    const outgoingSequence = await ProcessSequence.findOne({
      where: {
        processDefId: taskElement.processDefId,
        sourceElementBpmnId: taskElement.bpmnElementId,
      },
      transaction: t,
    });
    if (!outgoingSequence) {
      throw new Error(
        `Process modelling error: No outgoing sequence for ${taskElement.bpmnElementId}`,
      );
    }

    const nextElement = await ProcessElement.findOne({
      where: {
        processDefId: taskElement.processDefId,
        bpmnElementId: outgoingSequence.targetElementBpmnId,
      },
      transaction: t,
    });
    if (!nextElement) {
      throw new Error(`Process modelling error: Next element not found.`);
    }

    // La instancia se acaba de actualizar en esta misma transacción, por lo que existe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reloadedInstance = updatedProcessInstance!;

    if (nextElement.type === 'PARALLEL_GATEWAY') {
      logger.debug(`[Engine] | Reached a PARALLEL_GATEWAY join. Checking for completion...`);
      const joinGateway = nextElement;
      const incomingSequences = await ProcessSequence.findAll({
        where: {
          processDefId: joinGateway.processDefId,
          targetElementBpmnId: joinGateway.bpmnElementId,
        },
        transaction: t,
      });
      const sourceElementBpmnIds = incomingSequences.map((seq) => seq.sourceElementBpmnId);
      // Conteo muerto heredado (fuera de la transacción y sin usar); se corrige en US2/US4.
      await TaskInstance.count({
        where: {
          processInstanceId: task.processInstanceId,
          status: 'COMPLETED',
        },
      });

      const sourceElements = await ProcessElement.findAll({
        where: {
          bpmnElementId: { [Op.in]: sourceElementBpmnIds },
          processDefId: joinGateway.processDefId,
        },
        attributes: ['id'],
        transaction: t,
      });
      const sourceElementIds = sourceElements.map((el) => el.id);

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
        await processElement(joinGateway, reloadedInstance, t, taskContext);
      }
    } else {
      await processElement(nextElement, reloadedInstance, t, taskContext);
    }

    return { message: 'Task completed successfully.' };
  });
};
