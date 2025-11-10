/**
 * Image Relevance Validation
 * Uses AI to validate if an image is truly relevant to the question/concept
 */

import { invokeLLM } from './_core/llm';

interface ValidationResult {
  isRelevant: boolean;
  confidence: number; // 0-100
  reason: string;
}

/**
 * Validate if an image is relevant to the question and concept
 * Uses AI to analyze the image description/caption against the question
 */
export async function validateImageRelevance(
  questionText: string,
  correctAnswer: string,
  searchQuery: string,
  imageCaption: string,
  subject: string,
  actualImageAltText?: string
): Promise<ValidationResult> {
  const prompt = `You are an educational content quality validator. Determine if an image is TRULY RELEVANT to help a student understand this question.

**Question:** ${questionText}
**Correct Answer:** ${correctAnswer}
**Subject:** ${subject}

**Image Details:**
- Search Query: "${searchQuery}"
- Our Caption: "${imageCaption}"
- Actual Image Description from API: "${actualImageAltText || 'Not available'}"

**Your Task:**
Determine if this image would ACTUALLY help a Grade 7 student understand this specific question.

**Strict Criteria:**
- **MOST IMPORTANT:** Check the "Actual Image Description from API" - this is what the image ACTUALLY shows
- If the actual description doesn't match the question concept, REJECT it (even if our search query was good)
- The image must show the EXACT concept from the question (e.g., if question is about a hammer hitting a nail, image must show a hammer and nail, NOT just "energy" or "force")
- Generic stock photos are NOT relevant (e.g., light bulb for "energy", random tools for "work", welding sparks for "steam engine")
- Abstract concepts that don't match the specific scenario are NOT relevant
- The image must be educational and directly related to the physics/science concept in the question
- If actual image description is missing or vague, be VERY strict with validation

**Respond in JSON:**
{
  "isRelevant": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation"
}

Examples:
- Question about tennis ball bouncing + Image of "light bulb" = NOT RELEVANT (generic energy concept)
- Question about hammer hitting nail + Image of "Newton's cradle" = NOT RELEVANT (different mechanism)
- Question about hammer hitting nail + Image of "hammer driving nail into wood" = RELEVANT (exact match)
- Question about hydroelectric dam + Image of "water turbine diagram" = RELEVANT (exact component)

Be STRICT. Only mark as relevant if the image DIRECTLY shows the concept from the question.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a strict educational content quality validator.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 150,
      temperature: 0.3, // Low temperature for consistent validation
    });

    const content = response.choices[0].message.content || '{"isRelevant":false,"confidence":0,"reason":"Failed to validate"}';
    
    // Extract JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      isRelevant: parsed.isRelevant === true,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reason: parsed.reason || 'No reason provided',
    };
  } catch (error) {
    console.error('[Image Validation] Failed to validate:', error);
    // On error, be conservative and reject the image
    return {
      isRelevant: false,
      confidence: 0,
      reason: 'Validation failed',
    };
  }
}
