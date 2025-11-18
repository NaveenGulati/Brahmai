import { getDb } from './server/db';
import { questions, aiExplanationCache } from './drizzle/schema';
import { like, eq } from 'drizzle-orm';

async function verifyChapter4Explanations() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all Chapter 4 questions
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(like(questions.topic, '%Turkish Invasion%'));

  console.log(`\n📊 Verification Report for Chapter 4\n`);
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

  // Show a sample
  if (dbQuestions.length > 0) {
    const sampleQuestion = dbQuestions[0];
    const sampleExplanation = await db
      .select()
      .from(aiExplanationCache)
      .where(eq(aiExplanationCache.questionId, sampleQuestion.id))
      .limit(1);

    console.log(`\n📝 Sample Question:\n`);
    console.log(`Question: ${sampleQuestion.questionText.substring(0, 80)}...`);
    console.log(`Brief Explanation: ${sampleQuestion.explanation?.substring(0, 80)}...`);
    
    if (sampleExplanation.length > 0) {
      console.log(`\n✨ Detailed Explanation (first 200 chars):`);
      console.log(sampleExplanation[0].detailedExplanation.substring(0, 200) + '...');
    } else {
      console.log(`\n❌ No detailed explanation found`);
    }
  }

  console.log(`\n✅ Verification complete!\n`);
}

verifyChapter4Explanations().catch(console.error);
