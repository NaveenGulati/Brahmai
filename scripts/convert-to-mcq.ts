import { getDb } from '../server/db';
import { questions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function convertToMCQ() {
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

  console.log(`Found ${fillBlankQuestions.length} fill-in-the-blank questions to convert`);

  for (const question of fillBlankQuestions) {
    console.log(`\nConverting question ${question.id}: ${question.questionText}`);
    console.log(`Correct answer: ${question.correctAnswer}`);

    // Generate MCQ options based on the question type and correct answer
    const options = generateOptions(question.questionText!, question.correctAnswer!, question.subject);

    console.log(`Generated options: ${JSON.stringify(options)}`);

    // Update the question
    await db
      .update(questions)
      .set({
        questionType: 'mcq',
        options: JSON.stringify(options),
      })
      .where(eq(questions.id, question.id!));

    console.log(`✓ Converted question ${question.id}`);
  }

  console.log(`\n✅ Successfully converted ${fillBlankQuestions.length} questions to MCQ format`);
}

function generateOptions(questionText: string, correctAnswer: string, subject: string | null): string[] {
  const options = [correctAnswer];
  
  // Generate plausible distractors based on question context
  if (subject === 'Mathematics' || questionText.toLowerCase().includes('calculate') || questionText.toLowerCase().includes('value')) {
    // For math questions, generate numerical distractors
    const numAnswer = parseFloat(correctAnswer);
    if (!isNaN(numAnswer)) {
      options.push(String(numAnswer + 1));
      options.push(String(numAnswer - 1));
      options.push(String(numAnswer * 2));
    } else {
      // Non-numerical math answers
      options.push(getAlternative(correctAnswer, 1));
      options.push(getAlternative(correctAnswer, 2));
      options.push(getAlternative(correctAnswer, 3));
    }
  } else {
    // For other subjects, generate contextual distractors
    options.push(getAlternative(correctAnswer, 1));
    options.push(getAlternative(correctAnswer, 2));
    options.push(getAlternative(correctAnswer, 3));
  }

  // Shuffle options so correct answer isn't always first
  return shuffleArray(options.slice(0, 4));
}

function getAlternative(answer: string, variant: number): string {
  // Common alternatives for different types of answers
  const alternatives: { [key: string]: string[] } = {
    'positive': ['negative', 'zero', 'undefined'],
    'negative': ['positive', 'zero', 'undefined'],
    'true': ['false', 'sometimes', 'cannot be determined'],
    'false': ['true', 'sometimes', 'cannot be determined'],
    'increase': ['decrease', 'remain constant', 'become zero'],
    'decrease': ['increase', 'remain constant', 'become zero'],
  };

  const lowerAnswer = answer.toLowerCase();
  for (const [key, values] of Object.entries(alternatives)) {
    if (lowerAnswer.includes(key)) {
      return values[variant - 1] || values[0];
    }
  }

  // Default: modify the answer slightly
  if (variant === 1) return answer + 's';
  if (variant === 2) return 'not ' + answer;
  return answer.split('').reverse().join('').substring(0, answer.length);
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
convertToMCQ()
  .then(() => {
    console.log('\n🎉 Conversion complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during conversion:', error);
    process.exit(1);
  });

