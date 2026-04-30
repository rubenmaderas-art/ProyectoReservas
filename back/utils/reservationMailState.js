const db = require('../config/db');

const MAIL_STATE_COLUMNS = [
  {
    name: 'finalization_mail_sent_at',
    definition: 'DATETIME NULL DEFAULT NULL',
  },
  {
    name: 'delivery_reminder_sent_at',
    definition: 'DATETIME NULL DEFAULT NULL',
  },
];

const normalizeColumnName = (value) => String(value ?? '').trim();

const ensureReservationMailStateColumns = async () => {
  const connection = await db.getConnection();

  try {
    const columnNames = MAIL_STATE_COLUMNS.map((column) => column.name);
    const placeholders = columnNames.map(() => '?').join(',');

    const [rows] = await connection.query(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'reservations'
          AND COLUMN_NAME IN (${placeholders})
      `,
      columnNames
    );

    const existingColumns = new Set(Array.isArray(rows) ? rows.map((row) => row.COLUMN_NAME) : []);

    for (const column of MAIL_STATE_COLUMNS) {
      if (existingColumns.has(column.name)) {
        continue;
      }

      // Los nombres de columna son constantes y controlados en código.
      await connection.query(
        `ALTER TABLE reservations ADD COLUMN ${column.name} ${column.definition}`
      );
    }
  } finally {
    connection.release();
  }
};

const markReservationMailSent = async (reservationId, columnName) => {
  const normalizedColumnName = normalizeColumnName(columnName);
  const allowedColumns = new Set(MAIL_STATE_COLUMNS.map((column) => column.name));

  if (!reservationId || !allowedColumns.has(normalizedColumnName)) {
    return false;
  }

  await db.query(
    `UPDATE reservations SET ${normalizedColumnName} = NOW() WHERE id = ?`,
    [reservationId]
  );

  return true;
};

module.exports = {
  ensureReservationMailStateColumns,
  markReservationMailSent,
};
