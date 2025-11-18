import { getDb } from './server/db';
import { childProfiles, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkRelationship() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Check childProfile with id=1
  const profile = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.id, 1));
    
  console.log('childProfile with id=1:');
  console.log('  childProfiles.id:', profile[0]?.id);
  console.log('  childProfiles.userId:', profile[0]?.userId);
  
  // Check if there's a childProfile with userId=1
  const profileByUserId = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.userId, 1));
    
  console.log('\nchildProfile with userId=1:');
  console.log('  Found:', profileByUserId.length > 0 ? 'YES' : 'NO');
  if (profileByUserId.length > 0) {
    console.log('  childProfiles.id:', profileByUserId[0].id);
    console.log('  childProfiles.userId:', profileByUserId[0].userId);
  }

  process.exit(0);
}

checkRelationship().catch(console.error);
