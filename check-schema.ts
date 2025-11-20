import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'questions' 
    ORDER BY ordinal_position;
  `);

  console.log('Questions table columns:');
  console.log(result.rows);
  
  process.exit(0);
}

checkSchema();
