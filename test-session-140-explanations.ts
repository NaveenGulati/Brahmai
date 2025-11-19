import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL!;
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function checkExplanations() {
  console.log('Checking questions in session 140 for detailedExplanation...\n');
  
  const results = await db.execute(sql`
    SELECT 
        q.id,
        LEFT(q."questionText", 50) as question_preview,
        CASE 
            WHEN q."detailedExplanation" IS NULL THEN 'NULL'
            WHEN q."detailedExplanation" = '' THEN 'EMPTY'
            ELSE 'HAS_CONTENT (' || LENGTH(q."detailedExplanation") || ' chars)'
        END as detailed_explanation_status
    FROM questions q
    WHERE q.id IN (
        SELECT "questionId" FROM "quizAnswers" WHERE "sessionId" = 140
    )
    ORDER BY q.id
  `);
  
  console.log('Results:');
  console.log(JSON.stringify(results.rows, null, 2));
  
  const summary = results.rows.reduce((acc: any, row: any) => {
    acc[row.detailed_explanation_status.split(' ')[0]] = (acc[row.detailed_explanation_status.split(' ')[0]] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\nSummary:');
  console.log(summary);
  
  await client.end();
}

checkExplanations().catch(console.error);
