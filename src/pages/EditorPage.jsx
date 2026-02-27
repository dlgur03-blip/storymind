import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../stores/store';
import TipTapEditor from '../components/editor/TipTapEditor';
import ChapterSidebar from '../components/editor/ChapterSidebar';
import RightPanel from '../components/editor/RightPanel';
import EditorToolbar from '../components/editor/EditorToolbar';
import { ArrowLeft, PanelLeftClose, PanelRightClose, Moon, Sun, Download } from 'lucide-react';

export default function EditorPage() {
  const { workId } = useParams();
  const nav = useNavigate();
  const { works, currentWork, currentChapter, selectWork, saveChapter, fetchWorks, darkMode, toggleDark, fetchStyleProfile, fetchStats, fetchTensionHistory, runReview } = useStore();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const saveTimer = useRef(null);

  // #1-7 Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); const c = useStore.getState().currentChapter; const ed = window.__tiptapEditor; if (c && ed) saveChapter(ed.getHTML()); }
        if (e.shiftKey && e.key === 'R') { e.preventDefault(); runReview(); }
        if (e.key === '\\') { e.preventDefault(); setRightOpen(p => !p); }
        if (e.key === '[') { e.preventDefault(); setLeftOpen(p => !p); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (works.length === 0) await fetchWorks();
        const w = useStore.getState().works.find(w => w.id === +workId);
        if (w) { await selectWork(w); await fetchStyleProfile(w.id); await fetchStats(); await fetchTensionHistory(w.id); }
        else nav('/');
      } catch (e) { console.error('[EditorPage] Load error:', e); nav('/'); }
    })();
  }, [workId]);

  const onChange = useCallback((html) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveChapter(html), 2000);
  }, [saveChapter]);

  const exportWork = (fmt) => {
    const token = localStorage.getItem('sm_token');
    // Open export with auth header via fetch + blob
    fetch(`/api/works/${workId}/export?format=${fmt}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentWork?.title || 'export'}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!currentWork) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-surface-950 transition-colors">
      {/* Top bar */}
      <div className="flex items-center h-11 px-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 shrink-0">
        <button onClick={() => nav('/')} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-2"><ArrowLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold mr-2">{currentWork.title}</span>
        {currentChapter && <span className="text-xs text-surface-400">/ {currentChapter.title || currentChapter.number + '화'}</span>}
        <div className="flex-1" />
        <div className="relative group">
          <button className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1"><Download className="w-4 h-4 text-surface-400" /></button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 border dark:border-surface-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
            <button onClick={() => exportWork('txt')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">TXT 다운로드</button>
            <button onClick={() => exportWork('html')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">HTML 다운로드</button>
          </div>
        </div>
        <button onClick={toggleDark} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        <button onClick={() => setLeftOpen(!leftOpen)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1"><PanelLeftClose className={`w-4 h-4 transition ${leftOpen ? '' : 'rotate-180'}`} /></button>
        <button onClick={() => setRightOpen(!rightOpen)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg"><PanelRightClose className={`w-4 h-4 transition ${rightOpen ? '' : 'rotate-180'}`} /></button>
      </div>

      {/* Toolbar */}
      <EditorToolbar />

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden editor-layout">
        {leftOpen && <div className="w-56 sm:w-48 border-r border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto shrink-0 editor-sidebar"><ChapterSidebar /></div>}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-surface-950">
          {currentChapter ? <div className="max-w-3xl mx-auto tiptap-editor"><TipTapEditor content={currentChapter.content || ''} onChange={onChange} /></div> : <div className="flex items-center justify-center h-full text-surface-400">화를 선택하세요</div>}
        </div>
        {rightOpen && <div className="w-80 lg:w-96 border-l border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto shrink-0 editor-right-panel"><RightPanel /></div>}
      </div>
    </div>
  );
}
