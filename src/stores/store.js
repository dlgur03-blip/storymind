import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from '../lib/Toast';

const tryParse = (s, fb) => { if (Array.isArray(s)) return s; try { return JSON.parse(s); } catch { return fb; } };

export const useStore = create((set, get) => ({
  token: localStorage.getItem('sm_token') || null,
  user: null,
  darkMode: localStorage.getItem('sm_dark') === 'true',
  toggleDark: () => { const n = !get().darkMode; localStorage.setItem('sm_dark', n); set({ darkMode: n }); },

  // Auth
  checkAuth: async () => {
    const t = localStorage.getItem('sm_token'); if (!t) return;
    try { const u = await api.get('/auth/me'); set({ token: t, user: u }); await get().fetchWorks(); }
    catch { localStorage.removeItem('sm_token'); set({ token: null }); }
  },
  login: async (username, password) => { const d = await api.auth('/auth/login', { username, password }); localStorage.setItem('sm_token', d.token); set({ token: d.token, user: d.user }); await get().fetchWorks(); },
  register: async (username, password, nickname) => { const d = await api.auth('/auth/register', { username, password, nickname }); localStorage.setItem('sm_token', d.token); set({ token: d.token, user: d.user }); },
  googleLogin: async (credential) => { const d = await api.auth('/auth/google', { credential }); localStorage.setItem('sm_token', d.token); set({ token: d.token, user: d.user }); await get().fetchWorks(); },
  logout: () => { api.post('/auth/logout').catch(()=>{}); localStorage.removeItem('sm_token'); set({ token: null, user: null, works: [], currentWork: null }); },
  changePassword: async (currentPassword, newPassword) => { await api.put('/auth/password', { currentPassword, newPassword }); toast('비밀번호가 변경되었습니다', 'success'); },
  deleteAccount: async (password) => {
    const token = localStorage.getItem('sm_token');
    const r = await fetch('/api/auth/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ password }) });
    const d = await r.json(); if (d.error) throw new Error(d.error);
    localStorage.removeItem('sm_token'); set({ token: null, user: null });
  },
  changeNickname: async (nickname) => { await api.put('/auth/nickname', { nickname }); set(s => ({ user: { ...s.user, nickname } })); toast('닉네임이 변경되었습니다', 'success'); },

  // Works
  works: [], currentWork: null,
  fetchWorks: async () => { try { set({ works: await api.get('/works') }); } catch (e) { toast(e.message, 'error'); } },
  createWork: async (title, genre, style_preset, daily_goal) => { const w = await api.post('/works', { title, genre, style_preset, daily_goal }); await get().fetchWorks(); return w; },
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
    set({ isSaving: true });
    // Local backup
    try { localStorage.setItem('sm_backup_' + c.id, JSON.stringify({ content, title, t: Date.now() })); } catch {}
    try { await api.put('/chapters/' + c.id, { content, title: title || c.title }); set(s => ({ isSaving: false, currentChapter: { ...s.currentChapter, content, title: title || s.currentChapter.title } })); try { localStorage.removeItem('sm_backup_' + c.id); } catch {} }
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
  fetchStats: async () => { try { set({ stats: await api.get('/stats') }); } catch {} },

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

  // Settings panel
  showSettings: false,
}));
