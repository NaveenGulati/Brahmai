import { invokeLLM } from './_core/llm';

export interface GeneratedTag {
  name: string;
  type: 'subject' | 'topic' | 'subTopic';
}

export interface GeneratedQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Generate relevant tags for a note using AI
 */
export async function generateTags(noteContent: string): Promise<GeneratedTag[]> {
  try {
    const response = await invokeLLM({
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
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Handle both array response and object with tags property
    const tags = Array.isArray(parsed) ? parsed : (parsed.tags || []);
    
    return tags as GeneratedTag[];
  } catch (error) {
    console.error('Error generating tags:', error);
    throw new Error('Failed to generate tags');
  }
}

/**
 * Generate a concise headline for a note using AI
 */
export async function generateHeadline(noteContent: string): Promise<string> {
  try {
    const plainText = stripHtml(noteContent);
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an educational AI that creates concise headlines for student notes.
Generate a short, descriptive headline (max 60 characters) that captures the main topic.
Return ONLY the headline text. Do NOT include character count, parentheses, or any metadata.`,
        },
        {
          role: 'user',
          content: `Generate a headline for this note:\n\n${plainText.substring(0, 500)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      // Fallback: use first 60 chars
      return plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '');
    }

    // Clean up the headline - remove any character count like "(36 chars)"
    const cleanedContent = typeof content === 'string' ? content.trim() : content;
    return cleanedContent.replace(/\s*\(\d+\s*chars?\)\s*$/i, '');
  } catch (error) {
    console.error('Error generating headline:', error);
    // Fallback: use first 60 chars
    const plainText = stripHtml(noteContent);
    return plainText.substring(0, 60) + (plainText.length > 60 ? '...' : '');
  }
}

/**
 * Generate quiz questions from a note using AI with difficulty levels
 */
export async function generateQuizQuestions(
  noteContent: string,
  numQuestions: number = 5
): Promise<GeneratedQuizQuestion[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an educational AI that creates practice quiz questions from student notes.
Generate ${numQuestions} multiple-choice questions based on the note content.

Difficulty distribution:
- 2 EASY questions (basic recall and recognition)
- 2 MEDIUM questions (application and understanding)
- 1 HARD question (analysis and synthesis)

Each question should:
- Test understanding of key concepts
- Have 4 options (A, B, C, D)
- Have exactly one correct answer
- Include a brief explanation of why the answer is correct
- Specify difficulty level

Return ONLY a JSON array of objects with these properties:
- questionText: string
- options: string[] (array of 4 options)
- correctAnswerIndex: number (0-3)
- explanation: string
- difficulty: "easy" | "medium" | "hard"

Example: [{"questionText": "What is...?", "options": ["A", "B", "C", "D"], "correctAnswerIndex": 2, "explanation": "...", "difficulty": "easy"}]`,
        },
        {
          role: 'user',
          content: `Generate ${numQuestions} quiz questions from this note:\n\n${noteContent}`,
        },
      ],
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Handle both array response and object with questions property
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    
    return questions as GeneratedQuizQuestion[];
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
