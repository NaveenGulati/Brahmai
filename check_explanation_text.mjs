import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function checkExplanation() {
  try {
    // Check question 125 (the most recent one)
    const result = await sql`
      SELECT 
        "questionId",
        "detailedExplanation"
      FROM "aiExplanationCache"
      WHERE "questionId" = 125
      LIMIT 1
    `;
    
    if (result.length > 0) {
      const explanation = result[0].detailedExplanation;
      console.log('=== ORIGINAL EXPLANATION (from database) ===');
      console.log(explanation.substring(0, 500));
      console.log('\n=== EMOJI CHECK ===');
      
      // Check for common emojis
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      const emojis = explanation.match(emojiRegex);
      
      if (emojis) {
        console.log('Found emojis:', emojis.join(' '));
        console.log('Total emoji count:', emojis.length);
      } else {
        console.log('No emojis found in explanation');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkExplanation();
