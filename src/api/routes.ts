import { Router } from 'express';
import { roleRouter } from './roles/role.routes';
import { userRouter } from './users/user.routes';
import { authRouter } from './auth/auth.routes';
import { taskRouter } from './tasks/tasks.routes';
import { processRouter } from './processes/processes.routes';
import { processInstanceRouter } from './process-instances/processInstances.routes';
import { decisionRouter } from './engine/decision.routes';

export const apiRouter = Router();

apiRouter.use('/roles', roleRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/processes', processRouter);
apiRouter.use('/process-instances', processInstanceRouter);
apiRouter.use('/engine', decisionRouter);
