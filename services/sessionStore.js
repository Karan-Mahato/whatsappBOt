const { createClient } = require('redis');

const sessions = new Map();
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24);
const REDIS_URL = process.env.REDIS_URL;

let redisClient;
let redisReady = false;

if (REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (err) => {
    redisReady = false;
    console.error('Redis session store error:', err.message);
  });

  redisClient.on('ready', () => {
    redisReady = true;
    console.log('Redis session store connected');
  });

  redisClient.connect().catch((err) => {
    redisReady = false;
    console.error('Redis session store connection failed:', err.message);
  });
}

async function getSession(phone) {
  if (redisReady) {
    const raw = await redisClient.get(sessionKey(phone));
    return raw ? JSON.parse(raw) : null;
  }

  return sessions.get(phone) || null;
}

async function upsertSession(phone, updates = {}) {
  const now = new Date().toISOString();
  const existing = await getSession(phone) || {
    phone,
    language: null,
    currentFlow: 'LANGUAGE_SELECTION',
    currentStep: 'ASK_LANGUAGE',
    data: {},
    createdAt: now
  };

  const next = {
    ...existing,
    ...updates,
    data: {
      ...existing.data,
      ...(updates.data || {})
    },
    updatedAt: now
  };

  if (redisReady) {
    await redisClient.set(sessionKey(phone), JSON.stringify(next), {
      EX: SESSION_TTL_SECONDS
    });
  } else {
    sessions.set(phone, next);
  }

  return next;
}

function sessionKey(phone) {
  return `whatsbot:session:${phone}`;
}

module.exports = { getSession, upsertSession };
