import React, { useState } from 'react';
import { useStore } from '../../stores/store';
import { Plus, FileText, History, Loader2, Pencil, Check, X } from 'lucide-react';

export default function ChapterSidebar() {
  const { chapters, currentChapter, selectChapter, createChapter, fetchVersions, versions, loadVersion, saveChapter, renameChapter } = useStore();
  const [showVersions, setShowVersions] = useState(false);
  const [loadingV, setLoadingV] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const openVersions = async () => {
    if (!currentChapter) return;
    setShowVersions(!showVersions);
    if (!showVersions) await fetchVersions(currentChapter.id);
  };

  const restoreVersion = async (vid) => {
    setLoadingV(true);
    const v = await loadVersion(vid);
    if (v?.content) { const e = window.__tiptapEditor; if (e) { e.commands.setContent(v.content); await saveChapter(v.content); } }
    setLoadingV(false); setShowVersions(false);
  };

  const startRename = (ch) => { setEditingId(ch.id); setEditTitle(ch.title || `제${ch.number}화`); };
  const confirmRename = async () => {
    if (editingId && editTitle.trim()) { await renameChapter(editingId, editTitle.trim()); }
    setEditingId(null);
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">화 목록</h3>
        <div className="flex gap-1">
          <button onClick={openVersions} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition" title="버전 이력"><History className="w-3.5 h-3.5 text-surface-400" /></button>
          <button onClick={createChapter} className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition" title="새 화"><Plus className="w-3.5 h-3.5 text-surface-400" /></button>
        </div>
      </div>

      {showVersions && (
        <div className="mb-3 p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg anim-fade">
          <div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400 mb-1">버전 이력 {loadingV && <Loader2 className="inline w-3 h-3 animate-spin" />}</div>
          {versions.length === 0 ? <p className="text-[10px] text-surface-400">이력 없음</p> : versions.map(v => (
            <button key={v.id} onClick={() => restoreVersion(v.id)} className="w-full text-left text-[10px] px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 rounded">
              {new Date(v.saved_at).toLocaleString('ko-KR')} ({v.word_count}자)
            </button>
          ))}
        </div>
      )}

      <div className="space-y-0.5">
        {chapters.map(ch => (
          <div key={ch.id} className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition ${currentChapter?.id === ch.id ? 'bg-neutral-50 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-400 font-medium' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`}>
            {editingId === ch.id ? (
              <div className="flex items-center gap-1 flex-1">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-1 text-xs px-1 py-0.5 border dark:border-surface-700 rounded bg-transparent" autoFocus onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingId(null); }} />
                <button onClick={confirmRename} className="p-0.5 text-neutral-600"><Check className="w-3 h-3" /></button>
                <button onClick={() => setEditingId(null)} className="p-0.5 text-surface-400"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <>
                <button onClick={() => selectChapter(ch.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate"><span className="text-xs text-surface-400 mr-1">{ch.number}.</span>{ch.title || '제' + ch.number + '화'}</span>
                </button>
                <button onClick={() => startRename(ch)} className="opacity-0 group-hover:opacity-100 p-0.5 text-surface-400 hover:text-neutral-800 transition" title="제목 수정"><Pencil className="w-3 h-3" /></button>
                {ch.word_count > 0 && <span className="text-[10px] text-surface-400 shrink-0">{ch.word_count.toLocaleString()}</span>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
