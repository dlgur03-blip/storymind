const { Router } = require('express');
const crypto = require('crypto');
const db = require('../lib/db');
const { validate } = require('../lib/validate');
const { auth } = require('../middleware');

const router = Router();

function hashPw(pw) { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 64).toString('hex'); }
function verifyPw(pw, stored) { const [s, h] = stored.split(':'); return h === crypto.scryptSync(pw, s, 64).toString('hex'); }
function genToken() { return crypto.randomBytes(32).toString('hex'); }

router.post('/register', (req, res, next) => {
  try {
    const errs = validate({ email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, password: { required: true, minLength: 6 }, nickname: { required: true, minLength: 1, maxLength: 30 } }, req.body);
    if (errs) return res.status(400).json({ error: errs[0] });
    const { email, password, nickname } = req.body;
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(400).json({ error: '이미 사용 중인 이메일입니다' });
    const result = db.prepare('INSERT INTO users (email,password_hash,nickname) VALUES (?,?,?)').run(email, hashPw(password), nickname);
    const token = genToken();
    db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime("now","+30 days"))').run(token, result.lastInsertRowid);
    res.json({ token, user: { id: result.lastInsertRowid, email, nickname } });
  } catch (e) { next(e); }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요' });
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !verifyPw(password, user.password_hash)) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
    const token = genToken();
    db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime("now","+30 days"))').run(token, user.id);
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (e) { next(e); }
});

router.get('/me', auth, (req, res) => {
  res.json(db.prepare('SELECT id,email,nickname,created_at FROM users WHERE id=?').get(req.userId));
});

// Google OAuth 로그인
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    // Decode JWT payload (Google ID Token)
    const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
    const { email, name, sub: googleId } = payload;

    if (!email) return res.status(400).json({ error: 'Invalid Google token' });

    // Check if user exists
    let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);

    if (!user) {
      // Create new user with Google account
      const result = db.prepare('INSERT INTO users (email,password_hash,nickname,google_id) VALUES (?,?,?,?)').run(email, 'google_oauth', name || email.split('@')[0], googleId);
      user = { id: result.lastInsertRowid, email, nickname: name || email.split('@')[0] };
    } else if (!user.google_id) {
      // Link existing account with Google
      db.prepare('UPDATE users SET google_id=? WHERE id=?').run(googleId, user.id);
    }

    const token = genToken();
    db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime("now","+30 days"))').run(token, user.id);
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (e) { next(e); }
});

router.post('/logout', auth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token=?').run(req.headers.authorization?.replace('Bearer ', ''));
  res.json({ ok: true });
});

// #9 비밀번호 변경
router.put('/password', auth, (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
    if (newPassword.length < 6) return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다' });
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
    if (!verifyPw(currentPassword, user.password_hash)) return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다' });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPw(newPassword), req.userId);
    // Invalidate all other sessions
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    db.prepare('DELETE FROM sessions WHERE user_id=? AND token!=?').run(req.userId, currentToken);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// #10 계정 삭제
router.delete('/account', auth, (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: '비밀번호를 입력해주세요' });
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
    if (!verifyPw(password, user.password_hash)) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
    db.prepare('DELETE FROM users WHERE id=?').run(req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 닉네임 변경
router.put('/nickname', auth, (req, res, next) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.length > 30) return res.status(400).json({ error: '닉네임은 1~30자입니다' });
    db.prepare('UPDATE users SET nickname=? WHERE id=?').run(nickname, req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
