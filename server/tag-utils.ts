import { invokeLLM } from './_core/llm';

/**
 * Normalize tag name to Title Case
 * Examples:
 * - "energy" -> "Energy"
 * - "plant physiology" -> "Plant Physiology"
 * - "PHYSICS" -> "Physics"
 */
export function normalizeTitleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Use AI to check and correct spelling of a tag
 * Returns the corrected tag name or the original if no correction needed
 */
export async function aiSpellCheck(tagName: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a spelling correction AI for educational tags.
Check if the given word/phrase is spelled correctly.
If it's misspelled, return the correct spelling.
If it's correct, return the original word.
Return ONLY the corrected word, nothing else.

Examples:
- "enrgy" -> "Energy"
- "energi" -> "Energy"
- "Phisics" -> "Physics"
- "Biology" -> "Biology" (already correct)
- "Photosynthsis" -> "Photosynthesis"`,
        },
        {
          role: 'user',
          content: tagName,
        },
      ],
    });

    const corrected = response.choices[0]?.message?.content;
    if (!corrected || typeof corrected !== 'string') {
      return tagName;
    }

    return corrected.trim();
  } catch (error) {
    console.error('⚠️ AI spell check failed:', error);
    return tagName; // Return original on error
  }
}

/**
 * Normalize and spell-check a tag name
 * 1. AI spell check
 * 2. Title case normalization
 */
export async function normalizeTagName(tagName: string): Promise<string> {
  // First, spell check with AI
  const spellChecked = await aiSpellCheck(tagName);
  
  // Then normalize to Title Case
  return normalizeTitleCase(spellChecked);
}
