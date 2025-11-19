import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function checkModuleId() {
  console.log('Checking recent quiz sessions for moduleId...\n');
  
  const results = await db.execute(sql`
    SELECT 
        id,
        "childId",
        "moduleId",
        "isCompleted",
        "completedAt"
    FROM "quizSessions"
    WHERE "childId" = 1
    ORDER BY id DESC
    LIMIT 10
  `);
  
  console.log('Recent sessions:');
  console.table(results.rows);
  
  const nullCount = results.rows.filter((r: any) => r.moduleId === null).length;
  console.log(`\nSessions with null moduleId: ${nullCount}/${results.rows.length}`);
  
  await client.end();
}

checkModuleId().catch(console.error);
