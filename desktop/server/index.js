const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./lib/logger');
const { errorHandler, requestLogger, auth } = require('./middleware');
const db = require('./lib/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(requestLogger);

// Health check
app.get('/api/health', (_req, res) => {
  try { db.prepare('SELECT 1').get(); res.json({ status: 'ok' }); }
  catch { res.status(500).json({ status: 'error' }); }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/works', require('./routes/works'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/vault', require('./routes/vault'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/planner', require('./routes/planner'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/badges', require('./routes/badges'));

// Stats
app.get('/api/stats', auth, (req, res) => {
  const last7 = db.prepare("SELECT date,chars_written FROM writing_stats WHERE user_id=? AND date>=date('now','-7 days') ORDER BY date").all(req.userId);
  const today = db.prepare("SELECT COALESCE(SUM(chars_written),0) as total FROM writing_stats WHERE user_id=? AND date=date('now')").get(req.userId);
  res.json({ last7days: last7, today: today.total });
});

// #8-1 Plan info
app.get('/api/plan', auth, (req, res) => {
  let plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId);
  if (!plan) {
    db.prepare('INSERT OR IGNORE INTO user_plans (user_id) VALUES (?)').run(req.userId);
    plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId);
  }
  // Auto-reset monthly usage
  if (plan && new Date(plan.reset_at) < new Date()) {
    db.prepare("UPDATE user_plans SET monthly_reviews_used=0, reset_at=datetime('now','+30 days') WHERE user_id=?").run(req.userId);
    plan.monthly_reviews_used = 0;
  }
  res.json(plan || { plan: 'free', monthly_review_limit: 5, monthly_reviews_used: 0 });
});

// #8-2 Usage stats
app.get('/api/usage', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as calls, COALESCE(SUM(tokens_in),0) as tokens_in, COALESCE(SUM(tokens_out),0) as tokens_out, COALESCE(SUM(cost_estimate),0) as cost FROM api_usage WHERE user_id=?').get(req.userId);
  const last30 = db.prepare("SELECT date(created_at) as date, COUNT(*) as calls, SUM(tokens_out) as tokens FROM api_usage WHERE user_id=? AND created_at>=datetime('now','-30 days') GROUP BY date(created_at) ORDER BY date").all(req.userId);
  res.json({ total, last30days: last30 });
});

// #10-3 GDPR data export (with memory limit)
app.get('/api/export-data', auth, async (req, res, next) => {
  try {
    const user = db.prepare('SELECT id,email,nickname,created_at FROM users WHERE id=?').get(req.userId);
    const works = db.prepare('SELECT * FROM works WHERE user_id=?').all(req.userId);
    const allData = { user, works: [] };
    let totalSize = 0;
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB safety limit
    for (const w of works) {
      const chapters = db.prepare('SELECT id,work_id,number,title,word_count,created_at,updated_at,content FROM chapters WHERE work_id=?').all(w.id);
      // Truncate very long chapters to prevent memory issues
      chapters.forEach(c => { if (c.content && c.content.length > 500000) c.content = c.content.substring(0, 500000) + '...(truncated)'; totalSize += (c.content || '').length; });
      if (totalSize > MAX_SIZE) { allData._warning = '데이터가 너무 커서 일부 원고가 잘릴 수 있습니다'; break; }
      const vault = {
        characters: db.prepare('SELECT * FROM vault_characters WHERE work_id=?').all(w.id),
        foreshadows: db.prepare('SELECT * FROM vault_foreshadows WHERE work_id=?').all(w.id),
        world: db.prepare('SELECT * FROM vault_world WHERE work_id=?').all(w.id),
        timeline: db.prepare('SELECT * FROM vault_timeline WHERE work_id=?').all(w.id),
      };
      allData.works.push({ ...w, chapters, vault });
    }
    allData.stats = db.prepare('SELECT * FROM writing_stats WHERE user_id=?').all(req.userId);
    allData.usage = db.prepare('SELECT * FROM api_usage WHERE user_id=? ORDER BY created_at DESC LIMIT 1000').all(req.userId);
    allData.exported_at = new Date().toISOString();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="storymind_data_${req.userId}.json"`);
    res.json(allData);
  } catch (e) { next(e); }
});

// Static
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));
}

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => logger.info('StoryMind API started', { port: PORT }));

// Graceful error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} already in use. Kill existing process or use different port.`);
  } else {
    logger.error('Server error:', { error: err.message });
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  // Give time to flush logs
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: reason?.message || String(reason) });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
});
