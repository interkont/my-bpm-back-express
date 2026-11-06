import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { getTestDatabaseUrl, REPO_ROOT } from './db';

export const TEST_JWT_SECRET = 'test-secret-not-for-production';

export interface RunningServer {
  baseUrl: string;
  stop(): Promise<void>;
  output(): string;
}

// Obtiene un puerto libre pidiéndole uno al sistema operativo
const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => {
        resolve(port);
      });
    });
  });

export const startServer = async (): Promise<RunningServer> => {
  const target = process.env.CHARACTERIZATION_TARGET ?? 'ts';
  // CHARACTERIZATION_ENTRY permite a cada carril paralelo usar su propia build (p. ej. .build/<carril>/server.js).
  const entry =
    target === 'js' ? 'src/app.js' : (process.env.CHARACTERIZATION_ENTRY ?? 'dist/server.js');
  const port = await freePort();

  // Se sobrescribe todo lo relevante: dotenv no pisa variables ya definidas
  const child = spawn(process.execPath, [entry], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      NODE_CONFIG_DIR: path.join(REPO_ROOT, 'src', 'config'),
      DATABASE_URL: getTestDatabaseUrl(),
      JWT_SECRET: TEST_JWT_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let captured = '';
  const exited = new Promise<void>((resolve) =>
    child.once('exit', () => {
      resolve();
    }),
  );

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout esperando el arranque del servidor. Salida:\n${captured}`));
    }, 20000);
    const onData = (chunk: Buffer): void => {
      captured += chunk.toString();
      if (captured.includes('Server is running on port')) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(
        new Error(`El servidor terminó (código ${code}) antes de arrancar. Salida:\n${captured}`),
      );
    });
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => captured,
    stop: async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await exited;
    },
  };
};
