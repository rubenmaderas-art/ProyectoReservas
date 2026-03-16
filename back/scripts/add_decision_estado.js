const db = require('../config/db');

async function run() {
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
    process.exit(0);
  }
}

run();
