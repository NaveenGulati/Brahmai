import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function checkAudioCache() {
  try {
    const result = await sql`
      SELECT 
        "questionId",
        "audioUrl",
        "detailedExplanation" IS NOT NULL as has_explanation,
        LENGTH("detailedExplanation") as explanation_length
      FROM "aiExplanationCache"
      WHERE "audioUrl" IS NOT NULL
      LIMIT 10
    `;
    
    console.log('Audio cache entries with audioUrl:');
    console.log(result);
    
    if (result.length === 0) {
      console.log('\n✅ All audioUrl entries have been cleared!');
    } else {
      console.log(`\n⚠️  Found ${result.length} entries with audioUrl still set`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkAudioCache();
