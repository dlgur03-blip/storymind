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

// #2-7 Parallel 7-module review system (supports novel & webtoon)
const getReviewModules = (workType) => {
  const isWebtoon = workType === 'webtoon';
  const prefix = isWebtoon ? '웹툰 스크립트' : '웹소설';

  return [
    { id: 'M1', type: 'contradiction', name: '설정 모순', priority: 'critical',
      system: `${prefix} 설정 모순 탐지 전문가. StoryVault에 기록된 설정과 현재 화를 비교하여 모순만 찾으세요. JSON만: {"issues":[{"type":"contradiction","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}` },
    { id: 'M2', type: 'character', name: '캐릭터 일관성', priority: 'critical',
      system: `캐릭터 일관성 검증 전문가. 외모/성격/말투/능력이 프로필과 다른지 검사. ${isWebtoon ? '대사 톤과 캐릭터성 일치 여부도 체크.' : ''} JSON만: {"issues":[{"type":"character","severity":"critical|warning","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}` },
    { id: 'M3', type: 'timeline', name: '시간선 검증', priority: 'standard',
      system: `시간선 검증 전문가. 시간 경과 오류, 계절 모순, 날짜 불일치를 탐지. JSON만: {"issues":[{"type":"timeline","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}` },
    { id: 'M4', type: 'foreshadow', name: '복선 추적', priority: 'standard',
      system: `복선 추적 전문가. 미회수 복선 회수 여부, 새 복선 설치 탐지. JSON만: {"issues":[{"type":"foreshadow","severity":"info|suggestion","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}],"vault_updates":{"new_foreshadows":[{"summary":"","chapter":0}],"resolved_foreshadows":[{"summary":""}]}}` },
    { id: 'M5', type: isWebtoon ? 'script' : 'style', name: isWebtoon ? '스크립트 검수' : '문체 이탈', priority: 'light',
      system: isWebtoon
        ? '웹툰 스크립트 검수 전문가. 다음을 검사: 1)대사가 너무 긴지(말풍선 1개당 2줄 권장) 2)설명이 과한지(그림으로 보여줘야 할 내용) 3)지문이 명확한지 4)씬 전환이 자연스러운지. JSON만: {"issues":[{"type":"script","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}'
        : '문체 분석 전문가. 스타일 프리셋 대비 이탈 구간, 시점 일관성(1인칭/3인칭 전환 오류), 톤 변화를 검사. JSON만: {"issues":[{"type":"style","severity":"warning|info","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}]}' },
    { id: 'M6', type: 'popularity', name: isWebtoon ? '연출 분석' : '대중성 분석', priority: 'light',
      system: isWebtoon
        ? '웹툰 연출 전문가. 텐션, 클리프행어 품질, 씬 페이싱(느린구간 경고), 컷 임팩트를 분석. JSON만: {"tension_score":0,"issues":[{"type":"pacing","severity":"suggestion","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}],"popularity_tips":[""],"cliffhanger_score":0,"pacing_warning":""}'
        : '웹소설 대중성 전문가. 텐션, 클리프행어 품질, 페이싱(느린구간 경고), 독자 반응 예측. JSON만: {"tension_score":0,"issues":[{"type":"popularity","severity":"suggestion","description":"","location":"원문 10~30자","suggestion":"","reference_chapters":[]}],"popularity_tips":[""],"cliffhanger_score":0,"pacing_warning":""}' },
    { id: 'M7', type: 'extraction', name: '설정 추출', priority: 'light',
      system: `${prefix} 설정 추출 전문가. 현재 화에서 새로운 캐릭터, 세계관 요소(지명/조직/아이템/마법체계), 시간선 이벤트를 추출. JSON만: {"vault_updates":{"new_characters":[{"name":"","appearance":"외모 묘사","personality":"성격","speech_pattern":"말투 특징"}],"new_world":[{"category":"location|organization|item|magic_system|other","name":"","description":""}],"new_timeline":[{"event_summary":"주요 사건","in_world_time":"작중 시간(아침/저녁/3일후 등)","season":"봄|여름|가을|겨울|미상"}]}}` },
  ];
};

// Legacy constant for backwards compatibility
const REVIEW_MODULES = getReviewModules('novel');

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

    // Get previous 5 chapters with FULL content
    const prev = db.prepare('SELECT number,title,content FROM chapters WHERE work_id=? AND number<? ORDER BY number DESC LIMIT 5').all(workId, chapter.number);

    // Get ALL chapter summaries for broader context
    const allSummaries = db.prepare('SELECT number,title,summary FROM chapters WHERE work_id=? AND number<? AND summary IS NOT NULL ORDER BY number').all(workId, chapter.number);

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

    const isWebtoon = work?.work_type === 'webtoon';
    const typeLabel = isWebtoon ? '웹툰' : '웹소설';

    // Build full context with summaries for all chapters + full content for recent 5
    const summaryContext = allSummaries.length > 0
      ? `[이전 화 요약]\n${allSummaries.map(s => {
          const sum = s.summary ? (typeof s.summary === 'string' ? JSON.parse(s.summary) : s.summary) : null;
          return `${s.number}화 "${s.title}": ${sum?.summary || '요약 없음'}`;
        }).join('\n')}`
      : '';

    // Full content of recent 5 chapters (no truncation)
    const recentFullContent = prev.map(c => {
      const text = (c.content || '').replace(/<[^>]*>/g, '');
      return `[${c.number}화 "${c.title || ''}"]\n${text}`;
    }).join('\n\n---\n\n');

    const context = `작품:${work?.title}(${typeLabel},${work?.genre},스타일:${work?.style_preset})
[장르 기준] 적정 텐션:${benchmark.tension_avg||6}, 클리프행어율:${benchmark.cliffhanger_rate||0.8}, 대화비율:${JSON.stringify(benchmark.dialogue_ratio||[])}, ASL:${JSON.stringify(benchmark.asl||{})}
[핵심 규칙] ${rules}
StoryVault:${JSON.stringify(vault)}
${summaryContext}
[최근 5화 전문]
${recentFullContent}
[현재 ${chapter.number}화]
${plain}${rejectNote}`;

    // Run all 7 modules in parallel (using work_type-specific modules)
    const modules = getReviewModules(work?.work_type || 'novel');
    const results = await Promise.allSettled(
      modules.map(m => callClaude(m.system, context, 2048, m.priority).then(r => ({ ...parseJSON(r), _module: m.id })))
    );

    // Aggregate results
    const allIssues = [];
    let tensionScore = 0, popularityTips = [], cliffhangerScore = 0, pacingWarning = '';
    let vaultUpdates = { new_characters: [], new_foreshadows: [], resolved_foreshadows: [], new_world: [], new_timeline: [] };
    const moduleStatus = {};

    results.forEach((r, i) => {
      const mod = modules[i];
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
          if (v.vault_updates.new_world) vaultUpdates.new_world.push(...v.vault_updates.new_world);
          if (v.vault_updates.new_timeline) vaultUpdates.new_timeline.push(...v.vault_updates.new_timeline);
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
      overall_feedback: `7개 모듈 분석 완료. ${dedupIssues.length}건 이슈, 텐션 ${tensionScore}/10`,
      _moduleStatus: moduleStatus,
    };

    db.prepare('INSERT INTO review_history (work_id,chapter_id,issues,tension_score) VALUES (?,?,?,?)').run(workId, chapterId, JSON.stringify(parsed), tensionScore);

    // Auto-generate chapter summary for future context (async, non-blocking)
    (async () => {
      try {
        const existingSummary = db.prepare('SELECT summary FROM chapters WHERE id=?').get(chapterId);
        if (!existingSummary?.summary) {
          const summaryResult = await callClaude(
            '웹소설 요약 전문가. 핵심만 간결하게. JSON만: {"summary":"1-2문장 요약","keyPoints":["핵심1","핵심2"]}',
            plain.substring(0, 8000), 512, 'light'
          );
          const summaryParsed = parseJSON(summaryResult);
          db.prepare('UPDATE chapters SET summary=? WHERE id=?').run(JSON.stringify(summaryParsed), chapterId);
        }
      } catch (e) { console.error('[Auto-summary error]', e.message); }
    })();

    // Auto-apply vault updates
    const vaultMode = work?.vault_mode || 'smart';
    if (vaultMode !== 'manual') {
      (vaultUpdates.new_characters || []).forEach(nc => {
        if (nc.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(workId, nc.name))
          db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,speech_pattern,first_appearance) VALUES (?,?,?,?,?,?)').run(workId, nc.name, nc.appearance || '', nc.personality || '', nc.speech_pattern || '', chapter.number);
      });
      (vaultUpdates.new_foreshadows || []).forEach(nf => {
        if (nf.summary) db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter) VALUES (?,?,?)').run(workId, nf.summary, nf.chapter || chapter.number);
      });
      (vaultUpdates.new_world || []).forEach(nw => {
        if (nw.name && !db.prepare('SELECT id FROM vault_world WHERE work_id=? AND name=?').get(workId, nw.name))
          db.prepare('INSERT INTO vault_world (work_id,category,name,description) VALUES (?,?,?,?)').run(workId, nw.category || 'other', nw.name, nw.description || '');
      });
      (vaultUpdates.new_timeline || []).forEach(nt => {
        if (nt.event_summary) db.prepare('INSERT INTO vault_timeline (work_id,chapter,event_summary,in_world_time,season) VALUES (?,?,?,?,?)').run(workId, chapter.number, nt.event_summary, nt.in_world_time || '', nt.season || '미상');
      });
    }
    if (vaultMode === 'smart') parsed._pendingVaultUpdates = true;

    res.json(parsed);
  } catch (e) { next(e); }
});

// #7-4 SSE-based review with real-time progress
router.get('/review-stream', auth, async (req, res) => {
  const { workId, chapterId } = req.query;
  if (!workId || !chapterId) return res.status(400).json({ error: 'workId, chapterId 필수' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };

  try {
    let plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId);
    if (!plan) { db.prepare('INSERT OR IGNORE INTO user_plans (user_id) VALUES (?)').run(req.userId); plan = db.prepare('SELECT * FROM user_plans WHERE user_id=?').get(req.userId); }
    if (plan && plan.monthly_reviews_used >= plan.monthly_review_limit) { send('error', { error: '월 검수 한도 초과' }); res.end(); return; }
    db.prepare('UPDATE user_plans SET monthly_reviews_used=monthly_reviews_used+1 WHERE user_id=?').run(req.userId);

    const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(chapterId);
    if (!chapter) { send('error', { error: '화를 찾을 수 없습니다' }); res.end(); return; }

    // Full content of previous 5 chapters
    const prev = db.prepare('SELECT number,title,content FROM chapters WHERE work_id=? AND number<? ORDER BY number DESC LIMIT 5').all(workId, chapter.number);
    // All chapter summaries for broader context
    const allSummaries = db.prepare('SELECT number,title,summary FROM chapters WHERE work_id=? AND number<? AND summary IS NOT NULL ORDER BY number').all(workId, chapter.number);

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
    const isWebtoon = work?.work_type === 'webtoon';
    const typeLabel = isWebtoon ? '웹툰' : '웹소설';

    // Build context with summaries + full recent chapters
    const summaryContext = allSummaries.length > 0
      ? `[이전 화 요약]\n${allSummaries.map(s => {
          const sum = s.summary ? (typeof s.summary === 'string' ? JSON.parse(s.summary) : s.summary) : null;
          return `${s.number}화 "${s.title}": ${sum?.summary || '요약 없음'}`;
        }).join('\n')}`
      : '';

    const recentFullContent = prev.map(c => {
      const text = (c.content || '').replace(/<[^>]*>/g, '');
      return `[${c.number}화 "${c.title || ''}"]\n${text}`;
    }).join('\n\n---\n\n');

    const context = `작품:${work?.title}(${typeLabel},${work?.genre},스타일:${work?.style_preset})
StoryVault:${JSON.stringify(vault)}
${summaryContext}
[최근 5화 전문]
${recentFullContent}
[현재 ${chapter.number}화]
${plain}${rejectNote}`;

    const modules = getReviewModules(work?.work_type || 'novel');
    send('progress', { total: modules.length, completed: 0, current: '검수 시작...' });

    const allIssues = [];
    let tensionScore = 0, popularityTips = [], cliffhangerScore = 0, pacingWarning = '';
    let vaultUpdates = { new_characters: [], new_foreshadows: [], resolved_foreshadows: [], new_world: [], new_timeline: [] };
    const moduleStatus = {};
    let completed = 0;

    await Promise.allSettled(modules.map(async (m) => {
      try {
        send('progress', { total: modules.length, completed, current: `${m.name} 분석중...` });
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
          if (v.vault_updates.new_world) vaultUpdates.new_world.push(...v.vault_updates.new_world);
          if (v.vault_updates.new_timeline) vaultUpdates.new_timeline.push(...v.vault_updates.new_timeline);
        }
      } catch (e) { moduleStatus[m.id] = 'error'; }
      completed++;
      send('module_done', { module: m.id, name: m.name, status: moduleStatus[m.id] || 'error', completed, total: modules.length });
    }));

    const seen = new Set();
    const dedupIssues = allIssues.filter(is => { const k = is.description?.substring(0, 40); if (seen.has(k)) return false; seen.add(k); return true; });
    const sevOrder = { critical: 0, warning: 1, info: 2, suggestion: 3 };
    dedupIssues.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    const parsed = { issues: dedupIssues, tension_score: tensionScore, cliffhanger_score: cliffhangerScore, pacing_warning: pacingWarning, popularity_tips: popularityTips, vault_updates: vaultUpdates, overall_feedback: `7개 모듈 분석 완료. ${dedupIssues.length}건 이슈, 텐션 ${tensionScore}/10`, _moduleStatus: moduleStatus };

    const vaultMode = work?.vault_mode || 'smart';
    if (vaultMode !== 'manual') {
      (vaultUpdates.new_characters || []).forEach(nc => { if (nc.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(workId, nc.name)) db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,speech_pattern,first_appearance) VALUES (?,?,?,?,?,?)').run(workId, nc.name, nc.appearance || '', nc.personality || '', nc.speech_pattern || '', chapter.number); });
      (vaultUpdates.new_foreshadows || []).forEach(nf => { if (nf.summary) db.prepare('INSERT INTO vault_foreshadows (work_id,summary,planted_chapter) VALUES (?,?,?)').run(workId, nf.summary, nf.chapter || chapter.number); });
      (vaultUpdates.new_world || []).forEach(nw => { if (nw.name && !db.prepare('SELECT id FROM vault_world WHERE work_id=? AND name=?').get(workId, nw.name)) db.prepare('INSERT INTO vault_world (work_id,category,name,description) VALUES (?,?,?,?)').run(workId, nw.category || 'other', nw.name, nw.description || ''); });
      (vaultUpdates.new_timeline || []).forEach(nt => { if (nt.event_summary) db.prepare('INSERT INTO vault_timeline (work_id,chapter,event_summary,in_world_time,season) VALUES (?,?,?,?,?)').run(workId, chapter.number, nt.event_summary, nt.in_world_time || '', nt.season || '미상'); });
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

// Quick Extract - lightweight auto-extraction on save (no full review)
router.post('/quick-extract', auth, async (req, res, next) => {
  try {
    const { workId, chapterId } = req.body;
    if (!workId || !chapterId) return res.status(400).json({ error: 'workId, chapterId 필수' });

    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    if (!work || work.vault_mode === 'manual') return res.json({ skipped: true, reason: 'manual mode' });

    const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(chapterId);
    if (!chapter) return res.status(404).json({ error: '화를 찾을 수 없습니다' });

    // Skip if chapter too short
    const plain = (chapter.content || '').replace(/<[^>]*>/g, '');
    if (plain.length < 200) return res.json({ skipped: true, reason: 'too short' });

    // Get existing vault to avoid duplicates
    const vault = {
      characters: db.prepare('SELECT name FROM vault_characters WHERE work_id=?').all(workId).map(c => c.name),
      world: db.prepare('SELECT name FROM vault_world WHERE work_id=?').all(workId).map(w => w.name),
    };

    // Use extraction module only (M7)
    const extractionPrompt = `웹소설 설정 추출 전문가. 현재 화에서 새로운 캐릭터, 세계관 요소(지명/조직/아이템/마법체계), 시간선 이벤트를 추출.
기존 캐릭터(무시): ${vault.characters.join(', ') || '없음'}
기존 세계관(무시): ${vault.world.join(', ') || '없음'}
JSON만: {"vault_updates":{"new_characters":[{"name":"","appearance":"외모 묘사","personality":"성격","speech_pattern":"말투 특징"}],"new_world":[{"category":"location|organization|item|magic_system|other","name":"","description":""}],"new_timeline":[{"event_summary":"주요 사건","in_world_time":"작중 시간","season":"봄|여름|가을|겨울|미상"}]}}`;

    const context = `작품:${work.title}(${work.genre}) ${chapter.number}화:\n${plain.substring(0, 5000)}`;

    const result = await callClaude(extractionPrompt, context, 1500, 'light');
    const parsed = parseJSON(result);
    const vu = parsed.vault_updates || {};

    let inserted = { characters: 0, world: 0, timeline: 0 };

    // Insert new data
    (vu.new_characters || []).forEach(nc => {
      if (nc.name && !db.prepare('SELECT id FROM vault_characters WHERE work_id=? AND name=?').get(workId, nc.name)) {
        db.prepare('INSERT INTO vault_characters (work_id,name,appearance,personality,speech_pattern,first_appearance) VALUES (?,?,?,?,?,?)').run(workId, nc.name, nc.appearance || '', nc.personality || '', nc.speech_pattern || '', chapter.number);
        inserted.characters++;
      }
    });
    (vu.new_world || []).forEach(nw => {
      if (nw.name && !db.prepare('SELECT id FROM vault_world WHERE work_id=? AND name=?').get(workId, nw.name)) {
        db.prepare('INSERT INTO vault_world (work_id,category,name,description) VALUES (?,?,?,?)').run(workId, nw.category || 'other', nw.name, nw.description || '');
        inserted.world++;
      }
    });
    (vu.new_timeline || []).forEach(nt => {
      if (nt.event_summary) {
        db.prepare('INSERT INTO vault_timeline (work_id,chapter,event_summary,in_world_time,season) VALUES (?,?,?,?,?)').run(workId, chapter.number, nt.event_summary, nt.in_world_time || '', nt.season || '미상');
        inserted.timeline++;
      }
    });

    // Auto-generate summary if not exists
    const existingSummary = db.prepare('SELECT summary FROM chapters WHERE id=?').get(chapterId);
    if (!existingSummary?.summary && plain.length > 500) {
      try {
        const summaryResult = await callClaude(
          '웹소설 요약 전문가. 핵심만 간결하게. JSON만: {"summary":"1-2문장 요약","keyPoints":["핵심1","핵심2"]}',
          plain.substring(0, 8000), 512, 'light'
        );
        const summaryParsed = parseJSON(summaryResult);
        db.prepare('UPDATE chapters SET summary=? WHERE id=?').run(JSON.stringify(summaryParsed), chapterId);
        inserted.summary = true;
      } catch (e) { console.error('[Auto-summary error]', e.message); }
    }

    res.json({ ok: true, inserted, vault_updates: vu });
  } catch (e) { next(e); }
});

// Suggest Story
router.post('/suggest-story', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, direction, context } = req.body;
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const chars = db.prepare('SELECT name,personality,abilities FROM vault_characters WHERE work_id=?').all(workId);
    const fs = db.prepare('SELECT summary,status FROM vault_foreshadows WHERE work_id=? AND status="open"').all(workId);

    // Get all summaries + recent 5 full chapters
    const allSummaries = db.prepare('SELECT number,summary FROM chapters WHERE work_id=? AND summary IS NOT NULL ORDER BY number').all(workId);
    const recent = db.prepare('SELECT number,content FROM chapters WHERE work_id=? ORDER BY number DESC LIMIT 5').all(workId);

    const summaryContext = allSummaries.map(s => {
      const sum = s.summary ? (typeof s.summary === 'string' ? JSON.parse(s.summary) : s.summary) : null;
      return `${s.number}화: ${sum?.summary || ''}`;
    }).join('\n');

    const recentFull = recent.map(c => `[${c.number}화]\n${(c.content||'').replace(/<[^>]*>/g, '')}`).join('\n---\n');

    const result = await callClaude(
      `웹소설 스토리 컨설턴트 + 독자 반응 시뮬레이터. 복선+캐릭터 기반 전개 3~5가지 제안.
이전 화의 흐름을 정확히 파악하고, 자연스럽게 이어지는 전개를 제안하세요.
각 제안에 예상 독자 반응을 구체적으로 시뮬레이션해주세요.
JSON: {"suggestions":[{"title":"","synopsis":"200자","tension":"1~10","reader_reaction":"열광|호의|중립|분노|이탈 중 하나","reader_reaction_detail":"댓글에서 나올 반응 예시","reader_retention":"잔류율 영향: 상승|유지|하락","risk":"리스크 설명"}]}`,
      `작품:${work?.title}(${work?.genre})
[캐릭터] ${JSON.stringify(chars)}
[미회수 복선] ${JSON.stringify(fs)}
[전체 스토리 요약]
${summaryContext}
[최근 5화 전문]
${recentFull}
[요청 방향] ${direction || '자유롭게 제안'}`,
      4096, 'standard'
    );
    res.json(parseJSON(result));
  } catch (e) { next(e); }
});

// Ghostwrite (supports novel & webtoon)
router.post('/ghostwrite', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, idea, stylePreset, chapterNum } = req.body;
    if (!idea) return res.status(400).json({ error: '아이디어를 입력해주세요' });
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const chars = db.prepare('SELECT name,appearance,personality,speech_pattern FROM vault_characters WHERE work_id=?').all(workId);
    const world = db.prepare('SELECT name,category,description FROM vault_world WHERE work_id=?').all(workId);
    const fs = db.prepare('SELECT summary FROM vault_foreshadows WHERE work_id=? AND status="open"').all(workId);
    const sp = db.prepare('SELECT * FROM style_profiles WHERE work_id=?').get(workId);

    // Get ALL chapter summaries + recent 5 full content
    const allSummaries = db.prepare('SELECT number,title,summary FROM chapters WHERE work_id=? AND summary IS NOT NULL ORDER BY number').all(workId);
    const recent = db.prepare('SELECT number,title,content FROM chapters WHERE work_id=? ORDER BY number DESC LIMIT 5').all(workId);

    const isWebtoon = work?.work_type === 'webtoon';
    const styles = { action:'짧은 문장,전투,시스템 메시지', literary:'긴 문장,내면,비유', romance:'대화 중심,감정,심쿵', mystery:'긴장,떡밥', custom: sp ? `작가문체.ASL:${sp.avg_sentence_length},DR:${sp.dialogue_ratio},톤:${sp.tone}` : '작가문체 모방' };

    // Build summary context
    const summaryContext = allSummaries.length > 0
      ? allSummaries.map(s => {
          const sum = s.summary ? (typeof s.summary === 'string' ? JSON.parse(s.summary) : s.summary) : null;
          return `${s.number}화: ${sum?.summary || ''}`;
        }).join('\n')
      : '';

    // Full content of recent chapters
    const recentFull = recent.map(c => `[${c.number}화]\n${(c.content||'').replace(/<[^>]*>/g, '')}`).join('\n---\n');

    const systemPrompt = isWebtoon
      ? `웹툰 스크립트 대필 전문가. 아이디어를 웹툰 스크립트 형식으로 작성.
형식 규칙:
1. [씬 N - 장소, 시간대] 로 씬 구분
2. (지문) 으로 상황/동작 설명 (간결하게, 그림으로 보여줄 내용)
3. 캐릭터명: "대사" 형식으로 대사 작성
4. (감정/톤) 으로 연기 지시
5. (SFX) 로 효과음
6. 대사는 말풍선 1개당 2줄 이내로 짧게
7. 보여주기 > 설명하기 원칙
8. 10~15씬으로 구성, 클리프행어로 마무리
중요: 이전 화 내용과 자연스럽게 이어지도록 작성`
      : `웹소설 대필. 문체:${styles[stylePreset]||styles.action} StoryVault반영,복선활용,3000~5000자,클리프행어,순수텍스트. 중요: 이전 화 내용과 캐릭터 상황을 정확히 이어받아 작성`;

    const typeLabel = isWebtoon ? '웹툰' : '웹소설';
    const result = await callClaude(
      systemPrompt,
      `작품:${work?.title}(${typeLabel},${work?.genre}) ${chapterNum||'?'}화
[캐릭터] ${JSON.stringify(chars)}
[세계관] ${JSON.stringify(world)}
[미회수 복선] ${JSON.stringify(fs)}
[전체 스토리 요약]
${summaryContext}
[최근 5화 전문]
${recentFull}
[이번 화 아이디어]
${idea}`, 8000, 'critical'
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

// #20 Competition Benchmarking
const GENRE_BENCHMARKS = {
  '판타지': { avgChapterLength: 4500, dialogueRatio: 45, avgTension: 6.5, cliffhangerRate: 75, topWorks: ['나 혼자만 레벨업', '전지적 독자 시점', '오버기어드'] },
  '로맨스': { avgChapterLength: 3500, dialogueRatio: 55, avgTension: 5.5, cliffhangerRate: 60, topWorks: ['내 남편과 결혼해줘', '재혼 황후', '악녀는 두 번 산다'] },
  '로판': { avgChapterLength: 3800, dialogueRatio: 50, avgTension: 5.8, cliffhangerRate: 65, topWorks: ['악녀는 모래시계를 되돌린다', '황제의 외동딸', '이번 생은 가주가 되겠습니다'] },
  '무협': { avgChapterLength: 5000, dialogueRatio: 35, avgTension: 7.0, cliffhangerRate: 70, topWorks: ['화산귀환', '천마는 평범하게 살 수 없다', '마검신'] },
  '현판': { avgChapterLength: 4200, dialogueRatio: 40, avgTension: 6.8, cliffhangerRate: 72, topWorks: ['재벌집 막내아들', '탑 오브 더 갓', '김선비 연대기'] },
  'SF': { avgChapterLength: 4800, dialogueRatio: 38, avgTension: 6.2, cliffhangerRate: 68, topWorks: ['스토브 리그', '오브', '버그'] },
};

router.get('/benchmark/:workId', auth, async (req, res, next) => {
  try {
    const work = db.prepare('SELECT * FROM works WHERE id=?').get(req.params.workId);
    if (!work) return res.status(404).json({ error: '작품을 찾을 수 없습니다' });

    const chapters = db.prepare('SELECT content,word_count FROM chapters WHERE work_id=?').all(work.id);
    if (chapters.length === 0) return res.json({ error: '챕터가 없습니다' });

    // Calculate current work stats
    const avgLength = Math.round(chapters.reduce((sum, c) => sum + (c.word_count || 0), 0) / chapters.length);

    // Dialogue ratio calculation
    let totalDialogue = 0, totalLines = 0;
    chapters.forEach(c => {
      const text = (c.content || '').replace(/<[^>]+>/g, '');
      const lines = text.split(/[.!?。]/).filter(l => l.trim().length > 5);
      totalLines += lines.length;
      lines.forEach(l => { if (l.includes('"') || l.includes('"')) totalDialogue++; });
    });
    const dialogueRatio = totalLines > 0 ? Math.round((totalDialogue / totalLines) * 100) : 0;

    // Get tension history
    const tensions = db.prepare('SELECT tension_score FROM review_history WHERE work_id=? AND tension_score > 0').all(work.id);
    const avgTension = tensions.length > 0 ? (tensions.reduce((s, t) => s + t.tension_score, 0) / tensions.length).toFixed(1) : null;

    // Find matching genre benchmark
    const genreKey = Object.keys(GENRE_BENCHMARKS).find(g => (work.genre || '').includes(g)) || '판타지';
    const benchmark = GENRE_BENCHMARKS[genreKey];

    // Calculate scores
    const scores = {
      chapterLength: Math.min(100, Math.round((avgLength / benchmark.avgChapterLength) * 100)),
      dialogueRatio: Math.max(0, 100 - Math.abs(dialogueRatio - benchmark.dialogueRatio) * 2),
      tension: avgTension ? Math.min(100, Math.round((parseFloat(avgTension) / benchmark.avgTension) * 100)) : null,
    };

    const overallScore = Math.round(
      (scores.chapterLength * 0.3 + scores.dialogueRatio * 0.3 + (scores.tension || 50) * 0.4)
    );

    res.json({
      work: { title: work.title, genre: work.genre, chapters: chapters.length },
      current: { avgChapterLength: avgLength, dialogueRatio, avgTension },
      benchmark: { genre: genreKey, ...benchmark },
      scores,
      overallScore,
      recommendations: generateRecommendations(scores, benchmark, { avgLength, dialogueRatio, avgTension }),
    });
  } catch (e) { next(e); }
});

function generateRecommendations(scores, benchmark, current) {
  const recs = [];
  if (scores.chapterLength < 80) {
    if (current.avgLength < benchmark.avgChapterLength * 0.8) {
      recs.push({ type: 'warning', message: `평균 화 길이(${current.avgLength}자)가 장르 평균(${benchmark.avgChapterLength}자)보다 짧습니다. 묘사나 전개를 보강하세요.` });
    } else {
      recs.push({ type: 'info', message: `평균 화 길이(${current.avgLength}자)가 장르 평균(${benchmark.avgChapterLength}자)보다 깁니다. 간결한 전개를 고려하세요.` });
    }
  }
  if (scores.dialogueRatio < 70) {
    const diff = current.dialogueRatio - benchmark.dialogueRatio;
    if (diff < -10) {
      recs.push({ type: 'warning', message: `대화 비율(${current.dialogueRatio}%)이 장르 평균(${benchmark.dialogueRatio}%)보다 낮습니다. 대화를 늘려 몰입감을 높이세요.` });
    } else if (diff > 10) {
      recs.push({ type: 'info', message: `대화 비율(${current.dialogueRatio}%)이 높습니다. 서술로 상황 설명을 보충하세요.` });
    }
  }
  if (scores.tension && scores.tension < 80) {
    recs.push({ type: 'warning', message: `평균 텐션(${current.avgTension}/10)이 장르 평균(${benchmark.avgTension}/10)보다 낮습니다. 갈등과 위기를 강화하세요.` });
  }
  if (recs.length === 0) {
    recs.push({ type: 'success', message: '모든 지표가 장르 벤치마크를 충족합니다!' });
  }
  return recs;
}

// #19 Reader Persona Simulation
const READER_PERSONAS = {
  hardcore: { name: '열혈팬', traits: '작품 세계관에 빠져든 충성 독자. 설정 오류에 예민. 복선에 집착. 캐릭터 애정 깊음.' },
  casual: { name: '캐주얼', traits: '가볍게 읽는 독자. 어려운 설정 싫어함. 재미와 전개 속도 중시. 길면 이탈.' },
  critic: { name: '비평가', traits: '문학적 완성도 중시. 클리셰 싫어함. 캐릭터 깊이와 주제의식 중시.' },
  shipper: { name: '커플러', traits: '캐릭터 관계에 집중. 로맨스 전개에 민감. 캐릭터 케미 중시.' },
  lurker: { name: '눈팅러', traits: '댓글 잘 안 남김. 조용히 정주행. 결말까지 보고 판단.' },
  binger: { name: '정주행러', traits: '한번 시작하면 끝까지. 클리프행어에 약함. 몰입감 중시.' },
};

router.post('/simulate-readers', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId, chapterId, personas = ['hardcore', 'casual', 'critic'] } = req.body;

    const chapter = db.prepare('SELECT * FROM chapters WHERE id=?').get(chapterId);
    if (!chapter) return res.status(404).json({ error: '화를 찾을 수 없습니다' });

    const work = db.prepare('SELECT * FROM works WHERE id=?').get(workId);
    const text = (chapter.content || '').replace(/<[^>]*>/g, '').substring(0, 5000);

    const selectedPersonas = personas.filter(p => READER_PERSONAS[p]).map(p => ({
      id: p,
      ...READER_PERSONAS[p]
    }));

    const results = await Promise.all(selectedPersonas.map(async (persona) => {
      try {
        const result = await callClaude(
          `당신은 "${persona.name}" 독자입니다. 특성: ${persona.traits}
이 원고를 읽고 해당 독자 타입의 관점에서 반응을 시뮬레이션하세요.
JSON만: {"reaction":"열광|호의|중립|불만|이탈 중 하나","emotion":"느끼는 감정","comment":"이 독자가 남길 법한 댓글(1-2문장)","continue_reading":"계속 읽을 확률 %(0-100)","concerns":["이 독자가 불편해할 수 있는 점"],"likes":["이 독자가 좋아할 점"]}`,
          `작품: ${work?.title} (${work?.genre})\n${chapter.number}화:\n${text}`,
          1024, 'light'
        );
        return { persona: persona.id, name: persona.name, ...parseJSON(result) };
      } catch {
        return { persona: persona.id, name: persona.name, error: true };
      }
    }));

    // Calculate overall reader retention
    const validResults = results.filter(r => !r.error && r.continue_reading);
    const avgRetention = validResults.length > 0
      ? Math.round(validResults.reduce((sum, r) => sum + (parseInt(r.continue_reading) || 50), 0) / validResults.length)
      : 50;

    res.json({
      personas: results,
      avgRetention,
      available_personas: Object.entries(READER_PERSONAS).map(([id, p]) => ({ id, ...p }))
    });
  } catch (e) { next(e); }
});

// #16 Generate Chapter Summary (for Outline Mode)
router.post('/summarize-chapter', auth, async (req, res, next) => {
  try {
    const { chapterId, content } = req.body;
    if (!content) return res.status(400).json({ error: '내용이 필요합니다' });

    const text = (content || '').replace(/<[^>]+>/g, '').substring(0, 8000);
    if (text.length < 100) return res.json({ summary: '내용이 너무 짧습니다', keyPoints: [] });

    const result = await callClaude(
      '웹소설 요약 전문가. 한 화의 핵심 내용을 요약하고 주요 포인트를 추출. JSON만: {"summary":"2-3문장 요약","keyPoints":["핵심 포인트 1","핵심 포인트 2"],"characters_mentioned":["등장인물"],"mood":"분위기"}',
      text, 1024, 'light'
    );
    const parsed = parseJSON(result);

    // Save to DB if chapterId provided
    if (chapterId) {
      db.prepare('UPDATE chapters SET summary=? WHERE id=?').run(JSON.stringify(parsed), chapterId);
    }

    res.json(parsed);
  } catch (e) { next(e); }
});

// Batch summarize all chapters
router.post('/summarize-work', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { workId } = req.body;
    const chapters = db.prepare('SELECT id,number,content FROM chapters WHERE work_id=? ORDER BY number').all(workId);
    if (chapters.length === 0) return res.json({ summaries: [] });

    const summaries = [];
    for (const ch of chapters.slice(0, 30)) { // Limit to 30 chapters
      const text = (ch.content || '').replace(/<[^>]+>/g, '').substring(0, 3000);
      if (text.length < 100) {
        summaries.push({ chapter: ch.number, summary: '내용 없음', keyPoints: [] });
        continue;
      }
      try {
        const result = await callClaude(
          '웹소설 요약 전문가. 핵심만 요약. JSON만: {"summary":"1-2문장","keyPoints":["포인트"]}',
          text, 512, 'light'
        );
        const parsed = parseJSON(result);
        db.prepare('UPDATE chapters SET summary=? WHERE id=?').run(JSON.stringify(parsed), ch.id);
        summaries.push({ chapter: ch.number, ...parsed });
      } catch { summaries.push({ chapter: ch.number, summary: '요약 실패', keyPoints: [] }); }
    }

    res.json({ summaries, total: chapters.length });
  } catch (e) { next(e); }
});

// #13 Cliche Detection
const COMMON_CLICHES = [
  { pattern: /눈이?\s*(번쩍|휘둥그레|커지|동그래)/g, type: 'expression', desc: '눈 관련 클리셰' },
  { pattern: /심장이?\s*(쿵|두근|뛰|멎)/g, type: 'expression', desc: '심장 관련 클리셰' },
  { pattern: /입꼬리.*(올라|올리|끌어)/g, type: 'expression', desc: '입꼬리 관련 클리셰' },
  { pattern: /숨이?\s*(멎|막히|턱)/g, type: 'expression', desc: '숨 관련 클리셰' },
  { pattern: /(황금빛|금빛)\s*눈동자/g, type: 'appearance', desc: '황금빛 눈동자 (흔한 외모 묘사)' },
  { pattern: /은발|은빛\s*머리/g, type: 'appearance', desc: '은발 (흔한 외모 묘사)' },
  { pattern: /완벽한\s*(외모|몸매|얼굴)/g, type: 'appearance', desc: '완벽한 외모 묘사' },
  { pattern: /세상을?\s*(뒤집|바꿀|지배)/g, type: 'plot', desc: '세계관 장악 클리셰' },
  { pattern: /회귀|리셋|다시\s*태어/g, type: 'plot', desc: '회귀물 클리셰' },
  { pattern: /시스템\s*창?이?\s*(떴|나타|뜨)/g, type: 'plot', desc: '시스템 메시지 클리셰' },
  { pattern: /레벨\s*(업|상승|올|증가)/g, type: 'plot', desc: '레벨업 클리셰' },
  { pattern: /천재.*(각성|재능|실력)/g, type: 'character', desc: '천재 주인공 클리셰' },
  { pattern: /쓰레기.*(취급|인생|대우)/g, type: 'character', desc: '밑바닥 출발 클리셰' },
  { pattern: /(가문|귀족).*(몰락|추방|버림)/g, type: 'character', desc: '몰락 가문 클리셰' },
  { pattern: /복수.*(다짐|맹세|시작)/g, type: 'plot', desc: '복수 서사 클리셰' },
  { pattern: /전생|환생|이세계/g, type: 'plot', desc: '전생/이세계 클리셰' },
];

router.post('/detect-cliches', auth, async (req, res, next) => {
  try {
    const { content, useAI } = req.body;
    if (!content) return res.status(400).json({ error: '텍스트가 필요합니다' });

    const text = content.replace(/<[^>]+>/g, '');
    const found = [];

    // Local pattern matching
    COMMON_CLICHES.forEach(c => {
      const matches = text.match(c.pattern);
      if (matches) {
        matches.forEach(m => {
          found.push({ text: m, type: c.type, description: c.desc, source: 'local' });
        });
      }
    });

    // AI-enhanced detection if requested
    if (useAI && text.length > 100) {
      try {
        const aiResult = await callClaude(
          `웹소설 클리셰 탐지 전문가. 흔히 사용되는 상투적 표현, 뻔한 전개, 식상한 캐릭터 유형을 찾아라.
JSON만: {"cliches":[{"text":"원문 발췌","type":"expression|plot|character|appearance","description":"왜 클리셰인지","suggestion":"대안 제안"}]}`,
          text.substring(0, 5000), 2048, 'light'
        );
        const parsed = parseJSON(aiResult);
        (parsed.cliches || []).forEach(c => found.push({ ...c, source: 'ai' }));
      } catch (e) { console.error('[Cliche AI Error]', e.message); }
    }

    // Deduplicate
    const unique = found.filter((f, i, arr) => arr.findIndex(x => x.text === f.text) === i);

    res.json({
      total: unique.length,
      by_type: {
        expression: unique.filter(f => f.type === 'expression').length,
        plot: unique.filter(f => f.type === 'plot').length,
        character: unique.filter(f => f.type === 'character').length,
        appearance: unique.filter(f => f.type === 'appearance').length,
      },
      cliches: unique
    });
  } catch (e) { next(e); }
});

// #12 Name Generator
router.post('/generate-names', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const { style, gender, count = 5, context } = req.body;
    const styles = {
      korean: '한국 현대 이름 (성+이름 2-3자)',
      korean_historical: '한국 사극풍 이름 (고어체)',
      chinese: '중국풍 이름 (한자 음역)',
      japanese: '일본풍 이름 (성+이름)',
      fantasy_western: '서양 판타지 이름 (중세풍)',
      fantasy_eastern: '동양 판타지 이름 (무협/선협)',
      scifi: 'SF 이름 (미래적/코드네임)',
      unique: '독특하고 개성있는 이름'
    };
    const genderNote = gender === 'male' ? '남성' : gender === 'female' ? '여성' : '성별 무관';
    const contextNote = context ? `캐릭터 특징: ${context}` : '';

    const result = await callClaude(
      `캐릭터 이름 생성 전문가. ${styles[style] || styles.korean} 스타일로 ${genderNote} 이름 ${count}개를 생성.
각 이름에 의미/느낌을 설명. JSON만: {"names":[{"name":"","meaning":"이름의 뜻이나 느낌","pronunciation":"발음 가이드(필요시)"}]}`,
      `스타일: ${style || 'korean'}\n${genderNote}\n${contextNote}`,
      1500, 'light'
    );
    res.json(parseJSON(result));
  } catch (e) { next(e); }
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
