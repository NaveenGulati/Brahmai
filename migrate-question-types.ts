import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import { sql, eq } from 'drizzle-orm';

/**
 * Migration script to standardize question types
 * Converts all 'mcq' question types to 'multiple_choice'
 */
async function migrateQuestionTypes() {
  console.log('Starting question type migration...');
  
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    // First, check current state
    console.log('\n📊 Current question type distribution:');
    const currentStats = await db.execute(sql`
      SELECT "questionType", COUNT(*) as count 
      FROM questions 
      GROUP BY "questionType"
      ORDER BY count DESC
    `);
    console.table(currentStats.rows);

    // Count how many need to be updated
    const mcqCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM questions 
      WHERE "questionType" = 'mcq'
    `);
    const toUpdate = mcqCount.rows[0]?.count || 0;
    console.log(`\n🔄 Found ${toUpdate} questions with 'mcq' type that need updating...`);

    if (toUpdate === 0) {
      console.log('✅ No questions need updating. All question types are already standardized!');
      process.exit(0);
    }

    // Perform the update
    console.log('\n🚀 Updating question types from "mcq" to "multiple_choice"...');
    const result = await db.execute(sql`
      UPDATE questions 
      SET "questionType" = 'multiple_choice' 
      WHERE "questionType" = 'mcq'
    `);
    
    console.log(`✅ Successfully updated ${toUpdate} questions!`);

    // Verify the update
    console.log('\n📊 Updated question type distribution:');
    const updatedStats = await db.execute(sql`
      SELECT "questionType", COUNT(*) as count 
      FROM questions 
      GROUP BY "questionType"
      ORDER BY count DESC
    `);
    console.table(updatedStats.rows);

    // Final verification
    const remainingMcq = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM questions 
      WHERE "questionType" = 'mcq'
    `);
    const remaining = remainingMcq.rows[0]?.count || 0;

    if (remaining === 0) {
      console.log('\n✅ Migration completed successfully! All question types are now standardized.');
    } else {
      console.log(`\n⚠️  Warning: ${remaining} questions still have 'mcq' type. Please investigate.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateQuestionTypes();
