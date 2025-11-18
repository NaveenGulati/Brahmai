import { getDb } from './server/db';
import { modules } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function fixHistoryModules() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // History subject ID is 6 (from earlier check)
  const historySubjectId = 6;

  // Update Medieval Europe module name
  const result1 = await db
    .update(modules)
    .set({ name: 'Medieval Europe — Chapter 2' })
    .where(and(
      eq(modules.name, 'Medieval Europe'),
      eq(modules.subjectId, historySubjectId)
    ))
    .returning({ id: modules.id });
  console.log('✅ Updated Medieval Europe module:', result1);

  // Update Spread of Islam module name
  const result2 = await db
    .update(modules)
    .set({ name: 'Spread of Islam — Chapter 3' })
    .where(and(
      eq(modules.name, 'Spread of Islam'),
      eq(modules.subjectId, historySubjectId)
    ))
    .returning({ id: modules.id });
  console.log('✅ Updated Spread of Islam module:', result2);

  console.log('\n✅ All History module names fixed!');
}

fixHistoryModules().catch(console.error);
