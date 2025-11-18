import { getDb } from './server/db';
import { challenges } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkChallenge() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const challenge = await db.select().from(challenges).where(eq(challenges.id, 45));
  console.log('Challenge 45:', JSON.stringify(challenge[0], null, 2));
  console.log('\nChallengeScope type:', typeof challenge[0]?.challengeScope);
  console.log('ChallengeScope value:', challenge[0]?.challengeScope);
  
  if (challenge[0]?.challengeScope) {
    const scope = challenge[0].challengeScope as any;
    console.log('\nScope.topics type:', typeof scope.topics);
    console.log('Scope.topics value:', scope.topics);
    console.log('Is topics an array?', Array.isArray(scope.topics));
  }

  process.exit(0);
}

checkChallenge();
