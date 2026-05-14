const db = require('../config/db');

async function ensureDocumentsKmAtUploadRules() {
  const connection = await db.getConnection();

  try {
    const [columnRows] = await connection.query(
      `
        SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'documents'
          AND COLUMN_NAME = 'km_at_upload'
        LIMIT 1
      `
    );

    if (columnRows[0]?.IS_NULLABLE === 'NO') {
      await connection.query('ALTER TABLE documents MODIFY km_at_upload INT NULL');
    }

    await connection.query(
      "UPDATE documents SET km_at_upload = NULL WHERE type != 'parte-taller' AND km_at_upload IS NOT NULL"
    );

    await connection.query('DROP TRIGGER IF EXISTS trg_documents_km_at_upload_bi');
    await connection.query('DROP TRIGGER IF EXISTS trg_documents_km_at_upload_bu');

    await connection.query(`
      CREATE TRIGGER trg_documents_km_at_upload_bi
      BEFORE INSERT ON documents
      FOR EACH ROW
      BEGIN
        IF NEW.type <> 'parte-taller' THEN
          SET NEW.km_at_upload = NULL;
        END IF;
      END
    `);

    await connection.query(`
      CREATE TRIGGER trg_documents_km_at_upload_bu
      BEFORE UPDATE ON documents
      FOR EACH ROW
      BEGIN
        IF NEW.type <> 'parte-taller' THEN
          SET NEW.km_at_upload = NULL;
        END IF;
      END
    `);
  } finally {
    connection.release();
  }
}

module.exports = { ensureDocumentsKmAtUploadRules };
