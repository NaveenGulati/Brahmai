import { getDb } from './db';
import { sql } from 'drizzle-orm';

/**
 * Run database migrations
 * This script runs automatically on server startup
 */
export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    
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
    
    // Add grade and board to subjects table
    await db.execute(sql`
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 7
    `);
    await db.execute(sql`
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS board VARCHAR(50) DEFAULT 'ICSE'
    `);
    await db.execute(sql`
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS display_sequence INTEGER DEFAULT 0
    `);
    console.log('✅ Added grade, board, and display_sequence to subjects table');
    
    // Add grade and board to children table
    await db.execute(sql`
      ALTER TABLE children ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 7
    `);
    await db.execute(sql`
      ALTER TABLE children ADD COLUMN IF NOT EXISTS board VARCHAR(50) DEFAULT 'ICSE'
    `);
    console.log('✅ Added grade and board to children table');
    
    // Create child_subjects mapping table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS child_subjects (
        id SERIAL PRIMARY KEY,
        child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(child_id, subject_id)
      )
    `);
    console.log('✅ Created child_subjects mapping table');
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
