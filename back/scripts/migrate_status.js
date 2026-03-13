const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await db.query("SHOW COLUMNS FROM validations LIKE 'status'");
    if (rows.length === 0) {
      await db.query("ALTER TABLE validations ADD COLUMN status VARCHAR(20) DEFAULT 'pendiente'");
      console.log('Column status added to validations table');
    } else {
      console.log('Column status already exists');
    }
  } catch (e) {
    console.error('Error adding column:', e.message);
  } finally {
    await db.end();
  }
}

run();
