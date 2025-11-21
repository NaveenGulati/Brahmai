/**
 * PDF Processor - Upload, Store, Extract Text, Auto-Catalog Chapters
 * Handles OCR PDFs from Adobe Scan Premium and fallback OCR for non-OCR PDFs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from './_core/env';
import { invokeLLM } from './_core/llm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// S3 Client
const s3Client = new S3Client({
  region: ENV.awsRegion || 'us-east-1',
  credentials: {
    accessKeyId: ENV.awsAccessKeyId || '',
    secretAccessKey: ENV.awsSecretAccessKey || '',
  },
});

export interface PDFProcessingRequest {
  pdfBuffer: Buffer;
  fileName: string;
  textbookId: number;
  textbookName: string;
  board: string;
  grade: number;
  subject: string;
}

export interface Chapter {
  chapterNumber: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  extractedText: string;
  topics?: string[];
}

export interface PDFProcessingResult {
  pdfUrl: string;
  chapters: Chapter[];
  totalPages: number;
  isOCR: boolean;
}

/**
 * Upload PDF to S3 and return public URL
 */
async function uploadPDFToS3(buffer: Buffer, fileName: string, textbookId: number): Promise<string> {
  const bucketName = ENV.awsS3BucketName || 'brahmai-textbooks';
  const key = `textbooks/${textbookId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    ACL: 'public-read',
  });

  await s3Client.send(command);

  // Return public URL
  return `https://${bucketName}.s3.amazonaws.com/${key}`;
}

/**
 * Check if PDF has OCR text
 */
async function checkIfPDFHasOCR(pdfPath: string): Promise<boolean> {
  try {
    // Use pdftotext to extract text
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    const text = stdout.trim();
    
    // If we got substantial text, it's OCR'd
    return text.length > 100;
  } catch (error) {
    console.error('[PDF Processor] Error checking OCR:', error);
    return false;
  }
}

/**
 * Extract text from OCR PDF using pdftotext
 */
async function extractTextFromOCRPDF(pdfPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    console.error('[PDF Processor] Error extracting text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Apply OCR to non-OCR PDF using Tesseract
 */
async function applyOCRToPDF(pdfPath: string): Promise<string> {
  try {
    console.log('[PDF Processor] Applying OCR to PDF...');
    
    // Convert PDF to images
    const outputDir = path.dirname(pdfPath);
    const baseName = path.basename(pdfPath, '.pdf');
    const imagePattern = path.join(outputDir, `${baseName}-page`);
    
    await execAsync(`pdftoppm "${pdfPath}" "${imagePattern}" -png`);
    
    // Get all generated images
    const { stdout: lsOutput } = await execAsync(`ls "${imagePattern}"*.png`);
    const imageFiles = lsOutput.trim().split('\n');
    
    // Run OCR on each image
    let fullText = '';
    for (const imageFile of imageFiles) {
      const { stdout: ocrText } = await execAsync(`tesseract "${imageFile}" stdout -l eng`);
      fullText += ocrText + '\n\n';
      
      // Clean up image
      await execAsync(`rm "${imageFile}"`);
    }
    
    console.log('[PDF Processor] OCR completed');
    return fullText;
  } catch (error) {
    console.error('[PDF Processor] Error applying OCR:', error);
    throw new Error('Failed to apply OCR to PDF');
  }
}

/**
 * Use AI to auto-catalog chapters from extracted text
 */
async function autoCatalogChapters(
  extractedText: string,
  textbookName: string,
  board: string,
  grade: number,
  subject: string
): Promise<Chapter[]> {
  console.log('[PDF Processor] Auto-cataloging chapters with AI...');

  const prompt = `You are an expert at analyzing textbook content and identifying chapter boundaries.

TEXTBOOK INFORMATION:
- Name: ${textbookName}
- Board: ${board}
- Grade: ${grade}
- Subject: ${subject}

EXTRACTED TEXT FROM PDF:
${extractedText.substring(0, 50000)} ${extractedText.length > 50000 ? '...(truncated)' : ''}

TASK:
Analyze the extracted text and identify all chapters in this textbook. For each chapter, extract:
1. Chapter number
2. Chapter title
3. Approximate page start (estimate from text position)
4. Approximate page end (estimate from text position)
5. Main topics covered in the chapter
6. The actual text content of that chapter

IMPORTANT RULES:
- Look for chapter headings, "Chapter X", "Unit X", numbered sections
- Chapter titles are usually in larger font or bold (may appear as all caps in OCR)
- Estimate page numbers based on text position and typical textbook page length
- Extract the complete text for each chapter
- If page numbers are mentioned in the text, use those
- Topics should be 3-5 main concepts covered in the chapter

OUTPUT FORMAT:
Return a JSON array of chapters. Each chapter must have this exact structure:

{
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter Title",
      "pageStart": 10,
      "pageEnd": 25,
      "extractedText": "Complete chapter text...",
      "topics": ["Topic 1", "Topic 2", "Topic 3"]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No additional text before or after.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an expert textbook analyzer. You extract chapter information accurately and return only valid JSON.',
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

    const result = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    
    if (!result.chapters || !Array.isArray(result.chapters)) {
      throw new Error('Invalid response format from AI');
    }

    console.log('[PDF Processor] Auto-cataloged', result.chapters.length, 'chapters');
    return result.chapters;
  } catch (error) {
    console.error('[PDF Processor] Error auto-cataloging chapters:', error);
    throw new Error('Failed to auto-catalog chapters');
  }
}

/**
 * Get total page count from PDF
 */
async function getPDFPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    console.error('[PDF Processor] Error getting page count:', error);
    return 0;
  }
}

/**
 * Main PDF processing function
 */
export async function processPDF(request: PDFProcessingRequest): Promise<PDFProcessingResult> {
  console.log('[PDF Processor] Starting PDF processing for:', request.fileName);

  // Save PDF to temporary file
  const tempDir = '/tmp';
  const tempPdfPath = path.join(tempDir, `${Date.now()}-${request.fileName}`);
  fs.writeFileSync(tempPdfPath, request.pdfBuffer);

  try {
    // 1. Upload to S3
    console.log('[PDF Processor] Uploading to S3...');
    const pdfUrl = await uploadPDFToS3(request.pdfBuffer, request.fileName, request.textbookId);
    console.log('[PDF Processor] Uploaded to:', pdfUrl);

    // 2. Get page count
    const totalPages = await getPDFPageCount(tempPdfPath);
    console.log('[PDF Processor] Total pages:', totalPages);

    // 3. Check if PDF has OCR
    const hasOCR = await checkIfPDFHasOCR(tempPdfPath);
    console.log('[PDF Processor] Has OCR:', hasOCR);

    // 4. Extract text (with OCR fallback)
    let extractedText: string;
    if (hasOCR) {
      console.log('[PDF Processor] Extracting text from OCR PDF...');
      extractedText = await extractTextFromOCRPDF(tempPdfPath);
    } else {
      console.log('[PDF Processor] PDF not OCR\'d, applying Tesseract OCR...');
      extractedText = await applyOCRToPDF(tempPdfPath);
    }

    if (!extractedText || extractedText.trim().length < 100) {
      throw new Error('Insufficient text extracted from PDF');
    }

    console.log('[PDF Processor] Extracted text length:', extractedText.length);

    // 5. Auto-catalog chapters using AI
    const chapters = await autoCatalogChapters(
      extractedText,
      request.textbookName,
      request.board,
      request.grade,
      request.subject
    );

    // Clean up temp file
    fs.unlinkSync(tempPdfPath);

    console.log('[PDF Processor] Processing complete!');

    return {
      pdfUrl,
      chapters,
      totalPages,
      isOCR: hasOCR,
    };
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
    throw error;
  }
}
