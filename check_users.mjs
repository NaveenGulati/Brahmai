import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_Ki2cfdr3ETSY@ep-super-hall-a1obz0xf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

try {
  console.log('Checking for parent and teacher accounts...\n');
  
  const parents = await sql`SELECT id, username, name, email, role FROM users WHERE role = 'parent'`;
  console.log('Parents:', parents);
  
  const teachers = await sql`SELECT id, username, name, email, role FROM users WHERE role = 'teacher'`;
  console.log('\nTeachers:', teachers);
  
  await sql.end();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
