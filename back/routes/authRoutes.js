const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);

// Ruta para iniciar el proceso de autenticación con proveedor externo.
router.get('/externo', authController.externalLogin);

// La ruta para el callback
router.get('/callback', authController.externalCallback);

module.exports = router;