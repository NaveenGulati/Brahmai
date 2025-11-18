import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function checkHistoryTopics() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get distinct topics for History subject
  const topics = await db
    .selectDistinct({ topic: questions.topic })
    .from(questions)
    .where(eq(questions.subject, 'History'));

  console.log('History topics in database:');
  topics.forEach(t => console.log(`  - "${t.topic}"`));

  // Count questions per topic
  console.log('\nQuestion counts per topic:');
  for (const t of topics) {
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(eq(questions.topic, t.topic));
    console.log(`  - "${t.topic}": ${count[0].count} questions`);
  }
}

checkHistoryTopics().catch(console.error);
