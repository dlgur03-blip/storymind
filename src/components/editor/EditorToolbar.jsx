import React from 'react';
import { useStore } from '../../stores/store';
import { Bold, Italic, Underline, Heading1, Heading2, Quote, Minus, Wand2, Lightbulb, PenLine, Save, Loader2, GraduationCap } from 'lucide-react';

export default function EditorToolbar() {
  const { isSaving, isReviewing, runReview, currentChapter, currentWork, stats } = useStore();
  const cmd = fn => () => { const e = window.__tiptapEditor; if (e) fn(e); };
  const wc = (currentChapter?.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '').length;
  const goal = currentWork?.daily_goal || 3000;
  const pct = Math.min(100, Math.round(((stats.today || 0) / goal) * 100));

  return (
    <div className="flex items-center h-10 px-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 gap-0.5 shrink-0 overflow-x-auto">
      <ToolBtn icon={Bold} onClick={cmd(e => e.chain().focus().toggleBold().run())} />
      <ToolBtn icon={Italic} onClick={cmd(e => e.chain().focus().toggleItalic().run())} />
      <ToolBtn icon={Underline} onClick={cmd(e => e.chain().focus().toggleUnderline().run())} />
      <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />
      <ToolBtn icon={Heading1} onClick={cmd(e => e.chain().focus().toggleHeading({ level: 1 }).run())} />
      <ToolBtn icon={Heading2} onClick={cmd(e => e.chain().focus().toggleHeading({ level: 2 }).run())} />
      <ToolBtn icon={Quote} onClick={cmd(e => e.chain().focus().toggleBlockquote().run())} />
      <ToolBtn icon={Minus} onClick={cmd(e => e.chain().focus().setHorizontalRule().run())} />
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-2 mr-3">
        <div className="w-20 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full bg-neutral-700 rounded-full transition-all" style={{ width: pct + '%' }} />
        </div>
        <span className="text-[10px] text-surface-400">{pct}%</span>
      </div>
      <span className="text-xs text-surface-400 mr-3">{wc.toLocaleString()}자</span>
      <div className="flex items-center gap-1 text-xs text-surface-400 mr-2">
        {isSaving ? <><Loader2 className="w-3 h-3 animate-spin" />저장중</> : <><Save className="w-3 h-3" />저장됨</>}
      </div>
      <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />
      <button onClick={() => useStore.setState({ rightPanel: 'style' })} className="flex items-center gap-1 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 rounded-lg transition"><GraduationCap className="w-3.5 h-3.5" /><span className="hidden lg:inline">필체</span></button>
      <button onClick={() => useStore.setState({ rightPanel: 'suggest' })} className="flex items-center gap-1 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 rounded-lg transition"><Lightbulb className="w-3.5 h-3.5" /><span className="hidden lg:inline">전개</span></button>
      <button onClick={() => useStore.setState({ rightPanel: 'ghostwrite' })} className="flex items-center gap-1 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 rounded-lg transition"><PenLine className="w-3.5 h-3.5" /><span className="hidden lg:inline">대필</span></button>
      <button onClick={runReview} disabled={isReviewing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white hover:bg-neutral-950 disabled:opacity-60 rounded-lg transition ml-1">
        {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}{isReviewing ? '검수중...' : 'AI 검수'}
      </button>
    </div>
  );
}
function ToolBtn({ icon: I, onClick }) { return <button onClick={onClick} className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"><I className="w-4 h-4" /></button>; }
