import './config/env';
import { app } from './app';
import { sequelize } from './config/database';
import { logger } from './utils/logger';

const getPortFromArgs = (): number | null => {
  const portArgIndex = process.argv.indexOf('--port');
  const value = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : undefined;
  return value ? parseInt(value, 10) : null;
};

// Misma precedencia que hoy: PORT → --port → 3000 (N-14). `||` es intencional: un PORT vacío o
// un --port no numérico (NaN) caen al siguiente valor, igual que en el app.js original.
// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
const PORT = process.env.PORT || getPortFromArgs() || 3000;

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${String(PORT)}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

void startServer();
