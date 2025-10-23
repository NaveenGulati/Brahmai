import { drizzle } from "drizzle-orm/mysql2";
import { subjects, modules, achievements } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed subjects
  const subjectsData = [
    { name: "Mathematics", code: "MATH", description: "Algebra, Geometry, Arithmetic", icon: "🔢", color: "#3b82f6" },
    { name: "Science", code: "SCI", description: "Physics, Chemistry, Biology", icon: "🔬", color: "#10b981" },
    { name: "English", code: "ENG", description: "Grammar, Literature, Composition", icon: "📚", color: "#8b5cf6" },
    { name: "Social Studies", code: "SST", description: "History, Geography, Civics", icon: "🌍", color: "#f59e0b" },
    { name: "Hindi", code: "HIN", description: "व्याकरण, साहित्य", icon: "🇮🇳", color: "#ef4444" },
    { name: "Spanish", code: "SPA", description: "Gramática, Vocabulario", icon: "🇪🇸", color: "#ec4899" },
    { name: "Computer Science", code: "CS", description: "Programming, Digital Literacy", icon: "💻", color: "#06b6d4" },
  ];

  console.log("📖 Inserting subjects...");
  for (const subject of subjectsData) {
    await db.insert(subjects).values(subject).onDuplicateKeyUpdate({ set: { name: subject.name } });
  }

  // Seed sample modules for Mathematics
  const mathModules = [
    { subjectId: 1, name: "Integers", description: "Operations on integers, number line", orderIndex: 1 },
    { subjectId: 1, name: "Fractions and Decimals", description: "Operations on fractions and decimals", orderIndex: 2 },
    { subjectId: 1, name: "Algebra - Simple Equations", description: "Linear equations in one variable", orderIndex: 3 },
    { subjectId: 1, name: "Ratio and Proportion", description: "Ratios, proportions, unitary method", orderIndex: 4 },
    { subjectId: 1, name: "Geometry - Lines and Angles", description: "Types of angles, parallel lines", orderIndex: 5 },
    { subjectId: 1, name: "Perimeter and Area", description: "Area of triangles, rectangles, circles", orderIndex: 6 },
  ];

  // Seed sample modules for Science
  const scienceModules = [
    { subjectId: 2, name: "Nutrition in Plants", description: "Photosynthesis, modes of nutrition", orderIndex: 1 },
    { subjectId: 2, name: "Heat and Temperature", description: "Thermometer, heat transfer", orderIndex: 2 },
    { subjectId: 2, name: "Acids, Bases and Salts", description: "Properties and reactions", orderIndex: 3 },
    { subjectId: 2, name: "Motion and Time", description: "Speed, distance-time graphs", orderIndex: 4 },
  ];

  // Seed sample modules for English
  const englishModules = [
    { subjectId: 3, name: "Grammar - Tenses", description: "Present, past, future tenses", orderIndex: 1 },
    { subjectId: 3, name: "Grammar - Parts of Speech", description: "Nouns, verbs, adjectives, adverbs", orderIndex: 2 },
    { subjectId: 3, name: "Comprehension", description: "Reading comprehension passages", orderIndex: 3 },
    { subjectId: 3, name: "Vocabulary Building", description: "Synonyms, antonyms, idioms", orderIndex: 4 },
  ];

  console.log("📚 Inserting modules...");
  const allModules = [...mathModules, ...scienceModules, ...englishModules];
  for (const module of allModules) {
    await db.insert(modules).values(module);
  }

  // Seed achievements
  const achievementsData = [
    {
      name: "First Steps",
      description: "Complete your first quiz",
      icon: "🎯",
      criteria: JSON.stringify({ type: "quiz_count", value: 1 }),
      points: 50,
    },
    {
      name: "Perfect Score",
      description: "Score 100% in any quiz",
      icon: "⭐",
      criteria: JSON.stringify({ type: "perfect_score", value: 100 }),
      points: 100,
    },
    {
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "🔥",
      criteria: JSON.stringify({ type: "streak", value: 7 }),
      points: 150,
    },
    {
      name: "Century Club",
      description: "Answer 100 questions correctly",
      icon: "💯",
      criteria: JSON.stringify({ type: "correct_answers", value: 100 }),
      points: 200,
    },
    {
      name: "Subject Master",
      description: "Complete all modules in a subject",
      icon: "🏆",
      criteria: JSON.stringify({ type: "subject_complete", value: 1 }),
      points: 300,
    },
    {
      name: "Speed Demon",
      description: "Complete a quiz in under 5 minutes with 80%+ score",
      icon: "⚡",
      criteria: JSON.stringify({ type: "speed_accuracy", time: 300, score: 80 }),
      points: 250,
    },
    {
      name: "Olympiad Ready",
      description: "Score 90%+ on 5 hard/olympiad level quizzes",
      icon: "🥇",
      criteria: JSON.stringify({ type: "olympiad_ready", count: 5, score: 90 }),
      points: 500,
    },
  ];

  console.log("🏅 Inserting achievements...");
  for (const achievement of achievementsData) {
    await db.insert(achievements).values(achievement);
  }

  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});

