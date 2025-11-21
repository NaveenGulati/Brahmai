/**
 * AI Question Generator - Master Specification Compliant
 * Generates high-quality questions from textbook chapters following strict pedagogical rules
 */

import { invokeLLM } from './_core/llm';

export interface QuestionGenerationRequest {
  chapterText: string;
  board: string;
  grade: number;
  subject: string;
  topic: string;
  subTopic: string;
  generatedBy: string;
}

export interface GeneratedQuestion {
  questionType: 'multiple_choice' | 'true_false';
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  detailedExplanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimit: number;
  tags: string[];
  bloomsLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze';
  generatedBy: string;
}

export interface QuestionGenerationResult {
  metadata: {
    board: string;
    grade: number;
    subject: string;
    topic: string;
    subTopic: string;
    generatedBy: string;
  };
  questions: GeneratedQuestion[];
}

/**
 * Master specification prompt for AI question generation
 */
function buildMasterSpecPrompt(request: QuestionGenerationRequest): string {
  return `🎓 QUESTION BANK GENERATION — MASTER SPECIFICATION
You are to generate a Question Bank from the provided chapter text.
Each question must be precise, pedagogically correct, schema-compliant, and duplicate-free.

📚 CHAPTER TEXT:
${request.chapterText}

📋 METADATA:
- Board: ${request.board}
- Grade: ${request.grade}
- Subject: ${request.subject}
- Topic: ${request.topic}
- Sub-Topic: ${request.subTopic}

✅ 1. QUESTION TYPES & DISTRIBUTION
Generate questions for this sub-topic:
  • For Mathematics, Physics, Chemistry, or any numerical/calculation-based subjects: Generate 75+ questions
  • For other subjects (History, Geography, Biology, etc.): Generate 50+ questions
  • 90% MCQs (multiple_choice)
  • 10% True/False (true_false)

✅ 2. DIFFICULTY MIX
Every subtopic must include a mix of:
  • Easy - 30% (Basic recall and simple application)
  • Medium - 40% (Harder than Easy, requires deeper understanding and multi-step reasoning)
  • Hard - 30% (Significantly harder than Medium, just below Olympiad level, requires advanced problem-solving)

✅ 3. MANDATORY JSON SCHEMA (Strictly Follow This)
Each question must contain the following fields:

{
  "questionType": "multiple_choice" OR "true_false",
  "questionText": "...",
  "options": [ ... ],  // 4 options for MCQ, ["True", "False"] for true_false
  "correctAnswer": "...",
  "explanation": "...",                  ← short explanation (2–3 sentences)
  "detailedExplanation": "...",          ← long markdown explanation (format rules below)
  "difficulty": "easy" | "medium" | "hard",
  "points": 10/15/20,                    ← 10=easy, 15=medium, 20=hard
  "timeLimit": 45/60/90,                 ← 45=easy, 60=medium, 90=hard
  "tags": ["topic", "concept"],          ← choose relevant keywords
  "bloomsLevel": "Remember" | "Understand" | "Apply" | "Analyze",
  "generatedBy": "${request.generatedBy}"
}

❗ Strict Rules
  • MCQ options must NEVER repeat.
  • Questions must NEVER repeat.
  • No option may be identical or semantically identical.
  • Every question MUST include both explanation fields.
  • For MCQs, provide exactly 4 unique options.
  • For True/False, options must be ["True", "False"].

✅ 4. DETAILED EXPLANATION FORMAT (MANDATORY)
Each detailedExplanation must follow this exact Markdown layout:

### 🎯 Why the Answer is {Correct Answer}
(2–4 sentences explaining the logic)

### 💡 Understanding {Concept Name}
(Explain the deeper idea OR fix a misconception)

### 🌟 Real-Life Example
(Give 1–2 relatable examples for a Grade ${request.grade} student)

### 📚 Key Takeaway
(One crisp line with the core learning)

Style Rules:
  • Use short paragraphs, friendly tone.
  • Use emojis: 🎯 💡 🌟 🤔 📚
  • No motivational fluff ("Great job!", "You can do it!").
  • No greetings or conclusions.
  • Start directly with the explanation.

✅ 5. AVOID THESE ERRORS
The model must ensure:
❌ No duplicated MCQ options
(e.g., "5", "5.0", "five", "5" → prohibited)
✔ Value uniqueness check
  • -5/6
  • 5/-6
  • (-5)/6
  • (-10)/12
All normalize to the same rational number → not allowed.

✔ Formatting uniqueness
  • "5/18" vs "5/18 "
  • "0.5" vs "1/2"
  • "4/6" vs "2/3"
All considered duplicates → not allowed.

✔ Correct answer not repeated in distractors

❌ No repeated question prompts (even rephrased duplicates)
❌ No missing fields
❌ No formatting outside JSON
❌ No deviation from schema

✅ 6. GENERAL PEDAGOGY RULES
  • Follow ${request.board} + Grade ${request.grade} level + Indian curriculum syllabus sequence.
  • Use language and explanation complexity appropriate for the IQ level and cognitive development of a Grade ${request.grade} student in India.
  • For Grade 1-3: Very simple language, concrete examples, visual thinking
  • For Grade 4-6: Simple language, relatable examples, step-by-step logic
  • For Grade 7-8: Age-appropriate language, abstract thinking, real-world connections
  • For Grade 9-10: More sophisticated language, analytical thinking, application-based
  • For Grade 11-12: Advanced language, critical thinking, complex problem-solving
  • Use real-life examples relevant to Indian students (money in rupees, cricket, festivals, local measurements, etc.).
  • Ensure calculations and reasoning are 100% correct.

✅ 7. COVERAGE RULE
Use all examples, sample problems, and exercise patterns from the chapter:
  • Theory explanations
  • Worked examples
  • End-of-chapter exercise styles
  • Conceptual questions
  • Application questions
  • We have to be extremely granular so that nothing is missed out. Not even 1%. The child will completely rely on this quiz engine for their exam preparations.

✅ 8. FINAL DELIVERABLE STRUCTURE
The final output must be in pure JSON, structured like:

{
  "metadata": {
    "board": "${request.board}",
    "grade": ${request.grade},
    "subject": "${request.subject}",
    "topic": "${request.topic}",
    "subTopic": "${request.subTopic}",
    "generatedBy": "${request.generatedBy}"
  },
  "questions": [
    { ...50+ questions following schema... }
  ]
}

🔥 ZERO-TOLERANCE RULES (Critical)
If any of these are violated, the model must self-correct:
  • Duplicate MCQ options → regenerate
  • Duplicate questions → regenerate
  • Missing explanation fields → regenerate
  • Incorrect JSON → regenerate
  • Misaligned difficulty → adjust accordingly

⭐ IMPORTANT: Return ONLY the JSON object. No additional text before or after.`;
}

/**
 * Generate questions from chapter text using AI
 */
export async function generateQuestionsFromChapter(
  request: QuestionGenerationRequest
): Promise<QuestionGenerationResult> {
  console.log('[AI Question Generator] Starting generation for:', {
    board: request.board,
    grade: request.grade,
    subject: request.subject,
    topic: request.topic,
    subTopic: request.subTopic,
  });

  try {
    const prompt = buildMasterSpecPrompt(request);

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator specializing in generating high-quality, pedagogically sound questions for students. You follow strict specifications and never deviate from the required format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse JSON response
    const result: QuestionGenerationResult = JSON.parse(content);

    // Validate result
    validateQuestionGenerationResult(result);

    console.log('[AI Question Generator] Successfully generated', result.questions.length, 'questions');

    return result;
  } catch (error) {
    console.error('[AI Question Generator] Error:', error);
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate generated questions against master specification
 */
function validateQuestionGenerationResult(result: QuestionGenerationResult): void {
  if (!result.metadata || !result.questions) {
    throw new Error('Invalid result structure: missing metadata or questions');
  }

  if (!Array.isArray(result.questions)) {
    throw new Error('Questions must be an array');
  }

  if (result.questions.length < 50) {
    console.warn(`[AI Question Generator] Warning: Only ${result.questions.length} questions generated (expected 50+)`);
  }

  // Validate each question
  result.questions.forEach((q, index) => {
    // Required fields
    const requiredFields = [
      'questionType',
      'questionText',
      'options',
      'correctAnswer',
      'explanation',
      'detailedExplanation',
      'difficulty',
      'points',
      'timeLimit',
      'tags',
      'bloomsLevel',
      'generatedBy',
    ];

    for (const field of requiredFields) {
      if (!(field in q)) {
        throw new Error(`Question ${index + 1} missing required field: ${field}`);
      }
    }

    // Validate question type
    if (!['multiple_choice', 'true_false'].includes(q.questionType)) {
      throw new Error(`Question ${index + 1} has invalid questionType: ${q.questionType}`);
    }

    // Validate options
    if (!Array.isArray(q.options) || q.options.length === 0) {
      throw new Error(`Question ${index + 1} has invalid options`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(q.options.map(o => normalizeOption(o)));
    if (uniqueOptions.size !== q.options.length) {
      throw new Error(`Question ${index + 1} has duplicate options`);
    }

    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      throw new Error(`Question ${index + 1} has invalid difficulty: ${q.difficulty}`);
    }

    // Validate points match difficulty
    const expectedPoints = { easy: 10, medium: 15, hard: 20 };
    if (q.points !== expectedPoints[q.difficulty]) {
      console.warn(`Question ${index + 1}: points (${q.points}) don't match difficulty (${q.difficulty})`);
    }

    // Validate timeLimit match difficulty
    const expectedTime = { easy: 45, medium: 60, hard: 90 };
    if (q.timeLimit !== expectedTime[q.difficulty]) {
      console.warn(`Question ${index + 1}: timeLimit (${q.timeLimit}) doesn't match difficulty (${q.difficulty})`);
    }
  });

  // Check for duplicate questions
  const questionTexts = result.questions.map(q => q.questionText.toLowerCase().trim());
  const uniqueQuestions = new Set(questionTexts);
  if (uniqueQuestions.size !== questionTexts.length) {
    throw new Error('Duplicate questions detected');
  }

  // Validate distribution
  const typeDistribution = result.questions.reduce((acc, q) => {
    acc[q.questionType] = (acc[q.questionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const difficultyDistribution = result.questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[AI Question Generator] Type distribution:', typeDistribution);
  console.log('[AI Question Generator] Difficulty distribution:', difficultyDistribution);
}

/**
 * Normalize option for duplicate detection
 */
function normalizeOption(option: string): string {
  // Remove whitespace
  let normalized = option.trim();
  
  // Try to parse as fraction and normalize
  const fractionMatch = normalized.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
    const divisor = gcd(numerator, denominator);
    normalized = `${numerator / divisor}/${denominator / divisor}`;
  }
  
  // Try to parse as decimal
  const num = parseFloat(normalized);
  if (!isNaN(num)) {
    normalized = num.toString();
  }
  
  return normalized.toLowerCase();
}
