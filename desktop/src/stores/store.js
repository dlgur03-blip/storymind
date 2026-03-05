import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from '../lib/Toast';

const tryParse = (s, fb) => { if (Array.isArray(s)) return s; try { return JSON.parse(s); } catch { return fb; } };

// Debounce timer for auto-extraction
let extractTimer = null;
const EXTRACT_DELAY = 10000; // 10 seconds after last save

export const useStore = create((set, get) => ({
  user: { id: 1, nickname: '작가' },
  darkMode: localStorage.getItem('sm_dark') === 'true',
  toggleDark: () => { const n = !get().darkMode; localStorage.setItem('sm_dark', n); set({ darkMode: n }); },

  // 데스크톱 앱 초기화 (로그인 불필요)
  init: async () => {
    await get().fetchWorks();
    await get().fetchDailyStats();
  },

  // Works
  works: [], currentWork: null,
  fetchWorks: async () => { try { set({ works: await api.get('/works') }); } catch (e) { toast(e.message, 'error'); } },
  createWork: async (title, genre, style_preset, work_type, daily_goal) => { const w = await api.post('/works', { title, genre, style_preset, work_type: work_type || 'novel', daily_goal }); await get().fetchWorks(); return w; },
  selectWork: async (work) => { set({ currentWork: work, currentChapter: null, reviewResult: null }); await get().fetchChapters(work.id); await get().fetchVault(work.id); },
  deleteWork: async (id) => { await api.delete('/works/' + id); set({ currentWork: null, currentChapter: null, chapters: [] }); await get().fetchWorks(); },
  importWork: async (workId, chapterTexts) => {
    const r = await api.post('/works/' + workId + '/import', { chapters: chapterTexts });
    toast(`${r.imported}화 임포트 완료!`, 'success');
    await get().fetchWorks();
    return r;
  },
  updateVaultMode: async (mode) => { const w = get().currentWork; if (!w) return; await api.put('/vault/' + w.id + '/mode', { vault_mode: mode }); set(s => ({ currentWork: { ...s.currentWork, vault_mode: mode } })); },

  // Chapters
  chapters: [], currentChapter: null,
  fetchChapters: async (wid) => { try { const chs = await api.get('/works/' + wid + '/chapters'); set({ chapters: chs }); if (chs.length > 0 && !get().currentChapter) await get().selectChapter(chs[chs.length - 1].id); } catch {} },
  selectChapter: async (cid) => { try { set({ currentChapter: await api.get('/chapters/' + cid), reviewResult: null }); } catch {} },
  createChapter: async () => { const { currentWork: w, chapters } = get(); if (!w) return; const n = chapters.length + 1; const ch = await api.post('/works/' + w.id + '/chapters', { number: n, title: '제' + n + '화' }); await get().fetchChapters(w.id); set({ currentChapter: ch }); },
  saveChapter: async (content, title) => {
    const c = get().currentChapter; if (!c) return;
    const w = get().currentWork;
    set({ isSaving: true });
    // Local backup
    try { localStorage.setItem('sm_backup_' + c.id, JSON.stringify({ content, title, t: Date.now() })); } catch {}
    try {
      await api.put('/chapters/' + c.id, { content, title: title || c.title });
      set(s => ({ isSaving: false, currentChapter: { ...s.currentChapter, content, title: title || s.currentChapter.title } }));
      try { localStorage.removeItem('sm_backup_' + c.id); } catch {}
      // Auto-extract: debounced call after successful save
      if (w && w.vault_mode !== 'manual') {
        clearTimeout(extractTimer);
        extractTimer = setTimeout(() => get().quickExtract(w.id, c.id), EXTRACT_DELAY);
      }
    }
    catch (e) { set({ isSaving: false }); toast('저장 실패 (로컬 백업됨)', 'error'); }
  },
  renameChapter: async (cid, title) => { await api.put('/chapters/' + cid, { title, content: undefined }); const w = get().currentWork; if (w) await get().fetchChapters(w.id); },
  recoverBackup: (chapterId) => { try { const b = localStorage.getItem('sm_backup_' + chapterId); return b ? JSON.parse(b) : null; } catch { return null; } },

  // Versions
  versions: [],
  fetchVersions: async (cid) => { try { set({ versions: await api.get('/chapters/' + cid + '/versions') }); } catch {} },
  loadVersion: async (vid) => { try { return await api.get('/chapters/versions/' + vid); } catch { return null; } },

  // Stats
  stats: { last7days: [], today: 0 },
  dailyStats: [],
  usage: { total: { calls: 0, tokens_in: 0, tokens_out: 0, cost: 0 }, last30days: [] },
  fetchStats: async () => { try { set({ stats: await api.get('/stats') }); } catch {} },
  fetchDailyStats: async () => { try { const r = await api.get('/stats'); set({ dailyStats: r.last7days || [] }); } catch {} },
  fetchUsage: async () => { try { set({ usage: await api.get('/usage') }); } catch {} },

  // 폴더 임포트 (데스크톱 전용)
  importFromFolder: async (title, genre, style, files) => {
    // 1. 작품 생성
    const work = await api.post('/works', { title, genre, style_preset: style });
    // 2. 파일들을 챕터로 임포트
    const chapters = files.map((f, i) => ({ number: i + 1, title: f.name.replace(/\.[^.]+$/, ''), content: f.content }));
    await api.post('/works/' + work.id + '/import', { chapters });
    await get().fetchWorks();
    toast(`${files.length}화 임포트 완료!`, 'success');
    return work;
  },

  // Vault (fixed URL: /vault/:workId not /vault/:workId/vault)
  vault: { characters: [], foreshadows: [], world: [], timeline: [], addressMatrix: [] },
  fetchVault: async (wid) => {
    try {
      const v = await api.get('/vault/' + wid);
      v.characters = v.characters.map(c => ({ ...c, aliases: tryParse(c.aliases, []), abilities: tryParse(c.abilities, []), relationships: tryParse(c.relationships, []), state_log: tryParse(c.state_log, []) }));
      v.foreshadows = v.foreshadows.map(f => ({ ...f, related_characters: tryParse(f.related_characters, []) }));
      if (!v.timeline) v.timeline = [];
      if (!v.addressMatrix) v.addressMatrix = [];
      set({ vault: v });
    } catch {}
  },
  addCharacter: async (data) => { const w = get().currentWork; if (!w) return; await api.post('/vault/' + w.id + '/characters', data); await get().fetchVault(w.id); },
  updateCharacter: async (id, data) => { await api.put('/vault/characters/' + id, data); const w = get().currentWork; if (w) await get().fetchVault(w.id); },
  deleteCharacter: async (id) => { await api.delete('/vault/characters/' + id); const w = get().currentWork; if (w) await get().fetchVault(w.id); },
  addForeshadow: async (data) => { const w = get().currentWork; if (!w) return; await api.post('/vault/' + w.id + '/foreshadows', data); await get().fetchVault(w.id); },
  updateForeshadow: async (id, data) => { await api.put('/vault/foreshadows/' + id, data); const w = get().currentWork; if (w) await get().fetchVault(w.id); },

  // AI
  reviewResult: null, isReviewing: false, suggestions: null, isSuggesting: false, ghostwriteResult: null, isGhostwriting: false,
  rightPanel: 'vault', isSaving: false, styleProfile: null, isLearningStyle: false,
  tensionHistory: [],

  reviewProgress: null, _reviewChapterId: null,

  runReview: async () => {
    const { currentWork: w, currentChapter: c } = get(); if (!w || !c) return;
    const targetChapterId = c.id;
    set({ isReviewing: true, rightPanel: 'review', reviewProgress: { total: 6, completed: 0, current: '검수 시작...' }, _reviewChapterId: targetChapterId });

    // Try SSE streaming first, fallback to POST
    try {
      const token = localStorage.getItem('sm_token');
      const eventSource = new EventSource(`/api/ai/review-stream?workId=${w.id}&chapterId=${c.id}&token=${token}`);
      // Note: EventSource doesn't support custom headers, so we use query param
      // But our SSE endpoint uses auth middleware expecting Bearer token
      // Fallback to POST method which is more reliable
      eventSource.close();
      throw new Error('SSE auth not supported, using POST');
    } catch {
      // POST fallback (reliable)
      try {
        const r = await api.post('/ai/review', { workId: w.id, chapterId: c.id });
        // Race condition guard: only apply if still on same chapter
        if (get()._reviewChapterId === targetChapterId) {
          set({ reviewResult: r, isReviewing: false, reviewProgress: null });
          await get().fetchVault(w.id);
          toast('검수 완료!', 'success');
        }
      } catch (e) {
        if (get()._reviewChapterId === targetChapterId) {
          set({ isReviewing: false, reviewResult: { error: e.message }, reviewProgress: null });
          toast(e.message, 'error');
        }
      }
    }
  },
  rejectIssue: async (issueType, issueDescription) => {
    const w = get().currentWork; if (!w) return;
    await api.post('/ai/feedback', { workId: w.id, issueType, issueDescription, action: 'reject' });
    // Remove from current result
    set(s => ({ reviewResult: s.reviewResult ? { ...s.reviewResult, issues: (s.reviewResult.issues||[]).filter(i => i.description !== issueDescription) } : null }));
    toast('이 유형의 이슈는 다음 검수에서 제외됩니다', 'info');
  },
  acceptIssue: async (issue) => {
    const w = get().currentWork; if (!w) return;
    await api.post('/ai/feedback', { workId: w.id, issueType: issue.type, issueDescription: issue.description, action: 'accept' });
    // Apply suggestion to editor if available
    if (issue.suggestion && issue.location) {
      const editor = window.__tiptapEditor;
      if (editor) {
        let pos = 0;
        editor.state.doc.descendants((node, nodePos) => {
          if (node.isText && pos === 0) {
            const idx = (node.text || '').indexOf(issue.location);
            if (idx !== -1) { pos = nodePos + idx; return false; }
          }
        });
        if (pos > 0) {
          editor.chain().setTextSelection({ from: pos, to: pos + issue.location.length }).run();
          // Scroll to selection
        }
      }
    }
    set(s => ({ reviewResult: s.reviewResult ? { ...s.reviewResult, issues: (s.reviewResult.issues||[]).filter(i => i.description !== issue.description) } : null }));
    toast('이슈 수락됨', 'success');
  },
  fetchTensionHistory: async (wid) => { try { set({ tensionHistory: await api.get('/ai/tension-history/' + wid) }); } catch {} },
  suggestStory: async (direction) => {
    const w = get().currentWork; if (!w) return;
    set({ isSuggesting: true, rightPanel: 'suggest' });
    try { set({ suggestions: await api.post('/ai/suggest-story', { workId: w.id, direction }), isSuggesting: false }); }
    catch (e) { set({ isSuggesting: false }); toast(e.message, 'error'); }
  },
  ghostwrite: async (idea) => {
    const { currentWork: w, currentChapter: c } = get(); if (!w) return;
    set({ isGhostwriting: true, rightPanel: 'ghostwrite' });
    try { set({ ghostwriteResult: await api.post('/ai/ghostwrite', { workId: w.id, idea, stylePreset: w.style_preset, chapterNum: c?.number }), isGhostwriting: false }); toast('대필 완료!', 'success'); }
    catch (e) { set({ isGhostwriting: false }); toast(e.message, 'error'); }
  },
  learnStyle: async () => {
    const w = get().currentWork; if (!w) return;
    set({ isLearningStyle: true });
    try { const d = await api.post('/ai/learn-style', { workId: w.id }); set({ styleProfile: d.profile || d, isLearningStyle: false }); toast('문체 학습 완료!', 'success'); }
    catch (e) { set({ isLearningStyle: false }); toast(e.message, 'error'); }
  },
  fetchStyleProfile: async (wid) => { try { set({ styleProfile: await api.get('/ai/style-profile/' + wid) }); } catch {} },

  // Quick Extract - lightweight auto-extraction without full review
  isExtracting: false,
  lastExtracted: null,
  quickExtract: async (workId, chapterId) => {
    if (get().isExtracting) return; // Already running
    set({ isExtracting: true });
    try {
      const r = await api.post('/ai/quick-extract', { workId, chapterId });
      set({ isExtracting: false, lastExtracted: Date.now() });
      if (r.ok && (r.inserted.characters > 0 || r.inserted.world > 0 || r.inserted.timeline > 0)) {
        // Refresh vault if new data was extracted
        await get().fetchVault(workId);
        const total = r.inserted.characters + r.inserted.world + r.inserted.timeline;
        toast(`설정 ${total}건 자동 추출됨`, 'info');
      }
    } catch {
      set({ isExtracting: false });
      // Silently fail - this is background operation
    }
  },

  // Settings panel
  showSettings: false,

  // Competition Benchmarking
  benchmarkResult: null,
  isBenchmarking: false,
  runBenchmark: async () => {
    const w = get().currentWork;
    if (!w) return;
    set({ isBenchmarking: true, benchmarkResult: null });
    try {
      const r = await api.get('/ai/benchmark/' + w.id);
      set({ benchmarkResult: r, isBenchmarking: false });
    } catch (e) {
      set({ isBenchmarking: false });
      toast(e.message, 'error');
    }
  },

  // Reader Persona Simulation
  readerSimulation: null,
  isSimulatingReaders: false,
  simulateReaders: async (personas) => {
    const { currentWork: w, currentChapter: c } = get();
    if (!w || !c) return;
    set({ isSimulatingReaders: true, readerSimulation: null });
    try {
      const r = await api.post('/ai/simulate-readers', { workId: w.id, chapterId: c.id, personas });
      set({ readerSimulation: r, isSimulatingReaders: false });
    } catch (e) {
      set({ isSimulatingReaders: false });
      toast(e.message, 'error');
    }
  },

  // Outline Mode
  outlineSummaries: [],
  isGeneratingOutline: false,
  generateOutline: async () => {
    const w = get().currentWork;
    if (!w) return;
    set({ isGeneratingOutline: true, outlineSummaries: [] });
    try {
      const r = await api.post('/ai/summarize-work', { workId: w.id });
      set({ outlineSummaries: r.summaries || [], isGeneratingOutline: false });
      toast(`${r.summaries?.length || 0}화 요약 완료`, 'success');
    } catch (e) {
      set({ isGeneratingOutline: false });
      toast(e.message, 'error');
    }
  },

  // Cliche Detection
  clicheResult: null,
  isDetectingCliches: false,
  detectCliches: async (useAI = false) => {
    const c = get().currentChapter;
    if (!c || !c.content) return;
    set({ isDetectingCliches: true, clicheResult: null });
    try {
      const r = await api.post('/ai/detect-cliches', { content: c.content, useAI });
      set({ clicheResult: r, isDetectingCliches: false });
      toast(`클리셰 ${r.total}건 발견`, 'info');
    } catch (e) {
      set({ isDetectingCliches: false });
      toast(e.message, 'error');
    }
  },

  // Name Generator
  generatedNames: null,
  isGeneratingNames: false,
  generateNames: async (style, gender, count, context) => {
    set({ isGeneratingNames: true, generatedNames: null });
    try {
      const r = await api.post('/ai/generate-names', { style, gender, count, context });
      set({ generatedNames: r.names || [], isGeneratingNames: false });
    } catch (e) {
      set({ isGeneratingNames: false });
      toast(e.message, 'error');
    }
  },
}));
