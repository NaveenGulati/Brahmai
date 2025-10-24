import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { questions } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function checkQuestions() {
  const result = await db.select().from(questions).where(eq(questions.moduleId, 1));
  console.log("Questions for module 1:", result.length);
  console.log(JSON.stringify(result, null, 2));
}

checkQuestions().then(() => process.exit(0)).catch(console.error);
