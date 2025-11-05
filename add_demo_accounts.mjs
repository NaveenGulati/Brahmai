import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const sql = postgres('postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function addDemoAccounts() {
  try {
    console.log('Adding demo accounts...\n');
    
    // Hash passwords
    const naveenHash = await bcrypt.hash('naveen', 10);
    const demoHash = await bcrypt.hash('demo123', 10);
    
    // Update Naveen's account with username and password
    console.log('1. Updating Naveen\'s account...');
    await sql`
      UPDATE users 
      SET username = 'naveen', "passwordHash" = ${naveenHash}
      WHERE email = 'contact.naveengulati@gmail.com' AND role = 'parent'
    `;
    console.log('   ✅ Naveen\'s account updated (username: naveen, password: naveen)');
    
    // Update Demo Parent account with username and password
    console.log('\n2. Updating Demo Parent account...');
    await sql`
      UPDATE users 
      SET username = 'demo_parent', "passwordHash" = ${demoHash}
      WHERE email = 'parent@demo.com' AND role = 'parent'
    `;
    console.log('   ✅ Demo Parent updated (username: demo_parent, password: demo123)');
    
    // Create demo teacher account
    console.log('\n3. Creating Demo Teacher account...');
    const existingTeacher = await sql`
      SELECT id FROM users WHERE username = 'demo_teacher'
    `;
    
    if (existingTeacher.length === 0) {
      await sql`
        INSERT INTO users (name, username, email, "passwordHash", role)
        VALUES ('Demo Teacher', 'demo_teacher', 'teacher@demo.com', ${demoHash}, 'teacher')
      `;
      console.log('   ✅ Demo Teacher created (username: demo_teacher, password: demo123)');
    } else {
      console.log('   ⚠️  Demo Teacher already exists');
    }
    
    // Verify all accounts
    console.log('\n📋 All accounts with local login:');
    const allUsers = await sql`
      SELECT id, username, name, email, role 
      FROM users 
      WHERE username IS NOT NULL
      ORDER BY role, id
    `;
    console.table(allUsers);
    
    await sql.end();
    console.log('\n✅ All done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addDemoAccounts();
