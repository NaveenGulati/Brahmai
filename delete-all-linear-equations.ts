import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

async function deleteAllLinearEquations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  console.log('\n🔍 Finding all Simple Linear Equations questions...\n');

  // Find all questions for Simple Linear Equations
  const allQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations')
      )
    );

  console.log(`Found ${allQuestions.length} total questions`);

  if (allQuestions.length === 0) {
    console.log('✅ No questions to delete');
    return;
  }

  const questionIds = allQuestions.map(q => q.id);

  // Delete detailed explanations first (foreign key constraint)
  console.log('\n🗑️  Deleting detailed explanations...');
  const deletedExplanations = await db
    .delete(aiExplanationCache)
    .where(inArray(aiExplanationCache.questionId, questionIds))
    .returning({ id: aiExplanationCache.questionId });

  console.log(`✅ Deleted ${deletedExplanations.length} detailed explanations`);

  // Delete questions
  console.log('\n🗑️  Deleting all questions...');
  const deletedQuestions = await db
    .delete(questions)
    .where(inArray(questions.id, questionIds))
    .returning({ id: questions.id });

  console.log(`✅ Deleted ${deletedQuestions.length} questions`);

  // Verify deletion
  const remaining = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations')
      )
    );

  console.log(`\n✅ Verification: ${remaining.length} questions remaining (should be 0)\n`);
}

deleteAllLinearEquations().catch(console.error);
