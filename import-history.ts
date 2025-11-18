import { getDb } from './server/db';
import { questions } from './drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importHistory(filename: string, subject: string, board: string, grade: string) {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return { imported: 0, skipped: 0, total: 0 };
  }

  const jsonPath = path.join(__dirname, '..', 'upload', filename);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const topic = data.chapter;
  console.log(`Importing: ${topic}`);
  console.log(`Subtopics: ${data.subtopics.length}`);

  let imported = 0;
  let skipped = 0;
  let total = 0;

  for (const subtopic of data.subtopics) {
    const subTopicName = subtopic.subtopic;
    const qs = subtopic.questions;
    
    console.log(`Processing: ${subTopicName} (${qs.length} questions)`);
    
    for (const q of qs) {
      total++;
      try {
        await db.insert(questions).values({
          subject,
          topic,
          subTopic: subTopicName,
          board,
          grade: parseInt(grade),
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: (q.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
          points: q.points || 10,
          timeLimit: q.timeLimit || 60,
          tags: q.tags || [],
          submittedBy: 1,
          status: 'approved',
        });
        imported++;
        if (imported % 50 === 0) {
          console.log(`  Progress: ${imported} questions imported...`);
        }
      } catch (error: any) {
        if (error?.message?.includes('duplicate')) {
          skipped++;
        } else {
          console.error(`Error: ${error?.message}`);
        }
      }
    }
  }

  console.log(`✅ Complete: ${imported} imported, ${skipped} skipped, ${total} total`);
  return { imported, skipped, total };
}

// Import all 3 History chapters
async function main() {
  const results = [];
  
  results.push(await importHistory('Hist-1christianity_master.json', 'History', 'ICSE', '7'));
  results.push(await importHistory('Hist-2.json', 'History', 'ICSE', '7'));
  results.push(await importHistory('Hist-3.json', 'History', 'ICSE', '7'));
  
  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
  
  console.log(`\n📊 FINAL SUMMARY:`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`Total questions: ${totalQuestions}`);
}

main().catch(console.error);
