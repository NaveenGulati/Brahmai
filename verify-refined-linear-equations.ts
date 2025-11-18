import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function verifyRefinedLinearEquations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all Linear Equations questions
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.subject, 'Mathematics'),
        eq(questions.topic, 'Simple Linear Equations')
      )
    );

  console.log(`\n📊 Verification Report for Simple Linear Equations (Refined)\n`);
  console.log(`Total questions: ${dbQuestions.length}`);

  // Count by difficulty
  const difficultyCount = new Map<string, number>();
  for (const q of dbQuestions) {
    const count = difficultyCount.get(q.difficulty) || 0;
    difficultyCount.set(q.difficulty, count + 1);
  }

  console.log('\n📈 Questions by Difficulty:');
  for (const [difficulty, count] of difficultyCount.entries()) {
    console.log(`   ${difficulty}: ${count} questions`);
  }

  // Check how many have detailed explanations
  let withExplanations = 0;
  
  for (const q of dbQuestions) {
    const explanation = await db
      .select()
      .from(aiExplanationCache)
      .where(eq(aiExplanationCache.questionId, q.id))
      .limit(1);
    
    if (explanation.length > 0) {
      withExplanations++;
    }
  }

  console.log(`\n✅ Questions with detailed explanations: ${withExplanations}`);
  console.log(`❌ Questions without detailed explanations: ${dbQuestions.length - withExplanations}`);

  // Count by subtopic
  const subtopicCounts = new Map<string, number>();
  for (const q of dbQuestions) {
    const count = subtopicCounts.get(q.subTopic || 'Unknown') || 0;
    subtopicCounts.set(q.subTopic || 'Unknown', count + 1);
  }

  console.log(`\n📚 Questions by Subtopic:\n`);
  for (const [subtopic, count] of subtopicCounts.entries()) {
    console.log(`   ${subtopic}: ${count} questions`);
  }

  // Show a sample hard question
  const hardQuestions = dbQuestions.filter(q => q.difficulty === 'hard');
  if (hardQuestions.length > 0) {
    const sampleHard = hardQuestions[0];
    const sampleExplanation = await db
      .select()
      .from(aiExplanationCache)
      .where(eq(aiExplanationCache.questionId, sampleHard.id))
      .limit(1);

    console.log(`\n📝 Sample Hard Question:\n`);
    console.log(`Question: ${sampleHard.questionText}`);
    console.log(`Subtopic: ${sampleHard.subTopic}`);
    console.log(`Options: ${sampleHard.options}`);
    console.log(`Correct Answer: ${sampleHard.correctAnswer}`);
    console.log(`Brief Explanation: ${sampleHard.explanation}`);
    console.log(`Points: ${sampleHard.points}`);
    console.log(`Time Limit: ${sampleHard.timeLimit}s`);
    
    if (sampleExplanation.length > 0) {
      console.log(`\n✨ Has Detailed Explanation: Yes (${sampleExplanation[0].detailedExplanation.length} chars)`);
    } else {
      console.log(`\n❌ Has Detailed Explanation: No`);
    }
  }

  console.log(`\n✅ Verification complete!\n`);
}

verifyRefinedLinearEquations().catch(console.error);
