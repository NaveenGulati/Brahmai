import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function findMathSubjectId() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Query subjects table
  const subjects = await db.execute(sql`SELECT id, name FROM subjects WHERE name LIKE '%Math%'`);
  
  console.log('\n📊 Mathematics Subject:');
  console.log(subjects.rows);

  // Also check if there's already a Simple Linear Equations module
  const modules = await db.execute(sql`
    SELECT id, name, "subjectId" 
    FROM modules 
    WHERE name LIKE '%Linear%' OR name LIKE '%Equation%'
  `);
  
  console.log('\n📚 Existing Linear Equations Modules:');
  console.log(modules.rows);
}

findMathSubjectId().catch(console.error);
