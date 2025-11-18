import { getDb } from './server/db';
import { modules } from './drizzle/schema';

async function createHistoryModules() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const historyModules = [
    {
      name: 'Christianity',
      subject: 'History',
      description: 'Medieval Period and Birth of Christianity - covering the meaning of medieval period, birth and teachings of Jesus, crucifixion and resurrection, and spread of Christianity',
      difficulty: 'medium' as const,
      subjectId: 6,  // History
      boardId: 2,    // ICSE
      gradeId: 7,    // Grade 7
      isActive: true,
    },
    {
      name: 'Medieval Europe',
      subject: 'History',
      description: 'Medieval Europe Chapter 2 - covering decline of Roman Empire, rise of Byzantine Empire, spread of Christianity (400-900 CE), monasteries and monastic life, and the Crusades',
      difficulty: 'medium' as const,
      subjectId: 6,  // History
      boardId: 2,    // ICSE
      gradeId: 7,    // Grade 7
      isActive: true,
    },
    {
      name: 'Spread of Islam',
      subject: 'History',
      description: 'Spread of Islam Chapter 3 - covering advent of Islam, Hijrat, principles of Islam, the Caliphs, Abbasid & Umayyad Dynasties, Arab-Indian relations, and the Turks',
      difficulty: 'medium' as const,
      subjectId: 6,  // History
      boardId: 2,    // ICSE
      gradeId: 7,    // Grade 7
      isActive: true,
    },
  ];

  for (const module of historyModules) {
    try {
      const result = await db.insert(modules).values(module).returning({ id: modules.id });
      console.log(`✅ Created module: ${module.name} (ID: ${result[0].id})`);
    } catch (error: any) {
      console.error(`❌ Failed to create module ${module.name}:`, error.message);
    }
  }

  console.log('\n✅ All History modules created successfully!');
}

createHistoryModules().catch(console.error);
