const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'proyecto_reservas'
  });

  try {
    const [vehicles] = await connection.execute('SELECT id, license_plate, kilometers FROM vehicles LIMIT 5');
    console.table(vehicles);

    const [validations] = await connection.execute(`
      SELECT 
        v.id, 
        v.km_entrega, 
        ve.kilometers AS km_inicial_actual
      FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      INNER JOIN vehicles ve ON r.vehicle_id = ve.id
      LIMIT 5
    `);
    console.table(validations);
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

check();
