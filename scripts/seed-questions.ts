import { drizzle } from "drizzle-orm/mysql2";
import { questions } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seedQuestions() {
  console.log("🌱 Seeding sample questions...");

  // Sample questions for Module 1: Integers (assuming moduleId = 1)
  const integersQuestions = [
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "What is the value of (-15) + 8?",
      options: JSON.stringify(["-23", "-7", "7", "23"]),
      correctAnswer: "-7",
      explanation: "When adding a positive number to a negative number, subtract the smaller absolute value from the larger and keep the sign of the number with larger absolute value. |-15| > |8|, so 15 - 8 = 7, and the answer is -7.",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 45,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "What is (-6) × (-4)?",
      options: JSON.stringify(["-24", "-10", "10", "24"]),
      correctAnswer: "24",
      explanation: "When multiplying two negative numbers, the result is positive. (-6) × (-4) = 24",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 45,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "true_false" as const,
      questionText: "The product of two negative integers is always negative.",
      options: null,
      correctAnswer: "False",
      explanation: "The product of two negative integers is always POSITIVE. For example: (-2) × (-3) = 6",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 30,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "fill_blank" as const,
      questionText: "(-48) ÷ 6 = ?",
      options: null,
      correctAnswer: "-8",
      explanation: "When dividing a negative number by a positive number, the result is negative. 48 ÷ 6 = 8, so (-48) ÷ 6 = -8",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "What is the value of: (-5) + (-3) - (-8)?",
      options: JSON.stringify(["-16", "-6", "0", "10"]),
      correctAnswer: "0",
      explanation: "Step by step: (-5) + (-3) = -8, then -8 - (-8) = -8 + 8 = 0. Remember: subtracting a negative is the same as adding a positive.",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "If a = -3 and b = 5, what is the value of a² - 2ab + b²?",
      options: JSON.stringify(["4", "16", "64", "100"]),
      correctAnswer: "64",
      explanation: "This is the expansion of (a - b)². First method: a² = 9, 2ab = 2(-3)(5) = -30, b² = 25. So 9 - (-30) + 25 = 9 + 30 + 25 = 64. Second method: (a - b)² = (-3 - 5)² = (-8)² = 64",
      difficulty: "hard" as const,
      points: 20,
      timeLimit: 90,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "The temperature at 6 AM was -5°C. It increased by 3°C every hour until noon. What was the temperature at noon?",
      options: JSON.stringify(["-2°C", "8°C", "13°C", "18°C"]),
      correctAnswer: "13°C",
      explanation: "From 6 AM to noon is 6 hours. Temperature increase = 3°C × 6 = 18°C. Final temperature = -5°C + 18°C = 13°C",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 75,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 1,
      questionType: "mcq" as const,
      questionText: "Which of the following is the largest? (-1)⁵⁰, (-1)⁵¹, 0, 1",
      options: JSON.stringify(["(-1)⁵⁰", "(-1)⁵¹", "0", "All are equal"]),
      correctAnswer: "(-1)⁵⁰",
      explanation: "(-1)⁵⁰ = 1 (even power makes it positive), (-1)⁵¹ = -1 (odd power keeps it negative). So the order is: (-1)⁵⁰ = 1 > 0 > (-1)⁵¹ = -1",
      difficulty: "olympiad" as const,
      points: 25,
      timeLimit: 90,
      createdBy: 1,
      isActive: true,
    },
  ];

  // Sample questions for Module 2: Fractions and Decimals (assuming moduleId = 2)
  const fractionsQuestions = [
    {
      moduleId: 2,
      questionType: "mcq" as const,
      questionText: "What is 3/4 + 1/2?",
      options: JSON.stringify(["4/6", "5/4", "1 1/4", "1 1/2"]),
      correctAnswer: "1 1/4",
      explanation: "First find common denominator: 3/4 + 2/4 = 5/4 = 1 1/4",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 2,
      questionType: "mcq" as const,
      questionText: "Convert 0.625 to a fraction in simplest form.",
      options: JSON.stringify(["5/8", "625/100", "25/40", "125/200"]),
      correctAnswer: "5/8",
      explanation: "0.625 = 625/1000. Divide both by 125: 625÷125 = 5, 1000÷125 = 8. So 0.625 = 5/8",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 75,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 2,
      questionType: "true_false" as const,
      questionText: "0.75 is greater than 3/5",
      options: null,
      correctAnswer: "True",
      explanation: "0.75 = 3/4 = 15/20, and 3/5 = 12/20. Since 15/20 > 12/20, the statement is true.",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 45,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 2,
      questionType: "fill_blank" as const,
      questionText: "What is 2.5 × 0.4?",
      options: null,
      correctAnswer: "1",
      explanation: "2.5 × 0.4 = 25/10 × 4/10 = 100/100 = 1. Or simply: 2.5 × 0.4 = 1.0 = 1",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 2,
      questionType: "mcq" as const,
      questionText: "A recipe needs 2 3/4 cups of flour. If you want to make half the recipe, how much flour do you need?",
      options: JSON.stringify(["1 1/8 cups", "1 3/8 cups", "1 1/2 cups", "1 5/8 cups"]),
      correctAnswer: "1 3/8 cups",
      explanation: "2 3/4 = 11/4. Half of 11/4 = 11/8 = 1 3/8 cups",
      difficulty: "hard" as const,
      points: 20,
      timeLimit: 90,
      createdBy: 1,
      isActive: true,
    },
  ];

  // Sample questions for Module 3: Algebra - Simple Equations (assuming moduleId = 3)
  const algebraQuestions = [
    {
      moduleId: 3,
      questionType: "mcq" as const,
      questionText: "Solve for x: x + 7 = 15",
      options: JSON.stringify(["6", "8", "22", "105"]),
      correctAnswer: "8",
      explanation: "Subtract 7 from both sides: x = 15 - 7 = 8",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 45,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 3,
      questionType: "fill_blank" as const,
      questionText: "Solve for x: 3x = 24",
      options: null,
      correctAnswer: "8",
      explanation: "Divide both sides by 3: x = 24 ÷ 3 = 8",
      difficulty: "easy" as const,
      points: 10,
      timeLimit: 45,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 3,
      questionType: "mcq" as const,
      questionText: "Solve for x: 2x - 5 = 11",
      options: JSON.stringify(["3", "6", "8", "16"]),
      correctAnswer: "8",
      explanation: "Add 5 to both sides: 2x = 16. Divide by 2: x = 8",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 3,
      questionType: "mcq" as const,
      questionText: "Solve for x: (x/4) + 3 = 7",
      options: JSON.stringify(["1", "4", "10", "16"]),
      correctAnswer: "16",
      explanation: "Subtract 3 from both sides: x/4 = 4. Multiply by 4: x = 16",
      difficulty: "medium" as const,
      points: 15,
      timeLimit: 60,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 3,
      questionType: "mcq" as const,
      questionText: "The sum of three consecutive integers is 72. What is the smallest integer?",
      options: JSON.stringify(["22", "23", "24", "25"]),
      correctAnswer: "23",
      explanation: "Let the three consecutive integers be x, x+1, x+2. Then x + (x+1) + (x+2) = 72. This gives 3x + 3 = 72, so 3x = 69, x = 23",
      difficulty: "hard" as const,
      points: 20,
      timeLimit: 90,
      createdBy: 1,
      isActive: true,
    },
    {
      moduleId: 3,
      questionType: "mcq" as const,
      questionText: "If 5(2x - 3) = 3(x + 4), what is the value of x?",
      options: JSON.stringify(["3", "27/7", "4", "5"]),
      correctAnswer: "27/7",
      explanation: "Expand: 10x - 15 = 3x + 12. Collect like terms: 7x = 27. Therefore x = 27/7",
      difficulty: "olympiad" as const,
      points: 25,
      timeLimit: 120,
      createdBy: 1,
      isActive: true,
    },
  ];

  console.log("📝 Inserting Integers questions...");
  for (const q of integersQuestions) {
    await db.insert(questions).values(q);
  }

  console.log("📝 Inserting Fractions questions...");
  for (const q of fractionsQuestions) {
    await db.insert(questions).values(q);
  }

  console.log("📝 Inserting Algebra questions...");
  for (const q of algebraQuestions) {
    await db.insert(questions).values(q);
  }

  console.log("✅ Sample questions seeded successfully!");
  process.exit(0);
}

seedQuestions().catch((error) => {
  console.error("❌ Seeding questions failed:", error);
  process.exit(1);
});

