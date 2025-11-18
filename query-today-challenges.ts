import { getDb } from './server/db';
import { challenges } from './drizzle/schema';
import { gte, desc } from 'drizzle-orm';

async function queryTodayChallenges() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get challenges created today (Nov 18, 2025)
  const today = new Date('2025-11-18T00:00:00Z');
  
  const result = await db
    .select()
    .from(challenges)
    .where(gte(challenges.createdAt, today))
    .orderBy(desc(challenges.createdAt));

  console.log('Challenges created today (Nov 18, 2025):');
  result.forEach(challenge => {
    console.log('\n=== Challenge', challenge.id, '===');
    console.log('Title:', challenge.title);
    console.log('Type:', challenge.challengeType);
    console.log('Status:', challenge.status);
    console.log('AssignedBy (userId):', challenge.assignedBy);
    console.log('AssignedTo (childProfileId):', challenge.assignedTo);
    console.log('ModuleId:', challenge.moduleId);
    console.log('CreatedAt:', challenge.createdAt);
  });

  process.exit(0);
}

queryTodayChallenges().catch(console.error);
