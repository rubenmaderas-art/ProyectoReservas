const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { helmetMiddleware, apiLimiter } = require('./middleware/securityMiddleware');

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const createApp = () => {
  const app = express();

  app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));

  app.use((req, _res, next) => {
    if (
      req.method === 'PUT' &&
      req.path.includes('/reservations/') &&
      (req.headers['content-type'] || '').includes('application/json')
    ) {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        try {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          req._body = true;
        } catch (_error) {
          req.body = {};
        }
        next();
      });
      return;
    }

    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(helmetMiddleware);
  app.use('/api/', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  return app;
};

module.exports = { createApp };
