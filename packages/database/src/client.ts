import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDb(connectionUrl: string) {
  const client = postgres(connectionUrl, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(client, { schema });

  return { db, client };
}

export type Database = ReturnType<typeof createDb>['db'];
