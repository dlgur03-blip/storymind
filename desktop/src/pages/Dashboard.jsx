import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../stores/store';
import { BookOpen, Plus, Trash2, Sparkles, PenTool, Moon, Sun, Settings, Target, Download, HelpCircle, FolderOpen, Zap, ExternalLink } from 'lucide-react';
import OnboardingGuide, { useOnboarding } from '../components/OnboardingGuide';

const GENRES = ['판타지','로맨스','무협','현대판타지','회귀물','미스터리','SF','기타'];
const STYLES = [
  { id:'action', label:'전투 액션형', desc:'나혼렙 스타일' },
  { id:'literary', label:'서사 몰입형', desc:'헤세 스타일' },
  { id:'romance', label:'일상 경쾌형', desc:'로맨스/학원물' },
  { id:'mystery', label:'미스터리 긴장형', desc:'스릴러/추리' },
];

export default function Dashboard() {
  const { user, works, fetchWorks, createWork, deleteWork, toggleDark, darkMode, fetchDailyStats, dailyStats, usage, fetchUsage, importFromFolder } = useStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('판타지');
  const [style, setStyle] = useState('action');
  const [workType, setWorkType] = useState('novel'); // novel | webtoon
  const [importFiles, setImportFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const { showOnboarding, closeOnboarding, reopenOnboarding } = useOnboarding();

  useEffect(() => { fetchWorks(); fetchDailyStats(); fetchUsage(); }, []);

  // 폴더 선택 및 파일 읽기
  const handleSelectFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectFolder();
    if (!folder) return;
    const files = await window.electronAPI.readTextFiles(folder);
    if (files.length === 0) {
      alert('선택한 폴더에 .txt 파일이 없습니다.');
      return;
    }
    setImportFiles(files);
    setShowImport(true);
  };

  const handleImport = async () => {
    if (!title.trim() || importFiles.length === 0) return;
    setImporting(true);
    try {
      const work = await importFromFolder(title.trim(), genre, style, importFiles);
      setShowImport(false);
      setTitle('');
      setImportFiles([]);
      navigate(`/editor/${work.id}`);
    } catch (e) {
      alert('임포트 실패: ' + e.message);
    }
    setImporting(false);
  };

  const todayWords = dailyStats.find(s => s.date === new Date().toISOString().slice(0,10))?.words_written || 0;
  const goal = user?.daily_goal || 3000;
  const progress = Math.min(100, Math.round((todayWords / goal) * 100));

  const handleCreate = async () => {
    if (!title.trim()) return;
    const work = await createWork(title.trim(), genre, style, workType);
    setShowCreate(false); setTitle(''); setWorkType('novel');
    navigate(`/editor/${work.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors">
      <header className="border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center">
              <PenTool className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-white">StoryMind</h1>
              <p className="text-[10px] text-surface-400">by Fedma</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500 dark:text-surface-400 hidden sm:block">{user?.pen_name || user?.email}</span>
            <button onClick={reopenOnboarding} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition" title="사용 가이드">
              <HelpCircle className="w-4 h-4 text-surface-400" />
            </button>
            <button onClick={toggleDark} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition">
              {darkMode ? <Sun className="w-4 h-4 text-neutral-400" /> : <Moon className="w-4 h-4 text-surface-500" />}
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition" title="설정">
              <Settings className="w-4 h-4 text-surface-400" />
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition text-sm font-medium">
              <Plus className="w-4 h-4" /> 새 작품
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Daily Goal */}
        <div className="mb-6 p-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neutral-800 dark:text-white" />
              <span className="text-sm font-medium dark:text-white">오늘의 목표</span>
            </div>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">{todayWords.toLocaleString()} / {goal.toLocaleString()}자</span>
          </div>
          <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {progress >= 100 && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-medium">🎉 목표 달성! 대단해요!</p>}
        </div>

        {/* 주간 통계 그래프 */}
        {dailyStats.length > 0 && (
          <div className="mb-6 p-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800">
            <h3 className="text-sm font-medium dark:text-white mb-3">최근 7일 집필량</h3>
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const maxChars = Math.max(...dailyStats.map(s => s.chars_written || 0), 1);
                return dailyStats.slice(-7).map((s, i) => {
                  const height = Math.max(4, ((s.chars_written || 0) / maxChars) * 100);
                  const day = new Date(s.date).toLocaleDateString('ko-KR', { weekday: 'short' });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-20">
                        <span className="text-[10px] text-surface-400 mb-1">{(s.chars_written || 0).toLocaleString()}</span>
                        <div
                          className="w-full bg-neutral-800 dark:bg-neutral-300 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                          title={`${s.date}: ${(s.chars_written || 0).toLocaleString()}자`}
                        />
                      </div>
                      <span className="text-[10px] text-surface-400 mt-1">{day}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Works */}
        {works.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-surface-300 mx-auto mb-4" />
            <p className="text-surface-400 mb-4">아직 작품이 없습니다</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-neutral-900 dark:bg-white text-white rounded-lg hover:bg-neutral-950">첫 작품 시작하기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map(w => (
              <div key={w.id} onClick={() => navigate(`/editor/${w.id}`)} className="group bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-5 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-neutral-900 dark:text-white" />
                  </div>
                  <button onClick={e => { e.stopPropagation(); if(confirm('삭제하시겠습니까?')) deleteWork(w.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-neutral-700 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-surface-900 dark:text-white mb-1">{w.title}</h3>
                <div className="flex gap-2 text-xs mb-2">
                  <span className="px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800/30 text-neutral-900 dark:text-white rounded-full">{w.genre || '장르 미정'}</span>
                  <span className="px-2 py-0.5 bg-vault-50 dark:bg-neutral-800/30 text-vault-600 rounded-full">{STYLES.find(s=>s.id===w.style_preset)?.label || w.style_preset}</span>
                </div>
                <div className="flex justify-between text-xs text-surface-400">
                  <span>{w.chapter_count || 0}화 / {(w.total_words || 0).toLocaleString()}자</span>
                  <span>{new Date(w.updated_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 anim-fade" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white"><Sparkles className="w-5 h-5 text-neutral-800" /> 새 작품</h3>
            <div className="space-y-4">
              {/* 작품 유형 선택 */}
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">유형</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>setWorkType('novel')} className={`p-3 rounded-lg text-left border-2 transition ${workType==='novel'?'border-neutral-500 bg-neutral-50 dark:bg-neutral-800/30':'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                    <div className="text-sm font-medium dark:text-white">📖 웹소설</div>
                    <div className="text-xs text-surface-400">일반 서사체 집필</div>
                  </button>
                  <button onClick={()=>setWorkType('webtoon')} className={`p-3 rounded-lg text-left border-2 transition ${workType==='webtoon'?'border-blue-500 bg-blue-50 dark:bg-blue-900/20':'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                    <div className="text-sm font-medium dark:text-white">🎨 웹툰</div>
                    <div className="text-xs text-surface-400">씬/대사 스크립트</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">제목</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="작품 제목" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 dark:text-white focus:ring-2 focus:ring-neutral-800 outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&handleCreate()} />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">장르</label>
                <div className="flex flex-wrap gap-2">{GENRES.map(g => (
                  <button key={g} onClick={()=>setGenre(g)} className={`px-3 py-1 rounded-full text-sm transition ${genre===g?'bg-neutral-900 dark:bg-white text-white':'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'}`}>{g}</button>
                ))}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">문체 스타일</label>
                <div className="grid grid-cols-2 gap-2">{STYLES.map(s => (
                  <button key={s.id} onClick={()=>setStyle(s.id)} className={`p-3 rounded-lg text-left border transition ${style===s.id?'border-neutral-500 bg-neutral-50 dark:bg-neutral-800/30':'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                    <div className="text-sm font-medium dark:text-white">{s.label}</div>
                    <div className="text-xs text-surface-400">{s.desc}</div>
                  </button>
                ))}</div>
              </div>
              <button onClick={handleCreate} disabled={!title.trim()} className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:opacity-90 disabled:opacity-40 transition font-medium">바로 시작</button>
              <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div></div><div className="relative flex justify-center"><span className="bg-white dark:bg-surface-900 px-3 text-xs text-neutral-400">또는</span></div></div>
              <button onClick={() => navigate('/planner-survey')} className="w-full py-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-lg hover:border-neutral-500 hover:text-neutral-800 transition font-medium text-sm flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />AI 콘티 플래너로 기획부터</button>
            </div>
          </div>
        </div>
      )}

      {/* Token Usage */}
      <footer className="max-w-6xl mx-auto px-6 py-4 mt-8 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-center justify-between text-sm text-surface-500 mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>API 사용량</span>
            </div>
            <span className="text-surface-400">|</span>
            <span>호출: <strong className="text-surface-700 dark:text-surface-300">{usage.total?.calls || 0}</strong>회</span>
            <span>토큰: <strong className="text-surface-700 dark:text-surface-300">{((usage.total?.tokens_in || 0) + (usage.total?.tokens_out || 0)).toLocaleString()}</strong></span>
            <span>비용: <strong className="text-surface-700 dark:text-surface-300">${(usage.total?.cost || 0).toFixed(4)}</strong></span>
          </div>
          <button onClick={handleSelectFolder} className="flex items-center gap-2 px-3 py-1.5 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition">
            <FolderOpen className="w-4 h-4" />
            기존 원고 임포트
          </button>
        </div>
        {/* 플랫폼 바로가기 */}
        <div className="flex items-center justify-center gap-4 pt-3 border-t border-surface-100 dark:border-surface-800">
          <span className="text-xs text-surface-400">연재 플랫폼:</span>
          <a href="https://www.munpia.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-surface-500 hover:text-blue-500 transition">
            <ExternalLink className="w-3 h-3" /> 문피아
          </a>
          <a href="https://novelpia.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-surface-500 hover:text-green-500 transition">
            <ExternalLink className="w-3 h-3" /> 노벨피아
          </a>
          <a href="https://www.joara.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-surface-500 hover:text-purple-500 transition">
            <ExternalLink className="w-3 h-3" /> 조아라
          </a>
        </div>
      </footer>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 anim-fade" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white"><FolderOpen className="w-5 h-5 text-blue-500" /> 원고 임포트</h3>
            <p className="text-sm text-surface-500 mb-4">{importFiles.length}개 파일을 새 작품으로 임포트합니다.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">작품 제목</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="작품 제목" className="w-full px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 dark:text-white focus:ring-2 focus:ring-neutral-800 outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">장르</label>
                <div className="flex flex-wrap gap-2">{GENRES.map(g => (
                  <button key={g} onClick={()=>setGenre(g)} className={`px-3 py-1 rounded-full text-sm transition ${genre===g?'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900':'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'}`}>{g}</button>
                ))}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">문체 스타일</label>
                <div className="grid grid-cols-2 gap-2">{STYLES.map(s => (
                  <button key={s.id} onClick={()=>setStyle(s.id)} className={`p-3 rounded-lg text-left border transition ${style===s.id?'border-neutral-500 bg-neutral-50 dark:bg-neutral-800/30':'border-surface-200 dark:border-surface-700 hover:border-surface-300'}`}>
                    <div className="text-sm font-medium dark:text-white">{s.label}</div>
                    <div className="text-xs text-surface-400">{s.desc}</div>
                  </button>
                ))}</div>
              </div>
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-surface-400 mb-2">임포트할 파일:</p>
                {importFiles.map((f, i) => (
                  <div key={i} className="text-sm text-surface-600 dark:text-surface-300">{i+1}. {f.name}</div>
                ))}
              </div>
              <button onClick={handleImport} disabled={!title.trim() || importing} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition font-medium">
                {importing ? '임포트 중...' : `${importFiles.length}화 임포트`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding tutorial */}
      {showOnboarding && <OnboardingGuide onClose={closeOnboarding} />}
    </div>
  );
}
