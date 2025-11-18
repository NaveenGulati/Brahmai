import { getDb } from './server/db';
import { modules } from './drizzle/schema';

async function createLinearEquationsModule() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Mathematics subject ID = 4, ICSE board ID = 2, Grade 7 ID = 7
  const mathSubjectId = 4;
  const icseBoardId = 2;
  const grade7Id = 7;

  const result = await db
    .insert(modules)
    .values({
      subjectId: mathSubjectId,
      boardId: icseBoardId,
      gradeId: grade7Id,
      name: 'Simple Linear Equations',
      description: 'Simple Linear Equations - covering basics and definition of equations, solving one-step equations (add/subtract and multiply/divide), two-step equations, transposition methods, variables on both sides, equations with brackets and fractions, word problems, and practical applications including percent and mixture problems',
      estimatedDuration: 500, // 500 questions, ~1 min per question
      isActive: true,
    })
    .returning({ id: modules.id, name: modules.name });

  console.log('✅ Created Simple Linear Equations module:', result);
}

createLinearEquationsModule().catch(console.error);
