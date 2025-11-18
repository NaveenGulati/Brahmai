import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function verifyLinearEquations() {
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

  console.log(`\n📊 Verification Report for Simple Linear Equations\n`);
  console.log(`Total questions: ${dbQuestions.length}`);

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

  console.log(`Questions with detailed explanations: ${withExplanations}`);
  console.log(`Questions without detailed explanations: ${dbQuestions.length - withExplanations}`);

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

  // Show a sample
  if (dbQuestions.length > 0) {
    const sampleQuestion = dbQuestions[0];
    const sampleExplanation = await db
      .select()
      .from(aiExplanationCache)
      .where(eq(aiExplanationCache.questionId, sampleQuestion.id))
      .limit(1);

    console.log(`\n📝 Sample Question:\n`);
    console.log(`Question: ${sampleQuestion.questionText}`);
    console.log(`Options: ${sampleQuestion.options}`);
    console.log(`Correct Answer: ${sampleQuestion.correctAnswer}`);
    console.log(`Brief Explanation: ${sampleQuestion.explanation}`);
    console.log(`Difficulty: ${sampleQuestion.difficulty}`);
    console.log(`Points: ${sampleQuestion.points}`);
    
    if (sampleExplanation.length > 0) {
      console.log(`\n✨ Detailed Explanation (first 150 chars):`);
      console.log(sampleExplanation[0].detailedExplanation.substring(0, 150) + '...');
    } else {
      console.log(`\n❌ No detailed explanation found`);
    }
  }

  console.log(`\n✅ Verification complete!\n`);
}

verifyLinearEquations().catch(console.error);
