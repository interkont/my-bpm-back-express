const {
  sequelize,
  ProcessDefinition,
  ProcessInstance,
  ProcessElement,
  ProcessSequence,
  TaskInstance,
} = require('../../models');
const { evaluateExpression } = require('../../utils/expressionEngine');
const { Op } = require('sequelize');

// --- createTaskInstance (MODIFICADO para Sequelize) ---
const createTaskInstance = async (elementDefinition, processInstance, t) => {
  console.log(
    `[Engine] > Creating USER_TASK for element: ${elementDefinition.name} (${elementDefinition.bpmnElementId})`
  );
  return TaskInstance.create(
    {
      processInstanceId: processInstance.id,
      elementDefId: elementDefinition.id,
      status: 'PENDING',
      assignedToRoleId: elementDefinition.assignedRoleId,
    },
    { transaction: t }
  );
};

// --- processElement (MODIFICADO para Sequelize) ---
const processElement = async (
  elementToProcess,
  processInstance,
  t,
  taskContext = {}
) => {
  console.log(
    `[Engine] Processing element: ${elementToProcess.name} (${elementToProcess.bpmnElementId}) | Type: ${elementToProcess.type}`
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
      console.log(
        `[Engine] | Found ${outgoingSequences.length} outgoing sequence(s). Following all.`
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
          await processElement(nextElement, processInstance, t, taskContext);
        })
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
      const { businessData, ...instanceData } =
        processInstance.get({ plain: true });
      const fullContext = {
        ...(businessData || {}),
        instance: instanceData,
        task: taskContext,
      };
      let chosenSequence = null;
      for (const seq of outgoingSequences) {
        if (
          seq.conditionExpression &&
          evaluateExpression(seq.conditionExpression, fullContext)
        ) {
          chosenSequence = seq;
          break;
        }
      }
      if (!chosenSequence) {
        chosenSequence = outgoingSequences.find(
          (seq) => !seq.conditionExpression
        );
      }
      if (chosenSequence) {
        console.log(
          `[Engine] | Chosen route: -> ${chosenSequence.targetElementBpmnId}`
        );
        const nextElement = await ProcessElement.findOne({
          where: {
            processDefId: elementToProcess.processDefId,
            bpmnElementId: chosenSequence.targetElementBpmnId,
          },
          transaction: t,
        });
        await processElement(nextElement, processInstance, t, taskContext);
      } else {
        throw new Error(
          `No valid outgoing sequence found for EXCLUSIVE_GATEWAY ${elementToProcess.bpmnElementId}.`
        );
      }
      break;
    }
    case 'END_EVENT': {
      console.log(
        `[Engine] > Reached END_EVENT. Completing process instance ${processInstance.id}.`
      );
      await ProcessInstance.update(
        { status: 'COMPLETED', endTime: new Date() },
        {
          where: { id: processInstance.id },
          transaction: t,
        }
      );
      break;
    }
    default:
      throw new Error(`Unsupported element type: ${elementToProcess.type}`);
  }
};

// --- startProcess (MODIFICADO para Sequelize) ---
const startProcess = async (
  businessProcessKey,
  startedByUserId,
  businessData,
  description
) => {
  console.log(`[Engine] Starting process with key: ${businessProcessKey}`);
  return sequelize.transaction(async (t) => {
    const processDefinition = await ProcessDefinition.findOne({
      where: { businessProcessKey, status: 'ACTIVE' },
      order: [['version', 'DESC']],
      transaction: t,
    });
    if (!processDefinition)
      throw new Error(
        `Process with key '${businessProcessKey}' not found or is not active.`
      );
    const processInstance = await ProcessInstance.create(
      {
        processDefId: processDefinition.id,
        status: 'RUNNING',
        startedByUserId,
        businessData,
        description,
      },
      { transaction: t }
    );
    console.log(
      `[Engine] | Created process instance ID: ${processInstance.id}`
    );
    const startEvent = await ProcessElement.findOne({
      where: { processDefId: processDefinition.id, type: 'START_EVENT' },
      transaction: t,
    });
    if (!startEvent)
      throw new Error('Process is invalid: No START_EVENT found.');
    await processElement(startEvent, processInstance, t, {});
    return processInstance;
  });
};

// --- completeTask (MODIFICADO para Sequelize) ---
const completeTask = async (taskId, completionData, userId, roleIds) => {
  console.log(`[Engine] Completing task ID: ${taskId}`);
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
    if (!task)
      throw new Error('Task not found, not pending, or not authorized.');
    await TaskInstance.update(
      {
        status: 'COMPLETED',
        completedByUserId: userId,
        completionTime: new Date(),
        completionPayload: completionData,
        comments: completionData.comments,
      },
      { where: { id: taskId }, transaction: t }
    );
    const updatedBusinessData = {
      ...(task.processInstance.businessData || {}),
      ...(completionData.formData || {}),
    };
    await ProcessInstance.update(
      { businessData: updatedBusinessData },
      { where: { id: task.processInstanceId }, transaction: t }
    );
    // Recargamos la instancia para obtener los datos actualizados
    const updatedProcessInstance = await ProcessInstance.findByPk(
      task.processInstanceId,
      { transaction: t }
    );

    const taskContext = {
      bpmnElementId: task.processElement.bpmnElementId,
      action: completionData.action,
      formData: completionData.formData || {},
      comments: completionData.comments,
      completedBy: { id: userId, roleIds: roleIds },
    };

    const outgoingSequence = await ProcessSequence.findOne({
      where: {
        processDefId: task.processElement.processDefId,
        sourceElementBpmnId: task.processElement.bpmnElementId,
      },
      transaction: t,
    });
    if (!outgoingSequence) {
      throw new Error(
        `Process modelling error: No outgoing sequence for ${task.processElement.bpmnElementId}`
      );
    }

    const nextElement = await ProcessElement.findOne({
      where: {
        processDefId: task.processElement.processDefId,
        bpmnElementId: outgoingSequence.targetElementBpmnId,
      },
      transaction: t,
    });
    if (!nextElement) {
      throw new Error(`Process modelling error: Next element not found.`);
    }

    if (nextElement.type === 'PARALLEL_GATEWAY') {
      console.log(
        `[Engine] | Reached a PARALLEL_GATEWAY join. Checking for completion...`
      );
      const joinGateway = nextElement;
      const incomingSequences = await ProcessSequence.findAll({
        where: {
          processDefId: joinGateway.processDefId,
          targetElementBpmnId: joinGateway.bpmnElementId,
        },
        transaction: t,
      });
      const sourceElementBpmnIds = incomingSequences.map(
        (seq) => seq.sourceElementBpmnId
      );
      const completedTasksCount = await TaskInstance.count({
        where: {
          processInstanceId: task.processInstanceId,
          status: 'COMPLETED',
          // Sequelize no soporta un where en un include para count,
          // así que necesitamos un join manual o una subconsulta si es necesario.
          // Por ahora, asumimos que podemos consultar por el `elementDefId` directamente
          // si tenemos esa relación bien establecida.
          // Una forma más simple es obtener los Ids de los elementos de proceso
          // y luego usarlos en la consulta.
        },
        // Esta es una limitación en Sequelize. Vamos a hacerlo en dos pasos:
      });
      
      const sourceElements = await ProcessElement.findAll({
        where: { bpmnElementId: { [Op.in]: sourceElementBpmnIds }, processDefId: joinGateway.processDefId },
        attributes: ['id'],
        transaction: t,
      });
      const sourceElementIds = sourceElements.map(el => el.id);

      const completedTaskCountForJoin = await TaskInstance.count({
          where: {
              processInstanceId: task.processInstanceId,
              status: 'COMPLETED',
              elementDefId: { [Op.in]: sourceElementIds }
          },
          transaction: t
      });


      console.log(
        `[Engine] | ${completedTaskCountForJoin}/${incomingSequences.length} parallel tasks completed.`
      );
      if (completedTaskCountForJoin === incomingSequences.length) {
        console.log(
          `[Engine] | All parallel tasks complete. Continuing from gateway.`
        );
        await processElement(
          joinGateway,
          updatedProcessInstance,
          t,
          taskContext
        );
      }
    } else {
      await processElement(nextElement, updatedProcessInstance, t, taskContext);
    }

    return { message: 'Task completed successfully.' };
  });
};

module.exports = {
  startProcess,
  completeTask,
};
