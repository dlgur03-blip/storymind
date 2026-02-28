const { Router } = require('express');
const db = require('../lib/db');
const { auth } = require('../middleware');
const router = Router();

const BADGE_DEFS = [
  { type: 'first_work', name: '첫 작품', desc: '첫 번째 작품을 생성했습니다', icon: '📖' },
  { type: 'first_review', name: '첫 검수', desc: '첫 AI 검수를 실행했습니다', icon: '🔍' },
  { type: 'writer_10k', name: '만 자 작가', desc: '총 1만 자 이상 집필했습니다', icon: '✍️' },
  { type: 'writer_50k', name: '5만 자 돌파', desc: '총 5만 자 이상 집필했습니다', icon: '🔥' },
  { type: 'writer_100k', name: '10만 자 대작', desc: '총 10만 자 이상 집필했습니다', icon: '🏆' },
  { type: 'chapters_10', name: '10화 연재', desc: '10화 이상 작성했습니다', icon: '📝' },
  { type: 'chapters_50', name: '50화 연재', desc: '50화 이상 작성했습니다', icon: '📚' },
  { type: 'chapters_100', name: '100화 달성', desc: '100화 이상 작성했습니다', icon: '👑' },
  { type: 'vault_master', name: '볼트 마스터', desc: '캐릭터 10명 이상 등록했습니다', icon: '🛡️' },
  { type: 'streak_7', name: '7일 연속', desc: '7일 연속 집필했습니다', icon: '🔥' },
  { type: 'planner', name: '기획의 달인', desc: 'AI 콘티 플래너를 완료했습니다', icon: '🗺️' },
  { type: 'referrer', name: '전도사', desc: '친구 3명 이상을 초대했습니다', icon: '🤝' },
];

// Get my badges
router.get('/my', auth, (req, res) => {
  const earned = db.prepare('SELECT * FROM badges WHERE user_id=? ORDER BY earned_at DESC').all(req.userId);
  const all = BADGE_DEFS.map(d => ({
    ...d,
    earned: earned.find(e => e.badge_type === d.type) ? true : false,
    earned_at: earned.find(e => e.badge_type === d.type)?.earned_at || null,
  }));
  res.json(all);
});

// Check and award badges (call after key actions)
router.post('/check', auth, (req, res) => {
  const newBadges = [];
  const award = (type, name) => {
    const exists = db.prepare('SELECT id FROM badges WHERE user_id=? AND badge_type=?').get(req.userId, type);
    if (!exists) {
      db.prepare('INSERT INTO badges (user_id, badge_type, badge_name) VALUES (?,?,?)').run(req.userId, type, name);
      newBadges.push({ type, name });
    }
  };

  // Check conditions
  const works = db.prepare('SELECT COUNT(*) as c FROM works WHERE user_id=?').get(req.userId)?.c || 0;
  if (works >= 1) award('first_work', '첫 작품');

  const reviews = db.prepare('SELECT COUNT(*) as c FROM review_history rh JOIN works w ON rh.work_id=w.id WHERE w.user_id=?').get(req.userId)?.c || 0;
  if (reviews >= 1) award('first_review', '첫 검수');

  const totalWords = db.prepare('SELECT COALESCE(SUM(c.word_count),0) as w FROM chapters c JOIN works w ON c.work_id=w.id WHERE w.user_id=?').get(req.userId)?.w || 0;
  if (totalWords >= 10000) award('writer_10k', '만 자 작가');
  if (totalWords >= 50000) award('writer_50k', '5만 자 돌파');
  if (totalWords >= 100000) award('writer_100k', '10만 자 대작');

  const chapters = db.prepare('SELECT COUNT(*) as c FROM chapters ch JOIN works w ON ch.work_id=w.id WHERE w.user_id=?').get(req.userId)?.c || 0;
  if (chapters >= 10) award('chapters_10', '10화 연재');
  if (chapters >= 50) award('chapters_50', '50화 연재');
  if (chapters >= 100) award('chapters_100', '100화 달성');

  const chars = db.prepare('SELECT COUNT(*) as c FROM vault_characters vc JOIN works w ON vc.work_id=w.id WHERE w.user_id=?').get(req.userId)?.c || 0;
  if (chars >= 10) award('vault_master', '볼트 마스터');

  const streakDays = db.prepare("SELECT COUNT(DISTINCT date) as c FROM writing_stats WHERE user_id=? AND date >= date('now','-7 days')").get(req.userId)?.c || 0;
  if (streakDays >= 7) award('streak_7', '7일 연속');

  const plans = db.prepare("SELECT COUNT(*) as c FROM story_plans WHERE user_id=? AND status='completed'").get(req.userId)?.c || 0;
  if (plans >= 1) award('planner', '기획의 달인');

  const referrals = db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id=? AND status='completed'").get(req.userId)?.c || 0;
  if (referrals >= 3) award('referrer', '전도사');

  res.json({ new_badges: newBadges, total_earned: newBadges.length + db.prepare('SELECT COUNT(*) as c FROM badges WHERE user_id=?').get(req.userId)?.c || 0 });
});

// Badge definitions
router.get('/definitions', (req, res) => res.json(BADGE_DEFS));

module.exports = router;
