import { invokeLLM } from './_core/llm';
import { z } from 'zod';

/**
 * Generate similar practice questions based on a concept
 * 
 * @param concept - The main concept/topic to generate questions about
 * @param difficulty - Difficulty level (easy, medium, hard)
 * @param questionType - Type of question (multiple_choice, true_false)
 * @param count - Number of questions to generate (default: 5)
 * @returns Array of generated questions with options, correct answers, and explanations
 */
export async function generateSimilarQuestions(params: {
  concept: string;
  difficulty: string;
  questionType: string;
  count?: number;
  syllabus?: string;
}) {
  const { concept, difficulty, questionType, count = 5, syllabus } = params;

  const prompt = `You are an educational AI creating practice questions for Grade 7 students.

CONCEPT TO FOCUS ON:
${concept}

CONSTRAINTS:
- Generate EXACTLY ${count} ${questionType === 'true_false' ? 'True/False' : 'Multiple Choice'} questions
- Difficulty level: ${difficulty}
- Stay strictly within Grade 7 syllabus
${syllabus ? `- Syllabus context: ${syllabus}` : ''}
- Questions should test understanding of the concept from different angles
- Each question should be unique and not repetitive

${questionType === 'multiple_choice' ? `
For Multiple Choice Questions:
- Provide 4 options (A, B, C, D)
- Only ONE correct answer
- Make distractors plausible but clearly wrong
` : `
For True/False Questions:
- Statement should be clear and unambiguous
- Provide reasoning for why it's true or false
`}

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "questionText": "Question text here",
      ${questionType === 'multiple_choice' ? `
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      ` : ''}
      "correctAnswer": "${questionType === 'multiple_choice' ? 'A/B/C/D' : 'true/false'}",
      "explanation": "Clear explanation of why this is the correct answer, including the concept being tested"
    }
  ]
}

Generate ${count} high-quality practice questions now. Return ONLY valid JSON, no markdown formatting.`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are an educational AI that generates practice questions. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ]
  });

  // Parse the JSON response
  let parsedResponse;
  try {
    // Remove markdown code blocks if present
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsedResponse = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse LLM response:', response);
    throw new Error('Failed to generate questions - invalid response format');
  }

  // Validate the response structure
  if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
    throw new Error('Invalid response structure - missing questions array');
  }

  if (parsedResponse.questions.length !== count) {
    console.warn(`Expected ${count} questions, got ${parsedResponse.questions.length}`);
  }

  return parsedResponse.questions;
}

// Zod schema for validation
export const SimilarQuestionSchema = z.object({
  questionText: z.string(),
  options: z.record(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
});

export const SimilarQuestionsResponseSchema = z.object({
  questions: z.array(SimilarQuestionSchema),
});

/**
 * Generate 5 similar practice questions based on an original question
 * Questions stay within syllabus boundaries and match difficulty level
 */
export async function generateSimilarQuestionsFromOriginal(input: {
  questionId: number;
  questionText: string;
  correctAnswer: string;
  detailedExplanation?: string;
  moduleId: number;
}): Promise<Array<{
  questionText: string;
  type: 'MCQ' | 'T/F';
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  explanation: string;
}>> {
  const { getModuleById, getSubjectById, getQuestionById } = await import('./db');
  
  // Get module and subject information for syllabus context
  const module = await getModuleById(input.moduleId);
  const subject = module ? await getSubjectById(module.subjectId) : null;
  
  // Get the original question details for context
  const originalQuestion = await getQuestionById(input.questionId);
  
  const syllabusContext = `
Subject: ${subject?.name || 'Unknown'}
Module: ${module?.name || 'Unknown'}
Grade Level: 7
Difficulty: ${originalQuestion?.difficulty || 'medium'}
Question Type: ${originalQuestion?.questionType || 'multiple_choice'}
  `.trim();
  
  const prompt = `You are an expert educational content creator. Generate 5 practice questions similar to the original question below.

ORIGINAL QUESTION:
${input.questionText}

CORRECT ANSWER: ${input.correctAnswer}

${input.detailedExplanation ? `CONCEPT EXPLANATION:\n${input.detailedExplanation}\n` : ''}

SYLLABUS CONTEXT:
${syllabusContext}

REQUIREMENTS:
1. Generate exactly 5 questions that test the SAME CONCEPT as the original
2. Questions must stay within the syllabus boundaries (Grade 7, ${subject?.name || 'same subject'})
3. Match the difficulty level: ${originalQuestion?.difficulty || 'medium'}
4. Use the same question type: ${originalQuestion?.questionType === 'true_false' ? 'True/False' : 'Multiple Choice (MCQ)'}
5. Each question should test understanding from a slightly different angle
6. Provide clear, educational explanations for each answer
7. For MCQ questions, provide 4 options (A, B, C, D) with only one correct answer
8. For True/False questions, the correct answer must be either "True" or "False"

OUTPUT FORMAT (JSON array):
[
  {
    "questionText": "Question text here (use LaTeX notation for math: $x^2$ for inline, $$equation$$ for display)",
    "type": "MCQ" or "T/F",
    "optionA": "Option A text (only for MCQ)",
    "optionB": "Option B text (only for MCQ)",
    "optionC": "Option C text (only for MCQ)",
    "optionD": "Option D text (only for MCQ)",
    "correctAnswer": "A" or "B" or "C" or "D" (for MCQ) or "True" or "False" (for T/F),
    "explanation": "Clear explanation of why this is the correct answer and the concept behind it"
  }
]

IMPORTANT: 
- Return ONLY the JSON array, no additional text
- Use proper JSON formatting with escaped quotes if needed
- Use LaTeX notation for mathematical expressions: $x^2$ for inline math, $$\\frac{a}{b}$$ for display math
- For chemistry formulas, use LaTeX: $H_2O$, $CO_2$, etc.
- Ensure all questions are educationally valuable and test understanding, not just memorization`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are an expert educational content creator specializing in generating practice questions for Grade 7 students. You always respond with valid JSON arrays containing educational questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.8, // Higher temperature for more variety in questions
  });

  // Parse the JSON response
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Validate that we have exactly 5 questions
    if (questions.length !== 5) {
      console.warn(`Expected 5 questions, got ${questions.length}. Using what we have.`);
    }
    
    // Validate each question has required fields
    questions.forEach((q: any, index: number) => {
      if (!q.questionText || !q.type || !q.correctAnswer || !q.explanation) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      
      // Validate MCQ has all options
      if (q.type === 'MCQ' && (!q.optionA || !q.optionB || !q.optionC || !q.optionD)) {
        throw new Error(`MCQ question ${index + 1} is missing options`);
      }
      
      // Validate T/F has correct answer format
      if (q.type === 'T/F' && !['True', 'False'].includes(q.correctAnswer)) {
        throw new Error(`T/F question ${index + 1} has invalid answer: ${q.correctAnswer}`);
      }
    });
    
    return questions;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    throw new Error('Failed to generate practice questions. Please try again.');
  }
}
