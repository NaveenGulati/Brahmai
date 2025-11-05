import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, { 
  prepare: false,
  onnotice: () => {},
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...\n');
    
    // Check tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('📊 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');
    
    // Check users
    const users = await sql`SELECT id, username, email, name, role FROM users LIMIT 10;`;
    console.log('👥 Users in database:');
    console.table(users);
    
    // Check for demo_student specifically
    const demoStudent = await sql`SELECT * FROM users WHERE username = 'demo_student';`;
    console.log('\n🎓 Demo Student Account:');
    console.log(demoStudent);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkDatabase();
