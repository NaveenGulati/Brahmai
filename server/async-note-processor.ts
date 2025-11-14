/**
 * Asynchronous Note Processing Service
 * 
 * This service handles background processing of notes after they are saved.
 * It generates headlines, tags, and performs spell checking without blocking
 * the user's workflow.
 */

import { getDb } from './db';
import { notes, tags, noteTags } from './db-schema-notes';
import { eq, and, inArray } from 'drizzle-orm';
import { generateHeadline, generateTags, generateSubject, stripHtml } from './ai-notes-service';
import { normalizeTagName } from './tag-utils';

interface NoteProcessingJob {
  noteId: number;
  userId: number;
  content: string;
  subject?: string;
}

/**
 * Process a note asynchronously in the background
 * This function is fire-and-forget - it doesn't block the response
 */
export async function processNoteAsync(job: NoteProcessingJob): Promise<void> {
  console.log(`🔄 [AsyncProcessor] Starting background processing for note ${job.noteId}`);
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('❌ [AsyncProcessor] Database not available');
      return;
    }

    // Step 0: Check and correct spelling (do this first to improve other AI tasks)
    const correctedContent = await checkAndCorrectSpelling(db, job.noteId, job.content);
    const finalContent = correctedContent || job.content;

    // Step 1: Generate and save headline
    await generateAndSaveHeadline(db, job.noteId, finalContent);

    // Step 2: Generate and save tags
    await generateAndSaveTags(db, job.noteId, finalContent);

    // Step 3: Add subject tag (either user-provided or AI-generated)
    await addSubjectTag(db, job.noteId, finalContent, job.subject);

    console.log(`✅ [AsyncProcessor] Completed background processing for note ${job.noteId}`);
  } catch (error) {
    console.error(`❌ [AsyncProcessor] Error processing note ${job.noteId}:`, error);
    // Don't throw - we don't want background jobs to crash the server
  }
}

/**
 * Check and correct spelling in note content
 */
async function checkAndCorrectSpelling(db: any, noteId: number, content: string): Promise<string | null> {
  try {
    console.log(`🔍 [AsyncProcessor] Checking spelling for note ${noteId}`);
    const plainText = stripHtml(content);
    
    // Use OpenAI to check and correct spelling
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful spelling checker for student notes. Your task is to:
1. Check for spelling errors in the text
2. Correct any spelling mistakes
3. Preserve the original formatting, capitalization, and punctuation as much as possible
4. Do NOT change the meaning or rephrase the text
5. If there are no spelling errors, return the text exactly as is

Return ONLY the corrected text, nothing else.`
        },
        {
          role: 'user',
          content: plainText
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    const correctedText = response.choices[0]?.message?.content?.trim();
    
    if (!correctedText || correctedText === plainText) {
      console.log(`✅ [AsyncProcessor] No spelling errors found in note ${noteId}`);
      return null;
    }
    
    // Update the note with corrected content
    await db
      .update(notes)
      .set({ content: correctedText, updatedAt: new Date() })
      .where(eq(notes.id, noteId));
    
    console.log(`✅ [AsyncProcessor] Spelling corrected for note ${noteId}`);
    return correctedText;
  } catch (error) {
    console.error(`⚠️ [AsyncProcessor] Failed to check spelling for note ${noteId}:`, error);
    return null;
  }
}

/**
 * Generate and save headline for a note
 */
async function generateAndSaveHeadline(db: any, noteId: number, content: string): Promise<void> {
  try {
    console.log(`📝 [AsyncProcessor] Generating headline for note ${noteId}`);
    const headline = await generateHeadline(content);
    
    if (headline) {
      await db
        .update(notes)
        .set({ headline, updatedAt: new Date() })
        .where(eq(notes.id, noteId));
      
      console.log(`✅ [AsyncProcessor] Headline saved for note ${noteId}: "${headline}"`);
    }
  } catch (error) {
    console.error(`⚠️ [AsyncProcessor] Failed to generate headline for note ${noteId}:`, error);
  }
}

/**
 * Generate and save tags for a note
 */
async function generateAndSaveTags(db: any, noteId: number, content: string): Promise<void> {
  try {
    console.log(`🏷️ [AsyncProcessor] Generating tags for note ${noteId}`);
    const plainText = stripHtml(content);
    const generatedTags = await generateTags(plainText);
    
    for (const tag of generatedTags) {
      const normalizedName = await normalizeTagName(tag.name);
      console.log(`✅ [AsyncProcessor] Tag normalized: "${tag.name}" -> "${normalizedName}"`);
      
      // Find or create tag
      const [existingTag] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.name, normalizedName), eq(tags.type, tag.type)));
      
      let tagId: number;
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const [newTag] = await db
          .insert(tags)
          .values({ name: normalizedName, type: tag.type })
          .returning();
        tagId = newTag.id;
      }
      
      // Link tag to note (avoid duplicates)
      const [existing] = await db
        .select()
        .from(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
      
      if (!existing) {
        await db.insert(noteTags).values({ noteId, tagId });
      }
    }
    
    console.log(`✅ [AsyncProcessor] Generated ${generatedTags.length} tags for note ${noteId}`);
  } catch (error) {
    console.error(`⚠️ [AsyncProcessor] Failed to generate tags for note ${noteId}:`, error);
  }
}

/**
 * Add subject tag to a note (user-provided or AI-generated)
 */
async function addSubjectTag(db: any, noteId: number, content: string, userSubject?: string): Promise<void> {
  try {
    let finalSubject = userSubject;
    
    // If no user-provided subject, generate with AI
    if (!finalSubject) {
      console.log(`🤖 [AsyncProcessor] Generating subject for note ${noteId}`);
      const plainText = stripHtml(content);
      const aiSubject = await generateSubject(plainText);
      if (aiSubject) {
        finalSubject = aiSubject;
        console.log(`✅ [AsyncProcessor] AI-generated subject: "${aiSubject}"`);
      }
    }
    
    if (!finalSubject) {
      console.log(`⚠️ [AsyncProcessor] No subject available for note ${noteId}`);
      return;
    }
    
    const normalizedSubject = await normalizeTagName(finalSubject);
    console.log(`📚 [AsyncProcessor] Adding subject tag: "${finalSubject}" -> "${normalizedSubject}"`);
    
    // Find or create subject tag
    const [existingTag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.name, normalizedSubject), eq(tags.type, 'subject')));
    
    let tagId: number;
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      const [newTag] = await db
        .insert(tags)
        .values({ name: normalizedSubject, type: 'subject' })
        .returning();
      tagId = newTag.id;
    }
    
    // Link tag to note (avoid duplicates)
    const [existing] = await db
      .select()
      .from(noteTags)
      .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
    
    if (!existing) {
      await db.insert(noteTags).values({ noteId, tagId });
    }
    
    console.log(`✅ [AsyncProcessor] Subject tag added for note ${noteId}: "${normalizedSubject}"`);
  } catch (error) {
    console.error(`⚠️ [AsyncProcessor] Failed to add subject tag for note ${noteId}:`, error);
  }
}
