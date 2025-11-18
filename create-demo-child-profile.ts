import { getDb } from './server/db';
import { childProfiles } from './drizzle/schema';

async function createDemoChildProfile() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Create child profile for demo_student (user ID 3)
  // ICSE board ID = 2, Grade 7 ID = 7
  const result = await db
    .insert(childProfiles)
    .values({
      userId: 3,
      parentId: null, // No parent for demo account
      board: 'ICSE',
      currentGrade: 7,
      dateOfBirth: new Date('2010-01-01'), // Sample DOB
    })
    .returning({ id: childProfiles.id });

  console.log('✅ Created child profile for demo_student:', result);
}

createDemoChildProfile().catch(console.error);
