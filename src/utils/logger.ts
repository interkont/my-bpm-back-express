import winston from 'winston';
import { isProduction } from '../config/environment';

// Logger único de la aplicación (research R-14). Se importa con nombre: `import { logger }`.
export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: 'combined.log',
      level: 'info',
      format: winston.format.json(),
    }),
  ],
});
