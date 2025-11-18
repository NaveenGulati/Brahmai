import { getDb } from './server/db';
import { subjects, boards, grades } from './drizzle/schema';
import { eq, or, ilike } from 'drizzle-orm';

async function findIds() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Find History subject
  const historySubjects = await db.select().from(subjects).where(
    or(
      eq(subjects.name, 'History'),
      ilike(subjects.name, '%history%')
    )
  );
  console.log('History subjects:', historySubjects);

  // Find ICSE board
  const icseBoards = await db.select().from(boards).where(
    or(
      eq(boards.name, 'ICSE'),
      ilike(boards.name, '%icse%')
    )
  );
  console.log('ICSE boards:', icseBoards);

  // Find Grade 7
  const grade7 = await db.select().from(grades).where(
    or(
      eq(grades.name, '7'),
      eq(grades.name, 'Grade 7'),
      eq(grades.name, 'Class 7')
    )
  );
  console.log('Grade 7:', grade7);
}

findIds().catch(console.error);
