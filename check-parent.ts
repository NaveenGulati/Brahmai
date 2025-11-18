import { getDb } from './server/db';
import { childProfiles, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkParent() {
  const db = await getDb();
  if (!db) return;

  const profile = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.id, 1));
    
  console.log('childProfile 1:');
  console.log('  id:', profile[0]?.id);
  console.log('  userId:', profile[0]?.userId);
  console.log('  parentId:', profile[0]?.parentId);
  
  if (profile[0]?.parentId) {
    const parent = await db
      .select()
      .from(users)
      .where(eq(users.id, profile[0].parentId));
    console.log('\nParent user:');
    console.log('  id:', parent[0]?.id);
    console.log('  role:', parent[0]?.role);
    console.log('  name:', parent[0]?.name);
  }

  process.exit(0);
}

checkParent().catch(console.error);
