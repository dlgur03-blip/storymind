const { Router } = require('express');
const db = require('../lib/db');
const { auth, verifyWorkOwner } = require('../middleware');
const { cacheMiddleware, cache } = require('../lib/cache');

const router = Router();

// GET vault — cached for 60s
router.get('/:workId', auth, cacheMiddleware('vault', 60), (req, res) => {
  const wid = req.params.workId;
  res.json({
    characters: db.prepare('SELECT * FROM vault_characters WHERE work_id=?').all(wid),
    foreshadows: db.prepare('SELECT * FROM vault_foreshadows WHERE work_id=?').all(wid),
    world: db.prepare('SELECT * FROM vault_world WHERE work_id=?').all(wid),
    timeline: db.prepare('SELECT * FROM vault_timeline WHERE work_id=? ORDER BY chapter').all(wid),
    addressMatrix: db.prepare('SELECT * FROM vault_address_matrix WHERE work_id=?').all(wid),
  });
});

// Vault mode update (#8)
router.put('/:workId/mode', auth, (req, res, next) => {
  try {
    const work = verifyWorkOwner(req.params.workId, req.userId);
    if (!work) return res.status(404).json({ error: '작품을 찾을 수 없습니다' });
    const { vault_mode } = req.body;
    if (!['manual', 'smart', 'auto'].includes(vault_mode)) return res.status(400).json({ error: '유효하지 않은 모드' });
    db.prepare('UPDATE works SET vault_mode=? WHERE id=?').run(vault_mode, req.params.workId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Characters
router.post('/:workId/characters', auth, (req, res, next) => {
  try {
    const b = req.body;
    if (!b.name) return res.status(400).json({ error: '이름 필수' });
    const result = db.prepare('INSERT INTO vault_characters (work_id,name,aliases,appearance,personality,abilities,relationships,speech_pattern,is_alive,first_appearance,state_log) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      req.params.workId, b.name, JSON.stringify(b.aliases||[]), b.appearance||'', b.personality||'', JSON.stringify(b.abilities||[]), JSON.stringify(b.relationships||[]), b.speech_pattern||'', b.is_alive!==false?1:0, b.first_appearance||1, JSON.stringify(b.state_log||[])
    );
    // FIX 7: Invalidate vault cache on write
    cache.del(`vault:${req.userId}:/api/vault/${req.params.workId}`).catch(() => {});
    res.json(db.prepare('SELECT * FROM vault_characters WHERE id=?').get(result.lastInsertRowid));
  } catch (e) { next(e); }
});

router.put('/characters/:id', auth, (req, res, next) => {
  try {
    const b = req.body;
    db.prepare('UPDATE vault_characters SET name=?,aliases=?,appearance=?,personality=?,abilities=?,relationships=?,speech_pattern=?,is_alive=?,state_log=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
      b.name, JSON.stringify(b.aliases||[]), b.appearance||'', b.personality||'', JSON.stringify(b.abilities||[]), JSON.stringify(b.relationships||[]), b.speech_pattern||'', b.is_alive?1:0, JSON.stringify(b.state_log||[]), req.params.id
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/characters/:id', auth, (req, res, next) => {
  try { db.prepare('DELETE FROM vault_characters WHERE id=?').run(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});

// Foreshadows
router.post('/:workId/foreshadows', auth, (req, res, next) => {
  try {
    const b = req.body;
    if (!b.summary) return res.status(400).json({ error: '내용 필수' });
    const result = db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter,status,urgency,related_characters) VALUES (?,?,?,?,?,?)').run(
      req.params.workId, b.summary, b.planted_chapter||1, b.status||'open', b.urgency||'low', JSON.stringify(b.related_characters||[])
    );
    res.json(db.prepare('SELECT * FROM vault_foreshadows WHERE id=?').get(result.lastInsertRowid));
  } catch (e) { next(e); }
});

router.put('/foreshadows/:id', auth, (req, res, next) => {
  try {
    const b = req.body;
    db.prepare('UPDATE vault_foreshadows SET summary=?,status=?,resolved_chapter=?,urgency=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(b.summary, b.status, b.resolved_chapter||null, b.urgency||'low', req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// World
router.post('/:workId/world', auth, (req, res, next) => {
  try {
    const b = req.body;
    const result = db.prepare('INSERT INTO vault_world (work_id,category,name,description) VALUES (?,?,?,?)').run(req.params.workId, b.category, b.name, b.description||'');
    res.json(db.prepare('SELECT * FROM vault_world WHERE id=?').get(result.lastInsertRowid));
  } catch (e) { next(e); }
});

// #3-5 Address Matrix (호칭 매트릭스)
router.get('/:workId/address-matrix', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM vault_address_matrix WHERE work_id=?').all(req.params.workId));
});

router.post('/:workId/address-matrix', auth, (req, res, next) => {
  try {
    const { from_character, to_character, address, context } = req.body;
    if (!from_character || !to_character || !address) return res.status(400).json({ error: '발화자, 대상, 호칭 필수' });
    db.prepare('INSERT OR REPLACE INTO vault_address_matrix (work_id,from_character,to_character,address,context) VALUES (?,?,?,?,?)').run(req.params.workId, from_character, to_character, address, context || '');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/address-matrix/:id', auth, (req, res, next) => {
  try { db.prepare('DELETE FROM vault_address_matrix WHERE id=?').run(req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});

module.exports = router;
