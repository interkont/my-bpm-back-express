import './config/env';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { passport } from './config/passport';
import { errorMiddleware } from './api/middlewares/error.middleware';
import { apiRouter } from './api/routes';

// Aplicación Express sin `listen` (importable por pruebas); el arranque vive en server.ts.
// El orden de los middlewares es el mismo que en el app.js original.
export const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());

app.use(express.static(path.join(__dirname, '../public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(passport.initialize());

app.use('/api', apiRouter);

app.use(errorMiddleware);
