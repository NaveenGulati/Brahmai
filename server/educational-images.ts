/**
 * Educational Image Enhancement for Explanations
 * FREE TIER Strategy: Pexels + Pixabay + Wikimedia + Unsplash
 * All providers are free with unlimited or high limits
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
  attribution?: string;
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
1. searchQuery: What to search (e.g., "energy transformation", "steam engine diagram", "heat transfer illustration")
2. caption: Brief description of what the image shows
3. position: Where to place it ("after_intro", "after_example", or "end")

**Guidelines:**
- Use simple, clear search terms (2-4 words)
- Focus on visual concepts that aid understanding
- Only suggest if genuinely helpful (max 2 images)
- Position strategically to support understanding
- Prefer real photos over abstract concepts

Respond in JSON:
{
  "images": [
    {
      "searchQuery": "energy transformation",
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
 * Search Pexels API (FREE, Unlimited with attribution)
 * https://www.pexels.com/api/documentation/
 */
async function searchPexels(query: string): Promise<{ url: string; attribution: string } | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('[Educational Images] No Pexels API key');
    return null;
  }

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query,
        per_page: 3,
        orientation: 'landscape',
      },
      headers: {
        'Authorization': apiKey,
      },
      timeout: 5000,
    });

    if (response.data.photos && response.data.photos.length > 0) {
      const photo = response.data.photos[0];
      return {
        url: photo.src.large,
        attribution: `Photo by ${photo.photographer} from Pexels`,
      };
    }
  } catch (error) {
    console.error('[Educational Images] Pexels search failed:', error);
  }

  return null;
}

/**
 * Search Pixabay API (FREE, Unlimited, NO attribution required)
 * https://pixabay.com/api/docs/
 */
async function searchPixabay(query: string): Promise<{ url: string; attribution?: string } | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.log('[Educational Images] No Pixabay API key');
    return null;
  }

  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: query,
        image_type: 'photo',
        per_page: 3,
        safesearch: 'true',
      },
      timeout: 5000,
    });

    if (response.data.hits && response.data.hits.length > 0) {
      const image = response.data.hits[0];
      return {
        url: image.largeImageURL,
        attribution: undefined, // CC0 - no attribution required!
      };
    }
  } catch (error) {
    console.error('[Educational Images] Pixabay search failed:', error);
  }

  return null;
}

/**
 * Search Unsplash API (FREE, 50/hour)
 * https://unsplash.com/documentation
 */
async function searchUnsplash(query: string): Promise<{ url: string; attribution: string } | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.log('[Educational Images] No Unsplash API key');
    return null;
  }

  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query,
        per_page: 3,
        orientation: 'landscape',
      },
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
      },
      timeout: 5000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      return {
        url: photo.urls.regular,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
      };
    }
  } catch (error) {
    console.error('[Educational Images] Unsplash search failed:', error);
  }

  return null;
}

/**
 * Search Wikimedia Commons (FREE, Unlimited, Educational focus)
 * https://commons.wikimedia.org/w/api.php
 */
async function searchWikimedia(query: string): Promise<{ url: string; attribution: string } | null> {
  try {
    // Step 1: Search for images
    const searchResponse = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        srnamespace: 6, // File namespace
        srlimit: 3,
        format: 'json',
      },
      timeout: 5000,
    });

    const results = searchResponse.data.query?.search;
    if (!results || results.length === 0) {
      return null;
    }

    // Step 2: Get image URL
    const imageTitle = results[0].title;
    const imageResponse = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: imageTitle,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json',
      },
      timeout: 5000,
    });

    const pages = imageResponse.data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    const imageUrl = page.imageinfo?.[0]?.url;

    if (imageUrl) {
      return {
        url: imageUrl,
        attribution: 'From Wikimedia Commons',
      };
    }
  } catch (error) {
    console.error('[Educational Images] Wikimedia search failed:', error);
  }

  return null;
}

/**
 * Multi-provider search with fallback chain
 * Priority: Pexels → Pixabay → Wikimedia → Unsplash
 */
async function searchEducationalImage(query: string): Promise<{ url: string; attribution?: string } | null> {
  console.log(`[Educational Images] Searching for: "${query}"`);

  // 1. Try Pexels (unlimited, high quality)
  const pexelsResult = await searchPexels(query);
  if (pexelsResult) {
    console.log('[Educational Images] Found on Pexels');
    return pexelsResult;
  }

  // 2. Try Pixabay (unlimited, no attribution needed)
  const pixabayResult = await searchPixabay(query);
  if (pixabayResult) {
    console.log('[Educational Images] Found on Pixabay');
    return pixabayResult;
  }

  // 3. Try Wikimedia (unlimited, educational focus)
  const wikimediaResult = await searchWikimedia(query);
  if (wikimediaResult) {
    console.log('[Educational Images] Found on Wikimedia');
    return wikimediaResult;
  }

  // 4. Try Unsplash (50/hour, high quality)
  const unsplashResult = await searchUnsplash(query);
  if (unsplashResult) {
    console.log('[Educational Images] Found on Unsplash');
    return unsplashResult;
  }

  console.log('[Educational Images] No image found');
  return null;
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
    
    // Search for image
    const imageResult = await searchEducationalImage(suggestion.searchQuery);
    
    if (imageResult) {
      // Use direct URL (works in production without filesystem access)
      processedImages.push({
        url: imageResult.url,
        caption: suggestion.caption,
        position: suggestion.position,
        attribution: imageResult.attribution,
      });
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
    // Build attribution text
    const attributionText = img.attribution 
      ? `\n*${img.attribution}*` 
      : '';

    // Use pure markdown format (compatible with ReactMarkdown)
    const imageMarkdown = `\n\n---\n\n![${img.caption}](${img.url})\n\n*${img.caption}*${attributionText}\n\n---\n\n`;

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
): Promise<{ enhancedExplanation: string; imageCount: number; imageDataJson: string | null }> {
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
      return { enhancedExplanation: explanation, imageCount: 0, imageDataJson: null };
    }

    console.log(`[Educational Images] Processing ${suggestions.length} image suggestions...`);

    // Step 2: Search and download images (multi-provider fallback)
    const processedImages = await processImageSuggestions(suggestions, questionId);

    if (processedImages.length === 0) {
      console.log(`[Educational Images] No images found for question ${questionId}`);
      return { enhancedExplanation: explanation, imageCount: 0, imageDataJson: null };
    }

    // Step 3: Insert images into explanation
    const enhancedExplanation = insertImagesIntoExplanation(explanation, processedImages);

    // Step 4: Serialize image data for caching
    const imageDataJson = JSON.stringify(processedImages);

    console.log(`[Educational Images] Enhanced with ${processedImages.length} images`);
    return { enhancedExplanation, imageCount: processedImages.length, imageDataJson };

  } catch (error) {
    console.error('[Educational Images] Error enhancing explanation:', error);
    return { enhancedExplanation: explanation, imageCount: 0, imageDataJson: null };
  }
}

/**
 * Restore images into explanation from cached image data
 * Used when retrieving cached explanations from database
 */
export function restoreImagesIntoExplanation(
  explanation: string,
  imageData: ProcessedImage[]
): string {
  if (imageData.length === 0) return explanation;
  
  // Images are already embedded in the cached explanation text
  // This function exists for future enhancements (e.g., updating image URLs)
  // For now, just return the explanation as-is since images are in markdown format
  return explanation;
}
