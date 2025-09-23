const prisma = require('../../utils/prisma');
const { evaluateExpression } = require('../../utils/expressionEngine');

// ... (createTaskInstance sin cambios)
const createTaskInstance = async (elementDefinition, processInstance, tx) => {
    return tx.taskInstance.create({
      data: {
        processInstanceId: processInstance.id,
        elementDefId: elementDefinition.id,
        status: 'PENDING',
        assignedToRoleId: elementDefinition.assignedRoleId,
      },
    });
  };

const processElement = async (elementToProcess, processInstance, tx) => {
  switch (elementToProcess.type) {
    // ... (START_EVENT, PARALLEL_GATEWAY, USER_TASK sin cambios)
    case 'START_EVENT':
    case 'PARALLEL_GATEWAY': {
      const outgoingSequences = await tx.processSequence.findMany({ where: { processDefId: elementToProcess.processDefId, sourceElementBpmnId: elementToProcess.bpmnElementId } });
      for (const sequence of outgoingSequences) {
        const nextElement = await tx.processElement.findFirst({ where: { processDefId: elementToProcess.processDefId, bpmnElementId: sequence.targetElementBpmnId } });
        await processElement(nextElement, processInstance, tx);
      }
      break;
    }
    case 'USER_TASK': {
        await createTaskInstance(elementToProcess, processInstance, tx);
        break;
    }

    case 'EXCLUSIVE_GATEWAY': {
      const outgoingSequences = await tx.processSequence.findMany({ where: { processDefId: elementToProcess.processDefId, sourceElementBpmnId: elementToProcess.bpmnElementId } });
      
      // CORRECCIÓN: Contexto de evaluación limpio y sin duplicados.
      const { businessData, ...instanceData } = processInstance;
      const fullContext = { ...instanceData, ...(businessData || {}) };

      let chosenSequence = null;
      for (const seq of outgoingSequences) {
        if (seq.conditionExpression && evaluateExpression(seq.conditionExpression, fullContext)) {
          chosenSequence = seq;
          break;
        }
      }
      if (!chosenSequence) { chosenSequence = outgoingSequences.find(seq => !seq.conditionExpression); }

      if (chosenSequence) {
        const nextElement = await tx.processElement.findFirst({ where: { processDefId: elementToProcess.processDefId, bpmnElementId: chosenSequence.targetElementBpmnId } });
        await processElement(nextElement, processInstance, tx);
      } else {
        throw new Error(`No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${elementToProcess.bpmnElementId}.`);
      }
      break;
    }

    // ... (END_EVENT sin cambios)
    case 'END_EVENT': {
        await tx.processInstance.update({
          where: { id: processInstance.id },
          data: { status: 'COMPLETED', endTime: new Date() },
        });
        break;
      }

    default:
      throw new Error(`Unsupported element type: ${elementToProcess.type}`);
  }
};

// ... (startProcess y completeTask sin cambios)
const startProcess = async (businessProcessKey, startedByUserId, businessData) => {
    return prisma.$transaction(async (tx) => {
      const processDefinition = await tx.processDefinition.findFirst({ where: { businessProcessKey, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
      if (!processDefinition) throw new Error(`Process with key '${businessProcessKey}' not found or is not active.`);
      const processInstance = await tx.processInstance.create({ data: { processDefId: processDefinition.id, status: 'RUNNING', startedByUserId, businessData } });
      const startEvent = await tx.processElement.findFirst({ where: { processDefId: processDefinition.id, type: 'START_EVENT' } });
      if (!startEvent) throw new Error('Process is invalid: No START_EVENT found.');
      await processElement(startEvent, processInstance, tx);
      return processInstance;
    });
  };

  const completeTask = async (taskId, completionData, userId, userRoleId) => {
    return prisma.$transaction(async (tx) => {
      const task = await tx.taskInstance.findFirst({
        where: { id: taskId, status: 'PENDING', OR: [{ assignedToUserId: userId }, { assignedToRoleId: userRoleId }] },
        include: { processElement: true, processInstance: true },
      });
      if (!task) throw new Error('Task not found, not pending, or not authorized.');
  
      await tx.taskInstance.update({ where: { id: taskId }, data: { status: 'COMPLETED', completedByUserId: userId, completionTime: new Date(), completionPayload: completionData } });
      
      const updatedBusinessData = { ...(task.processInstance.businessData || {}), ...(completionData.formData || {}) };
      const updatedProcessInstance = await tx.processInstance.update({ where: { id: task.processInstanceId }, data: { businessData: updatedBusinessData } });
  
      const outgoingSequence = await tx.processSequence.findFirst({
        where: {
          processDefId: task.processElement.processDefId,
          sourceElementBpmnId: task.processElement.bpmnElementId,
        },
      });
  
      if (outgoingSequence) {
        const nextElement = await tx.processElement.findFirst({
          where: {
            processDefId: task.processElement.processDefId,
            bpmnElementId: outgoingSequence.targetElementBpmnId,
          },
        });
        await processElement(nextElement, updatedProcessInstance, tx);
      } else if (task.processElement.type !== 'END_EVENT') {
        throw new Error(`Process modelling error: No outgoing sequence found for element ${task.processElement.bpmnElementId}`);
      }
  
      return { message: 'Task completed successfully.' };
    });
  };
    
  module.exports = {
    startProcess,
    completeTask,
  };
