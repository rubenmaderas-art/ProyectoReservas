const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');
const { validate, loginSchema, selectCentreSchema } = require('../middleware/validationMiddleware');

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.me);
router.post('/select-centre', verifyToken, validate(selectCentreSchema), authController.selectCentre);
router.get('/externo', authController.externalLogin);
router.get('/callback', authController.externalCallback);

module.exports = router;
