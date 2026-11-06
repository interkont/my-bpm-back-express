import './config/env';
import { logger } from './utils/logger';

// Mensaje seguro: nunca incluye la URL de conexión ni valores de configuración.
const safeMessage = (error: unknown): string =>
  error instanceof Error && error.message.startsWith('Missing required configuration:')
    ? error.message
    : 'Unable to connect to the database';

const startServer = async (): Promise<void> => {
  try {
    // Import dinámico: la validación de configuración corre al cargar estos módulos y su
    // error debe pasar por el logger y terminar con código 1.
    const { config } = await import('./config/index.js');
    const { app } = await import('./app.js');
    const { sequelize } = await import('./config/database.js');
    const port = config.resolvePort(process.argv);
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    app.listen(port, () => {
      logger.info(`Server is running on port ${String(port)}`);
    });
  } catch (error) {
    logger.error(safeMessage(error));
    // Deja que winston vacíe los transportes de archivo antes de salir.
    setTimeout(() => process.exit(1), 100);
  }
};

void startServer();
