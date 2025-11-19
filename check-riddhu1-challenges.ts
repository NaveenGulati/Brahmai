import { getDb } from './server/db';
import { challenges, childProfiles, users } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function checkChallenges() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get riddhu1's childProfileId
  const user = await db.select()
    .from(users)
    .where(eq(users.username, 'riddhu1'))
    .limit(1);
  
  if (user.length === 0) {
    console.log('User riddhu1 not found');
    return;
  }

  const profile = await db.select()
    .from(childProfiles)
    .where(eq(childProfiles.userId, user[0].id))
    .limit(1);
  
  if (profile.length === 0) {
    console.log('Child profile not found for riddhu1');
    return;
  }

  const childProfileId = profile[0].id;
  console.log(`riddhu1 userId: ${user[0].id}, childProfileId: ${childProfileId}`);

  // Get all pending challenges
  const pendingChallenges = await db.select()
    .from(challenges)
    .where(and(
      eq(challenges.assignedTo, childProfileId),
      eq(challenges.status, 'pending')
    ));

  console.log(`\nFound ${pendingChallenges.length} pending challenges:`);
  pendingChallenges.forEach(c => {
    console.log(`- ID: ${c.id}, Title: ${c.title}, Type: ${c.challengeType}, Created: ${c.createdAt}`);
  });
}

checkChallenges().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
