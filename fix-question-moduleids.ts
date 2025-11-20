import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { questions, modules, subjects } from './drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL!;

async function fixQuestionModuleIds() {
  console.log('🔧 Starting moduleId fix for questions...\n');
  
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Get all questions without moduleId
    const result = await db.execute(sql`
      SELECT * FROM questions WHERE "moduleId" IS NULL
    `);
    const questionsWithoutModule = result.rows as any[];

    console.log(`Found ${questionsWithoutModule.length} questions without moduleId\n`);

    let updated = 0;
    let failed = 0;

    for (const question of questionsWithoutModule) {
      try {
        // Find the subject by name
        const subjectRecord = await db
          .select()
          .from(subjects)
          .where(eq(subjects.name, question.subject))
          .limit(1);

        if (subjectRecord.length === 0) {
          console.warn(`❌ Subject not found: ${question.subject} for question ${question.id}`);
          failed++;
          continue;
        }

        const subjectId = subjectRecord[0].id;

        // Find the module by subjectId and topic name
        const moduleRecord = await db
          .select()
          .from(modules)
          .where(and(
            eq(modules.subjectId, subjectId),
            eq(modules.name, question.topic)
          ))
          .limit(1);

        if (moduleRecord.length === 0) {
          console.warn(`❌ Module not found: ${question.subject} - ${question.topic} for question ${question.id}`);
          failed++;
          continue;
        }

        const moduleId = moduleRecord[0].id;

        // Update the question with moduleId
        await db
          .update(questions)
          .set({ moduleId })
          .where(eq(questions.id, question.id));

        updated++;
        
        if (updated % 100 === 0) {
          console.log(`✅ Updated ${updated} questions...`);
        }
      } catch (error: any) {
        console.error(`❌ Error updating question ${question.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${questionsWithoutModule.length}`);

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

fixQuestionModuleIds().catch(console.error);
