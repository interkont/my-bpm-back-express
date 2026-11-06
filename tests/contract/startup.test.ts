import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { getTestDatabaseUrl, REPO_ROOT } from '../setup/db';
import { TEST_JWT_SECRET } from '../setup/server-harness';

const entry = process.env.CHARACTERIZATION_ENTRY ?? 'dist/server.js';

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

interface Result {
  code: number | null;
  output: string;
}

// Lanza el servidor con entorno explícito; resuelve al salir o al ver `waitFor` (y lo detiene).
const run = (env: Record<string, string>, args: string[], waitFor?: string): Promise<Result> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NODE_CONFIG_DIR: path.join(REPO_ROOT, 'src', 'config'),
        DATABASE_URL: getTestDatabaseUrl(),
        JWT_SECRET: TEST_JWT_SECRET,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timeout. Salida:\n${output}`));
    }, 20000);
    const onData = (chunk: Buffer): void => {
      output += chunk.toString();
      if (waitFor && output.includes(waitFor)) {
        clearTimeout(timer);
        child.once('exit', () => {
          resolve({ code: null, output });
        });
        child.kill();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });

describe('startup', () => {
  it('sin JWT_SECRET termina con código 1 y nombra la variable sin valores', async () => {
    const res = await run({ JWT_SECRET: '', PORT: String(await freePort()) }, []);
    expect(res.code).toBe(1);
    expect(res.output).toContain('Missing required configuration: JWT_SECRET');
    expect(res.output).not.toContain(getTestDatabaseUrl());
  });

  it('--port escucha en ese puerto cuando no hay PORT', async () => {
    const port = await freePort();
    const res = await run({ PORT: '' }, ['--port', String(port)], 'Server is running on port');
    expect(res.output).toContain(`Server is running on port ${String(port)}`);
  });

  it('PORT prevalece sobre --port', async () => {
    const envPort = await freePort();
    const argPort = await freePort();
    const res = await run(
      { PORT: String(envPort) },
      ['--port', String(argPort)],
      'Server is running on port',
    );
    expect(res.output).toContain(`Server is running on port ${String(envPort)}`);
    expect(res.output).not.toContain(`port ${String(argPort)}`);
  });
});
