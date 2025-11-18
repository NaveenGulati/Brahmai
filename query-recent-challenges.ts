import { getDb } from './server/db';
import { challenges } from './drizzle/schema';
import { eq, desc } from 'drizzle-orm';

async function queryRecentChallenges() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Query challenges for childProfileId = 1 (riddhu1's child)
  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.assignedTo, 1))
    .orderBy(desc(challenges.createdAt))
    .limit(10);

  console.log('Recent challenges for childProfileId 1:');
  result.forEach(challenge => {
    console.log('\n=== Challenge', challenge.id, '===');
    console.log('Title:', challenge.title);
    console.log('Type:', challenge.challengeType);
    console.log('Status:', challenge.status);
    console.log('AssignedBy:', challenge.assignedBy);
    console.log('AssignedTo:', challenge.assignedTo);
    console.log('ModuleId:', challenge.moduleId);
    console.log('CreatedAt:', challenge.createdAt);
  });

  process.exit(0);
}

queryRecentChallenges().catch(console.error);
