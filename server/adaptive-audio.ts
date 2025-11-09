/**
 * Audio generation for adaptive explanations
 * Handles TTS for different simplification levels
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { explanationVersions } from "../drizzle/schema";
import { generateSpeech } from './_core/googleTTS';

/**
 * Generate or retrieve audio for a specific explanation version
 * Uses caching to avoid regenerating the same audio
 */
export async function generateAudioForExplanationVersion(
  questionId: number,
  simplificationLevel: number
): Promise<{ audioUrl: string; fromCache: boolean }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get the explanation version
  const versions = await db
    .select()
    .from(explanationVersions)
    .where(
      and(
        eq(explanationVersions.questionId, questionId),
        eq(explanationVersions.simplificationLevel, simplificationLevel)
      )
    )
    .limit(1);

  if (versions.length === 0) {
    throw new Error(`No explanation found for question ${questionId} at level ${simplificationLevel}`);
  }

  const version = versions[0];

  // Check if audio already exists
  if (version.audioUrl) {
    console.log(`[Adaptive TTS] Using cached audio for question ${questionId}, level ${simplificationLevel}`);
    return { audioUrl: version.audioUrl, fromCache: true };
  }

  // Generate new audio
  console.log(`[Adaptive TTS] Generating audio for question ${questionId}, level ${simplificationLevel}`);
  console.log(`[Adaptive TTS] Text preview:`, version.explanationText.substring(0, 200));
  
  const audioUrl = await generateSpeech(version.explanationText);

  // Update the version with audio URL
  await db
    .update(explanationVersions)
    .set({ audioUrl })
    .where(eq(explanationVersions.id, version.id));

  console.log(`[Adaptive TTS] Generated and cached audio for question ${questionId}, level ${simplificationLevel}`);

  // Re-fetch from database to ensure same code path as cached audio
  const updatedVersions = await db
    .select()
    .from(explanationVersions)
    .where(eq(explanationVersions.id, version.id))
    .limit(1);

  const fetchedAudioUrl = updatedVersions[0]?.audioUrl;
  if (!fetchedAudioUrl) {
    throw new Error('Failed to fetch audio URL after saving');
  }

  console.log(`[Adaptive TTS] Re-fetched audio URL from database`);
  return { audioUrl: fetchedAudioUrl, fromCache: false };
}
