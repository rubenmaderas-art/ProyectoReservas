const db = require('../config/db');

async function check() {
  try {
    const [vehicles] = await db.execute('SELECT id, license_plate, kilometers FROM vehicles LIMIT 5');
    console.log('--- Ultimos Vehiculos ---');
    console.table(vehicles);

    const [validations] = await db.execute(`
      SELECT 
        v.id, 
        v.km_entrega, 
        ve.kilometers AS km_inicial_actual
      FROM validations v
      INNER JOIN reservations r ON v.reservation_id = r.id
      INNER JOIN vehicles ve ON r.vehicle_id = ve.id
      LIMIT 5
    `);
    console.log('--- Ultimas Validaciones ---');
    console.table(validations);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

check();
