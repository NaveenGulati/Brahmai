const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'riddhu123';
  const hash = '$2b$10$4ITxUJW0vkPcc3aEnMoeUeIx7aFxCcXCyUxThNtNy1sPR6uWxUPc.';
  
  const match = await bcrypt.compare(password, hash);
  console.log('Password "riddhu123" matches hash:', match);
  
  // Try other common passwords
  const passwords = ['riddhu1', 'Riddhu123', 'password123', '123456', 'test123'];
  for (const pwd of passwords) {
    const m = await bcrypt.compare(pwd, hash);
    if (m) console.log(`Password "${pwd}" matches!`);
  }
}

testPassword();
