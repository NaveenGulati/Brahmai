const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'test123';
  const hash = await bcrypt.hash(password, 10);
  console.log('New password hash for "test123":', hash);
}

hashPassword();
