const { Router } = require('express');
const db = require('../lib/db');
const { validate, sanitize } = require('../lib/validate');
const { auth } = require('../middleware');

const router = Router();

// ── Works ──
router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM works WHERE user_id=? ORDER BY updated_at DESC').all(req.userId));
});

router.post('/', auth, (req, res, next) => {
  try {
    const errs = validate({ title: { required: true, maxLength: 200 } }, req.body);
    if (errs) return res.status(400).json({ error: errs[0] });
    const { title, genre, style_preset, work_type, daily_goal } = req.body;
    const type = work_type === 'webtoon' ? 'webtoon' : 'novel';
    const result = db.prepare('INSERT INTO works (user_id,title,genre,style_preset,work_type,daily_goal) VALUES (?,?,?,?,?,?)').run(req.userId, sanitize(title), genre || '', style_preset || 'action', type, daily_goal || 3000);
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(result.lastInsertRowid);
    const chapterTitle = type === 'webtoon' ? '1화' : '제1화';
    db.prepare('INSERT INTO chapters (work_id,number,title) VALUES (?,1,?)').run(work.id, chapterTitle);
    res.json(work);
  } catch (e) { next(e); }
});

router.put('/:id', auth, (req, res, next) => {
  try {
    const { title, genre, style_preset, daily_goal } = req.body;
    db.prepare('UPDATE works SET title=?,genre=?,style_preset=?,daily_goal=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').run(sanitize(title), genre, style_preset, daily_goal || 3000, req.params.id, req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, (req, res, next) => {
  try {
    db.prepare('DELETE FROM works WHERE id=? AND user_id=?').run(req.params.id, req.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── Export ──
router.get('/:workId/export', auth, (req, res, next) => {
  try {
    const work = db.prepare('SELECT * FROM works WHERE id=? AND user_id=?').get(req.params.workId, req.userId);
    if (!work) return res.status(404).json({ error: '작품을 찾을 수 없습니다' });
    const chapters = db.prepare('SELECT * FROM chapters WHERE work_id=? ORDER BY number').all(work.id);
    const fmt = req.query.format || 'txt';
    const platform = req.query.platform || 'generic';

    // Platform-specific formatting
    const platformFormats = {
      naver: { // 네이버 시리즈
        lineBreak: '\n\n',
        chapterSeparator: '\n\n※ ※ ※\n\n',
        dialogueFormat: (text) => text.replace(/"([^"]+)"/g, '"$1"'),
        maxCharsPerLine: 40,
      },
      kakao: { // 카카오페이지
        lineBreak: '\n\n',
        chapterSeparator: '\n\n───────\n\n',
        dialogueFormat: (text) => text,
        indent: false,
      },
      munpia: { // 문피아
        lineBreak: '\n\n',
        chapterSeparator: '\n\n* * *\n\n',
        dialogueFormat: (text) => text,
        indent: true,
      },
      ridi: { // 리디북스
        lineBreak: '\n\n',
        chapterSeparator: '\n\n□ □ □\n\n',
        dialogueFormat: (text) => text,
      },
      generic: {
        lineBreak: '\n\n',
        chapterSeparator: '\n\n---\n\n',
        dialogueFormat: (text) => text,
      }
    };

    const pf = platformFormats[platform] || platformFormats.generic;

    if (fmt === 'txt') {
      let text = `${work.title}\n${'='.repeat(40)}\n`;
      chapters.forEach((ch, i) => {
        let content = (ch.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        content = pf.dialogueFormat(content);
        if (pf.indent) content = content.split('\n').map(line => '　' + line).join('\n');
        if (i > 0) text += pf.chapterSeparator;
        text += `\n${ch.title || '제' + ch.number + '화'}\n\n${content}${pf.lineBreak}`;
      });
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(work.title)}_${platform}.txt"`);
      res.send(text);
    } else if (fmt === 'epub') {
      // Simple EPUB structure (without external library)
      const epub = generateSimpleEpub(work, chapters);
      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(work.title)}.epub"`);
      res.send(epub);
    } else {
      let html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${work.title}</title><style>body{font-family:'Noto Serif KR',Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.9}h1{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}h2{margin-top:40px;border-top:1px solid #ddd;padding-top:20px;color:#555}</style></head><body><h1>${work.title}</h1>`;
      chapters.forEach(ch => { html += `<h2>${ch.title || '제' + ch.number + '화'}</h2>${ch.content || ''}`; });
      html += '</body></html>';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(work.title)}.html"`);
      res.send(html);
    }
  } catch (e) { next(e); }
});

// Helper: Generate simple EPUB (basic implementation)
function generateSimpleEpub(work, chapters) {
  // Returns a buffer - for full EPUB, would need archiver package
  // For now, return HTML as fallback since EPUB requires zip
  let content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ko">
<head><title>${work.title}</title></head>
<body>
<h1>${work.title}</h1>`;
  chapters.forEach(ch => {
    content += `<h2>${ch.title || '제' + ch.number + '화'}</h2>`;
    content += (ch.content || '').replace(/<script[^>]*>.*?<\/script>/gi, '');
  });
  content += '</body></html>';
  return Buffer.from(content, 'utf-8');
}

// ── Chapters ──
router.get('/:workId/chapters', auth, (req, res) => {
  res.json(db.prepare('SELECT id,work_id,number,title,word_count,updated_at FROM chapters WHERE work_id=? ORDER BY number').all(req.params.workId));
});

router.post('/:workId/chapters', auth, (req, res, next) => {
  try {
    const { number, title } = req.body;
    const result = db.prepare('INSERT INTO chapters (work_id,number,title) VALUES (?,?,?)').run(req.params.workId, number, title || `제${number}화`);
    res.json(db.prepare('SELECT * FROM chapters WHERE id=?').get(result.lastInsertRowid));
  } catch (e) { next(e); }
});

// #3-6 Bulk import — receive array of chapter texts, create chapters + run vault extraction
router.post('/:workId/import', auth, async (req, res, next) => {
  try {
    const { chapters: chapterTexts } = req.body;
    if (!Array.isArray(chapterTexts) || chapterTexts.length === 0) return res.status(400).json({ error: '최소 1화 이상의 원고가 필요합니다' });
    const work = db.prepare('SELECT * FROM works WHERE id=? AND user_id=?').get(req.params.workId, req.userId);
    if (!work) return res.status(404).json({ error: '작품을 찾을 수 없습니다' });

    // Delete existing empty chapters
    db.prepare('DELETE FROM chapters WHERE work_id=? AND word_count=0').run(work.id);

    const insertChapter = db.prepare('INSERT INTO chapters (work_id,number,title,content,word_count) VALUES (?,?,?,?,?)');
    const imported = [];
    const insertMany = db.transaction(() => {
      chapterTexts.forEach((text, i) => {
        const num = i + 1;
        const content = text.split('\n').filter(Boolean).map(p => `<p>${sanitize(p)}</p>`).join('');
        const wc = text.replace(/\s+/g, '').length;
        const result = insertChapter.run(work.id, num, `제${num}화`, content, wc);
        imported.push({ id: result.lastInsertRowid, number: num, word_count: wc });
      });
    });
    insertMany();

    db.prepare('UPDATE works SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(work.id);

    // Batch vault extraction (async, simplified — extract from first 5 chapters)
    const { callClaude, parseJSON } = require('../lib/gemini');
    const sampleTexts = chapterTexts.slice(0, 5).map((t, i) => `[${i + 1}화] ${t.substring(0, 2000)}`).join('\n---\n');
    try {
      const vaultResult = await callClaude(
        'StoryVault 초기 구축 전문가. 원고에서 캐릭터/세계관/복선을 추출. JSON만: {"characters":[{"name":"","appearance":"","personality":"","first_appearance":1}],"world":[{"category":"장소|아이템|조직|시스템","name":"","description":""}],"foreshadows":[{"summary":"","chapter":1}]}',
        `작품: ${work.title} (${work.genre})\n원고:\n${sampleTexts}`, 4096
      );
      const vault = parseJSON(vaultResult);
      (vault.characters || []).forEach(c => {
        if (c.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(work.id, c.name))
          db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,first_appearance) VALUES (?,?,?,?,?)').run(work.id, c.name, c.appearance || '', c.personality || '', c.first_appearance || 1);
      });
      (vault.world || []).forEach(w => {
        if (w.name) db.prepare('INSERT INTO vault_world (work_id,category,name,description) VALUES (?,?,?,?)').run(work.id, w.category || '기타', w.name, w.description || '');
      });
      (vault.foreshadows || []).forEach(f => {
        if (f.summary) db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter) VALUES (?,?,?)').run(work.id, f.summary, f.chapter || 1);
      });
    } catch (e) { console.error('[Import Vault Error]', e.message); }

    res.json({ imported: imported.length, chapters: imported });
  } catch (e) { next(e); }
});

module.exports = router;
