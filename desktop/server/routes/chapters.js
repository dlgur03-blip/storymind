const { Router } = require('express');
const db = require('../lib/db');
const { sanitize } = require('../lib/validate');
const { auth, verifyChapterOwner } = require('../middleware');

const router = Router();

router.get('/:id', auth, (req, res) => {
  const ch = verifyChapterOwner(req.params.id, req.userId);
  if (!ch) return res.status(404).json({ error: '화를 찾을 수 없습니다' });
  res.json(ch);
});

router.put('/:id', auth, (req, res, next) => {
  try {
    const { title, content } = req.body;
    const ch = verifyChapterOwner(req.params.id, req.userId);
    if (!ch) return res.status(404).json({ error: '화를 찾을 수 없습니다' });

    // If only title is being updated (content is undefined), skip content processing
    const actualContent = content !== undefined ? content : ch.content;
    const safeContent = sanitize(actualContent || '');
    const wc = safeContent.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;

    // Version history (max 20) — only if content actually changed
    if (content !== undefined && ch.content && ch.content !== safeContent) {
      db.prepare('INSERT INTO chapter_versions (chapter_id,content,word_count) VALUES (?,?,?)').run(ch.id, ch.content, ch.word_count);
      const vCount = db.prepare('SELECT COUNT(*) as c FROM chapter_versions WHERE chapter_id=?').get(ch.id).c;
      if (vCount > 20) db.prepare('DELETE FROM chapter_versions WHERE chapter_id=? AND id NOT IN (SELECT id FROM chapter_versions WHERE chapter_id=? ORDER BY saved_at DESC LIMIT 20)').run(ch.id, ch.id);
    }

    db.prepare('UPDATE chapters SET title=?,content=?,word_count=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title || ch.title, safeContent, wc, req.params.id);
    db.prepare('UPDATE works SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(ch.work_id);

    // Writing stats
    const work = db.prepare('SELECT user_id FROM works WHERE id=?').get(ch.work_id);
    if (work) {
      const diff = Math.max(0, wc - (ch.word_count || 0));
      if (diff > 0) {
        const today = new Date().toISOString().split('T')[0];
        db.prepare('INSERT INTO writing_stats (user_id,date,chars_written) VALUES (?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET chars_written=chars_written+?').run(work.user_id, today, diff, diff);
      }
    }
    res.json({ ok: true, word_count: wc });
  } catch (e) { next(e); }
});

// Chapter title inline edit (#6)
router.patch('/:id/title', auth, (req, res, next) => {
  try {
    const ch = verifyChapterOwner(req.params.id, req.userId);
    if (!ch) return res.status(404).json({ error: '화를 찾을 수 없습니다' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: '제목을 입력해주세요' });
    db.prepare('UPDATE chapters SET title=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(title, req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Versions
router.get('/:id/versions', auth, (req, res) => {
  const ch = verifyChapterOwner(req.params.id, req.userId);
  if (!ch) return res.status(404).json({ error: '화를 찾을 수 없습니다' });
  res.json(db.prepare('SELECT id,word_count,saved_at FROM chapter_versions WHERE chapter_id=? ORDER BY saved_at DESC LIMIT 20').all(req.params.id));
});

router.get('/versions/:vid', auth, (req, res) => {
  const v = db.prepare('SELECT * FROM chapter_versions WHERE id=?').get(req.params.vid);
  if (!v) return res.status(404).json({ error: '버전을 찾을 수 없습니다' });
  res.json(v);
});

module.exports = router;
