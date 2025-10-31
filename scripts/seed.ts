/**
 * Seed script for multi-tenant EdTech platform
 * Run with: tsx scripts/seed.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import * as bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // 1. Create Boards
    console.log("📚 Creating boards...");
    const boardsData = [
      { code: "CBSE", name: "Central Board of Secondary Education", country: "India", displayOrder: 1 },
      { code: "ICSE", name: "Indian Certificate of Secondary Education", country: "India", displayOrder: 2 },
      { code: "IB", name: "International Baccalaureate", country: "International", displayOrder: 3 },
      { code: "STATE_UP", name: "Uttar Pradesh State Board", country: "India", displayOrder: 4 },
      { code: "STATE_MH", name: "Maharashtra State Board", country: "India", displayOrder: 5 },
    ];
    await db.insert(schema.boards).values(boardsData);
    console.log(`✅ Created ${boardsData.length} boards\n`);

    // 2. Create Grades
    console.log("🎓 Creating grades...");
    const gradesData = Array.from({ length: 12 }, (_, i) => ({
      level: i + 1,
      name: `Grade ${i + 1}`,
      displayOrder: i + 1,
    }));
    await db.insert(schema.grades).values(gradesData);
    console.log(`✅ Created ${gradesData.length} grades\n`);

    // 3. Create Subjects
    console.log("📖 Creating subjects...");
    const subjectsData = [
      { name: "Mathematics", code: "MATH", category: "core" as const, icon: "🔢", color: "#3B82F6", displayOrder: 1 },
      { name: "Physics", code: "PHY", category: "core" as const, icon: "⚛️", color: "#8B5CF6", displayOrder: 2 },
      { name: "Chemistry", code: "CHEM", category: "core" as const, icon: "🧪", color: "#10B981", displayOrder: 3 },
      { name: "Biology", code: "BIO", category: "core" as const, icon: "🧬", color: "#F59E0B", displayOrder: 4 },
      { name: "English", code: "ENG", category: "language" as const, icon: "📚", color: "#EF4444", displayOrder: 5 },
      { name: "Hindi", code: "HIN", category: "language" as const, icon: "🇮🇳", color: "#F97316", displayOrder: 6 },
      { name: "History", code: "HIST", category: "core" as const, icon: "📜", color: "#6366F1", displayOrder: 7 },
      { name: "Geography", code: "GEO", category: "core" as const, icon: "🌍", color: "#14B8A6", displayOrder: 8 },
      { name: "Computer Science", code: "CS", category: "elective" as const, icon: "💻", color: "#06B6D4", displayOrder: 9 },
    ];
    await db.insert(schema.subjects).values(subjectsData);
    console.log(`✅ Created ${subjectsData.length} subjects\n`);

    // Get IDs for relationships
    const boards = await db.select().from(schema.boards);
    const grades = await db.select().from(schema.grades);
    const subjects = await db.select().from(schema.subjects);

    const icseBoard = boards.find(b => b.code === "ICSE")!;
    const grade7 = grades.find(g => g.level === 7)!;

    // 4. Create Board-Grade-Subject mappings (ICSE Grade 7)
    console.log("🔗 Creating board-grade-subject mappings...");
    const mappings = subjects.map((subject, index) => ({
      boardId: icseBoard.id,
      gradeId: grade7.id,
      subjectId: subject.id,
      isCompulsory: subject.category !== "elective",
      displayOrder: index + 1,
    }));
    await db.insert(schema.boardGradeSubjects).values(mappings);
    console.log(`✅ Created ${mappings.length} mappings\n`);

    // 5. Create Users
    console.log("👥 Creating users...");
    
    // SuperAdmin
    const [superAdmin] = await db.insert(schema.users).values({
      email: "admin@brahmai.ai",
      name: "Platform Administrator",
      role: "superadmin",
      loginMethod: "local",
      isActive: true,
      isEmailVerified: true,
    }).$returningId();
    console.log("✅ Created SuperAdmin");

    // QB Admin
    const [qbAdmin] = await db.insert(schema.users).values({
      email: "qbadmin@brahmai.ai",
      name: "Question Bank Admin",
      role: "qb_admin",
      loginMethod: "local",
      isActive: true,
      isEmailVerified: true,
    }).$returningId();
    console.log("✅ Created QB Admin");

    // Assign QB Admin to ICSE Grade 7
    await db.insert(schema.qbAdminAssignments).values({
      userId: qbAdmin.id,
      boardId: icseBoard.id,
      gradeId: grade7.id,
      subjectId: null, // All subjects
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canApprove: false,
      assignedBy: superAdmin.id,
    });

    // Parent (Naveen)
    const [parent] = await db.insert(schema.users).values({
      openId: "parent_naveen_123",
      email: "naveen@example.com",
      name: "Naveen Gulati",
      role: "parent",
      loginMethod: "oauth",
      isActive: true,
      isEmailVerified: true,
    }).$returningId();
    
    await db.insert(schema.parentProfiles).values({
      userId: parent.id,
      phone: "+91-9876543210",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
    });
    console.log("✅ Created Parent (Naveen)");

    // Child (Riddhansh)
    const passwordHash = await bcrypt.hash("riddhu123", 10);
    const [child] = await db.insert(schema.users).values({
      username: "riddhu",
      passwordHash,
      name: "Riddhansh",
      role: "child",
      loginMethod: "local",
      isActive: true,
    }).$returningId();
    
    await db.insert(schema.childProfiles).values({
      userId: child.id,
      parentId: parent.id,
      currentGrade: 7,
      board: "ICSE",
      schoolName: "Delhi Public School",
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
    });

    await db.insert(schema.gradeHistory).values({
      childId: child.id,
      grade: 7,
      board: "ICSE",
      startDate: new Date("2024-04-01"),
      endDate: null,
      academicYear: "2024-25",
    });
    console.log("✅ Created Child (Riddhansh)");

    // Teacher (Priya Sharma)
    const [teacher] = await db.insert(schema.users).values({
      email: "priya.sharma@example.com",
      name: "Priya Sharma",
      role: "teacher",
      loginMethod: "oauth",
      isActive: true,
      isEmailVerified: true,
    }).$returningId();
    
    await db.insert(schema.teacherProfiles).values({
      userId: teacher.id,
      bio: "Experienced Physics and Chemistry teacher with 10+ years of teaching ICSE curriculum.",
      qualifications: "M.Sc. Physics, B.Ed.",
      experience: 10,
      specializations: JSON.stringify(["ICSE Physics", "ICSE Chemistry", "Grade 7-10"]),
      phone: "+91-9876543211",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: superAdmin.id,
    });
    console.log("✅ Created Teacher (Priya Sharma)\n");

    // 6. Create Modules
    console.log("📝 Creating modules...");
    const physicsSubject = subjects.find(s => s.code === "PHY")!;
    
    const modulesData = [
      {
        subjectId: physicsSubject.id,
        boardId: icseBoard.id,
        gradeId: grade7.id,
        name: "Heat and Temperature",
        description: "Understanding the concepts of heat, temperature, and thermal energy",
        orderIndex: 1,
        difficulty: "intermediate" as const,
      },
      {
        subjectId: physicsSubject.id,
        boardId: icseBoard.id,
        gradeId: grade7.id,
        name: "Light and Reflection",
        description: "Properties of light, reflection, and mirrors",
        orderIndex: 2,
        difficulty: "intermediate" as const,
      },
      {
        subjectId: physicsSubject.id,
        boardId: icseBoard.id,
        gradeId: grade7.id,
        name: "Motion and Force",
        description: "Laws of motion, force, and their applications",
        orderIndex: 3,
        difficulty: "intermediate" as const,
      },
    ];
    
    await db.insert(schema.modules).values(modulesData);
    const modules = await db.select().from(schema.modules);
    console.log(`✅ Created ${modules.length} modules\n`);

    // 7. Create Sample Questions
    console.log("❓ Creating sample questions...");
    const heatModule = modules.find(m => m.name === "Heat and Temperature")!;
    
    const questionsData = [
      {
        boardId: icseBoard.id,
        gradeId: grade7.id,
        subjectId: physicsSubject.id,
        moduleId: heatModule.id,
        topic: "Heat Transfer",
        subTopic: "Conduction",
        scope: "School" as const,
        questionType: "mcq" as const,
        questionText: "Which of the following is the best conductor of heat?",
        options: JSON.stringify(["Wood", "Plastic", "Copper", "Glass"]),
        correctAnswer: "Copper",
        explanation: "Copper is a metal and metals are excellent conductors of heat due to free electrons.",
        difficulty: "easy" as const,
        points: 10,
        timeLimit: 60,
        status: "approved" as const,
        submittedBy: qbAdmin.id,
        reviewedBy: superAdmin.id,
        reviewedAt: new Date(),
      },
      {
        boardId: icseBoard.id,
        gradeId: grade7.id,
        subjectId: physicsSubject.id,
        moduleId: heatModule.id,
        topic: "Temperature",
        subTopic: "Thermometer",
        scope: "School" as const,
        questionType: "mcq" as const,
        questionText: "What is the normal human body temperature in Celsius?",
        options: JSON.stringify(["35°C", "37°C", "39°C", "40°C"]),
        correctAnswer: "37°C",
        explanation: "The normal human body temperature is approximately 37°C or 98.6°F.",
        difficulty: "easy" as const,
        points: 10,
        timeLimit: 60,
        status: "approved" as const,
        submittedBy: qbAdmin.id,
        reviewedBy: superAdmin.id,
        reviewedAt: new Date(),
      },
      {
        boardId: icseBoard.id,
        gradeId: grade7.id,
        subjectId: physicsSubject.id,
        moduleId: heatModule.id,
        topic: "Heat Transfer",
        subTopic: "Convection",
        scope: "School" as const,
        questionType: "mcq" as const,
        questionText: "Heat transfer in liquids primarily occurs through:",
        options: JSON.stringify(["Conduction", "Convection", "Radiation", "Absorption"]),
        correctAnswer: "Convection",
        explanation: "In liquids and gases, heat transfer occurs mainly through convection, where heated particles move and carry energy.",
        difficulty: "medium" as const,
        points: 15,
        timeLimit: 90,
        status: "approved" as const,
        submittedBy: qbAdmin.id,
        reviewedBy: superAdmin.id,
        reviewedAt: new Date(),
      },
    ];
    
    await db.insert(schema.questions).values(questionsData);
    console.log(`✅ Created ${questionsData.length} sample questions\n`);

    // 8. Create Achievements
    console.log("🏅 Creating achievements...");
    const achievementsData = [
      {
        name: "First Steps",
        description: "Complete your first quiz",
        icon: "🎯",
        category: "completion" as const,
        criteria: JSON.stringify({ type: "quiz_count", value: 1 }),
        points: 50,
        rarity: "common" as const,
      },
      {
        name: "Perfect Score",
        description: "Score 100% in any quiz",
        icon: "⭐",
        category: "score" as const,
        criteria: JSON.stringify({ type: "perfect_score", value: 100 }),
        points: 100,
        rarity: "rare" as const,
      },
      {
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "🔥",
        category: "streak" as const,
        criteria: JSON.stringify({ type: "streak", value: 7 }),
        points: 150,
        rarity: "rare" as const,
      },
      {
        name: "Century Club",
        description: "Answer 100 questions correctly",
        icon: "💯",
        category: "completion" as const,
        criteria: JSON.stringify({ type: "correct_answers", value: 100 }),
        points: 200,
        rarity: "epic" as const,
      },
      {
        name: "Subject Master",
        description: "Complete all modules in a subject",
        icon: "🏆",
        category: "completion" as const,
        criteria: JSON.stringify({ type: "subject_complete", value: 1 }),
        points: 300,
        rarity: "epic" as const,
      },
      {
        name: "Speed Demon",
        description: "Complete a quiz in under 5 minutes with 80%+ score",
        icon: "⚡",
        category: "speed" as const,
        criteria: JSON.stringify({ type: "speed_accuracy", time: 300, score: 80 }),
        points: 250,
        rarity: "rare" as const,
      },
      {
        name: "Olympiad Ready",
        description: "Score 90%+ on 5 hard/olympiad level quizzes",
        icon: "🥇",
        category: "special" as const,
        criteria: JSON.stringify({ type: "olympiad_ready", count: 5, score: 90 }),
        points: 500,
        rarity: "legendary" as const,
      },
    ];
    
    await db.insert(schema.achievements).values(achievementsData);
    console.log(`✅ Created ${achievementsData.length} achievements\n`);

    console.log("🎉 Database seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Boards: ${boards.length}`);
    console.log(`   - Grades: ${grades.length}`);
    console.log(`   - Subjects: ${subjects.length}`);
    console.log(`   - Modules: ${modules.length}`);
    console.log(`   - Questions: ${questionsData.length}`);
    console.log(`   - Achievements: ${achievementsData.length}`);
    console.log(`   - Users: 5 (1 SuperAdmin, 1 QB Admin, 1 Parent, 1 Child, 1 Teacher)`);
    console.log("\n✅ Login Credentials:");
    console.log("   Parent: OAuth (naveen@example.com)");
    console.log("   Child: username='riddhu', password='riddhu123'");
    console.log("   Teacher: OAuth (priya.sharma@example.com)");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("\n✅ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });

