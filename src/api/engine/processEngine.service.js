const prisma = require('../../utils/prisma');
const { evaluateExpression } = require('../../utils/expressionEngine');

// --- createTaskInstance (SIN CAMBIOS) ---
const createTaskInstance = async (elementDefinition, processInstance, tx) => {
    console.log(`[Engine] > Creating USER_TASK for element: ${elementDefinition.name} (${elementDefinition.bpmnElementId})`);
    return tx.taskInstance.create({
      data: {
        processInstanceId: processInstance.id,
        elementDefId: elementDefinition.id,
        status: 'PENDING',
        assignedToRoleId: elementDefinition.assignedRoleId,
      },
    });
};

// --- processElement (SIN CAMBIOS) ---
const processElement = async (elementToProcess, processInstance, tx, taskContext = {}) => {
    console.log(`[Engine] Processing element: ${elementToProcess.name} (${elementToProcess.bpmnElementId}) | Type: ${elementToProcess.type}`);
    switch (elementToProcess.type) {
      case 'START_EVENT':
      case 'PARALLEL_GATEWAY': {
        const outgoingSequences = await tx.processSequence.findMany({ where: { processDefId: elementToProcess.processDefId, sourceElementBpmnId: elementToProcess.bpmnElementId } });
        console.log(`[Engine] | Found ${outgoingSequences.length} outgoing sequence(s). Following all.`);
        await Promise.all(outgoingSequences.map(async (sequence) => {
          const nextElement = await tx.processElement.findFirst({ where: { processDefId: elementToProcess.processDefId, bpmnElementId: sequence.targetElementBpmnId } });
          await processElement(nextElement, processInstance, tx, taskContext);
        }));
        break;
      }
      case 'USER_TASK': {
        await createTaskInstance(elementToProcess, processInstance, tx);
        break;
      }
      case 'EXCLUSIVE_GATEWAY': {
        const outgoingSequences = await tx.processSequence.findMany({ where: { processDefId: elementToProcess.processDefId, sourceElementBpmnId: elementToProcess.bpmnElementId } });
        const { businessData, ...instanceData } = processInstance;
        const fullContext = {
            ...(businessData || {}),
            instance: instanceData,
            task: taskContext
        };
        let chosenSequence = null;
        for (const seq of outgoingSequences) {
          if (seq.conditionExpression && evaluateExpression(seq.conditionExpression, fullContext)) {
            chosenSequence = seq;
            break;
          }
        }
        if (!chosenSequence) { chosenSequence = outgoingSequences.find(seq => !seq.conditionExpression); }
        if (chosenSequence) {
          console.log(`[Engine] | Chosen route: -> ${chosenSequence.targetElementBpmnId}`);
          const nextElement = await tx.processElement.findFirst({ where: { processDefId: elementToProcess.processDefId, bpmnElementId: chosenSequence.targetElementBpmnId } });
          await processElement(nextElement, processInstance, tx, taskContext);
        } else {
          throw new Error(`No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${elementToProcess.bpmnElementId}.`);
        }
        break;
      }
      case 'END_EVENT': {
        console.log(`[Engine] > Reached END_EVENT. Completing process instance ${processInstance.id}.`);
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

// --- startProcess (MODIFICADO) ---
const startProcess = async (businessProcessKey, startedByUserId, businessData, description) => { // Añadido 'description'
    console.log(`[Engine] Starting process with key: ${businessProcessKey}`);
    return prisma.$transaction(async (tx) => {
      const processDefinition = await tx.processDefinition.findFirst({ where: { businessProcessKey, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
      if (!processDefinition) throw new Error(`Process with key '${businessProcessKey}' not found or is not active.`);
      const processInstance = await tx.processInstance.create({ 
        data: { 
            processDefId: processDefinition.id, 
            status: 'RUNNING', 
            startedByUserId, 
            businessData,
            description // <-- CAMBIO QUIRÚRGICO AQUÍ
        } 
      });
      console.log(`[Engine] | Created process instance ID: ${processInstance.id}`);
      const startEvent = await tx.processElement.findFirst({ where: { processDefId: processDefinition.id, type: 'START_EVENT' } });
      if (!startEvent) throw new Error('Process is invalid: No START_EVENT found.');
      await processElement(startEvent, processInstance, tx, {});
      return processInstance;
    });
};

// --- completeTask (MODIFICADO) ---
const completeTask = async (taskId, completionData, userId, userRoleId) => {
  console.log(`[Engine] Completing task ID: ${taskId}`);
  return prisma.$transaction(async (tx) => {
    const task = await tx.taskInstance.findFirst({
      where: { id: taskId, status: 'PENDING', OR: [{ assignedToUserId: userId }, { assignedToRoleId: userRoleId }] },
      include: { processElement: true, processInstance: true },
    });
    if (!task) throw new Error('Task not found, not pending, or not authorized.');
    await tx.taskInstance.update({ 
        where: { id: taskId }, 
        data: { 
            status: 'COMPLETED', 
            completedByUserId: userId, 
            completionTime: new Date(), 
            completionPayload: completionData,
            comments: completionData.comments // <-- CAMBIO QUIRÚRGICO AQUÍ
        } 
    });
    const updatedBusinessData = { ...(task.processInstance.businessData || {}), ...(completionData.formData || {}) };
    const updatedProcessInstance = await tx.processInstance.update({ where: { id: task.processInstanceId }, data: { businessData: updatedBusinessData } });

    const taskContext = {
        bpmnElementId: task.processElement.bpmnElementId,
        action: completionData.action,
        formData: completionData.formData || {},
        comments: completionData.comments, // <-- CAMBIO QUIRÚRGICO AQUÍ
        completedBy: { id: userId, roleId: userRoleId }
    };

    const outgoingSequence = await tx.processSequence.findFirst({
      where: { processDefId: task.processElement.processDefId, sourceElementBpmnId: task.processElement.bpmnElementId },
    });
    if (!outgoingSequence) { throw new Error(`Process modelling error: No outgoing sequence for ${task.processElement.bpmnElementId}`); }
    
    const nextElement = await tx.processElement.findFirst({
      where: { processDefId: task.processElement.processDefId, bpmnElementId: outgoingSequence.targetElementBpmnId },
    });
    if (!nextElement) { throw new Error(`Process modelling error: Next element not found.`); }

    if (nextElement.type === 'PARALLEL_GATEWAY') {
      console.log(`[Engine] | Reached a PARALLEL_GATEWAY join. Checking for completion...`);
      const joinGateway = nextElement;
      const incomingSequences = await tx.processSequence.findMany({ where: { processDefId: joinGateway.processDefId, targetElementBpmnId: joinGateway.bpmnElementId } });
      const sourceElementBpmnIds = incomingSequences.map(seq => seq.sourceElementBpmnId);
      const completedTasksCount = await tx.taskInstance.count({
        where: {
          processInstanceId: task.processInstanceId,
          status: 'COMPLETED',
          processElement: { bpmnElementId: { in: sourceElementBpmnIds } }
        },
      });
      console.log(`[Engine] | ${completedTasksCount}/${incomingSequences.length} parallel tasks completed.`);
      if (completedTasksCount === incomingSequences.length) {
        console.log(`[Engine] | All parallel tasks complete. Continuing from gateway.`);
        await processElement(joinGateway, updatedProcessInstance, tx, taskContext);
      }
    } else {
      await processElement(nextElement, updatedProcessInstance, tx, taskContext);
    }

    return { message: 'Task completed successfully.' };
  });
};
  
module.exports = {
  startProcess,
  completeTask,
};
