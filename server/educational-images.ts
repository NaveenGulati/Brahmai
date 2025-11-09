/**
 * Educational Image Enhancement for Explanations
 * Hybrid approach: Search for existing images from web + Generate when needed
 */

import { invokeLLM } from './_core/llm';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

interface ImageSuggestion {
  searchQuery: string;
  caption: string;
  position: 'after_intro' | 'after_example' | 'end';
}

interface ProcessedImage {
  url: string;
  caption: string;
  position: string;
}

/**
 * Analyze explanation and suggest image search queries
 */
export async function analyzeAndSuggestImages(
  questionText: string,
  correctAnswer: string,
  subject: string,
  topic: string,
  grade: number
): Promise<ImageSuggestion[]> {
  const prompt = `You are an educational content designer. Analyze this Grade ${grade} ${subject} question and suggest 1-2 educational images that would help students understand better.

**Question:** ${questionText}
**Correct Answer:** ${correctAnswer}
**Subject:** ${subject}
**Topic:** ${topic}

**Your Task:**
Suggest 1-2 images to search for. For each provide:
1. searchQuery: What to search (e.g., "energy transformation diagram educational", "steam engine how it works illustration")
2. caption: Brief description of what the image shows
3. position: Where to place it ("after_intro", "after_example", or "end")

**Guidelines:**
- Search for educational diagrams, illustrations, or real photos
- Use specific, descriptive search terms
- Include words like "diagram", "illustration", "educational", "labeled" for better results
- Only suggest if genuinely helpful (max 2 images)
- Position strategically to support understanding

Respond in JSON:
{
  "images": [
    {
      "searchQuery": "energy transformation steam engine diagram educational",
      "caption": "How energy transforms in a steam engine from chemical to mechanical",
      "position": "after_intro"
    }
  ]
}

IMPORTANT: Return empty array if the concept is simple enough without images.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an educational content designer.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 400,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || '{"images":[]}';
    
    // Extract JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Limit to 2 images max
    const images = (parsed.images || []).slice(0, 2);
    return images;
  } catch (error) {
    console.error('[Educational Images] Failed to analyze for images:', error);
    return [];
  }
}

/**
 * Download and save image from URL
 */
async function downloadAndSaveImage(
  imageUrl: string,
  questionId: number,
  imageIndex: number
): Promise<string | null> {
  try {
    // Create directory
    const imagesDir = path.join(process.cwd(), 'public', 'educational-images');
    await fs.mkdir(imagesDir, { recursive: true });

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Generate filename
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 8);
    const filename = `q${questionId}_img${imageIndex}_${hash}.${ext}`;
    const filepath = path.join(imagesDir, filename);

    // Save file
    await fs.writeFile(filepath, response.data);

    const publicPath = `/educational-images/${filename}`;
    console.log(`[Educational Images] Downloaded and saved: ${publicPath}`);
    return publicPath;
  } catch (error) {
    console.error('[Educational Images] Failed to download image:', error);
    return null;
  }
}

/**
 * Search for educational images using Bing/Google image search
 * Returns array of image URLs
 */
async function searchEducationalImages(query: string): Promise<string[]> {
  try {
    // Use Bing Image Search API (you'll need to set BING_SEARCH_API_KEY env var)
    const apiKey = process.env.BING_SEARCH_API_KEY;
    
    if (!apiKey) {
      console.log('[Educational Images] No Bing API key, skipping image search');
      return [];
    }

    const response = await axios.get('https://api.bing.microsoft.com/v7.0/images/search', {
      params: {
        q: query,
        count: 5,
        imageType: 'Photo',
        license: 'Public', // Only public domain/creative commons
        safeSearch: 'Strict',
      },
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      timeout: 5000,
    });

    const imageUrls = response.data.value?.map((img: any) => img.contentUrl) || [];
    return imageUrls.slice(0, 3); // Return top 3
  } catch (error) {
    console.error('[Educational Images] Image search failed:', error);
    return [];
  }
}

/**
 * Process image suggestions and get actual image URLs
 */
export async function processImageSuggestions(
  suggestions: ImageSuggestion[],
  questionId: number
): Promise<ProcessedImage[]> {
  const processedImages: ProcessedImage[] = [];

  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    
    console.log(`[Educational Images] Searching for: ${suggestion.searchQuery}`);
    const imageUrls = await searchEducationalImages(suggestion.searchQuery);

    if (imageUrls.length > 0) {
      // Try to download the first available image
      for (const url of imageUrls) {
        const localPath = await downloadAndSaveImage(url, questionId, i + 1);
        if (localPath) {
          processedImages.push({
            url: localPath,
            caption: suggestion.caption,
            position: suggestion.position,
          });
          break; // Successfully got one image, move to next suggestion
        }
      }
    }
  }

  return processedImages;
}

/**
 * Insert images into explanation markdown
 */
export function insertImagesIntoExplanation(
  explanation: string,
  images: ProcessedImage[]
): string {
  if (images.length === 0) return explanation;

  let result = explanation;
  const sections = result.split('###');

  images.forEach(img => {
    const imageMarkdown = `\n\n<div class="educational-image" style="text-align: center; margin: 24px 0; padding: 16px; background: #f8f9fa; border-radius: 12px;">
  <img src="${img.url}" alt="${img.caption}" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
  <p style="font-style: italic; color: #555; margin-top: 12px; font-size: 14px; line-height: 1.5;">${img.caption}</p>
</div>\n\n`;

    switch (img.position) {
      case 'after_intro':
        if (sections.length > 1) {
          sections[1] += imageMarkdown;
        }
        break;
      
      case 'after_example':
        const exampleIndex = sections.findIndex(s => 
          s.toLowerCase().includes('example') || 
          s.toLowerCase().includes('break it down')
        );
        if (exampleIndex > 0) {
          sections[exampleIndex] += imageMarkdown;
        } else if (sections.length > 2) {
          sections[2] += imageMarkdown;
        }
        break;
      
      case 'end':
        sections[sections.length - 1] += imageMarkdown;
        break;
    }
  });

  result = sections.join('###');
  return result;
}

/**
 * Main function: Enhance explanation with educational images
 */
export async function enhanceExplanationWithImages(
  questionId: number,
  questionText: string,
  correctAnswer: string,
  explanation: string,
  subject: string = 'Science',
  topic: string = '',
  grade: number = 7
): Promise<{ enhancedExplanation: string; imageCount: number }> {
  try {
    console.log(`[Educational Images] Analyzing question ${questionId}...`);
    
    // Step 1: Analyze and get image suggestions
    const suggestions = await analyzeAndSuggestImages(
      questionText,
      correctAnswer,
      subject,
      topic,
      grade
    );

    if (suggestions.length === 0) {
      console.log(`[Educational Images] No images needed for question ${questionId}`);
      return { enhancedExplanation: explanation, imageCount: 0 };
    }

    console.log(`[Educational Images] Processing ${suggestions.length} image suggestions...`);

    // Step 2: Search and download images
    const processedImages = await processImageSuggestions(suggestions, questionId);

    if (processedImages.length === 0) {
      console.log(`[Educational Images] No images found for question ${questionId}`);
      return { enhancedExplanation: explanation, imageCount: 0 };
    }

    // Step 3: Insert images into explanation
    const enhancedExplanation = insertImagesIntoExplanation(explanation, processedImages);

    console.log(`[Educational Images] Enhanced with ${processedImages.length} images`);
    return { enhancedExplanation, imageCount: processedImages.length };

  } catch (error) {
    console.error('[Educational Images] Error enhancing explanation:', error);
    return { enhancedExplanation: explanation, imageCount: 0 };
  }
}
