const mongoose = require('mongoose');
const config = require('./config');
const { createApp } = require('./app');
const { startResearchRefresher } = require('./lib/researchJob');

async function start() {
  // The community stores real members' data, so there is no fallback mode:
  // if the database is unreachable, refuse to start rather than run without it.
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
  startResearchRefresher();

  const server = createApp().listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  const shutdown = () => {
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
