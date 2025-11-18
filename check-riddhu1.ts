import { getDb } from './server/db';
import { users, childProfiles } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkRiddhu1() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const user = await db.select().from(users).where(eq(users.username, 'riddhu1'));
  console.log('User riddhu1:', user[0]);

  if (user[0]) {
    const child = await db.select().from(childProfiles).where(eq(childProfiles.id, user[0].id));
    console.log('Child profile for user id', user[0].id, ':', child[0] || 'NOT FOUND');
    
    // Also check if there's a child profile with userId pointing to this user
    const childByUserId = await db.select().from(childProfiles).where(eq(childProfiles.userId, user[0].id));
    console.log('Child profile by userId:', childByUserId[0] || 'NOT FOUND');
  }

  process.exit(0);
}

checkRiddhu1();
