import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { invokeLLM } from './_core/llm';

const execAsync = promisify(exec);

/**
 * PDF Processing Service
 * Handles PDF upload, OCR detection, text extraction, and chapter cataloging
 * Uses LOCAL SERVER STORAGE (no AWS S3 needed)
 */

interface ProcessPDFInput {
  pdfBuffer: Buffer;
  fileName: string;
  textbookId: number;
  textbookName: string;
  board: string;
  grade: number;
  subject: string;
}

interface Chapter {
  chapterNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  extractedText: string;
  topics: string[];
}

interface ProcessPDFResult {
  pdfUrl: string;
  totalPages: number;
  chapters: Chapter[];
  isOCR: boolean;
}

/**
 * Main PDF processing function
 * 1. Saves PDF to local server storage
 * 2. Detects if PDF has OCR text
 * 3. Extracts text (or applies Tesseract if needed)
 * 4. Uses AI to catalog chapters
 */
export async function processPDF(input: ProcessPDFInput): Promise<ProcessPDFResult> {
  const { pdfBuffer, fileName, textbookId, textbookName, board, grade, subject } = input;

  // Create upload directory if it doesn't exist
  const uploadDir = join(process.cwd(), 'uploads', 'textbooks', textbookId.toString());
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Save PDF to local storage
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const pdfFileName = `${timestamp}-${sanitizedFileName}`;
  const pdfPath = join(uploadDir, pdfFileName);
  
  await writeFile(pdfPath, pdfBuffer);

  // Generate public URL (served by backend)
  const pdfUrl = `/uploads/textbooks/${textbookId}/${pdfFileName}`;

  // Get total page count
  const totalPages = await getPDFPageCount(pdfPath);

  // Check if PDF has OCR text
  const isOCR = await checkIfOCR(pdfPath);

  // Extract text from PDF
  let fullText: string;
  if (isOCR) {
    fullText = await extractTextFromOCRPDF(pdfPath);
  } else {
    fullText = await applyTesseractOCR(pdfPath);
  }

  // Use AI to catalog chapters
  const chapters = await catalogChaptersWithAI(fullText, textbookName, board, grade, subject);

  return {
    pdfUrl,
    totalPages,
    chapters,
    isOCR,
  };
}

/**
 * Get total page count from PDF
 */
async function getPDFPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    return 0;
  }
}

/**
 * Check if PDF has OCR text (selectable text)
 */
async function checkIfOCR(pdfPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" - | head -c 1000`);
    const text = stdout.trim();
    // If we get more than 100 characters, it's likely OCR'd
    return text.length > 100;
  } catch (error) {
    console.error('Error checking OCR:', error);
    return false;
  }
}

/**
 * Extract text from OCR'd PDF using pdftotext
 */
async function extractTextFromOCRPDF(pdfPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    console.error('Error extracting text from OCR PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Apply Tesseract OCR to non-OCR PDF
 * 1. Convert PDF to images
 * 2. Run Tesseract on each image
 * 3. Combine text from all pages
 */
async function applyTesseractOCR(pdfPath: string): Promise<string> {
  try {
    // Create temp directory for images
    const tempDir = join(process.cwd(), 'temp', `ocr-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Convert PDF to images (one per page)
    const imagePrefix = join(tempDir, 'page');
    await execAsync(`pdftoppm "${pdfPath}" "${imagePrefix}" -png`);

    // Get list of generated images
    const { stdout: imageList } = await execAsync(`ls "${tempDir}"/*.png`);
    const imageFiles = imageList.trim().split('\n');

    // Run Tesseract on each image
    const textPromises = imageFiles.map(async (imagePath) => {
      const { stdout } = await execAsync(`tesseract "${imagePath}" stdout`);
      return stdout;
    });

    const textPages = await Promise.all(textPromises);
    const fullText = textPages.join('\n\n');

    // Clean up temp directory
    await execAsync(`rm -rf "${tempDir}"`);

    return fullText;
  } catch (error) {
    console.error('Error applying Tesseract OCR:', error);
    throw new Error('Failed to apply OCR to PDF');
  }
}

/**
 * Use AI to catalog chapters from extracted text
 * Identifies chapter boundaries, titles, and page ranges
 */
async function catalogChaptersWithAI(
  fullText: string,
  textbookName: string,
  board: string,
  grade: number,
  subject: string
): Promise<Chapter[]> {
  // Truncate text if too long (keep first 50,000 characters)
  const textToAnalyze = fullText.substring(0, 50000);

  const prompt = `You are an expert at analyzing textbook content and identifying chapter structure.

**Textbook Information:**
- Name: ${textbookName}
- Board: ${board}
- Grade: ${grade}
- Subject: ${subject}

**Task:**
Analyze the following textbook text and identify all chapters. For each chapter, extract:
1. Chapter number
2. Chapter title
3. Estimated page start (if mentioned, otherwise estimate based on position)
4. Estimated page end (if mentioned, otherwise estimate based on position)
5. Main topics covered in the chapter (3-5 topics)
6. Full text content of the chapter

**Text to Analyze:**
${textToAnalyze}

**Output Format (JSON):**
Return a JSON array of chapters. Each chapter should have:
- chapterNumber: number
- title: string
- pageStart: number
- pageEnd: number
- topics: string[] (3-5 main topics)
- extractedText: string (full chapter text, up to 10,000 characters)

**Important:**
- Look for patterns like "Chapter 1", "Unit 1", "1.", "CHAPTER ONE", etc.
- Chapter titles are often in ALL CAPS or bold (may appear as repeated text)
- Estimate page numbers based on position if not explicitly mentioned
- Extract the complete text for each chapter
- If you can't find clear chapters, divide the text into logical sections

Return ONLY the JSON array, no additional text.`;

  try {
    const response = await invokeLLM({
      messages: [{ role: 'user', content: prompt }],
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxTokens: 16384,
      responseFormat: 'json',
    });

    const chapters = JSON.parse(response.content);

    // Validate and ensure each chapter has required fields
    return chapters.map((chapter: any, index: number) => ({
      chapterNumber: chapter.chapterNumber || index + 1,
      title: chapter.title || `Chapter ${index + 1}`,
      pageStart: chapter.pageStart || index * 10 + 1,
      pageEnd: chapter.pageEnd || (index + 1) * 10,
      extractedText: chapter.extractedText || '',
      topics: Array.isArray(chapter.topics) ? chapter.topics : [],
    }));
  } catch (error) {
    console.error('Error cataloging chapters with AI:', error);
    
    // Fallback: Create a single chapter with all text
    return [{
      chapterNumber: 1,
      title: 'Complete Textbook',
      pageStart: 1,
      pageEnd: 100,
      extractedText: textToAnalyze,
      topics: [subject],
    }];
  }
}

/**
 * Extract text from specific page range of PDF
 * Used when generating questions from a specific chapter
 */
export async function extractTextFromPageRange(
  pdfPath: string,
  pageStart: number,
  pageEnd: number
): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `pdftotext -f ${pageStart} -l ${pageEnd} "${pdfPath}" -`
    );
    return stdout;
  } catch (error) {
    console.error('Error extracting text from page range:', error);
    return '';
  }
}
