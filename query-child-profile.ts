import { getDb } from './server/db';
import { childProfiles, users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function queryChildProfile() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Query childProfile for userId 45
  const profiles = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.userId, 45));

  console.log('Child profiles for userId 45:');
  profiles.forEach(profile => {
    console.log('childProfileId:', profile.id);
    console.log('userId:', profile.userId);
    console.log('name:', profile.name);
  });

  // Also check the user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, 45));
    
  console.log('\nUser 45:');
  console.log(user[0]);

  process.exit(0);
}

queryChildProfile().catch(console.error);
