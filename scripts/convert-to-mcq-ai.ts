import { getDb } from '../server/db';
import { questions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { invokeLLM } from '../server/_core/llm';

async function convertToMCQWithAI() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all fill-in-the-blank questions
  const fillBlankQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.questionType, 'fill_blank'));

  console.log(`Found ${fillBlankQuestions.length} fill-in-the-blank questions to convert\n`);

  let converted = 0;
  for (const question of fillBlankQuestions) {
    try {
      console.log(`[${converted + 1}/${fillBlankQuestions.length}] Converting question ${question.id}`);
      console.log(`Question: ${question.questionText}`);
      console.log(`Correct answer: ${question.correctAnswer}`);

      // Use AI to generate plausible wrong options
      const prompt = `You are converting a fill-in-the-blank question to multiple choice format for Grade 7 students.

Question: ${question.questionText}
Correct Answer: ${question.correctAnswer}
Subject: ${question.subject || 'General'}
Topic: ${question.topic || 'General'}

Generate 3 plausible but INCORRECT options that:
1. Are believable distractors (not obviously wrong)
2. Test common misconceptions
3. Are at the same difficulty level as the correct answer
4. Are distinct from each other and the correct answer

Return ONLY a JSON array of 3 wrong options, nothing else.
Example format: ["wrong option 1", "wrong option 2", "wrong option 3"]`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are an educational content expert. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ]
      });

      const aiContent = response.choices[0]?.message?.content || '';
      let wrongOptions: string[];
      
      try {
        // Try to parse the AI response as JSON
        wrongOptions = JSON.parse(aiContent);
        if (!Array.isArray(wrongOptions) || wrongOptions.length !== 3) {
          throw new Error('Invalid format');
        }
      } catch (e) {
        console.warn(`  ⚠️  AI response not valid JSON, using fallback options`);
        wrongOptions = generateFallbackOptions(question.correctAnswer!);
      }

      // Combine correct answer with wrong options and shuffle
      const allOptions = [question.correctAnswer!, ...wrongOptions];
      const shuffledOptions = shuffleArray(allOptions);

      console.log(`  Generated options: ${JSON.stringify(shuffledOptions)}`);

      // Update the question in database
      await db
        .update(questions)
        .set({
          questionType: 'mcq',
          options: JSON.stringify(shuffledOptions),
        })
        .where(eq(questions.id, question.id!));

      console.log(`  ✓ Converted successfully\n`);
      converted++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ✗ Error converting question ${question.id}:`, error);
    }
  }

  console.log(`\n✅ Successfully converted ${converted}/${fillBlankQuestions.length} questions to MCQ format`);
}

function generateFallbackOptions(correctAnswer: string): string[] {
  // Fallback options if AI fails
  return [
    `Not ${correctAnswer}`,
    `${correctAnswer} (incorrect)`,
    `Opposite of ${correctAnswer}`
  ];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Run the conversion
convertToMCQWithAI()
  .then(() => {
    console.log('\n🎉 Conversion complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during conversion:', error);
    process.exit(1);
  });

