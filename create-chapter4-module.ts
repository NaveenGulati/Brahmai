import { getDb } from './server/db';
import { modules } from './drizzle/schema';

async function createChapter4Module() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // History subject ID = 6, ICSE board ID = 2, Grade 7 ID = 7
  const historySubjectId = 6;
  const icseBoardId = 2;
  const grade7Id = 7;

  const result = await db
    .insert(modules)
    .values({
      subjectId: historySubjectId,
      boardId: icseBoardId,
      gradeId: grade7Id,
      name: 'The Turkish Invasion and Establishment of the Delhi Sultanate (Chapter 4)',
      description: 'The Turkish Invasion and Establishment of the Delhi Sultanate (Chapter 4) - covering early Turkish invasions, rise of the Slave (Mamluk) Dynasty with Qutbuddin Aibak, Iltutmish and Razia Sultan, expansion under Balban and Alauddin Khilji, and the administration, governance and legacy of the Delhi Sultanate',
      estimatedDuration: 100, // 100 questions, ~1 min per question
      isActive: true,
    })
    .returning({ id: modules.id, name: modules.name });

  console.log('✅ Created Chapter 4 module:', result);
}

createChapter4Module().catch(console.error);
