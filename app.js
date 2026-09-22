const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errors');

// Any $-operator in a value taken from a request is treated as a literal
// instead of a query operator — a backstop against NoSQL injection on top of
// the explicit type checks in each route.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and non-browser requests send no Origin header.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiLimiter);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/pain', require('./routes/pain'));
  app.use('/api/vitals', require('./routes/vitals'));
  app.use('/api/insights', require('./routes/insights'));
  app.use('/api/places', require('./routes/places'));
  app.use('/api/community', require('./routes/community'));
  app.use('/api/groups', require('./routes/groups'));
  app.use('/api/friends', require('./routes/friends'));
  app.use('/api/research', require('./routes/research'));
  app.use('/api/mod', require('./routes/moderation'));
  app.use('/api/account', require('./routes/account'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
