const db = require('../lib/db');
const logger = require('../lib/logger');

function auth(req, res, next) {
  // 데스크톱 앱: 로그인 없이 항상 userId=1 사용
  req.userId = 1;
  global.__currentUserId = 1;
  next();
}

// Verify chapter belongs to user
function verifyChapterOwner(chapterId, userId) {
  return db.prepare('SELECT c.* FROM chapters c JOIN works w ON c.work_id=w.id WHERE c.id=? AND w.user_id=?').get(chapterId, userId);
}

// Verify work belongs to user
function verifyWorkOwner(workId, userId) {
  return db.prepare('SELECT * FROM works WHERE id=? AND user_id=?').get(workId, userId);
}

// Rate limiter
const buckets = new Map();
const LIMITS = { ai: { max: 30, windowMs: 60000 }, general: { max: 200, windowMs: 60000 } };
function rateLimit(type = 'general') {
  return (req, res, next) => {
    const key = `${req.userId || req.ip}:${type}`;
    const limit = LIMITS[type] || LIMITS.general;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now - b.start > limit.windowMs) { b = { count: 0, start: now }; buckets.set(key, b); }
    if (++b.count > limit.max) return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요' });
    next();
  };
}

function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(err.status || 500).json({ error: err.message || '서버 오류가 발생했습니다' });
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => logger.info('Request', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }));
  next();
}

// Admin check (first registered user = admin, or email-based)
function adminOnly(req, res, next) {
  const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(req.userId);
  // Admin = user ID 1 (first registered) or email contains 'admin'
  if (!user || (user.id !== 1 && !user.email.includes('admin'))) return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  next();
}

module.exports = { auth, rateLimit, errorHandler, requestLogger, verifyChapterOwner, verifyWorkOwner, adminOnly };
