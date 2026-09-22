// Central configuration. Everything environment-dependent is read here, once,
// so the rest of the code never touches process.env directly.
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

// A fixed, obviously-fake secret keeps dev sessions alive across restarts. It
// is never accepted in production, where a real secret is mandatory.
const DEV_JWT_SECRET = 'dev-only-secret-do-not-use-in-production';

const jwtSecret = process.env.JWT_SECRET || (isProd ? '' : DEV_JWT_SECRET);
if (isProd) {
  const weak = jwtSecret.length < 32 || /change_this|your_|secret_key|demo|dev-only/i.test(jwtSecret);
  if (weak) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
}

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/health-report';
if (isProd && /127\.0\.0\.1|localhost/.test(mongoUri)) {
  throw new Error('MONGODB_URI points at localhost in production. Set it to your hosted database.');
}

// Origins allowed to call the API from a browser. In dev the Vite proxy makes
// requests same-origin, so this only matters when the frontend is hosted apart.
const corsOrigins = (process.env.CORS_ORIGIN || (isProd ? '' : 'http://localhost:5183'))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// AI-assisted insights. With no key the feature reports itself unavailable. AI_MOCK=1 (development
// only) swaps in a clearly labelled demo generator so the flow can be tried without an account.
const aiMock = process.env.AI_MOCK === '1';
if (isProd && aiMock) throw new Error('AI_MOCK=1 is for development only and must not be set in production.');

module.exports = {
  isProd,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  // The cheap model by default: an insight or answer costs a fraction of a cent. Set AI_MODEL=claude-opus-5
  // (or claude-sonnet-5) for stronger reasoning at a much higher price.
  aiModel: process.env.AI_MODEL || 'claude-haiku-4-5',
  // Rolling 30-day limits per member for the *paid* (AI) features. The free rules-based summary has none.
  aiDeepPerMonth: Number(process.env.AI_DEEP_PER_MONTH) || 2,
  aiQuestionsPerMonth: Number(process.env.AI_QUESTIONS_PER_MONTH) || 5,
  aiMock,
  // Bump when the wording of the AI consent changes; members re-consent on mismatch.
  aiConsentVersion: '2026-09-draft',
  // Optional. NCBI asks API users to identify themselves, and a key raises the request limit.
  ncbiEmail: process.env.NCBI_EMAIL || '',
  ncbiApiKey: process.env.NCBI_API_KEY || '',
  port: Number(process.env.PORT) || 5000,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: '7d',
  bcryptCost: 12,
  corsOrigins,
  // Set TRUST_PROXY=1 when running behind a load balancer/reverse proxy so
  // rate limiting sees real client IPs instead of the proxy's.
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || true : false,
  // Bump when the terms/privacy text changes; users re-consent on mismatch.
  termsVersion: '2026-09-draft',
};
