const { Client } = require('pg');
require('dotenv').config();

async function checkQuestions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    // Check for questions with null or empty options
    const result = await client.query(`
      SELECT id, question_text, question_type, options, difficulty
      FROM questions 
      WHERE question_type = 'multiple_choice' 
        AND (options IS NULL OR options = '' OR options = '[]')
      LIMIT 20
    `);
    
    console.log(`Found ${result.rows.length} MCQ questions with missing options:`);
    result.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`Type: ${row.question_type}`);
      console.log(`Text: ${row.question_text.substring(0, 80)}...`);
      console.log(`Options: ${row.options}`);
      console.log(`Difficulty: ${row.difficulty}`);
    });
    
    // Also check total questions
    const total = await client.query('SELECT COUNT(*) FROM questions WHERE question_type = \'multiple_choice\'');
    console.log(`\nTotal MCQ questions: ${total.rows[0].count}`);
    
  } finally {
    await client.end();
  }
}

checkQuestions().catch(console.error);
