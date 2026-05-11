const mysql = require('mysql2');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const TZ = process.env.DB_TIMEZONE || '+02:00';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    timezone: TZ,
});

// SET time_zone en cada conexión nueva para que MySQL convierta los campos
// TIMESTAMP (guardados en UTC) a la zona horaria local antes de devolverlos.
pool.on('connection', (connection) => {
    connection.query(`SET time_zone = '${TZ}'`);
});

module.exports = pool.promise();
