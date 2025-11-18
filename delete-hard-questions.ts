import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

async function deleteHardQuestions() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  console.log('\n🔍 Finding hard difficulty questions in Simple Linear Equations...\n');

  // Find all hard questions for Simple Linear Equations
  const hardQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations'),
        eq(questions.difficulty, 'hard')
      )
    );

  console.log(`Found ${hardQuestions.length} hard difficulty questions`);

  if (hardQuestions.length === 0) {
    console.log('✅ No hard questions to delete');
    return;
  }

  const questionIds = hardQuestions.map(q => q.id);

  // Delete detailed explanations first (foreign key constraint)
  console.log('\n🗑️  Deleting detailed explanations...');
  const deletedExplanations = await db
    .delete(aiExplanationCache)
    .where(inArray(aiExplanationCache.questionId, questionIds))
    .returning({ id: aiExplanationCache.questionId });

  console.log(`✅ Deleted ${deletedExplanations.length} detailed explanations`);

  // Delete questions
  console.log('\n🗑️  Deleting hard questions...');
  const deletedQuestions = await db
    .delete(questions)
    .where(inArray(questions.id, questionIds))
    .returning({ id: questions.id });

  console.log(`✅ Deleted ${deletedQuestions.length} hard questions`);

  // Verify deletion
  const remainingHard = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations'),
        eq(questions.difficulty, 'hard')
      )
    );

  console.log(`\n✅ Verification: ${remainingHard.length} hard questions remaining (should be 0)`);
  
  // Count remaining questions by difficulty
  const remainingQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations')
      )
    );

  const difficultyCount = new Map<string, number>();
  for (const q of remainingQuestions) {
    const count = difficultyCount.get(q.difficulty) || 0;
    difficultyCount.set(q.difficulty, count + 1);
  }

  console.log('\n📊 Remaining questions by difficulty:');
  for (const [difficulty, count] of difficultyCount.entries()) {
    console.log(`   ${difficulty}: ${count} questions`);
  }
  console.log(`   Total: ${remainingQuestions.length} questions\n`);
}

deleteHardQuestions().catch(console.error);
