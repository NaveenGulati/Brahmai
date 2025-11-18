import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import { like, and } from 'drizzle-orm';

async function checkChapter4() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const chapter4Questions = await db
    .select()
    .from(questions)
    .where(
      and(
        like(questions.topic, '%Turkish Invasion%')
      )
    );

  console.log(`Found ${chapter4Questions.length} Chapter 4 questions in database`);
  
  if (chapter4Questions.length > 0) {
    console.log('\nSample question:');
    console.log('Topic:', chapter4Questions[0].topic);
    console.log('Subtopic:', chapter4Questions[0].subTopic);
    console.log('Question:', chapter4Questions[0].questionText.substring(0, 80) + '...');
  }
}

checkChapter4().catch(console.error);
