import postgres from 'postgres';

const connectionString = "postgresql://postgres:P%40ssw0rd%239913%2399@db.jolxmhmjpwyxnevaaipy.supabase.co:5432/postgres?sslmode=require";

const sql = postgres(connectionString);

// Test 1: Check current search_path
console.log("Test 1: Checking current search_path...");
const searchPath = await sql`SHOW search_path`;
console.log("Current search_path:", searchPath);

// Test 2: Set search_path to public
console.log("\nTest 2: Setting search_path to public...");
await sql`SET search_path TO public`;
const newSearchPath = await sql`SHOW search_path`;
console.log("New search_path:", newSearchPath);

// Test 3: Query users without schema prefix
console.log("\nTest 3: Querying users table (without schema prefix)...");
try {
  const users = await sql`SELECT id, username, email, role FROM users LIMIT 3`;
  console.log("Found users:", users);
} catch (error) {
  console.error("Error querying users:", error.message);
}

// Test 4: Query users WITH schema prefix
console.log("\nTest 4: Querying public.users (with schema prefix)...");
try {
  const users = await sql`SELECT id, username, email, role FROM public.users LIMIT 3`;
  console.log("Found users:", users);
} catch (error) {
  console.error("Error querying public.users:", error.message);
}

await sql.end();

