import { getDb } from './server/db';
import { challenges } from './drizzle/schema';
import { inArray } from 'drizzle-orm';

async function queryChallenge() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db
    .select()
    .from(challenges)
    .where(inArray(challenges.id, [45, 40]));

  console.log('Challenge 45 and 40:');
  result.forEach(challenge => {
    console.log('\n=== Challenge', challenge.id, '===');
    console.log('Title:', challenge.title);
    console.log('Type:', challenge.challengeType);
    console.log('challengeScope type:', typeof challenge.challengeScope);
    console.log('challengeScope:', JSON.stringify(challenge.challengeScope, null, 2));
  });

  process.exit(0);
}

queryChallenge().catch(console.error);
