import { existsSync } from 'node:fs';
import { adminDb } from './helpers';

/** Removes what the tests created (users e2e-*@wantedlevel.test, events titled "E2E …"). */
export default async function globalTeardown() {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const db = adminDb();
  await db.from('events').delete().like('title', 'E2E %');
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith('e2e-') && user.email.endsWith('@wantedlevel.test')) await db.auth.admin.deleteUser(user.id);
  }
}
