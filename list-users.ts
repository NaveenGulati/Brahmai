import { getDb } from './server/db';
import { users, childProfiles } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function listUsers() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all child users
  const childUsers = await db.select({
    userId: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
  })
  .from(users)
  .where(eq(users.role, 'child'))
  .limit(10);

  console.log('Child users:');
  console.table(childUsers);
}

listUsers().catch(console.error);
