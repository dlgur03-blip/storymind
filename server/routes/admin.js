const { Router } = require('express');
const db = require('../lib/db');
const { auth, adminOnly } = require('../middleware');

const router = Router();

// All admin routes require auth + admin
router.use(auth, adminOnly);

// Overview stats
router.get('/overview', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as total FROM users').get();
  const usersToday = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= date('now')").get();
  const usersWeek = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at >= date('now', '-7 days')").get();
  const works = db.prepare('SELECT COUNT(*) as total FROM works').get();
  const chapters = db.prepare('SELECT COUNT(*) as total FROM chapters').get();
  const totalWords = db.prepare('SELECT COALESCE(SUM(word_count), 0) as total FROM chapters').get();
  const reviews = db.prepare('SELECT COUNT(*) as total FROM review_history').get();
  const reviewsToday = db.prepare("SELECT COUNT(*) as c FROM review_history WHERE created_at >= date('now')").get();
  const apiCalls = db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(cost_estimate), 0) as cost FROM api_usage').get();
  const apiToday = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(cost_estimate), 0) as cost FROM api_usage WHERE created_at >= date('now')").get();

  res.json({
    users: { total: users.total, today: usersToday.c, thisWeek: usersWeek.c },
    content: { works: works.total, chapters: chapters.total, totalWords: totalWords.total },
    ai: { totalReviews: reviews.total, reviewsToday: reviewsToday.c },
    cost: { totalApiCalls: apiCalls.total, totalCost: Math.round(apiCalls.cost * 100) / 100, todayCost: Math.round(apiToday.cost * 100) / 100 },
  });
});

// User list
router.get('/users', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const users = db.prepare(`
    SELECT u.id, u.email, u.nickname, u.created_at,
      (SELECT COUNT(*) FROM works WHERE user_id=u.id) as works_count,
      (SELECT COUNT(*) FROM chapters c JOIN works w ON c.work_id=w.id WHERE w.user_id=u.id) as chapters_count,
      (SELECT COALESCE(SUM(word_count),0) FROM chapters c JOIN works w ON c.work_id=w.id WHERE w.user_id=u.id) as total_words,
      (SELECT plan FROM user_plans WHERE user_id=u.id) as plan,
      (SELECT COUNT(*) FROM api_usage WHERE user_id=u.id) as api_calls
    FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  res.json({ users, total, limit, offset });
});

// User detail
router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
  const works = db.prepare('SELECT id, title, genre, style_preset, created_at, updated_at FROM works WHERE user_id=?').all(user.id);
  const plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(user.id);
  const usage = db.prepare("SELECT date(created_at) as date, COUNT(*) as calls, SUM(tokens_out) as tokens, SUM(cost_estimate) as cost FROM api_usage WHERE user_id=? AND created_at >= date('now', '-30 days') GROUP BY date(created_at) ORDER BY date").all(user.id);
  res.json({ user, works, plan, usage_last30: usage });
});

// Daily stats (last 30 days)
router.get('/daily-stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const signups = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= date('now', '-${days} days') GROUP BY date(created_at) ORDER BY date`).all();
  const reviews = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM review_history WHERE created_at >= date('now', '-${days} days') GROUP BY date(created_at) ORDER BY date`).all();
  const apiCost = db.prepare(`SELECT date(created_at) as date, COUNT(*) as calls, COALESCE(SUM(cost_estimate), 0) as cost FROM api_usage WHERE created_at >= date('now', '-${days} days') GROUP BY date(created_at) ORDER BY date`).all();
  const writing = db.prepare(`SELECT date, SUM(chars_written) as chars FROM writing_stats WHERE date >= date('now', '-${days} days') GROUP BY date ORDER BY date`).all();
  res.json({ signups, reviews, apiCost, writing });
});

// Plan distribution
router.get('/plan-stats', (req, res) => {
  const plans = db.prepare("SELECT COALESCE(plan, 'free') as plan, COUNT(*) as count FROM user_plans GROUP BY plan").all();
  // Add users without plans (all are free)
  const usersWithPlan = plans.reduce((s, p) => s + p.count, 0);
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (totalUsers > usersWithPlan) plans.push({ plan: 'free (no record)', count: totalUsers - usersWithPlan });
  res.json(plans);
});

// Top works by word count
router.get('/top-works', (req, res) => {
  const works = db.prepare(`
    SELECT w.id, w.title, w.genre, u.nickname as author,
      (SELECT COUNT(*) FROM chapters WHERE work_id=w.id) as chapters,
      (SELECT COALESCE(SUM(word_count),0) FROM chapters WHERE work_id=w.id) as total_words,
      w.created_at, w.updated_at
    FROM works w JOIN users u ON w.user_id=u.id
    ORDER BY total_words DESC LIMIT 20
  `).all();
  res.json(works);
});

// AI model usage breakdown
router.get('/model-usage', (req, res) => {
  const models = db.prepare("SELECT model, COUNT(*) as calls, COALESCE(SUM(tokens_in),0) as tokens_in, COALESCE(SUM(tokens_out),0) as tokens_out, COALESCE(SUM(cost_estimate),0) as cost FROM api_usage GROUP BY model").all();
  res.json(models);
});

module.exports = router;
