const path = require('path');
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

  app.use(
    helmet({
      contentSecurityPolicy: {
        // Helmet's defaults plus what the built frontend (served below in production) needs:
        // 3D model textures decode from blob: URLs, the hospital map loads OpenStreetMap tiles,
        // and the Urology page embeds a Sketchfab model.
        directives: {
          'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org'],
          'connect-src': ["'self'", 'blob:', 'data:'],
          'frame-src': ['https://sketchfab.com'],
        },
      },
    }),
  );
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

  // In production this one server also serves the built frontend (digital-twin/dist), so the
  // whole site is a single origin — as the Vite proxy makes it in dev. Unknown non-API paths get
  // index.html so client-side routes like /dashboard survive a reload.
  if (config.isProd) {
    const dist = path.join(__dirname, 'digital-twin', 'dist');
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, filePath) {
          // Vite content-hashes everything under /assets, so those never go stale.
          if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.get(/^\/(?!api(\/|$)).*/, (req, res, next) => {
      // A missing file (e.g. a stale chunk after a redeploy) is a 404, not the app shell.
      if (path.extname(req.path)) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
