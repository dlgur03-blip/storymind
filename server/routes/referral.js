const { Router } = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { auth } = require('../middleware');
const router = Router();

// Get my referral code (auto-generate if none)
router.get('/my-code', auth, (req, res) => {
  let user = db.prepare('SELECT referral_code FROM users WHERE id=?').get(req.userId);
  if (!user?.referral_code) {
    const code = 'SM' + crypto.randomBytes(4).toString('hex').toUpperCase();
    db.prepare('UPDATE users SET referral_code=? WHERE id=?').run(code, req.userId);
    user = { referral_code: code };
  }
  const referred = db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id=? AND status='completed'").get(req.userId);
  const pending = db.prepare("SELECT COUNT(*) as c FROM referrals WHERE referrer_id=? AND status='pending'").get(req.userId);
  res.json({ code: user.referral_code, referred_count: referred?.c || 0, pending_count: pending?.c || 0 });
});

// Apply referral code (during signup or after)
router.post('/apply', auth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '코드를 입력해주세요' });
  const referrer = db.prepare('SELECT id FROM users WHERE referral_code=?').get(code.trim().toUpperCase());
  if (!referrer) return res.status(404).json({ error: '유효하지 않은 코드입니다' });
  if (referrer.id === req.userId) return res.status(400).json({ error: '본인의 코드는 사용할 수 없습니다' });
  const exists = db.prepare('SELECT id FROM referrals WHERE referred_id=?').get(req.userId);
  if (exists) return res.status(400).json({ error: '이미 레퍼럴이 적용되었습니다' });
  
  db.prepare('INSERT INTO referrals (referrer_id, referral_code, referred_id, status) VALUES (?,?,?,?)').run(referrer.id, code.trim().toUpperCase(), req.userId, 'completed');
  // Reward: add 3 extra reviews to referrer
  db.prepare('UPDATE user_plans SET monthly_review_limit = monthly_review_limit + 3 WHERE user_id=?').run(referrer.id);
  res.json({ ok: true, message: '레퍼럴 적용 완료! 초대자에게 검수 3회가 추가됩니다.' });
});

// Referral stats (for admin)
router.get('/stats', auth, (req, res) => {
  const top = db.prepare(`SELECT u.nickname, u.referral_code, COUNT(r.id) as count 
    FROM referrals r JOIN users u ON r.referrer_id=u.id 
    WHERE r.status='completed' GROUP BY r.referrer_id ORDER BY count DESC LIMIT 20`).all();
  res.json(top);
});

module.exports = router;
