const db = require('../config/db');

async function run() {
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
    process.exit(0);
  }
}

run();
