import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/mysql2';
import { users, childProfiles } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

async function createDemoAccount() {
  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('demo123', salt);
    
    // Create demo student user
    const result = await db.insert(users).values({
      name: 'Demo Student',
      username: 'demo_student',
      passwordHash: passwordHash,
      email: 'demo@student.com',
      role: 'child',
      isActive: true,
      openId: 'local_demo_student',
    });
    
    const userId = Number(result[0].insertId);
    console.log('Created demo student user with ID:', userId);
    
    // Create child profile (with parentId = 1, assuming parent exists)
    await db.insert(childProfiles).values({
      userId: userId,
      parentId: 1, // Assuming first parent exists
      currentGrade: 7,
      board: 'ICSE',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    
    console.log('✅ Demo account created successfully!');
    console.log('Username: demo_student');
    console.log('Password: demo123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo account:', error);
    process.exit(1);
  }
}

createDemoAccount();
