import { getDb } from './server/db';
import { subjects, modules, boards, grades } from './drizzle/schema';
import { like, eq, and } from 'drizzle-orm';

async function findMathIds() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Find Mathematics subject
  const mathSubjects = await db
    .select()
    .from(subjects)
    .where(like(subjects.name, '%Math%'));
  
  console.log('\n📊 Mathematics Subject:');
  console.log(mathSubjects);

  // Find ICSE board
  const icseBoard = await db
    .select()
    .from(boards)
    .where(eq(boards.name, 'ICSE'));
  
  console.log('\n📋 ICSE Board:');
  console.log(icseBoard);

  // Find Grade 7
  const grade7 = await db
    .select()
    .from(grades)
    .where(eq(grades.level, 7));
  
  console.log('\n🎓 Grade 7:');
  console.log(grade7);

  // Check existing Linear Equations modules
  const existingModules = await db
    .select()
    .from(modules)
    .where(like(modules.name, '%Linear%'));
  
  console.log('\n📚 Existing Linear Equations Modules:');
  console.log(existingModules);
}

findMathIds().catch(console.error);
