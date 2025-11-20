import { getDb } from './server/db';
import { questions } from './drizzle/schema';

async function checkSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Try to get one question to see what columns exist
  const result = await db.select().from(questions).limit(1);
  
  if (result.length > 0) {
    console.log('Question columns:');
    console.log(Object.keys(result[0]));
    console.log('\nHas moduleId?', 'moduleId' in result[0]);
  } else {
    console.log('No questions found in database');
  }
  
  process.exit(0);
}

checkSchema();
