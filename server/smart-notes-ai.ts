import { invokeLLM } from './_core/llm';

/**
 * AI-powered note indexing
 * Analyzes note content and generates topic and sub-topic tags
 * Uses Gemini 2.5 Flash (same as detailed explanations)
 */
export async function generateNoteTags(
  noteContent: string,
  subject: string
): Promise<{ topic: string; subTopic: string }> {
  const prompt = `You are an expert academic indexer for Grade 7 educational content. Your task is to analyze a piece of text and categorize it within the given subject.

**Subject:**
${subject}

**Text Content:**
"${noteContent}"

Based on the text, identify the primary "topic" and a more specific "subTopic". The topic should be a broad category within the subject, and the sub-topic should be a more granular concept.

**Examples:**
- Subject: Physics, Text: "In a steam engine, chemical energy transforms to heat energy", Topic: "Energy", SubTopic: "Energy Transformation"
- Subject: Biology, Text: "Photosynthesis converts light energy to chemical energy", Topic: "Plant Processes", SubTopic: "Photosynthesis"

**Constraint:** Your response MUST be a valid JSON object with the following structure, and nothing else:
{
  "topic": "<Your identified topic>",
  "subTopic": "<Your identified sub-topic>"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic indexer. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsed = JSON.parse(content);
    
    if (!parsed.topic || !parsed.subTopic) {
      throw new Error('Invalid response structure from AI');
    }

    console.log('[Smart Notes AI] Generated tags:', parsed);
    return parsed;
  } catch (error) {
    console.error('[Smart Notes AI] Error generating tags:', error);
    // Fallback to generic tags
    return {
      topic: 'General',
      subTopic: 'Miscellaneous',
    };
  }
}

/**
 * AI-powered question generation
 * Creates 5 practice questions based on note content
 * Uses Gemini 2.5 Flash (same as detailed explanations)
 */
export async function generatePracticeQuestions(
  noteContent: string,
  subject: string,
  originalQuestionText?: string
): Promise<Array<{
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}>> {
  const prompt = `You are an expert question creator for a Grade 7 ICSE curriculum quiz platform. Your task is to generate a mini-quiz of 5 multiple-choice questions based on a specific concept.

**Constraint Checklist (You MUST follow all rules):**
1. **Syllabus:** All questions must be strictly within the Grade 7 ICSE syllabus for the given subject.
2. **Relevance:** All questions must be directly related to the "Specific Concept from Note". Do not ask general knowledge questions.
3. **Difficulty:** Questions should be appropriate for Grade 7 students - not too easy, not too hard.
4. **Variety:** Mix different types of questions: conceptual understanding, application, and analysis.
5. **Format:** The output MUST be a single, valid JSON array containing 5 question objects. Do not include any text or explanations outside of the JSON structure.

**Subject:**
${subject}

${originalQuestionText ? `**Original Question Context:**\n"${originalQuestionText}"\n` : ''}

**Specific Concept from Note:**
"${noteContent}"

Generate 5 multiple-choice questions based on the "Specific Concept from Note".

**Required JSON Output Format:**
[
  {
    "questionText": "<Your generated question>",
    "options": [
      "<Option A>",
      "<Option B>",
      "<Option C>",
      "<Option D>"
    ],
    "correctAnswerIndex": <0, 1, 2, or 3>,
    "explanation": "<A brief explanation for why the answer is correct>"
  }
]

**Important:** Return ONLY the JSON array, no additional text.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert question creator for Grade 7 ICSE curriculum. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsed = JSON.parse(content);
    
    if (!Array.isArray(parsed) || parsed.length !== 5) {
      throw new Error('Invalid response structure from AI - expected array of 5 questions');
    }

    // Validate each question
    for (const q of parsed) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswerIndex !== 'number' || !q.explanation) {
        throw new Error('Invalid question structure from AI');
      }
    }

    console.log('[Smart Notes AI] Generated', parsed.length, 'questions');
    return parsed;
  } catch (error) {
    console.error('[Smart Notes AI] Error generating questions:', error);
    throw new Error('Failed to generate practice questions. Please try again.');
  }
}
