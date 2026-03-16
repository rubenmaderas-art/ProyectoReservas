const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function hashStoredPasswords() {
    try {
        const connection = await db.getConnection();
        const [users] = await connection.query('SELECT id, password FROM users');
        
        let updatedCount = 0;
        for (const user of users) {
            if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);
                await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            console.log(`[Startup] ${updatedCount} passwords were automatically hashed for security.`);
        }
        
        connection.release();
    } catch (err) {
        console.error('[Startup Error] Failed to hash passwords:', err.message);
    }
}

module.exports = { hashStoredPasswords };
