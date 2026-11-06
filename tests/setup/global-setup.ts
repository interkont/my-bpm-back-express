import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { getTestDatabaseUrl, REPO_ROOT } from './db';

export default async function globalSetup(): Promise<void> {
  const testUrl = getTestDatabaseUrl();

  // Salvaguarda: jamás tocar la base compartida definida en .env
  const envPath = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    if (parsed.DATABASE_URL && parsed.DATABASE_URL === testUrl) {
      throw new Error('TEST_DATABASE_URL apunta a la base compartida');
    }
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === testUrl) {
    throw new Error('TEST_DATABASE_URL apunta a la base compartida');
  }

  // El baseline es idempotente: se aplica sin recrear la base
  const sql = fs.readFileSync(path.join(REPO_ROOT, 'db/migrations/000_baseline.sql'), 'utf8');
  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }

  // Los workers heredan la variable
  process.env.TEST_DATABASE_URL = testUrl;
}
