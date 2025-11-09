/**
 * Adaptive Explanation System
 * Provides progressive simplification of explanations based on student feedback
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { explanationVersions, questions } from "../drizzle/schema";
import { invokeLLM } from './_core/llm';

/**
 * Simplification levels with descriptive names
 */
export const SIMPLIFICATION_LEVELS = {
  STANDARD: 0,
  SIMPLE: 1,
  VERY_SIMPLE: 2,
  ELI5: 3, // Explain Like I'm 5
} as const;

/**
 * Level descriptions for prompt engineering
 */
const LEVEL_DESCRIPTIONS = {
  [SIMPLIFICATION_LEVELS.STANDARD]: {
    name: 'Standard',
    instruction: 'Grade 7 level explanation with proper terminology and concepts',
    audience: 'a Grade 7 student',
    complexity: 'standard academic language with examples',
  },
  [SIMPLIFICATION_LEVELS.SIMPLE]: {
    name: 'Simplified',
    instruction: 'Simpler language, more examples, shorter sentences',
    audience: 'a younger student (Grade 4-5 level)',
    complexity: 'simple words, lots of examples, short sentences',
  },
  [SIMPLIFICATION_LEVELS.VERY_SIMPLE]: {
    name: 'Very Simple',
    instruction: 'Very basic language, everyday examples, step-by-step breakdown',
    audience: 'a young child (Grade 2-3 level)',
    complexity: 'very simple words, everyday examples, one idea at a time',
  },
  [SIMPLIFICATION_LEVELS.ELI5]: {
    name: 'Explain Like I\'m 5',
    instruction: 'Extremely simple language, relatable analogies, playful tone',
    audience: 'a 5-year-old child',
    complexity: 'the simplest possible words, fun comparisons, playful explanations',
  },
};

/**
 * Get or generate a simplified explanation for a question
 * Uses caching to avoid regenerating the same simplification level
 */
export async function getSimplifiedExplanation(
  questionId: number,
  simplificationLevel: number,
  previousExplanation?: string,
  grade?: number
): Promise<{ explanationText: string; fromCache: boolean }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Validate simplification level
  if (simplificationLevel < 0 || simplificationLevel > 3) {
    throw new Error('Invalid simplification level. Must be 0-3.');
  }

  // Check cache first
  const cached = await db
    .select()
    .from(explanationVersions)
    .where(
      and(
        eq(explanationVersions.questionId, questionId),
        eq(explanationVersions.simplificationLevel, simplificationLevel)
      )
    )
    .limit(1);

  if (cached.length > 0 && cached[0].explanationText) {
    console.log(`[Adaptive] Using cached explanation for question ${questionId}, level ${simplificationLevel}`);
    
    // Update usage stats
    await db
      .update(explanationVersions)
      .set({
        usageCount: cached[0].usageCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(explanationVersions.id, cached[0].id));
    
    let explanation = cached[0].explanationText;
    
    // Restore images from cache if available
    if (cached[0].imageData) {
      try {
        const { restoreImagesIntoExplanation } = await import('./educational-images');
        const imageData = JSON.parse(cached[0].imageData);
        explanation = restoreImagesIntoExplanation(explanation, imageData);
        console.log(`[Adaptive] Restored ${imageData.length} cached images for level ${simplificationLevel}`);
      } catch (error) {
        console.error('[Adaptive] Failed to restore cached images:', error);
        // Continue with text-only explanation
      }
    }
    
    return { 
      explanationText: explanation, 
      fromCache: true 
    };
  }

  // Generate new simplified explanation
  const question = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (question.length === 0) {
    throw new Error('Question not found');
  }

  const q = question[0];
  const levelInfo = LEVEL_DESCRIPTIONS[simplificationLevel as keyof typeof LEVEL_DESCRIPTIONS];
  const gradeLevel = grade || q.grade || 7; // Use question grade or fallback to 7

  // Build prompt for AI
  let prompt = `You are a friendly, patient teacher. A student didn't fully understand the previous explanation, so you need to explain it in a SIMPLER way.

**Target Audience:** ${levelInfo.audience}
**Student's Grade Level:** Grade ${gradeLevel}
**Complexity Level:** ${levelInfo.complexity}
**Instruction:** ${levelInfo.instruction}

**Question:** ${q.questionText}
**Correct Answer:** ${q.correctAnswer}
**Brief Explanation:** ${q.explanation || 'Not provided'}

${previousExplanation ? `**Previous Explanation (that was too complex):**\n${previousExplanation}\n\n` : ''}

**Your Task:**
Create a ${levelInfo.name} explanation that:
1. Uses ${levelInfo.complexity}
2. Includes 1-2 CONCRETE, RELATABLE EXAMPLES that kids can visualize
3. Breaks down complex ideas into smaller, digestible pieces
4. Uses a warm, encouraging tone
5. Makes the concept feel easy and approachable

**CRITICAL RULES:**
- NO introductions like "Hello!", "You are doing great!", "Let's learn together!"
- NO conclusions like "You got this!", "Keep up the amazing work!", "Great job!", "Keep studying!"
- NO tables or complex formatting (use simple paragraphs and bullet lists only)
- Start DIRECTLY with the concept explanation
- End with the key takeaway, NO motivational fluff

**IMPORTANT FORMATTING RULES:**
- Use markdown formatting: **bold** for key terms, *italics* for emphasis
- Use ### for section headings
- Add relevant emojis (🎯, 💡, 🤔, ✅, 📚, 🔬, 🌟, etc.) to make it engaging
- Use bullet points (- or *) for lists
- Keep paragraphs SHORT (1-2 sentences max for this level)
- NO long introductions - dive straight into the explanation
- Start directly with the concept

**Example Structure:**
### 🎯 The Simple Answer

[Direct, simple explanation of the correct answer]

### 💡 Let's Break It Down

[Step-by-step breakdown with simple language]

### 🌟 Real-Life Example

[1-2 concrete examples kids can relate to]

### ✅ Remember This

[One key takeaway in the simplest terms]

Write as if you're talking to ${levelInfo.audience}. Be warm, patient, and make it FUN!`;

  if (q.questionType === 'multiple_choice' && q.options) {
    prompt += `\n\n**Options:**\n${q.options.join('\n')}`;
  }

  const response = await invokeLLM({
    messages: [
      { 
        role: 'system', 
        content: `You are a patient, encouraging teacher who excels at explaining complex concepts in simple terms for ${levelInfo.audience}.` 
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 500, // Allow longer explanations with examples
  });

  let explanationText = response.choices[0].message.content || 'Unable to generate explanation';

  // Enhance with educational images (non-blocking)
  let imageDataJson: string | null = null;
  try {
    const { enhanceExplanationWithImages } = await import('./educational-images');
    const result = await enhanceExplanationWithImages(
      questionId,
      q.questionText,
      q.correctAnswer,
      explanationText,
      q.subject,
      q.topic,
      q.grade
    );
    
    if (result.imageCount > 0) {
      explanationText = result.enhancedExplanation;
      imageDataJson = result.imageDataJson;
      console.log(`[Adaptive] Enhanced level ${simplificationLevel} with ${result.imageCount} images`);
    }
  } catch (imageError) {
    console.error('[Adaptive] Failed to enhance with images:', imageError);
    // Continue without images - not critical
  }

  // Cache the explanation with images
  try {
    await db
      .insert(explanationVersions)
      .values({
        questionId,
        simplificationLevel,
        explanationText,
        imageData: imageDataJson,
        generatedAt: new Date(),
        usageCount: 1,
        lastUsedAt: new Date(),
      });
    
    console.log(`[Adaptive] Cached new explanation for question ${questionId}, level ${simplificationLevel}`);
  } catch (error) {
    console.error('[Adaptive] Failed to cache explanation:', error);
    // Continue even if caching fails
  }

  return { 
    explanationText, 
    fromCache: false 
  };
}

/**
 * Get the next simplification level
 * Returns null if already at maximum simplification
 */
export function getNextSimplificationLevel(currentLevel: number): number | null {
  if (currentLevel >= SIMPLIFICATION_LEVELS.ELI5) {
    return null; // Already at maximum simplification
  }
  return currentLevel + 1;
}

/**
 * Get level name for display
 */
export function getLevelName(level: number): string {
  return LEVEL_DESCRIPTIONS[level as keyof typeof LEVEL_DESCRIPTIONS]?.name || 'Unknown';
}
