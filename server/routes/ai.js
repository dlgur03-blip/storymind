const { Router } = require('express');
const db = require('../lib/db');
const { callGemini, callClaude, parseJSON } = require('../lib/gemini');
const { auth, rateLimit, verifyWorkOwner } = require('../middleware');
const problemPatterns = require('../lib/problem-patterns.json');
const novelAnalysis = require('../lib/novel-analysis.json');

const router = Router();

// #7 Review feedback - reject issue pattern
router.post('/feedback', auth, (req, res, next) => {
  try {
    const { workId, issueType, issueDescription, action } = req.body;
    db.prepare('INSERT INTO review_feedback (work_id,issue_type,issue_description,action) VALUES (?,?,?,?)').run(workId, issueType, issueDescription, action || 'reject');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// #5 Tension history for chart
router.get('/tension-history/:workId', auth, (req, res) => {
  const rows = db.prepare('SELECT r.chapter_id, c.number, r.tension_score, r.created_at FROM review_history r JOIN chapters c ON r.chapter_id=c.id WHERE r.work_id=? AND r.tension_score>0 ORDER BY c.number').all(req.params.workId);
  res.json(rows);
});

// #2-7 Parallel 6-module review system
const REVIEW_MODULES = [
  { id: 'M1', type: 'contradiction', name: '설정 모순', priority: 'critical',
    system: '웹소설 설정 모순 탐지 전문가. StoryVault에 기록된 설정과 현재 화를 비교하여 모순만 찾으세요. JSON만: {"issues":[{"type":"contradiction","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}' },
  { id: 'M2', type: 'character', name: '캐릭터 일관성', priority: 'critical',
    system: '캐릭터 일관성 검증 전문가. 외모/성격/말투/능력이 프로필과 다른지 검사. JSON만: {"issues":[{"type":"character","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}' },
  { id: 'M3', type: 'timeline', name: '시간선 검증', priority: 'standard',
    system: '시간선 검증 전문가. 시간 경과 오류, 계절 모순, 날짜 불일치를 탐지. JSON만: {"issues":[{"type":"timeline","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}' },
  { id: 'M4', type: 'foreshadow', name: '복선 추적', priority: 'standard',
    system: '복선 추적 전문가. 미회수 복선 회수 여부, 새 복선 설치 탐지. JSON만: {"issues":[{"type":"foreshadow","severity":"info|suggestion","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}],"vault_updates":{"new_foreshadows":[{"summary":"","chapter":0}],"resolved_foreshadows":[{"summary":""}]}}' },
  { id: 'M5', type: 'style', name: '문체 이탈', priority: 'light',
    system: '문체 분석 전문가. 스타일 프리셋 대비 이탈 구간, 시점 일관성(1인칭/3인칭 전환 오류), 톤 변화를 검사. JSON만: {"issues":[{"type":"style","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}' },
  { id: 'M6', type: 'popularity', name: '대중성 분석', priority: 'light',
    system: '웹소설 대중성 전문가. 텐션, 클리프행어 품질, 페이싱(느린구간 경고), 독자 반응 예측. JSON만: {"tension_score":0,"issues":[{"type":"popularity","severity":"suggestion","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}],"popularity_tips":[""],"cliffhanger_score":0,"pacing_warning":""}' },
];

router.post('/review', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, chapterId } = req.body;
    if (!workId || !chapterId) return res.status(400).json({ error: 'workId, chapterId 필수' });

    // #8-1 Plan check
    let plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId);
    if (!plan) { db.prepare('INSERT OR IGNORE INTO user_plans (user_id) VALUES (?)').run(req.userId); plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId); }
    if (plan && new Date(plan.reset_at) < new Date()) { db.prepare("UPDATE user_plans SET monthly_reviews_used=0,reset_at=datetime('now','+30 days') WHERE user_id=?").run(req.userId); plan.monthly_reviews_used = 0; }
    if (plan && plan.monthly_reviews_used >= plan.monthly_review_limit) return res.status(429).json({ error: `월 검수 ${plan.monthly_review_limit}회 한도 초과. 플랜을 업그레이드해주세요.`, plan: plan.plan, limit: plan.monthly_review_limit });
    db.prepare('UPDATE user_plans SET monthly_reviews_used=monthly_reviews_used+1 WHERE user_id=?').run(req.userId);

    const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(chapterId);
    if (!chapter) return res.status(404).json({ error: '화를 찾을 수 없습니다' });
    const prev = db.prepare('SELECT number,title,content FROM chapters WHERE work_id=? AND number<? ORDER BY number DESC LIMIT 5').all(workId, chapter.number);
    const vault = {
      characters: db.prepare('SELECT name,appearance,personality,is_alive,speech_pattern FROM vault_characters WHERE work_id=?').all(workId),
      foreshadows: db.prepare('SELECT summary,status,planted_chapter FROM vault_foreshadows WHERE work_id=?').all(workId),
      world: db.prepare('SELECT category,name,description FROM vault_world WHERE work_id=?').all(workId),
      timeline: db.prepare('SELECT chapter,event_summary,in_world_time,season FROM vault_timeline WHERE work_id=? ORDER BY chapter').all(workId),
    };
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const plain = (chapter.content || '').replace(/<[^>]*>/g, '');

    const rejected = db.prepare('SELECT issue_type,issue_description FROM review_feedback WHERE work_id=? AND action="reject" ORDER BY created_at DESC LIMIT 30').all(workId);
    const rejectNote = rejected.length > 0 ? `\n작가가 무시한 패턴(보고금지): ${rejected.map(r => `[${r.issue_type}]${r.issue_description}`).join('; ')}` : '';

    // Build context with genre-specific benchmarks
    const genreKey = Object.keys(novelAnalysis.success_benchmarks).find(k => (work?.genre || '').includes(novelAnalysis.success_benchmarks[k]?.reference_works?.[0]?.substring(0,2))) || Object.keys(novelAnalysis.success_benchmarks)[0];
    const benchmark = novelAnalysis.success_benchmarks[genreKey] || {};
    const rules = novelAnalysis.universal_rules.map(r => r.rule + ': ' + r.description).join('; ');

    const context = `작품:${work?.title}(${work?.genre},스타일:${work?.style_preset})
[장르 기준] 적정 텐션:${benchmark.tension_avg||6}, 클리프행어율:${benchmark.cliffhanger_rate||0.8}, 대화비율:${JSON.stringify(benchmark.dialogue_ratio||[])}, ASL:${JSON.stringify(benchmark.asl||{})}
[핵심 규칙] ${rules}
StoryVault:${JSON.stringify(vault)}
최근:${prev.map(c => `[${c.number}화]${c.content?.replace(/<[^>]*>/g, '').substring(0, 400)}`).join('\n---\n')}
현재 ${chapter.number}화:\n${plain}${rejectNote}`;

// #7-4 SSE-based review with real-time progress
router.get('/review-stream', auth, async (req, res) => {
  const { workId, chapterId } = req.query;
  if (!workId || !chapterId) return res.status(400).json({ error: 'workId, chapterId 필수' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

  try {
    // Plan check
    let plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId);
    if (!plan) { db.prepare('INSERT OR IGNORE INTO user_plans (user_id) VALUES (?)').run(req.userId); plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId); }
    if (plan && plan.monthly_reviews_used >= plan.monthly_review_limit) { send('error', { error: '월 검수 한도 초과' }); res.end(); return; }
    db.prepare('UPDATE user_plans SET monthly_reviews_used=monthly_reviews_used+1 WHERE user_id=?').run(req.userId);

    const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(chapterId);
    if (!chapter) { send('error', { error: '화를 찾을 수 없습니다' }); res.end(); return; }

    const prev = db.prepare('SELECT number,title,content FROM chapters WHERE work_id=? AND number<? ORDER BY number DESC LIMIT 5').all(workId, chapter.number);
    const vault = {
      characters: db.prepare('SELECT name,appearance,personality,is_alive,speech_pattern FROM vault_characters WHERE work_id=?').all(workId),
      foreshadows: db.prepare('SELECT summary,status,planted_chapter FROM vault_foreshadows WHERE work_id=?').all(workId),
      world: db.prepare('SELECT category,name,description FROM vault_world WHERE work_id=?').all(workId),
      timeline: db.prepare('SELECT chapter,event_summary,in_world_time,season FROM vault_timeline WHERE work_id=? ORDER BY chapter').all(workId),
    };
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const plain = (chapter.content || '').replace(/<[^>]*>/g, '');
    const rejected = db.prepare('SELECT issue_type,issue_description FROM review_feedback WHERE work_id=? AND action="reject" ORDER BY created_at DESC LIMIT 30').all(workId);
    const rejectNote = rejected.length > 0 ? `\n작가가 무시한 패턴: ${rejected.map(r => `[${r.issue_type}]${r.issue_description}`).join('; ')}` : '';
    const context = `작품:${work?.title}(${work?.genre},스타일:${work?.style_preset}) StoryVault:${JSON.stringify(vault)}\n최근:${prev.map(c => `[${c.number}화]${c.content?.replace(/<[^>]*>/g, '').substring(0, 400)}`).join('\n---\n')}\n현재 ${chapter.number}화:\n${plain}${rejectNote}`;

    send('progress', { total: REVIEW_MODULES.length, completed: 0, current: '검수 시작...' });

    // Run modules with progress updates
    const allIssues = [];
    let tensionScore = 0, popularityTips = [], cliffhangerScore = 0, pacingWarning = '';
    let vaultUpdates = { new_characters: [], new_foreshadows: [], resolved_foreshadows: [] };
    const moduleStatus = {};
    let completed = 0;

    await Promise.allSettled(REVIEW_MODULES.map(async (m) => {
      try {
        send('progress', { total: REVIEW_MODULES.length, completed, current: `${m.name} 분석중...` });
        const raw = await callClaude(m.system, context, 2048, m.priority);
        const v = parseJSON(raw);
        moduleStatus[m.id] = 'done';
        (v.issues || []).forEach(is => allIssues.push({ ...is, module: m.id }));
        if (v.tension_score) tensionScore = v.tension_score;
        if (v.popularity_tips) popularityTips.push(...v.popularity_tips.filter(Boolean));
        if (v.cliffhanger_score) cliffhangerScore = v.cliffhanger_score;
        if (v.pacing_warning) pacingWarning = v.pacing_warning;
        if (v.vault_updates) {
          if (v.vault_updates.new_foreshadows) vaultUpdates.new_foreshadows.push(...v.vault_updates.new_foreshadows);
          if (v.vault_updates.resolved_foreshadows) vaultUpdates.resolved_foreshadows.push(...v.vault_updates.resolved_foreshadows);
          if (v.vault_updates.new_characters) vaultUpdates.new_characters.push(...v.vault_updates.new_characters);
        }
      } catch (e) { moduleStatus[m.id] = 'error'; }
      completed++;
      send('module_done', { module: m.id, name: m.name, status: moduleStatus[m.id] || 'error', completed, total: REVIEW_MODULES.length });
    }));

    // Deduplicate + sort
    const seen = new Set();
    const dedupIssues = allIssues.filter(is => { const k = is.description?.substring(0, 40); if (seen.has(k)) return false; seen.add(k); return true; });
    const sevOrder = { critical: 0, warning: 1, info: 2, suggestion: 3 };
    dedupIssues.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    const parsed = { issues: dedupIssues, tension_score: tensionScore, cliffhanger_score: cliffhangerScore, pacing_warning: pacingWarning, popularity_tips: popularityTips, vault_updates: vaultUpdates, overall_feedback: `6개 모듈 분석 완료. ${dedupIssues.length}건 이슈, 텐션 ${tensionScore}/10`, _moduleStatus: moduleStatus };

    const vaultMode = work?.vault_mode || 'smart';
    if (vaultMode !== 'manual') {
      (vaultUpdates.new_characters || []).forEach(nc => { if (nc.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(workId, nc.name)) db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,first_appearance) VALUES (?,?,?,?,?)').run(workId, nc.name, nc.appearance || '', nc.personality || '', chapter.number); });
      (vaultUpdates.new_foreshadows || []).forEach(nf => { if (nf.summary) db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter) VALUES (?,?,?)').run(workId, nf.summary, nf.chapter || chapter.number); });
    }
    if (vaultMode === 'smart') parsed._pendingVaultUpdates = true;
    db.prepare('INSERT INTO review_history (work_id,chapter_id,issues,tension_score) VALUES (?,?,?,?)').run(workId, chapterId, JSON.stringify(parsed), tensionScore);

    send('complete', parsed);
    res.end();
  } catch (e) {
    send('error', { error: e.message });
    res.end();
  }
});

// #2-7 Run all 6 modules in parallel
    const results = await Promise.allSettled(
      REVIEW_MODULES.map(m => callClaude(m.system, context, 2048, m.priority).then(r => ({ ...parseJSON(r), _module: m.id })))
    );

    // Aggregate results
    const allIssues = [];
    let tensionScore = 0, popularityTips = [], cliffhangerScore = 0, pacingWarning = '';
    let vaultUpdates = { new_characters: [], new_foreshadows: [], resolved_foreshadows: [] };
    const moduleStatus = {};

    results.forEach((r, i) => {
      const mod = REVIEW_MODULES[i];
      if (r.status === 'fulfilled' && r.value) {
        const v = r.value;
        moduleStatus[mod.id] = 'done';
        (v.issues || []).forEach(is => allIssues.push({ ...is, module: mod.id }));
        if (v.tension_score) tensionScore = v.tension_score;
        if (v.popularity_tips) popularityTips.push(...v.popularity_tips.filter(Boolean));
        if (v.cliffhanger_score) cliffhangerScore = v.cliffhanger_score;
        if (v.pacing_warning) pacingWarning = v.pacing_warning;
        if (v.vault_updates) {
          if (v.vault_updates.new_foreshadows) vaultUpdates.new_foreshadows.push(...v.vault_updates.new_foreshadows);
          if (v.vault_updates.resolved_foreshadows) vaultUpdates.resolved_foreshadows.push(...v.vault_updates.resolved_foreshadows);
          if (v.vault_updates.new_characters) vaultUpdates.new_characters.push(...v.vault_updates.new_characters);
        }
      } else {
        moduleStatus[mod.id] = 'error';
      }
    });

    // Deduplicate by description similarity
    const seen = new Set();
    const dedupIssues = allIssues.filter(is => {
      const key = is.description?.substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by severity
    const sevOrder = { critical: 0, warning: 1, info: 2, suggestion: 3 };
    dedupIssues.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    const parsed = {
      issues: dedupIssues,
      tension_score: tensionScore,
      cliffhanger_score: cliffhangerScore,
      pacing_warning: pacingWarning,
      popularity_tips: popularityTips,
      vault_updates: vaultUpdates,
      overall_feedback: `6개 모듈 분석 완료. ${dedupIssues.length}건 이슈, 텐션 ${tensionScore}/10`,
      _moduleStatus: moduleStatus,
    };

    db.prepare('INSERT INTO review_history (work_id,chapter_id,issues,tension_score) VALUES (?,?,?,?)').run(workId, chapterId, JSON.stringify(parsed), tensionScore);

    // Auto-apply vault updates
    const vaultMode = work?.vault_mode || 'smart';
    if (vaultMode !== 'manual') {
      (vaultUpdates.new_characters || []).forEach(nc => {
        if (nc.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(workId, nc.name))
          db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,first_appearance) VALUES (?,?,?,?,?)').run(workId, nc.name, nc.appearance || '', nc.personality || '', chapter.number);
      });
      (vaultUpdates.new_foreshadows || []).forEach(nf => {
        if (nf.summary) db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter) VALUES (?,?,?)').run(workId, nf.summary, nf.chapter || chapter.number);
      });
    }
    if (vaultMode === 'smart') parsed._pendingVaultUpdates = true;

    res.json(parsed);
  } catch (e) { next(e); }
});

// Suggest Story
router.post('/suggest-story', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, direction, context } = req.body;
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const chars = db.prepare('SELECT name,personality,abilities FROM vault_characters WHERE work_id=?').all(workId);
    const fs = db.prepare('SELECT summary,status FROM vault_foreshadows WHERE work_id=? AND status="open"').all(workId);
    const recent = db.prepare('SELECT number,content FROM chapters WHERE work_id=? ORDER BY number DESC LIMIT 3').all(workId);
    const result = await callClaude(
      `웹소설 스토리 컨설턴트 + 독자 반응 시뮬레이터. 복선+캐릭터 기반 전개 3~5가지 제안.
각 제안에 예상 독자 반응을 구체적으로 시뮬레이션해주세요.
JSON: {"suggestions":[{"title":"","synopsis":"200자","tension":"1~10","reader_reaction":"열광|호의|중립|분노|이탈 중 하나","reader_reaction_detail":"댓글에서 나올 반응 예시","reader_retention":"잔류율 영향: 상승|유지|하락","risk":"리스크 설명"}]}`,
      `작품:${work?.title}(${work?.genre}) 캐릭터:${JSON.stringify(chars)} 미회수복선:${JSON.stringify(fs)} 최근:${recent.map(c => c.content?.replace(/<[^>]*>/g, '').substring(0, 300)).join('\n---\n')} 요청:${direction || '자유'}`,
      4096, 'standard'
    );
    res.json(parseJSON(result));
  } catch (e) { next(e); }
});

// Ghostwrite
router.post('/ghostwrite', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, idea, stylePreset, chapterNum } = req.body;
    if (!idea) return res.status(400).json({ error: '아이디어를 입력해주세요' });
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const chars = db.prepare('SELECT name,appearance,personality,speech_pattern FROM vault_characters WHERE work_id=?').all(workId);
    const world = db.prepare('SELECT name,category,description FROM vault_world WHERE work_id=?').all(workId);
    const fs = db.prepare('SELECT summary FROM vault_foreshadows WHERE work_id=? AND status="open"').all(workId);
    const recent = db.prepare('SELECT content FROM chapters WHERE work_id=? ORDER BY number DESC LIMIT 3').all(workId);
    const sp = db.prepare('SELECT * FROM style_profiles WHERE work_id=?').get(workId);
    const styles = { action:'짧은 문장,전투,시스템 메시지', literary:'긴 문장,내면,비유', romance:'대화 중심,감정,심쿵', mystery:'긴장,떡밥', custom: sp ? `작가문체.ASL:${sp.avg_sentence_length},DR:${sp.dialogue_ratio},톤:${sp.tone}` : '작가문체 모방' };
    const result = await callClaude(
      `웹소설 대필. 문체:${styles[stylePreset]||styles.action} StoryVault반영,복선활용,3000~5000자,클리프행어,순수텍스트`,
      `작품:${work?.title}(${work?.genre}) ${chapterNum||'?'}화 캐릭터:${JSON.stringify(chars)} 세계관:${JSON.stringify(world)} 복선:${JSON.stringify(fs)} 최근:${recent.map(c=>c.content?.replace(/<[^>]*>/g,'').substring(0,500)).join('\n---\n')} 아이디어:${idea}`, 8000, 'critical'
    );
    res.json({ content: result });
  } catch (e) { next(e); }
});

// Style Learning — #4-3: Hybrid quantitative (local) + qualitative (LLM)
router.post('/learn-style', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId } = req.body;
    const chapters = db.prepare('SELECT content FROM chapters WHERE work_id=? AND word_count>500 ORDER BY number LIMIT 15').all(workId);
    if (chapters.length < 3) return res.status(400).json({ error: '최소 3화(각 500자+) 필요' });
    const text = chapters.map(c => (c.content||'').replace(/<[^>]*>/g, '')).join('\n\n---\n\n');

    // #4-3 Local quantitative analysis first
    const { analyzeStyle } = require('../lib/text-analysis');
    const localMetrics = analyzeStyle(text);

    // LLM qualitative analysis
    const result = await callClaude(
      '문체 분석 전문가. JSON만: {"tone":"","unique_patterns":[""],"example_paragraphs":[""],"narrative_voice":"","pov_consistency":"일관|혼재","rhythm_description":""}',
      `분석 원고(${chapters.length}화):\n${text.substring(0, 15000)}`, 2048, 'light'
    );
    const llm = parseJSON(result);

    // Merge: local metrics take priority for numbers, LLM for qualitative
    const p = {
      avg_sentence_length: localMetrics?.asl || 0,
      dialogue_ratio: localMetrics?.dialogue_ratio || 0,
      description_density: localMetrics?.description_density || 0,
      vocab_diversity: localMetrics?.vocab_diversity || 0,
      active_ratio: localMetrics?.active_ratio || 0,
      conjunctions: localMetrics?.conjunctions || {},
      pov: localMetrics?.pov || 'unknown',
      tone: llm.tone || '',
      unique_patterns: llm.unique_patterns || [],
      example_paragraphs: llm.example_paragraphs || [],
      narrative_voice: llm.narrative_voice || '',
      pov_consistency: llm.pov_consistency || '',
      rhythm_description: llm.rhythm_description || '',
    };

    const vals = [p.avg_sentence_length, p.dialogue_ratio, p.description_density, p.vocab_diversity, p.tone, JSON.stringify(p.unique_patterns), JSON.stringify(p.example_paragraphs), chapters.length];
    const existing = db.prepare('SELECT id FROM style_profiles WHERE work_id=?').get(workId);
    if (existing) db.prepare('UPDATE style_profiles SET avg_sentence_length=?,dialogue_ratio=?,description_density=?,vocab_diversity=?,tone=?,unique_patterns=?,example_paragraphs=?,analyzed_chapters=?,updated_at=CURRENT_TIMESTAMP WHERE work_id=?').run(...vals, workId);
    else db.prepare('INSERT INTO style_profiles (work_id,avg_sentence_length,dialogue_ratio,description_density,vocab_diversity,tone,unique_patterns,example_paragraphs,analyzed_chapters) VALUES (?,?,?,?,?,?,?,?,?)').run(workId, ...vals);
    db.prepare('UPDATE works SET style_preset="custom" WHERE id=?').run(workId);

    res.json({ profile: p, local_metrics: localMetrics, analyzed_chapters: chapters.length });
  } catch (e) { next(e); }
});

router.get('/style-profile/:workId', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM style_profiles WHERE work_id=?').get(req.params.workId) || null);
});

// #5-6 Genre pattern data
const genrePatterns = require('../lib/genre-patterns.json');
router.get('/genre-patterns', auth, (req, res) => {
  res.json(genrePatterns);
});
router.get('/genre-patterns/:genre', auth, (req, res) => {
  const p = genrePatterns[req.params.genre];
  if (!p) return res.status(404).json({ error: '해당 장르 패턴이 없습니다' });
  res.json(p);
});

// #6-3 Problem patterns API
router.get('/problem-patterns', auth, (req, res) => {
  res.json(problemPatterns);
});
router.get('/problem-patterns/:category', auth, (req, res) => {
  const cat = problemPatterns.categories[req.params.category];
  if (!cat) return res.status(404).json({ error: '해당 카테고리가 없습니다' });
  res.json(cat);
});

// #6-4 Novel analysis API
router.get('/novel-analysis', auth, (req, res) => {
  res.json(novelAnalysis);
});
router.get('/novel-analysis/benchmarks/:genre', auth, (req, res) => {
  const b = novelAnalysis.success_benchmarks[req.params.genre];
  if (!b) return res.status(404).json({ error: '해당 장르 벤치마크가 없습니다' });
  res.json(b);
});

module.exports = router;

// #2-10 Accuracy evaluation system
router.get('/accuracy/:workId', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM review_feedback WHERE work_id=?').get(req.params.workId)?.c || 0;
  const accepted = db.prepare("SELECT COUNT(*) as c FROM review_feedback WHERE work_id=? AND action='accept'").get(req.params.workId)?.c || 0;
  const rejected = db.prepare("SELECT COUNT(*) as c FROM review_feedback WHERE work_id=? AND action='reject'").get(req.params.workId)?.c || 0;
  const byType = db.prepare("SELECT issue_type, action, COUNT(*) as c FROM review_feedback WHERE work_id=? GROUP BY issue_type, action").all(req.params.workId);
  
  const accuracy = total > 0 ? Math.round((accepted / total) * 100) : null;
  const typeBreakdown = {};
  byType.forEach(r => {
    if (!typeBreakdown[r.issue_type]) typeBreakdown[r.issue_type] = { accept: 0, reject: 0 };
    typeBreakdown[r.issue_type][r.action] = r.c;
  });
  // Per-type accuracy
  Object.keys(typeBreakdown).forEach(t => {
    const tb = typeBreakdown[t];
    tb.total = tb.accept + tb.reject;
    tb.accuracy = tb.total > 0 ? Math.round((tb.accept / tb.total) * 100) : null;
  });
  
  res.json({ total_feedback: total, accepted, rejected, overall_accuracy: accuracy, by_type: typeBreakdown });
});

// #9-1 Review report share link
router.get('/report/:workId/:chapterId', (req, res) => {
  // Public endpoint (no auth) — generates shareable report
  const review = db.prepare('SELECT * FROM review_history WHERE work_id=? AND chapter_id=? ORDER BY created_at DESC LIMIT 1').get(req.params.workId, req.params.chapterId);
  if (!review) return res.status(404).json({ error: '검수 결과가 없습니다' });
  const chapter = db.prepare('SELECT number,title,word_count FROM chapters WHERE id=?').get(req.params.chapterId);
  const work = db.prepare('SELECT title,genre FROM works WHERE id=?').get(req.params.workId);
  let issues = [];
  try { issues = JSON.parse(review.issues || '[]'); } catch {}
  
  res.json({
    work: { title: work?.title, genre: work?.genre },
    chapter: { number: chapter?.number, title: chapter?.title, word_count: chapter?.word_count },
    tension_score: review.tension_score,
    issues_count: issues.length,
    issues_by_severity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    },
    reviewed_at: review.created_at,
    powered_by: 'StoryMind by Fedma'
  });
});
