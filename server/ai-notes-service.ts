import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedTag {
  name: string;
  type: 'subject' | 'topic' | 'subTopic';
}

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

/**
 * Generate relevant tags for a note using AI
 */
export async function generateTags(noteContent: string): Promise<GeneratedTag[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an educational AI that helps students organize their notes by generating relevant tags.
Analyze the note content and generate 2-5 relevant tags.
Each tag should be categorized as:
- "subject": Main academic subject (e.g., Physics, Mathematics, Biology)
- "topic": Specific topic within the subject (e.g., Mechanics, Algebra, Cell Biology)
- "subTopic": More specific concept (e.g., Newton's Laws, Quadratic Equations, Mitosis)

Return ONLY a JSON array of objects with "name" and "type" properties.
Example: [{"name": "Physics", "type": "subject"}, {"name": "Energy", "type": "topic"}]`,
        },
        {
          role: 'user',
          content: `Generate tags for this note:\n\n${noteContent}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const tags = JSON.parse(content) as GeneratedTag[];
    return tags;
  } catch (error) {
    console.error('Error generating tags:', error);
    throw new Error('Failed to generate tags');
  }
}

/**
 * Generate quiz questions from a note using AI
 */
export async function generateQuizQuestions(
  noteContent: string,
  numQuestions: number = 5
): Promise<GeneratedQuizQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an educational AI that creates practice quiz questions from student notes.
Generate ${numQuestions} multiple-choice questions based on the note content.
Each question should:
- Test understanding of key concepts
- Have 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation of why the answer is correct

Return ONLY a JSON array of objects with these properties:
- questionText: string
- options: string[] (array of 4 options)
- correctAnswerIndex: number (0-3)
- explanation: string

Example: [{"questionText": "What is...?", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 2, "explanation": "..."}]`,
        },
        {
          role: 'user',
          content: `Generate ${numQuestions} quiz questions from this note:\n\n${noteContent}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const questions = JSON.parse(content) as GeneratedQuizQuestion[];
    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error('Failed to generate quiz questions');
  }
}

/**
 * Extract plain text from HTML content
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
