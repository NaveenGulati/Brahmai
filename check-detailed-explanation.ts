import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import { like, and } from 'drizzle-orm';

async function checkDetailedExplanation() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const chapter4Questions = await db
    .select()
    .from(questions)
    .where(
      like(questions.topic, '%Turkish Invasion%')
    )
    .limit(5);

  console.log(`Checking ${chapter4Questions.length} sample Chapter 4 questions:\n`);
  
  for (const q of chapter4Questions) {
    console.log('Question:', q.questionText.substring(0, 60) + '...');
    console.log('Explanation:', q.explanation?.substring(0, 80) + '...');
    console.log('Has detailedExplanation:', !!(q as any).detailedExplanation);
    
    // Check if the field exists in the schema
    const keys = Object.keys(q);
    console.log('Available fields:', keys.join(', '));
    console.log('---\n');
    break; // Just check first one
  }
}

checkDetailedExplanation().catch(console.error);
