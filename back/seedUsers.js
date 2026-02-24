const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
  const users = [
    { username: 'admin',       password: 'admin123',      role: 'admin' },
    { username: 'empleado1',   password: 'empleado123',   role: 'empleado' },
    { username: 'supervisor1', password: 'supervisor123', role: 'supervisor' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [hash, u.username]
    );
    console.log(`${u.username} actualizado`);
  }

  process.exit(0);
}

seed();