import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function resetQBAdminPassword() {
  try {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);
    
    // Hash the new password
    const newPassword = 'password';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('Updating QB Admin password...');
    
    // Update QB Admin password
    const result = await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.username, 'qbadmin'))
      .returning();
    
    if (result.length === 0) {
      console.error('❌ QB Admin user not found!');
      await client.end();
      process.exit(1);
    }
    
    console.log('✅ Password reset successfully!');
    console.log('Username:', result[0].username);
    console.log('User ID:', result[0].id);
    console.log('Role:', result[0].role);
    console.log('\nNew credentials:');
    console.log('  Username: qbadmin');
    console.log('  Password: password');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

resetQBAdminPassword();
