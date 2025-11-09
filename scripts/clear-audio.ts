/**
 * Clear all generated audio files from database
 * This removes audioUrl references from both aiExplanationCache and explanationVersions tables
 * Run with: tsx scripts/clear-audio.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { aiExplanationCache, explanationVersions } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function clearAudioFiles() {
  console.log("🧹 Starting audio file cleanup...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set!");
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, {
    prepare: false,
    onnotice: () => {},
    options: 'search_path=public'
  });
  
  const db = drizzle(client);

  try {
    // Count audio files before deletion
    const cacheCount = await db.select({ count: sql<number>`count(*)` })
      .from(aiExplanationCache)
      .where(sql`${aiExplanationCache.audioUrl} IS NOT NULL`);
    
    const versionsCount = await db.select({ count: sql<number>`count(*)` })
      .from(explanationVersions)
      .where(sql`${explanationVersions.audioUrl} IS NOT NULL`);

    console.log(`📊 Found ${cacheCount[0].count} audio files in aiExplanationCache`);
    console.log(`📊 Found ${versionsCount[0].count} audio files in explanationVersions`);

    // Clear audioUrl from aiExplanationCache
    const result1 = await db.update(aiExplanationCache)
      .set({ audioUrl: null })
      .where(sql`${aiExplanationCache.audioUrl} IS NOT NULL`);

    console.log(`✅ Cleared audio URLs from aiExplanationCache`);

    // Clear audioUrl from explanationVersions
    const result2 = await db.update(explanationVersions)
      .set({ audioUrl: null })
      .where(sql`${explanationVersions.audioUrl} IS NOT NULL`);

    console.log(`✅ Cleared audio URLs from explanationVersions`);

    console.log("\n🎉 Audio cleanup complete!");
    console.log("💡 Note: This only clears database references. Storage files remain on Forge.");
    console.log("💡 To clear storage, you would need to delete files from Forge S3 bucket manually.");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clearAudioFiles();
