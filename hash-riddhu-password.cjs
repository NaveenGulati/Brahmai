const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'riddhu';
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
}

hashPassword();
