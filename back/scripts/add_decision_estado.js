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
    const [rows] = await db.query("SHOW COLUMNS FROM validations LIKE 'decision_estado'");
    if (rows.length === 0) {
      await db.query("ALTER TABLE validations ADD COLUMN decision_estado VARCHAR(20) NULL DEFAULT NULL");
      console.log('Column decision_estado added to validations table');
    } else {
      console.log('Column decision_estado already exists');
    }
  } catch (e) {
    console.error('Error adding column:', e.message);
  } finally {
    await db.end();
  }
}

run();
