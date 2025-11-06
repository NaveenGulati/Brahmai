import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import { sql } from 'drizzle-orm';

/**
 * Migration script to set points based on difficulty
 * Easy: 5 points
 * Medium: 10 points
 * Hard: 15 points
 */
async function migratePointsByDifficulty() {
  console.log('Starting points migration based on difficulty...');
  
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    // First, check current distribution
    console.log('\n📊 Current points distribution by difficulty:');
    const currentStats = await db.execute(sql`
      SELECT difficulty, points, COUNT(*) as count 
      FROM questions 
      GROUP BY difficulty, points
      ORDER BY difficulty, points
    `);
    console.table(currentStats.rows);

    // Update easy questions to 5 points
    console.log('\n🔄 Updating easy questions to 5 points...');
    const easyResult = await db.execute(sql`
      UPDATE questions 
      SET points = 5 
      WHERE difficulty = 'easy'
    `);
    console.log(`✅ Updated easy questions`);

    // Update medium questions to 10 points
    console.log('\n🔄 Updating medium questions to 10 points...');
    const mediumResult = await db.execute(sql`
      UPDATE questions 
      SET points = 10 
      WHERE difficulty = 'medium'
    `);
    console.log(`✅ Updated medium questions`);

    // Update hard questions to 15 points
    console.log('\n🔄 Updating hard questions to 15 points...');
    const hardResult = await db.execute(sql`
      UPDATE questions 
      SET points = 15 
      WHERE difficulty = 'hard'
    `);
    console.log(`✅ Updated hard questions`);

    // Verify the update
    console.log('\n📊 Updated points distribution by difficulty:');
    const updatedStats = await db.execute(sql`
      SELECT difficulty, points, COUNT(*) as count 
      FROM questions 
      GROUP BY difficulty, points
      ORDER BY difficulty, points
    `);
    console.table(updatedStats.rows);

    // Summary
    console.log('\n✅ Migration completed successfully!');
    console.log('Points are now set based on difficulty:');
    console.log('  - Easy: 5 points');
    console.log('  - Medium: 10 points');
    console.log('  - Hard: 15 points');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migratePointsByDifficulty();
