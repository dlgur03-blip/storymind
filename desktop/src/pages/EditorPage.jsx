import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../stores/store';
import TipTapEditor from '../components/editor/TipTapEditor';
import ChapterSidebar from '../components/editor/ChapterSidebar';
import RightPanel from '../components/editor/RightPanel';
import EditorToolbar from '../components/editor/EditorToolbar';
import { ArrowLeft, PanelLeftClose, PanelRightClose, Moon, Sun, Download, Maximize2, Minimize2, Search, X, List, Loader2, ChevronDown, ChevronRight, Volume2, VolumeX, Pause, Play } from 'lucide-react';

export default function EditorPage() {
  const { workId } = useParams();
  const nav = useNavigate();
  const { works, currentWork, currentChapter, chapters, selectWork, saveChapter, fetchWorks, darkMode, toggleDark, fetchStyleProfile, fetchStats, fetchTensionHistory, runReview, selectChapter, generateOutline, outlineSummaries, isGeneratingOutline } = useStore();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showOutline, setShowOutline] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const saveTimer = useRef(null);

  // TTS Functions
  const startTTS = () => {
    if (!currentChapter?.content) return;
    const text = currentChapter.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = ttsRate;
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const toggleTTS = () => {
    if (!isSpeaking) {
      startTTS();
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // #1-7 Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && focusMode) { setFocusMode(false); return; }
      if (e.key === 'Escape' && showSearch) { setShowSearch(false); return; }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); const c = useStore.getState().currentChapter; const ed = window.__tiptapEditor; if (c && ed) saveChapter(ed.getHTML()); }
        if (e.shiftKey && e.key === 'R') { e.preventDefault(); runReview(); }
        if (e.key === '\\') { e.preventDefault(); setRightOpen(p => !p); }
        if (e.key === '[') { e.preventDefault(); setLeftOpen(p => !p); }
        if (e.key === 'f') { e.preventDefault(); setShowSearch(p => !p); }
        if (e.key === 'Enter') { e.preventDefault(); setFocusMode(p => !p); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusMode, showSearch]);

  // 검색 기능
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const results = [];
    chapters.forEach(ch => {
      if (!ch.content) return;
      const text = ch.content.replace(/<[^>]+>/g, '');
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + query.length + 30);
        results.push({ chapterId: ch.id, chapterTitle: ch.title || `${ch.number}화`, preview: '...' + text.slice(start, end) + '...' });
      }
    });
    setSearchResults(results);
  };

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

  const exportWork = async (fmt, platform = 'generic') => {
    const suffix = platform !== 'generic' ? `_${platform}` : '';
    // Electron 환경이면 네이티브 다이얼로그 사용
    if (window.electronAPI) {
      const token = localStorage.getItem('sm_token');
      const resp = await fetch(`/api/works/${workId}/export?format=${fmt}&platform=${platform}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      await window.electronAPI.saveFile({
        defaultName: `${currentWork?.title || 'export'}${suffix}.${fmt}`,
        content: text,
        filters: [{ name: fmt.toUpperCase(), extensions: [fmt] }]
      });
    } else {
      // 웹 환경 폴백
      const token = localStorage.getItem('sm_token');
      fetch(`/api/works/${workId}/export?format=${fmt}&platform=${platform}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentWork?.title || 'export'}${suffix}.${fmt}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  if (!currentWork) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-surface-950 transition-colors">
      {/* Top bar */}
      <div className="flex items-center h-11 px-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 shrink-0">
        <button onClick={() => nav('/')} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-2"><ArrowLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold mr-2">{currentWork.title}</span>
        {currentChapter && <span className="text-xs text-surface-400">/ {currentChapter.title || currentChapter.number + '화'}</span>}
        {currentChapter?.content && (() => {
          const text = (currentChapter.content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
          const charCount = text.replace(/\s+/g, '').length;
          const readingMin = Math.max(1, Math.round(charCount / 500));
          return (
            <span className="text-xs text-surface-400 ml-2 px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded">
              약 {readingMin}분
            </span>
          );
        })()}
        <div className="flex-1" />
        <button onClick={() => setShowOutline(true)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1" title="아웃라인"><List className="w-4 h-4 text-surface-400" /></button>
        <button onClick={() => setShowSearch(true)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1" title="검색 (Ctrl+F)"><Search className="w-4 h-4 text-surface-400" /></button>
        {/* TTS Controls */}
        <div className="flex items-center gap-1 mr-1">
          {isSpeaking ? (
            <>
              <button onClick={toggleTTS} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg" title={isPaused ? '재생' : '일시정지'}>
                {isPaused ? <Play className="w-4 h-4 text-blue-500" /> : <Pause className="w-4 h-4 text-blue-500" />}
              </button>
              <button onClick={stopTTS} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg" title="정지">
                <VolumeX className="w-4 h-4 text-red-500" />
              </button>
            </>
          ) : (
            <button onClick={startTTS} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg" title="TTS 읽기">
              <Volume2 className="w-4 h-4 text-surface-400" />
            </button>
          )}
        </div>
        <div className="relative group">
          <button className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1"><Download className="w-4 h-4 text-surface-400" /></button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white dark:bg-surface-800 border dark:border-surface-700 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            <div className="px-3 py-1 text-[10px] text-surface-400 border-b border-surface-100 dark:border-surface-700">일반</div>
            <button onClick={() => exportWork('txt')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">TXT</button>
            <button onClick={() => exportWork('html')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">HTML</button>
            <div className="px-3 py-1 text-[10px] text-surface-400 border-b border-t border-surface-100 dark:border-surface-700 mt-1">플랫폼별</div>
            <button onClick={() => exportWork('txt', 'naver')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">네이버 시리즈</button>
            <button onClick={() => exportWork('txt', 'kakao')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">카카오페이지</button>
            <button onClick={() => exportWork('txt', 'munpia')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">문피아</button>
            <button onClick={() => exportWork('txt', 'ridi')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-100 dark:hover:bg-surface-700">리디북스</button>
          </div>
        </div>
        <button onClick={() => setFocusMode(!focusMode)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1" title="집중 모드 (Ctrl+Enter)">
          {focusMode ? <Minimize2 className="w-4 h-4 text-blue-500" /> : <Maximize2 className="w-4 h-4 text-surface-400" />}
        </button>
        <button onClick={toggleDark} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        {!focusMode && <button onClick={() => setLeftOpen(!leftOpen)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg mr-1"><PanelLeftClose className={`w-4 h-4 transition ${leftOpen ? '' : 'rotate-180'}`} /></button>}
        {!focusMode && <button onClick={() => setRightOpen(!rightOpen)} className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 rounded-lg"><PanelRightClose className={`w-4 h-4 transition ${rightOpen ? '' : 'rotate-180'}`} /></button>}
      </div>

      {/* Toolbar */}
      <EditorToolbar />

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden editor-layout">
        {leftOpen && !focusMode && <div className="w-56 sm:w-48 border-r border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto shrink-0 editor-sidebar"><ChapterSidebar /></div>}
        <div className={`flex-1 overflow-y-auto bg-white dark:bg-surface-950 ${focusMode ? 'max-w-4xl mx-auto' : ''}`}>
          {currentChapter ? <div className={`mx-auto tiptap-editor ${focusMode ? 'max-w-2xl px-8' : 'max-w-3xl'}`}><TipTapEditor content={currentChapter.content || ''} onChange={onChange} /></div> : <div className="flex items-center justify-center h-full text-surface-400">화를 선택하세요</div>}
        </div>
        {rightOpen && !focusMode && <div className="w-80 lg:w-96 border-l border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto shrink-0 editor-right-panel"><RightPanel /></div>}
      </div>

      {/* 검색 모달 */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-20 z-50" onClick={() => setShowSearch(false)}>
          <div className="bg-white dark:bg-surface-900 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-3 border-b border-surface-200 dark:border-surface-800">
              <Search className="w-5 h-5 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="작품 내 검색..."
                className="flex-1 bg-transparent outline-none text-surface-900 dark:text-white"
                autoFocus
              />
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && (
                <div className="p-4 text-center text-surface-400 text-sm">검색 결과가 없습니다</div>
              )}
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { selectChapter(r.chapterId); setShowSearch(false); }}
                  className="w-full p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 border-b border-surface-100 dark:border-surface-800"
                >
                  <div className="text-sm font-medium text-surface-900 dark:text-white">{r.chapterTitle}</div>
                  <div className="text-xs text-surface-500 truncate">{r.preview}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 아웃라인 모달 */}
      {showOutline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOutline(false)}>
          <div className="bg-white dark:bg-surface-900 rounded-xl w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-neutral-600" />
                <span className="text-lg font-bold">아웃라인</span>
                <span className="text-xs text-surface-400">{chapters.length}화</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={generateOutline} disabled={isGeneratingOutline} className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-1">
                  {isGeneratingOutline ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {isGeneratingOutline ? '요약 생성 중...' : 'AI 요약 생성'}
                </button>
                <button onClick={() => setShowOutline(false)} className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded">
                  <X className="w-5 h-5 text-surface-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-surface-400">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>화가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch, i) => {
                    const summary = outlineSummaries.find(s => s.chapter === ch.number);
                    const isExpanded = expandedChapters.has(ch.id);
                    const text = (ch.content || '').replace(/<[^>]+>/g, '');
                    const wordCount = text.replace(/\s+/g, '').length;
                    return (
                      <div key={ch.id} className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const next = new Set(expandedChapters);
                            if (isExpanded) next.delete(ch.id);
                            else next.add(ch.id);
                            setExpandedChapters(next);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-surface-400 shrink-0" />}
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-700 dark:text-white shrink-0">
                            {ch.number}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium truncate dark:text-white">{ch.title || `${ch.number}화`}</div>
                            <div className="text-[10px] text-surface-400">{wordCount}자 • 약 {Math.max(1, Math.round(wordCount / 500))}분</div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); selectChapter(ch.id); setShowOutline(false); }}
                            className="text-[10px] px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded hover:bg-surface-200 dark:hover:bg-surface-600 transition"
                          >
                            이동
                          </button>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 border-t border-surface-100 dark:border-surface-800 pt-3 bg-surface-50 dark:bg-surface-800/50">
                            {summary ? (
                              <div className="space-y-2">
                                <p className="text-xs text-surface-600 dark:text-surface-300">{summary.summary}</p>
                                {summary.keyPoints?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.keyPoints.map((kp, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                        {kp}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-surface-400 truncate">{text.substring(0, 200)}...</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
