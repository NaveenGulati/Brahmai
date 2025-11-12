import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Run database migrations
 * This script runs automatically on server startup
 */
export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Add headline column to notes table
    await db.execute(sql`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS headline VARCHAR(255)
    `);
    console.log('✅ Added headline column to notes table');
    
    // Add difficulty column to generated_questions table
    await db.execute(sql`
      ALTER TABLE generated_questions 
      ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium'
    `);
    console.log('✅ Added difficulty column to generated_questions table');
    
    // Create index on difficulty
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty 
      ON generated_questions(difficulty)
    `);
    console.log('✅ Created index on difficulty column');
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
