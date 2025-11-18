import { getDb } from './server/db';
import { users, childProfiles } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkDemoProfile() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get demo_student user
  const demoUser = await db
    .select()
    .from(users)
    .where(eq(users.username, 'demo_student'))
    .limit(1);

  console.log('Demo user:', demoUser);

  if (demoUser.length > 0) {
    // Get child profile for this user
    const childProfile = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.userId, demoUser[0].id));

    console.log('\nChild profile:', childProfile);
  }
}

checkDemoProfile().catch(console.error);
