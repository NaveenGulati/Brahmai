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

    // Step 1: Generate and save headline
    await generateAndSaveHeadline(db, job.noteId, job.content);

    // Step 2: Generate and save tags
    await generateAndSaveTags(db, job.noteId, job.content);

    // Step 3: Add subject tag (either user-provided or AI-generated)
    await addSubjectTag(db, job.noteId, job.content, job.subject);

    console.log(`✅ [AsyncProcessor] Completed background processing for note ${job.noteId}`);
  } catch (error) {
    console.error(`❌ [AsyncProcessor] Error processing note ${job.noteId}:`, error);
    // Don't throw - we don't want background jobs to crash the server
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
