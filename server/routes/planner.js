const { Router } = require('express');
const db = require('../lib/db');
const { callGemini, callClaude, parseJSON } = require('../lib/gemini');
const { auth, rateLimit } = require('../middleware');
const novelAnalysis = require('../lib/novel-analysis.json');

const router = Router();

// ====== CRUD ======

// List all plans
router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT id,title,status,current_step,genre,created_at,updated_at FROM story_plans WHERE user_id=? ORDER BY updated_at DESC').all(req.userId));
});

// Get plan detail
router.get('/:id', auth, (req, res) => {
  const plan = db.prepare('SELECT * FROM story_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!plan) return res.status(404).json({ error: '플랜을 찾을 수 없습니다' });
  // Parse JSON fields
  ['analysis','arcs','characters','world','conti','foreshadows','conversation'].forEach(k => {
    try { plan[k] = JSON.parse(plan[k] || '{}'); } catch { plan[k] = k === 'conversation' || k === 'characters' || k === 'world' || k === 'conti' || k === 'foreshadows' ? [] : {}; }
  });
  res.json(plan);
});

// Create new plan
router.post('/', auth, (req, res) => {
  const { idea_text } = req.body;
  if (!idea_text || idea_text.trim().length < 5) return res.status(400).json({ error: '아이디어를 5자 이상 입력해주세요' });
  const result = db.prepare('INSERT INTO story_plans (user_id, idea_text, conversation) VALUES (?, ?, ?)').run(
    req.userId, idea_text.trim(), JSON.stringify([{ role: 'user', content: idea_text.trim(), step: 1 }])
  );
  res.json({ id: result.lastInsertRowid, status: 'step1', current_step: 1 });
});

// Delete plan
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM story_plans WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ====== AI CONVERSATION — The core: AI asks questions, author answers ======

router.post('/:id/chat', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const plan = db.prepare('SELECT * FROM story_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId);
    if (!plan) return res.status(404).json({ error: '플랜 없음' });

    const { message } = req.body;
    let conversation = [];
    try { conversation = JSON.parse(plan.conversation || '[]'); } catch { conversation = []; }

    // Add user message
    if (message) {
      conversation.push({ role: 'user', content: message, step: plan.current_step, timestamp: new Date().toISOString() });
    }

    // Build context from all accumulated plan data
    let analysis = {}, arcs = {}, characters = [], world = [], conti = [], foreshadows = [];
    try { analysis = JSON.parse(plan.analysis || '{}'); } catch {}
    try { arcs = JSON.parse(plan.arcs || '{}'); } catch {}
    try { characters = JSON.parse(plan.characters || '[]'); } catch {}
    try { world = JSON.parse(plan.world || '[]'); } catch {}
    try { conti = JSON.parse(plan.conti || '[]'); } catch {}
    try { foreshadows = JSON.parse(plan.foreshadows || '[]'); } catch {}

    const step = plan.current_step;
    const benchmarks = Object.values(novelAnalysis.success_benchmarks).map(b => `${b.reference_works?.[0]||''}: 텐션${b.tension_avg}, 클리프${b.cliffhanger_rate}`).join('; ');

    // Core system prompt: AI must ASK QUESTIONS, not just generate
    const systemBase = `너는 웹소설 기획 전문 컨설턴트 "스토리마인드"다. 
핵심 원칙:
1. 일방적으로 생성하지 마라. 반드시 작가에게 2~3개 질문을 던져서 작가의 의도를 확인하라.
2. 선택지를 줄 때는 3가지 옵션을 주고 작가가 고르게 하라.
3. 작가의 답변을 받으면 그것을 반영해서 다음 단계로 진행하라.
4. 작가가 "좋아", "이걸로", "ㅇㅇ" 같은 짧은 긍정을 하면 확정하고 다음으로 넘어가라.
5. 작가가 수정을 요청하면 즉시 반영하라.
6. 항상 친근하지만 전문적인 톤을 유지하라. 반말 OK.
7. 응답 끝에 항상 다음 질문이나 선택지를 포함하라.

인기작 기준: ${benchmarks}`;

    let systemPrompt, userContext;

    switch(step) {
      case 1: // 아이디어 분석
        systemPrompt = `${systemBase}
현재 단계: 아이디어 분석 (Step 1/6)
작가가 아이디어를 제시했다. 다음을 해라:
- 아이디어를 칭찬하되, 구체화가 필요한 부분을 질문하라
- 장르를 감지하고 확인 질문을 하라
- 주인공의 핵심 동기/목적을 물어라
- 이 이야기만의 차별점(hook)이 뭔지 물어라
- 비슷한 인기작을 언급하며 "이런 느낌?" 확인하라

만약 충분한 정보가 모였다면 (대화 3회+ 이상), 다음 JSON을 포함해서 응답하라:
<STEP_COMPLETE>{"detected_genres":[""],"core_premise":"","unique_hook":"","title_suggestions":["","",""],"tone":"","target_readers":""}</STEP_COMPLETE>
이 JSON이 포함되면 시스템이 자동으로 Step 2로 전환한다. 충분한 정보가 모이기 전에는 절대 이 태그를 넣지 마라.`;
        userContext = `대화기록:\n${conversation.map(c => `[${c.role}]: ${c.content}`).join('\n')}`;
        break;

      case 2: // 아크 구조
        systemPrompt = `${systemBase}
현재 단계: 아크 구조 설계 (Step 2/6)
분석 결과: ${JSON.stringify(analysis)}

작가에게 3가지 아크 구조 버전을 제안하라:
A) 정석: 장르 성공 패턴 충실
B) 변주: 기존에 반전 추가
C) 실험: 독창적 (리스크/리워드 설명)

각 버전은 4~5개 아크(기승전결)로 나누고, 각 아크의 화수 범위와 핵심 전환점을 설명하라.
작가에게 "어떤 버전이 마음에 들어?" 물어라. 커스텀 조합도 가능하다고 안내하라.
작가가 "몇 화까지 계획할지"도 물어라 (30화/50화/100화).

작가가 선택하면:
<STEP_COMPLETE>{"selected_version":"A/B/C/custom","total_chapters":30,"arcs":[{"name":"","chapters":"1~10","description":"","tension_range":[3,7],"key_turning_point":""}]}</STEP_COMPLETE>`;
        userContext = `대화기록:\n${conversation.map(c => `[${c.role}]: ${c.content}`).join('\n')}`;
        break;

      case 3: // 캐릭터
        systemPrompt = `${systemBase}
현재 단계: 캐릭터 설계 (Step 3/6)
분석: ${JSON.stringify(analysis)}
선택된 아크: ${JSON.stringify(arcs)}

먼저 주인공에 대해 집중 질문하라:
- 이름? (작가가 정하고 싶은지, AI가 제안할지)
- 성격 키워드? (냉정/열혈/음침/유쾌 등)
- 강점과 약점?
- 성장 방향?

그 다음 히로인/라이벌/멘토 등 핵심 캐릭터를 1명씩 질문하며 설계하라.
한번에 모든 캐릭터를 만들지 말고, 1~2명씩 확인하며 진행하라.

4~6명 확정되면:
<STEP_COMPLETE>{"characters":[{"name":"","role":"주인공/히로인/라이벌/멘토/조력자","personality":"","appearance":"","abilities":[""],"speech_pattern":"","secret":"","arc":"성장방향"}]}</STEP_COMPLETE>`;
        userContext = `대화기록:\n${conversation.map(c => `[${c.role}]: ${c.content}`).join('\n')}\n현재 캐릭터: ${JSON.stringify(characters)}`;
        break;

      case 4: // 세계관
        systemPrompt = `${systemBase}
현재 단계: 세계관 설계 (Step 4/6)
분석: ${JSON.stringify(analysis)}
캐릭터: ${JSON.stringify(characters)}

장르에 맞는 세계관 질문을 하라:
- 능력 체계가 있다면 어떤 시스템? (레벨/랭크/마나 등)
- 주요 장소는? (모험 시작점, 최종 목적지 등)
- 세력/조직이 있나?
- 세계관의 고유 규칙은?

작가의 답변을 반영하며 하나씩 구축하라. 작가가 "AI가 알아서"라고 하면 제안하고 확인받아라.

확정되면:
<STEP_COMPLETE>{"world":[{"category":"능력체계/지리/세력/규칙/역사","name":"","description":""}]}</STEP_COMPLETE>`;
        userContext = `대화기록:\n${conversation.map(c => `[${c.role}]: ${c.content}`).join('\n')}\n현재 세계관: ${JSON.stringify(world)}`;
        break;

      case 5: // 화별 콘티
        systemPrompt = `${systemBase}
현재 단계: 화별 콘티 생성 (Step 5/6)
분석: ${JSON.stringify(analysis)}
아크: ${JSON.stringify(arcs)}
캐릭터: ${JSON.stringify(characters)}
세계관: ${JSON.stringify(world)}

아크 구조를 기반으로 화별 콘티를 생성하되:
1. 먼저 첫 아크(1~10화 정도)의 콘티를 보여주고 작가에게 확인받아라
2. 작가가 OK하면 다음 아크의 콘티를 생성하라
3. 한번에 전체를 쏟아내지 말고, 아크 단위로 나눠서 확인받아라
4. 각 화: 제목, 1줄 요약, 텐션(1~10), 핵심 이벤트, 클리프행어 아이디어

작가에게 물어봐라:
- "이 흐름이 마음에 들어?"
- "여기서 반전을 넣고 싶은 곳이 있어?"
- "텐션이 너무 높거나 낮은 곳이 있으면 말해줘"

전체 아크 콘티가 완성되면:
<STEP_COMPLETE>{"conti":[{"number":1,"title":"","summary":"","tension":5,"key_events":[""],"cliffhanger":"","characters_appearing":[""]}]}</STEP_COMPLETE>`;
        userContext = `대화기록:\n${conversation.slice(-10).map(c => `[${c.role}]: ${c.content}`).join('\n')}\n현재 콘티(${conti.length}화): ${JSON.stringify(conti.slice(-5))}`;
        break;

      case 6: // 복선
        systemPrompt = `${systemBase}
현재 단계: 복선/떡밥 설계 (Step 6/6 — 마지막!)
콘티: ${JSON.stringify(conti)}
캐릭터: ${JSON.stringify(characters)}

콘티를 분석해서 복선 5~10개를 제안하라:
- 각 복선: 설치 화, 힌트 화, 회수 화를 구체적으로 매핑
- 작가에게 "이 복선이 마음에 들어?"하고 하나씩 확인
- 작가가 추가 복선을 원하면 반영

확정되면:
<STEP_COMPLETE>{"foreshadows":[{"summary":"","plant_chapter":1,"hint_chapters":[5,10],"payoff_chapter":20,"connected_characters":[""],"reader_impact":""}]}</STEP_COMPLETE>

복선이 확정되면 마지막으로:
"이제 모든 기획이 끝났어! '작품 생성하기'를 누르면 이 기획을 바탕으로 작품이 자동 생성돼. 
캐릭터, 세계관, 복선이 StoryVault에 등록되고, 화별 제목이 미리 세팅돼. 준비됐어?"`;
        userContext = `대화기록:\n${conversation.slice(-8).map(c => `[${c.role}]: ${c.content}`).join('\n')}\n현재 복선: ${JSON.stringify(foreshadows)}`;
        break;

      default:
        systemPrompt = `${systemBase}\n기획이 완료되었습니다. 작가에게 수정하고 싶은 부분이 있는지 물어보세요.`;
        userContext = `대화기록:\n${conversation.slice(-5).map(c => `[${c.role}]: ${c.content}`).join('\n')}`;
    }

    // Call AI
    const priority = step === 5 ? 'critical' : step === 1 ? 'light' : 'standard';
    const raw = await callClaude(systemPrompt, userContext, step === 5 ? 6000 : 4000, priority);

    // Check for step completion
    let stepData = null;
    const completeMatch = raw.match(/<STEP_COMPLETE>([\s\S]*?)<\/STEP_COMPLETE>/);
    if (completeMatch) {
      try { stepData = JSON.parse(completeMatch[1]); } catch {}
    }

    // Clean response (remove the JSON tag from displayed text)
    const cleanResponse = raw.replace(/<STEP_COMPLETE>[\s\S]*?<\/STEP_COMPLETE>/, '').trim();

    // Add AI response to conversation
    conversation.push({ role: 'assistant', content: cleanResponse, step, timestamp: new Date().toISOString() });

    // Update plan
    const updates = { conversation: JSON.stringify(conversation), updated_at: new Date().toISOString() };

    if (stepData) {
      switch(step) {
        case 1:
          updates.analysis = JSON.stringify(stepData);
          updates.genre = (stepData.detected_genres || []).join(', ');
          updates.title = stepData.title_suggestions?.[0] || plan.title || '';
          updates.current_step = 2;
          updates.status = 'step2';
          break;
        case 2:
          updates.arcs = JSON.stringify(stepData);
          updates.selected_arc = stepData.selected_version || '';
          updates.current_step = 3;
          updates.status = 'step3';
          break;
        case 3:
          updates.characters = JSON.stringify(stepData.characters || []);
          updates.current_step = 4;
          updates.status = 'step4';
          break;
        case 4:
          updates.world = JSON.stringify(stepData.world || []);
          updates.current_step = 5;
          updates.status = 'step5';
          break;
        case 5:
          updates.conti = JSON.stringify(stepData.conti || []);
          updates.current_step = 6;
          updates.status = 'step6';
          break;
        case 6:
          updates.foreshadows = JSON.stringify(stepData.foreshadows || []);
          updates.current_step = 7;
          updates.status = 'completed';
          break;
      }
    }

    // Build SQL update
    const setClauses = Object.keys(updates).map(k => `${k}=?`).join(',');
    db.prepare(`UPDATE story_plans SET ${setClauses} WHERE id=?`).run(...Object.values(updates), plan.id);

    res.json({
      response: cleanResponse,
      step_completed: !!stepData,
      new_step: updates.current_step || step,
      status: updates.status || plan.status,
      step_data: stepData,
    });
  } catch (e) { next(e); }
});

// ====== MANUAL EDIT — 작가가 직접 수정 ======

router.put('/:id/conti', auth, (req, res) => {
  const { conti } = req.body;
  db.prepare('UPDATE story_plans SET conti=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .run(JSON.stringify(conti), req.params.id, req.userId);
  res.json({ ok: true });
});

router.put('/:id/characters', auth, (req, res) => {
  const { characters } = req.body;
  db.prepare('UPDATE story_plans SET characters=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .run(JSON.stringify(characters), req.params.id, req.userId);
  res.json({ ok: true });
});

router.put('/:id/world', auth, (req, res) => {
  const { world } = req.body;
  db.prepare('UPDATE story_plans SET world=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .run(JSON.stringify(world), req.params.id, req.userId);
  res.json({ ok: true });
});

router.put('/:id/foreshadows', auth, (req, res) => {
  const { foreshadows } = req.body;
  db.prepare('UPDATE story_plans SET foreshadows=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?')
    .run(JSON.stringify(foreshadows), req.params.id, req.userId);
  res.json({ ok: true });
});

// ====== EXTEND CONTI — 연장 (핵심!) ======

router.post('/:id/extend', auth, rateLimit('ai'), async (req, res, next) => {
  try {
    const plan = db.prepare('SELECT * FROM story_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId);
    if (!plan) return res.status(404).json({ error: '플랜 없음' });

    const { direction, extend_count } = req.body; // direction: 'middle' or 'end', extend_count: 10~30
    const count = Math.min(Math.max(extend_count || 10, 5), 50);
    let conti = [], characters = [], arcs = {};
    try { conti = JSON.parse(plan.conti || '[]'); } catch {}
    try { characters = JSON.parse(plan.characters || '[]'); } catch {}
    try { arcs = JSON.parse(plan.arcs || '{}'); } catch {}

    const lastCh = conti.length > 0 ? conti[conti.length - 1].number : 0;

    const system = `웹소설 콘티 연장 전문가. 기존 콘티를 자연스럽게 이어서 ${count}화를 추가 생성하라.
기존 아크 구조를 존중하되, 새로운 위기/반전을 추가하여 독자 흥미를 유지하라.
JSON 배열만 응답: [{"number":${lastCh+1},"title":"","summary":"","tension":5,"key_events":[""],"cliffhanger":"","characters_appearing":[""]}]`;

    const context = `아크: ${JSON.stringify(arcs)}
캐릭터: ${JSON.stringify(characters)}
기존 콘티 (마지막 5화): ${JSON.stringify(conti.slice(-5))}
작가 요청: ${direction === 'middle' ? '중반 확장 (템포를 늦추고 캐릭터 성장/관계 심화)' : '후반 연장 (새 아크/위기 추가)'}
추가할 화수: ${count}화 (${lastCh+1}화~${lastCh+count}화)`;

    const raw = await callClaude(system, context, 6000, 'critical');
    const parsed = parseJSON(raw);
    const newConti = Array.isArray(parsed) ? parsed : parsed.conti || parsed;

    if (Array.isArray(newConti)) {
      const extended = [...conti, ...newConti];
      db.prepare('UPDATE story_plans SET conti=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(JSON.stringify(extended), plan.id);
      res.json({ added: newConti.length, total: extended.length, new_chapters: newConti });
    } else {
      res.status(500).json({ error: 'AI 응답 파싱 실패', raw: typeof raw === 'string' ? raw.substring(0, 200) : '' });
    }
  } catch (e) { next(e); }
});

// ====== FINALIZE — 작품 생성 ======

router.post('/:id/finalize', auth, async (req, res, next) => {
  try {
    const plan = db.prepare('SELECT * FROM story_plans WHERE id=? AND user_id=?').get(req.params.id, req.userId);
    if (!plan) return res.status(404).json({ error: '플랜 없음' });

    let analysis = {}, characters = [], world = [], conti = [], foreshadows = [];
    try { analysis = JSON.parse(plan.analysis || '{}'); } catch {}
    try { characters = JSON.parse(plan.characters || '[]'); } catch {}
    try { world = JSON.parse(plan.world || '[]'); } catch {}
    try { conti = JSON.parse(plan.conti || '[]'); } catch {}
    try { foreshadows = JSON.parse(plan.foreshadows || '[]'); } catch {}

    const title = plan.title || analysis.title_suggestions?.[0] || '새 작품';
    const genre = plan.genre || (analysis.detected_genres || []).join(', ') || '판타지';

    // 1. Create work
    const work = db.prepare('INSERT INTO works (user_id, title, genre, style_preset) VALUES (?,?,?,?)').run(
      req.userId, title, genre, analysis.tone || 'action'
    );
    const workId = work.lastInsertRowid;

    // 2. Create chapters from conti
    const insertCh = db.prepare('INSERT INTO chapters (work_id, number, title, content) VALUES (?,?,?,?)');
    for (const ch of conti) {
      insertCh.run(workId, ch.number, ch.title || `제${ch.number}화`, '');
    }

    // 3. Register characters to vault
    const insertChar = db.prepare('INSERT INTO vault_characters (work_id, name, personality, appearance, abilities, speech_pattern, first_appearance) VALUES (?,?,?,?,?,?,?)');
    for (const ch of characters) {
      insertChar.run(workId, ch.name, ch.personality || '', ch.appearance || '', JSON.stringify(ch.abilities || []), ch.speech_pattern || '', 1);
    }

    // 4. Register world to vault
    const insertWorld = db.prepare('INSERT INTO vault_world (work_id, category, name, description) VALUES (?,?,?,?)');
    for (const w of world) {
      insertWorld.run(workId, w.category || '설정', w.name, w.description || '');
    }

    // 5. Register foreshadows to vault
    const insertFs = db.prepare('INSERT INTO vault_foreshadows (work_id, summary, planted_chapter, status, related_characters) VALUES (?,?,?,?,?)');
    for (const f of foreshadows) {
      insertFs.run(workId, f.summary, f.plant_chapter || 1, 'open', JSON.stringify(f.connected_characters || []));
    }

    // 6. Link plan to work
    db.prepare('UPDATE story_plans SET work_id=?, status="finalized", updated_at=CURRENT_TIMESTAMP WHERE id=?').run(workId, plan.id);

    res.json({
      work_id: workId,
      title,
      chapters_created: conti.length,
      characters_registered: characters.length,
      world_elements: world.length,
      foreshadows_registered: foreshadows.length,
    });
  } catch (e) { next(e); }
});

module.exports = router;
