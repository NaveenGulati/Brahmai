import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { users, childProfiles } from '../drizzle/schema';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Authenticate a child user with username and password
 */
export async function authenticateChild(username: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const user = result[0];

  // Check if user is a child
  if (user.role !== 'child') {
    return null;
  }

  // Verify password
  if (!user.passwordHash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

/**
 * Create a child user with username and password
 */
export async function createChildWithPassword(
  parentId: number,
  name: string,
  username: string,
  password: string,
  email?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Check if username already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Username already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user in users table
  const userResult = await db.insert(users).values({
    name,
    username,
    passwordHash,
    email: email || null,
    role: 'child',
    isActive: true,
  });

  const userId = Number(userResult[0].insertId);

  // Create child profile
  await db.insert(childProfiles).values({
    userId,
    parentId,
    currentGrade: 7,
    board: 'ICSE',
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  return userId;
}


/**
 * Reset a child's password (parent only)
 */
export async function resetChildPassword(
  childId: number,
  parentId: number,
  newPassword: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Verify the child belongs to this parent by checking childProfiles
  const childProfileResult = await db
    .select()
    .from(childProfiles)
    .where(eq(childProfiles.userId, childId))
    .limit(1);

  if (childProfileResult.length === 0) {
    throw new Error('Child profile not found');
  }

  const childProfile = childProfileResult[0];

  if (childProfile.parentId !== parentId) {
    throw new Error('Unauthorized: This child does not belong to you');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, childId));

  return { success: true };
}

