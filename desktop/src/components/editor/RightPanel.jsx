import React, { useState, useEffect } from 'react';
import { useStore } from '../../stores/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { highlightIssuesInEditor } from './TipTapEditor';
import { BookOpen, Wand2, Lightbulb, PenLine, GraduationCap, Settings, Loader2, AlertTriangle, AlertCircle, Info, Sparkles, ChevronDown, ChevronUp, Plus, Send, X, Ban, Lock, Trash2, User, TrendingUp, BarChart3 } from 'lucide-react';

const TABS=[{id:'vault',icon:BookOpen},{id:'review',icon:Wand2},{id:'tension',icon:TrendingUp},{id:'analyze',icon:BarChart3},{id:'suggest',icon:Lightbulb},{id:'ghostwrite',icon:PenLine},{id:'style',icon:GraduationCap},{id:'settings',icon:Settings}];

export default function RightPanel(){const{rightPanel}=useStore();return(<div className="flex flex-col h-full"><div className="flex border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shrink-0">{TABS.map(t=><button key={t.id} onClick={()=>useStore.setState({rightPanel:t.id})} className={`flex-1 flex items-center justify-center py-2.5 text-[11px] font-medium transition border-b-2 ${rightPanel===t.id?'border-neutral-500 text-neutral-900 dark:text-white':'border-transparent text-surface-400 hover:text-surface-600'}`}><t.icon className="w-3.5 h-3.5"/></button>)}</div><div className="flex-1 overflow-y-auto p-3">{rightPanel==='vault'&&<VaultPanel/>}{rightPanel==='review'&&<ReviewPanel/>}{rightPanel==='tension'&&<TensionPanel/>}{rightPanel==='analyze'&&<AnalyzePanel/>}{rightPanel==='suggest'&&<SuggestPanel/>}{rightPanel==='ghostwrite'&&<GhostwritePanel/>}{rightPanel==='style'&&<StylePanel/>}{rightPanel==='settings'&&<SettingsPanel/>}</div></div>);}

// ── VAULT with mode selector + relationship graph ──
function VaultPanel() {
  const { vault, addCharacter, addForeshadow, currentChapter, currentWork, updateVaultMode, isExtracting, generateNames, generatedNames, isGeneratingNames } = useStore();
  const [tab, setTab] = useState('chars');
  const [showAddChar, setShowAddChar] = useState(false);
  const [charName, setCharName] = useState('');
  const [charAppearance, setCharAppearance] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [showNameGen, setShowNameGen] = useState(false);
  const [nameStyle, setNameStyle] = useState('korean');
  const [nameGender, setNameGender] = useState('any');
  const mode = currentWork?.vault_mode || 'smart';

  const handleAddCharacter = () => {
    if (charName.trim()) {
      addCharacter({
        name: charName.trim(),
        appearance: charAppearance,
        personality: charPersonality,
        first_appearance: currentChapter?.number || 1
      });
      setShowAddChar(false);
      setCharName('');
      setCharAppearance('');
      setCharPersonality('');
    }
  };

  const VAULT_TABS = [
    { id: 'chars', label: '캐릭터', count: vault.characters?.length || 0 },
    { id: 'foreshadow', label: '복선', count: vault.foreshadows?.length || 0 },
    { id: 'world', label: '세계관', count: vault.world?.length || 0 },
    { id: 'timeline', label: '시간선', count: vault.timeline?.length || 0 },
    { id: 'relations', label: '관계도', count: null },
  ];

  return (
    <div>
      {/* Auto-extraction indicator */}
      {isExtracting && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[10px] text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>설정 자동 추출 중...</span>
        </div>
      )}
      {/* Vault Mode Selector */}
      <div className="flex items-center gap-1 mb-3 p-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg">
        {[
          { id: 'manual', label: '수동', desc: '직접 관리' },
          { id: 'smart', label: '스마트', desc: 'AI 제안 후 승인' },
          { id: 'auto', label: '자동', desc: 'AI 자동 추가' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => updateVaultMode(m.id)}
            className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${mode === m.id ? 'bg-white dark:bg-surface-700 shadow-sm text-neutral-700 dark:text-white' : 'text-surface-400 hover:text-surface-600'}`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {VAULT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[50px] text-[10px] py-1.5 px-1 rounded-md font-medium transition whitespace-nowrap ${tab === t.id ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900' : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
          >
            {t.label}{t.count !== null && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Characters Tab */}
      {tab === 'chars' && (
        <div className="space-y-2">
          {vault.characters?.length === 0 && !showAddChar && (
            <div className="text-center py-6 text-surface-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs mb-2">등록된 캐릭터가 없습니다</p>
              <p className="text-[10px]">아래 버튼으로 추가하거나<br />AI 검수 시 자동 추출됩니다</p>
            </div>
          )}
          {vault.characters?.map(c => <CharCard key={c.id} c={c} />)}

          {/* Add Character Button/Form */}
          {!showAddChar ? (
            <button
              onClick={() => setShowAddChar(true)}
              className="w-full py-3 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg text-sm text-surface-500 hover:border-neutral-500 hover:text-neutral-700 dark:hover:text-white transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              캐릭터 추가
            </button>
          ) : (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">새 캐릭터</span>
                <button onClick={() => setShowNameGen(!showNameGen)} className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 transition">
                  ✨ 이름 생성
                </button>
              </div>

              {/* Name Generator Panel */}
              {showNameGen && (
                <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2 anim-fade">
                  <div className="flex gap-2">
                    <select value={nameStyle} onChange={e => setNameStyle(e.target.value)} className="flex-1 text-[10px] px-2 py-1.5 border dark:border-surface-700 rounded bg-transparent">
                      <option value="korean">한국 현대</option>
                      <option value="korean_historical">한국 사극</option>
                      <option value="chinese">중국풍</option>
                      <option value="japanese">일본풍</option>
                      <option value="fantasy_western">서양 판타지</option>
                      <option value="fantasy_eastern">동양 판타지</option>
                      <option value="scifi">SF/미래</option>
                      <option value="unique">독특한</option>
                    </select>
                    <select value={nameGender} onChange={e => setNameGender(e.target.value)} className="text-[10px] px-2 py-1.5 border dark:border-surface-700 rounded bg-transparent">
                      <option value="any">무관</option>
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                  </div>
                  <button onClick={() => generateNames(nameStyle, nameGender, 5, charPersonality)} disabled={isGeneratingNames} className="w-full text-[10px] py-1.5 bg-blue-500 text-white rounded flex items-center justify-center gap-1 disabled:opacity-60">
                    {isGeneratingNames ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isGeneratingNames ? '생성 중...' : '이름 5개 생성'}
                  </button>
                  {generatedNames && generatedNames.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {generatedNames.map((n, i) => (
                        <button key={i} onClick={() => { setCharName(n.name); setShowNameGen(false); }} className="w-full text-left p-1.5 hover:bg-surface-50 dark:hover:bg-surface-700 rounded transition">
                          <div className="text-xs font-medium">{n.name}</div>
                          <div className="text-[9px] text-surface-400">{n.meaning}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <input
                value={charName}
                onChange={e => setCharName(e.target.value)}
                placeholder="이름 *"
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 dark:text-white"
                autoFocus
              />
              <input
                value={charAppearance}
                onChange={e => setCharAppearance(e.target.value)}
                placeholder="외모 (예: 검은 머리, 큰 키)"
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 dark:text-white"
              />
              <input
                value={charPersonality}
                onChange={e => setCharPersonality(e.target.value)}
                placeholder="성격 (예: 냉철하지만 따뜻한)"
                className="w-full text-sm px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 dark:text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCharacter}
                  disabled={!charName.trim()}
                  className="flex-1 text-sm py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium disabled:opacity-40"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowAddChar(false)}
                  className="flex-1 text-sm py-2 bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 rounded-lg"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Foreshadow Tab */}
      {tab === 'foreshadow' && (
        <div className="space-y-2">
          {vault.foreshadows?.length === 0 && (
            <div className="text-center py-6 text-surface-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs mb-2">등록된 복선이 없습니다</p>
              <p className="text-[10px]">아래에서 추가하거나<br />AI 검수 시 자동 추출됩니다</p>
            </div>
          )}
          {vault.foreshadows?.filter(f => f.status === 'open').length > 0 && (
            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
              ⚠ 미회수 복선 {vault.foreshadows.filter(f => f.status === 'open').length}개
            </div>
          )}
          {vault.foreshadows?.map(f => <FSCard key={f.id} f={f} />)}
          <AddFS />
        </div>
      )}

      {/* World Tab */}
      {tab === 'world' && (
        <div className="space-y-2">
          {(!vault.world || vault.world.length === 0) ? (
            <div className="text-center py-6 text-surface-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs mb-2">세계관 정보가 없습니다</p>
              <p className="text-[10px]">AI 검수 실행 시<br />지명, 아이템, 설정 등이 자동 추출됩니다</p>
            </div>
          ) : (
            vault.world.map(w => (
              <div key={w.id} className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{w.category}</span>
                  <span className="text-sm font-medium dark:text-white">{w.name}</span>
                </div>
                <p className="text-xs text-surface-500">{w.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Timeline Tab - Visual Timeline */}
      {tab === 'timeline' && (
        <TimelineVisual timeline={vault.timeline || []} />
      )}

      {/* Relations Tab */}
      {tab === 'relations' && <RelationGraph chars={vault.characters || []} />}
    </div>
  );
}

// Timeline Visual Component
function TimelineVisual({ timeline }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'visual'

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-6 text-surface-400">
        <div className="text-2xl mb-2">🕐</div>
        <p className="text-xs mb-2">시간선이 비어있습니다</p>
        <p className="text-[10px]">AI 검수 실행 시<br />각 화의 사건과 시간 정보가 자동 구축됩니다</p>
      </div>
    );
  }

  const seasonColors = { '봄': '#ec4899', '여름': '#22c55e', '가을': '#f97316', '겨울': '#3b82f6', '미상': '#a3a3a3' };
  const seasonIcons = { '봄': '🌸', '여름': '☀️', '가을': '🍂', '겨울': '❄️', '미상': '🕐' };

  // Group by chapter
  const grouped = timeline.reduce((acc, t) => {
    if (!acc[t.chapter]) acc[t.chapter] = [];
    acc[t.chapter].push(t);
    return acc;
  }, {});

  const chapters = Object.keys(grouped).sort((a, b) => +a - +b);

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
        <button onClick={() => setViewMode('list')} className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${viewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-surface-400'}`}>리스트</button>
        <button onClick={() => setViewMode('visual')} className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${viewMode === 'visual' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-surface-400'}`}>타임라인</button>
      </div>

      {/* Visual Timeline Mode */}
      {viewMode === 'visual' && (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-surface-200 dark:bg-surface-700" />

          {chapters.map((chNum, idx) => (
            <div key={chNum} className="relative mb-4 last:mb-0">
              {/* Chapter marker */}
              <div className="absolute left-0 w-4 h-4 rounded-full bg-neutral-700 dark:bg-white border-2 border-white dark:border-surface-900 -translate-x-1.5 z-10" />

              {/* Chapter header */}
              <div className="mb-2 ml-4">
                <span className="text-xs font-bold text-neutral-700 dark:text-white">{chNum}화</span>
                {grouped[chNum][0]?.season && (
                  <span className="ml-2 text-[10px]" style={{ color: seasonColors[grouped[chNum][0].season] }}>
                    {seasonIcons[grouped[chNum][0].season]} {grouped[chNum][0].season}
                  </span>
                )}
              </div>

              {/* Events for this chapter */}
              <div className="ml-4 space-y-2">
                {grouped[chNum].map((event, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 text-xs">
                    <p className="font-medium dark:text-white">{event.event_summary}</p>
                    {event.in_world_time && (
                      <p className="text-[10px] text-surface-400 mt-1">🕐 {event.in_world_time}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List Mode */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {timeline.map((t, i) => (
            <div key={i} className="flex gap-3 p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: (seasonColors[t.season] || '#a3a3a3') + '20', color: seasonColors[t.season] || '#a3a3a3' }}>
                {t.chapter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium dark:text-white">{t.event_summary}</p>
                <div className="flex gap-3 mt-1">
                  {t.in_world_time && <span className="text-[10px] text-surface-400">🕐 {t.in_world_time}</span>}
                  {t.season && <span className="text-[10px]" style={{ color: seasonColors[t.season] }}>{seasonIcons[t.season]} {t.season}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Season summary */}
      <div className="p-2 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
        <div className="text-[10px] font-medium text-surface-500 mb-1">계절 분포</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(seasonColors).map(([season, color]) => {
            const count = timeline.filter(t => t.season === season).length;
            if (count === 0) return null;
            return (
              <span key={season} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>
                {seasonIcons[season]} {season} ({count})
              </span>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-surface-400 text-center">{timeline.length}개 이벤트 / {chapters.length}화</p>
    </div>
  );
}

// #8 Enhanced SVG relationship graph with interaction
function RelationGraph({ chars }) {
  const { updateCharacter } = useStore();
  const [selectedChar, setSelectedChar] = useState(null);
  const [showAddRel, setShowAddRel] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('');

  if (!chars || chars.length === 0) {
    return (
      <div className="text-center py-6 text-surface-400">
        <div className="text-2xl mb-2">🔗</div>
        <p className="text-xs mb-2">관계도를 표시할 캐릭터가 없습니다</p>
        <p className="text-[10px]">"캐릭터" 탭에서 캐릭터를 추가하면<br />관계도가 자동으로 생성됩니다</p>
      </div>
    );
  }

  const r = Math.min(120, 60 + chars.length * 10);
  const cx = 160; const cy = 150;
  const positions = chars.map((c, i) => {
    const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), char: c };
  });

  // Relationship type colors
  const relColors = { '가족': '#ef4444', '연인': '#ec4899', '친구': '#22c55e', '적': '#f97316', '동료': '#3b82f6', '스승': '#8b5cf6', '제자': '#a855f7' };
  const getRelColor = (type) => relColors[type] || '#a3a3a3';

  // Build relationship lines with bidirectional support
  const lines = [];
  const seenPairs = new Set();
  chars.forEach((c, i) => {
    const rels = Array.isArray(c.relationships) ? c.relationships : [];
    rels.forEach(rel => {
      const target = typeof rel === 'string' ? rel : (rel.name || rel.target || '');
      const type = typeof rel === 'object' ? rel.type || '' : '';
      const j = chars.findIndex(ch => ch.name === target);
      const pairKey = [Math.min(i, j), Math.max(i, j)].join('-');
      if (j >= 0 && j < positions.length && !seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        lines.push({ from: positions[i], to: positions[j], label: type, color: getRelColor(type) });
      }
    });
  });

  const handleAddRelationship = () => {
    if (!selectedChar || !relTarget || !relType) return;
    const rels = Array.isArray(selectedChar.relationships) ? [...selectedChar.relationships] : [];
    rels.push({ name: relTarget, type: relType });
    updateCharacter(selectedChar.id, { ...selectedChar, relationships: rels });
    setShowAddRel(false);
    setRelTarget('');
    setRelType('');
  };

  return (
    <div className="anim-fade space-y-3">
      <svg viewBox="0 0 320 300" className="w-full">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#a3a3a3" />
          </marker>
        </defs>
        {/* Connection lines */}
        {lines.map((l, i) => (
          <g key={i}>
            <line x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} stroke={l.color} strokeWidth="2" strokeOpacity="0.6" />
            {l.label && (
              <g transform={`translate(${(l.from.x + l.to.x) / 2}, ${(l.from.y + l.to.y) / 2})`}>
                <rect x="-18" y="-8" width="36" height="14" rx="4" fill="white" className="dark:fill-surface-800" />
                <text x="0" y="3" textAnchor="middle" className="text-[8px] font-medium" fill={l.color}>{l.label}</text>
              </g>
            )}
          </g>
        ))}
        {/* Character nodes */}
        {positions.map((p, i) => (
          <g key={i} className="cursor-pointer" onClick={() => setSelectedChar(p.char)}>
            <circle cx={p.x} cy={p.y} r={selectedChar?.id === p.char.id ? 25 : 22} className={p.char.is_alive ? "fill-neutral-700 dark:fill-neutral-300" : "fill-surface-400"} stroke={selectedChar?.id === p.char.id ? "#525252" : "none"} strokeWidth="3" />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-white dark:fill-neutral-900 font-bold pointer-events-none">{p.char.name.substring(0, 2)}</text>
            <text x={p.x} y={p.y + 36} textAnchor="middle" className="text-[10px] fill-current pointer-events-none">{p.char.name}</text>
            {!p.char.is_alive && <text x={p.x + 18} y={p.y - 15} className="text-[10px]">💀</text>}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-1 justify-center">
        {Object.entries(relColors).map(([type, color]) => (
          <span key={type} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>{type}</span>
        ))}
      </div>

      {/* Selected character info + add relationship */}
      {selectedChar && (
        <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 anim-fade">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{selectedChar.name}</span>
            <button onClick={() => setSelectedChar(null)} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"><X className="w-3 h-3" /></button>
          </div>
          <div className="text-[10px] text-surface-500 space-y-1 mb-3">
            {selectedChar.personality && <p>성격: {selectedChar.personality}</p>}
            {selectedChar.appearance && <p>외모: {selectedChar.appearance}</p>}
          </div>
          {!showAddRel ? (
            <button onClick={() => setShowAddRel(true)} className="w-full text-[10px] py-1.5 border border-dashed border-surface-300 dark:border-surface-600 rounded hover:border-neutral-500 transition">+ 관계 추가</button>
          ) : (
            <div className="space-y-2">
              <select value={relTarget} onChange={e => setRelTarget(e.target.value)} className="w-full text-xs px-2 py-1.5 border dark:border-surface-700 rounded bg-transparent">
                <option value="">대상 선택</option>
                {chars.filter(c => c.id !== selectedChar.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={relType} onChange={e => setRelType(e.target.value)} className="w-full text-xs px-2 py-1.5 border dark:border-surface-700 rounded bg-transparent">
                <option value="">관계 유형</option>
                {Object.keys(relColors).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-1">
                <button onClick={handleAddRelationship} disabled={!relTarget || !relType} className="flex-1 text-xs py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded disabled:opacity-40">추가</button>
                <button onClick={() => setShowAddRel(false)} className="flex-1 text-xs py-1 bg-surface-200 dark:bg-surface-700 rounded">취소</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-surface-400 text-center">캐릭터를 클릭해서 관계를 추가하세요</p>
    </div>
  );
}

function CharCard({c}){const[o,setO]=useState(false);return(<div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden"><button onClick={()=>setO(!o)} className="w-full flex items-center gap-2 p-2 hover:bg-surface-50 dark:hover:bg-surface-750 transition"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.is_alive?'bg-neutral-500':'bg-surface-400'}`}>{c.name[0]}</div><div className="text-left flex-1 min-w-0"><div className="text-sm font-medium truncate">{c.name}</div><div className="text-[10px] text-surface-400 truncate">{c.personality||'미설정'}</div></div>{!c.is_alive&&<span className="text-[10px] px-1.5 py-0.5 bg-neutral-50 dark:bg-red-900/30 text-neutral-700 rounded">사망</span>}{o?<ChevronUp className="w-3 h-3 text-surface-400"/>:<ChevronDown className="w-3 h-3 text-surface-400"/>}</button>{o&&<div className="px-3 pb-3 text-xs text-surface-600 dark:text-surface-400 space-y-1 border-t border-surface-100 dark:border-surface-700 pt-2 anim-fade">{c.appearance&&<p><b className="text-surface-500">외모:</b> {c.appearance}</p>}{c.personality&&<p><b className="text-surface-500">성격:</b> {c.personality}</p>}{c.speech_pattern&&<p><b className="text-surface-500">말투:</b> {c.speech_pattern}</p>}<p><b className="text-surface-500">첫 등장:</b> {c.first_appearance}화</p></div>}</div>);}
function FSCard({f}){const{updateForeshadow}=useStore();const col={open:'border-l-neutral-600 bg-neutral-50 dark:bg-neutral-900/20',resolved:'border-l-neutral-400 bg-neutral-50 dark:bg-neutral-800/20',abandoned:'border-l-surface-400 bg-surface-50 dark:bg-surface-800'};return(<div className={`p-2 rounded-lg border-l-[3px] ${col[f.status]||col.open}`}><div className="flex items-start justify-between"><p className="text-xs font-medium flex-1">{f.summary}</p><select value={f.status} onChange={e=>updateForeshadow(f.id,{...f,status:e.target.value})} className="text-[10px] bg-transparent border-none outline-none text-surface-500 cursor-pointer"><option value="open">미회수</option><option value="resolved">회수</option><option value="abandoned">폐기</option></select></div><p className="text-[10px] text-surface-400 mt-1">{f.planted_chapter}화 설치</p></div>);}
function AddFS(){const{addForeshadow,currentChapter}=useStore();const[s,setS]=useState(false);const[t,setT]=useState('');if(!s)return<button onClick={()=>setS(true)} className="w-full py-2 border border-dashed border-surface-300 dark:border-surface-700 rounded-lg text-xs text-surface-400 hover:border-neutral-400 transition flex items-center justify-center gap-1"><Plus className="w-3 h-3"/>복선 추가</button>;return<div className="flex gap-1"><input value={t} onChange={e=>setT(e.target.value)} placeholder="복선 내용" className="flex-1 text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent" autoFocus/><button onClick={()=>{if(t){addForeshadow({summary:t,planted_chapter:currentChapter?.number||1});setT('');setS(false);}}} className="text-xs px-2 py-1 bg-neutral-900 dark:bg-white text-white rounded">추가</button></div>;}

// ── REVIEW with inline highlight + tension chart + feedback reject ──
function ReviewPanel(){
  const{reviewResult:r,isReviewing,rejectIssue,acceptIssue,tensionHistory,fetchTensionHistory,currentWork,reviewProgress}=useStore();

  useEffect(()=>{if(currentWork)fetchTensionHistory(currentWork.id);},[currentWork?.id,r]);

  // #4 Apply inline highlights when review completes
  useEffect(()=>{if(r?.issues)highlightIssuesInEditor(r.issues);},[r]);

  if(isReviewing)return<div className="space-y-3">
    <Loading text={reviewProgress?.current||'AI가 분석 중...'}/>
    {reviewProgress&&<div className="px-4"><div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden"><div className="h-full bg-neutral-800 rounded-full transition-all" style={{width:`${Math.max(5,(reviewProgress.completed/reviewProgress.total)*100)}%`}}/></div><p className="text-[10px] text-surface-400 text-center mt-1">{reviewProgress.completed}/{reviewProgress.total} 모듈 완료</p></div>}
  </div>;
  if(!r)return<Empty text="AI 검수 버튼을 눌러주세요" icon={Wand2}/>;
  if(r.error||r.raw)return<div className="text-xs text-surface-500 whitespace-pre-wrap">{r.error||r.raw}</div>;
  const issues=r.issues||[];
  const sIcon={critical:AlertTriangle,warning:AlertCircle,info:Info,suggestion:Sparkles};
  const sCol={critical:'text-neutral-700 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30',warning:'text-neutral-600 bg-neutral-50 dark:bg-neutral-800/20',info:'text-neutral-600 bg-neutral-50 dark:bg-neutral-900/20',suggestion:'text-neutral-600 bg-neutral-50 dark:bg-neutral-900/20'};

  return(<div className="space-y-3">
    {/* Tension score + chart (#5) */}
    {r.tension_score!==undefined&&<div className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
      <div className="flex items-center justify-between mb-2"><span className="text-xs text-surface-500">텐션 점수</span><span className="text-2xl font-bold text-neutral-900 dark:text-white">{r.tension_score}<span className="text-sm text-surface-400 font-normal">/10</span></span></div>
      {r.cliffhanger_score>0&&<div className="flex items-center justify-between mb-1"><span className="text-[10px] text-surface-400">클리프행어</span><span className="text-xs font-bold text-neutral-700">{r.cliffhanger_score}/10</span></div>}
      {r.pacing_warning&&<p className="text-[10px] text-neutral-700 mb-1">⚡ {r.pacing_warning}</p>}
      {tensionHistory.length>1&&<ResponsiveContainer width="100%" height={60}><LineChart data={tensionHistory.map(t=>({화:t.number+'화',텐션:t.tension_score}))}><XAxis dataKey="화" tick={{fontSize:9}} /><Line type="monotone" dataKey="텐션" stroke="#404040" strokeWidth={2} dot={{r:2}}/><Tooltip contentStyle={{fontSize:10}}/></LineChart></ResponsiveContainer>}
    </div>}

    {r.overall_feedback&&<div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg"><div className="text-xs font-medium text-surface-500 mb-1">종합 피드백</div><p className="text-xs leading-relaxed">{r.overall_feedback}</p>
      {r._moduleStatus&&<div className="flex gap-1 mt-2 flex-wrap">{Object.entries(r._moduleStatus).map(([k,v])=><span key={k} className={`text-[9px] px-1.5 py-0.5 rounded ${v==='done'?'bg-neutral-100 dark:bg-neutral-800/20 text-neutral-700':'bg-neutral-100 dark:bg-red-900/30 text-neutral-700'}`}>{k} {v==='done'?'✓':'✗'}</span>)}</div>}
    </div>}

    {/* #3-7 Pending Vault Updates (Smart mode) */}
    {r._pendingVaultUpdates&&r.vault_updates&&(r.vault_updates.new_characters?.length>0||r.vault_updates.new_foreshadows?.length>0)&&<VaultDiffPanel updates={r.vault_updates}/>}

    <div className="text-xs font-medium text-surface-500">{issues.length>0?`이슈 (${issues.length}건)`:'이슈 없음'}</div>
    {issues.map((is,i)=>{const I=sIcon[is.severity]||Info;const c=sCol[is.severity]||sCol.info;return(
      <div key={i} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700 anim-fade">
        <div className="flex items-start gap-2"><div className={`p-1 rounded ${c}`}><I className="w-3 h-3"/></div><div className="flex-1">
          <div className="flex gap-2 mb-1"><span className="text-[10px] font-medium uppercase text-surface-400">{is.type}</span><span className={`text-[10px] px-1.5 py-0.5 rounded ${c}`}>{is.severity}</span>
            {/* #7 Reject button */}
            <button onClick={()=>rejectIssue(is.type,is.description)} className="text-[10px] text-surface-400 hover:text-neutral-700 flex items-center gap-0.5" title="이 유형 무시"><Ban className="w-2.5 h-2.5"/>무시</button>
          </div>
          <p className="text-xs mb-1">{is.description}</p>
          {is.location&&<p className="text-[10px] text-surface-400 italic mb-1 cursor-pointer hover:text-neutral-800" onClick={()=>{const e=window.__tiptapEditor;if(e){let pos=0;e.state.doc.descendants((nd,np)=>{if(nd.isText&&pos===0){const idx=(nd.text||'').indexOf(is.location);if(idx!==-1){pos=np+idx;return false;}}});if(pos>0)e.chain().setTextSelection({from:pos,to:pos+is.location.length}).scrollIntoView().run();}}}>&ldquo;{is.location}&rdquo;</p>}
          {is.suggestion&&<p className="text-xs text-neutral-900 dark:text-white font-medium mb-2">💡 {is.suggestion}</p>}
          {is.reference_chapters?.length>0&&<p className="text-[10px] text-surface-400 mb-1">📖 근거: {is.reference_chapters.map(c=>c+'화').join(', ')}</p>}
          {/* #1-5 Accept/Reject buttons */}
          <div className="flex gap-1 mt-1">{is.suggestion&&<button onClick={()=>acceptIssue(is)} className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800/20 text-neutral-700 rounded hover:bg-neutral-200 transition">수락</button>}<button onClick={()=>rejectIssue(is.type,is.description)} className="text-[10px] px-2 py-0.5 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 rounded hover:bg-neutral-100 transition">거절</button></div>
        </div></div>
      </div>);})}

    {r.popularity_tips?.filter(Boolean).length>0&&<div className="mt-3"><div className="text-xs font-medium text-neutral-700 mb-2">🎯 대중성 팁</div>{r.popularity_tips.filter(Boolean).map((t,i)=><div key={i} className="p-2 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg text-xs text-neutral-700 dark:text-neutral-400 mb-1">{t}</div>)}</div>}

    {/* 9-1: Share report */}
    <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700"><button onClick={()=>{const url=`${window.location.origin}/api/ai/report/${r._workId||''}/${r._chapterId||''}`;navigator.clipboard.writeText(url).then(()=>alert('리포트 링크가 복사되었습니다!')).catch(()=>alert(url));}} className="w-full py-1.5 text-[11px] text-neutral-500 hover:text-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg transition">📤 리포트 공유 링크 복사</button></div>
  </div>);
}

// ── TENSION CURVE ANALYSIS ──
function TensionPanel() {
  const { tensionHistory, fetchTensionHistory, currentWork, chapters } = useStore();

  useEffect(() => { if (currentWork) fetchTensionHistory(currentWork.id); }, [currentWork?.id]);

  if (!currentWork) return <Empty text="작품을 선택하세요" icon={TrendingUp} />;
  if (!tensionHistory || tensionHistory.length === 0) return (
    <div className="text-center py-8">
      <TrendingUp className="w-10 h-10 text-surface-300 mx-auto mb-3" />
      <p className="text-xs text-surface-500 mb-2">텐션 데이터가 없습니다</p>
      <p className="text-[10px] text-surface-400">AI 검수를 실행하면<br />각 화의 텐션 점수가 기록됩니다</p>
    </div>
  );

  // Calculate stats
  const scores = tensionHistory.map(t => t.tension_score);
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const maxChapter = tensionHistory.find(t => t.tension_score === max)?.number;
  const minChapter = tensionHistory.find(t => t.tension_score === min)?.number;

  // Detect tension drops (potential pacing issues)
  const drops = [];
  for (let i = 1; i < tensionHistory.length; i++) {
    const diff = tensionHistory[i - 1].tension_score - tensionHistory[i].tension_score;
    if (diff >= 3) drops.push({ from: tensionHistory[i - 1].number, to: tensionHistory[i].number, drop: diff });
  }

  // Ideal curve overlay data (rising action pattern)
  const chartData = tensionHistory.map((t, i) => {
    const idealProgress = (i + 1) / tensionHistory.length;
    const idealTension = idealProgress < 0.2 ? 4 + idealProgress * 10 : idealProgress < 0.8 ? 6 + (idealProgress - 0.2) * 5 : 9 - (idealProgress - 0.8) * 5;
    return { 화: t.number + '화', 텐션: t.tension_score, 이상적: Math.round(idealTension * 10) / 10 };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-neutral-600" />
        <span className="text-sm font-bold">텐션 곡선 분석</span>
      </div>

      {/* Full tension chart */}
      <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="화" tick={{ fontSize: 9 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="이상적" stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4" dot={false} name="이상적 곡선" />
            <Line type="monotone" dataKey="텐션" stroke="#404040" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-surface-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-neutral-700 inline-block"></span> 실제</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-surface-300 inline-block" style={{ borderTop: '1px dashed' }}></span> 이상적</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded-lg text-center">
          <div className="text-lg font-bold text-neutral-700 dark:text-white">{avg}</div>
          <div className="text-[10px] text-surface-400">평균 텐션</div>
        </div>
        <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600">{max}</div>
          <div className="text-[10px] text-surface-400">최고 ({maxChapter}화)</div>
        </div>
        <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded-lg text-center">
          <div className="text-lg font-bold text-amber-600">{min}</div>
          <div className="text-[10px] text-surface-400">최저 ({minChapter}화)</div>
        </div>
      </div>

      {/* Pacing Issues */}
      {drops.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">⚠️ 텐션 급락 감지</div>
          {drops.map((d, i) => (
            <div key={i} className="text-[10px] text-amber-700 dark:text-amber-300">
              {d.from}화 → {d.to}화: 텐션 {d.drop}점 하락
            </div>
          ))}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">급격한 텐션 하락은 독자 이탈을 유발할 수 있습니다</p>
        </div>
      )}

      {/* Analysis tip */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">📈 분석 팁</div>
        <ul className="text-[10px] text-surface-500 space-y-1">
          <li>• 이상적 곡선: 초반 낮음 → 중반 상승 → 클라이맥스 → 엔딩</li>
          <li>• 평균 텐션 6+ 권장 (장르별 상이)</li>
          <li>• 3화 이상 저텐션 지속 시 독자 이탈 위험</li>
        </ul>
      </div>

      <p className="text-[10px] text-surface-400 text-center">
        분석 범위: {tensionHistory.length}화 / 전체 {chapters.length}화
      </p>
    </div>
  );
}

// ── ANALYZE PANEL (Cliche + Dialogue Ratio + Benchmark) ──
function AnalyzePanel() {
  const { currentChapter, clicheResult, isDetectingCliches, detectCliches, benchmarkResult, isBenchmarking, runBenchmark } = useStore();
  const [dialogueStats, setDialogueStats] = useState(null);

  // Calculate dialogue ratio locally
  useEffect(() => {
    if (!currentChapter?.content) {
      setDialogueStats(null);
      return;
    }
    const text = currentChapter.content.replace(/<[^>]+>/g, '');
    const lines = text.split(/[.!?。]/).filter(l => l.trim().length > 5);
    let dialogueLines = 0;
    let narrativeLines = 0;
    lines.forEach(l => {
      if (l.includes('"') || l.includes('"') || l.includes('」') || l.match(/[가-힣]+:\s*"/)) {
        dialogueLines++;
      } else {
        narrativeLines++;
      }
    });
    const total = dialogueLines + narrativeLines;
    const dialogueRatio = total > 0 ? Math.round((dialogueLines / total) * 100) : 0;
    const avgDialogueLength = dialogueLines > 0 ? Math.round(text.length / dialogueLines) : 0;

    setDialogueStats({
      dialogueLines,
      narrativeLines,
      dialogueRatio,
      avgDialogueLength,
      recommendation: dialogueRatio < 30 ? '대화 비율이 낮습니다. 독자 몰입을 위해 대화를 늘려보세요.' :
        dialogueRatio > 70 ? '대화 비율이 높습니다. 서술로 상황 설명을 보충하세요.' :
        '적절한 대화/서술 비율입니다.'
    });
  }, [currentChapter?.content]);

  if (!currentChapter) return <Empty text="화를 선택하세요" icon={BarChart3} />;

  const typeColors = { expression: '#ec4899', plot: '#3b82f6', character: '#22c55e', appearance: '#f97316' };
  const typeLabels = { expression: '표현', plot: '전개', character: '캐릭터', appearance: '외모묘사' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-neutral-600" />
        <span className="text-sm font-bold">텍스트 분석</span>
      </div>

      {/* Dialogue Ratio Analysis */}
      {dialogueStats && (
        <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <div className="text-xs font-medium text-surface-500 mb-3">대화/서술 비율</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500" style={{ width: `${dialogueStats.dialogueRatio}%` }} title="대화" />
              <div className="h-full bg-neutral-400" style={{ width: `${100 - dialogueStats.dialogueRatio}%` }} title="서술" />
            </div>
            <span className="text-sm font-bold text-neutral-700 dark:text-white">{dialogueStats.dialogueRatio}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-lg font-bold text-blue-600">{dialogueStats.dialogueLines}</div>
              <div className="text-[10px] text-surface-400">대화</div>
            </div>
            <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-800/30 rounded">
              <div className="text-lg font-bold text-neutral-600">{dialogueStats.narrativeLines}</div>
              <div className="text-[10px] text-surface-400">서술</div>
            </div>
          </div>
          <p className="text-[10px] text-surface-500">{dialogueStats.recommendation}</p>
        </div>
      )}

      {/* Cliche Detection */}
      <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-surface-500">클리셰 탐지</span>
          <div className="flex gap-1">
            <button onClick={() => detectCliches(false)} disabled={isDetectingCliches} className="text-[10px] px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded hover:bg-surface-200 transition disabled:opacity-50">
              {isDetectingCliches ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '빠른 검사'}
            </button>
            <button onClick={() => detectCliches(true)} disabled={isDetectingCliches} className="text-[10px] px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50">
              AI 정밀 검사
            </button>
          </div>
        </div>

        {isDetectingCliches && <Loading text="클리셰 탐지 중..." />}

        {clicheResult && (
          <div className="space-y-3 anim-fade">
            {/* Summary */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(clicheResult.by_type || {}).map(([type, count]) => count > 0 && (
                <span key={type} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: typeColors[type] + '20', color: typeColors[type] }}>
                  {typeLabels[type]} {count}
                </span>
              ))}
            </div>

            {/* Cliche List */}
            {clicheResult.cliches?.length === 0 ? (
              <div className="text-center py-4 text-surface-400">
                <Sparkles className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs">클리셰가 발견되지 않았습니다!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clicheResult.cliches?.map((c, i) => (
                  <div key={i} className="p-2 bg-surface-50 dark:bg-surface-700/50 rounded">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: typeColors[c.type] + '20', color: typeColors[c.type] }}>{typeLabels[c.type] || c.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">"{c.text}"</p>
                        <p className="text-[10px] text-surface-400">{c.description}</p>
                        {c.suggestion && <p className="text-[10px] text-blue-500 mt-1">💡 {c.suggestion}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!clicheResult && !isDetectingCliches && (
          <p className="text-[10px] text-surface-400 text-center py-4">버튼을 눌러 클리셰를 탐지하세요</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
        <div className="text-[10px] font-medium text-surface-500 mb-2">현재 화 통계</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-neutral-700 dark:text-white">{currentChapter.word_count || 0}</div>
            <div className="text-[9px] text-surface-400">글자 수</div>
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-700 dark:text-white">{Math.max(1, Math.round((currentChapter.word_count || 0) / 500))}분</div>
            <div className="text-[9px] text-surface-400">읽기 시간</div>
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-700 dark:text-white">{dialogueStats?.dialogueRatio || 0}%</div>
            <div className="text-[9px] text-surface-400">대화 비율</div>
          </div>
        </div>
      </div>

      {/* Benchmark */}
      <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-surface-500">📊 경쟁작 벤치마킹</span>
          <button onClick={runBenchmark} disabled={isBenchmarking} className="text-[10px] px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded hover:opacity-80 transition disabled:opacity-50">
            {isBenchmarking ? '분석 중...' : '벤치마크'}
          </button>
        </div>

        {isBenchmarking && <Loading text="장르 벤치마크 분석 중..." />}

        {benchmarkResult && !benchmarkResult.error && (
          <div className="space-y-3 anim-fade">
            {/* Overall Score */}
            <div className="text-center p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: benchmarkResult.overallScore >= 80 ? '#22c55e' : benchmarkResult.overallScore >= 60 ? '#f97316' : '#ef4444' }}>
                {benchmarkResult.overallScore}점
              </div>
              <div className="text-[10px] text-surface-400">{benchmarkResult.benchmark.genre} 장르 대비</div>
            </div>

            {/* Metrics Comparison */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-surface-400">화 길이</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{benchmarkResult.current.avgChapterLength}자</span>
                  <span className="text-[10px] text-surface-400">/ {benchmarkResult.benchmark.avgChapterLength}자</span>
                </div>
              </div>
              <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, benchmarkResult.scores.chapterLength)}%` }} />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-surface-400">대화 비율</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{benchmarkResult.current.dialogueRatio}%</span>
                  <span className="text-[10px] text-surface-400">/ {benchmarkResult.benchmark.dialogueRatio}%</span>
                </div>
              </div>
              <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, benchmarkResult.scores.dialogueRatio)}%` }} />
              </div>

              {benchmarkResult.current.avgTension && (
                <>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-surface-400">텐션</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{benchmarkResult.current.avgTension}</span>
                      <span className="text-[10px] text-surface-400">/ {benchmarkResult.benchmark.avgTension}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, benchmarkResult.scores.tension || 0)}%` }} />
                  </div>
                </>
              )}
            </div>

            {/* Recommendations */}
            {benchmarkResult.recommendations?.length > 0 && (
              <div className="space-y-1">
                {benchmarkResult.recommendations.map((r, i) => (
                  <div key={i} className={`text-[10px] p-2 rounded ${r.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : r.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                    {r.type === 'success' ? '✓' : r.type === 'warning' ? '⚠' : 'ℹ'} {r.message}
                  </div>
                ))}
              </div>
            )}

            {/* Top Works Reference */}
            <div className="text-[10px] text-surface-400">
              <span className="font-medium">참고 작품:</span> {benchmarkResult.benchmark.topWorks?.join(', ')}
            </div>
          </div>
        )}

        {!benchmarkResult && !isBenchmarking && (
          <p className="text-[10px] text-surface-400 text-center py-4">버튼을 눌러 장르 벤치마크와 비교하세요</p>
        )}
      </div>
    </div>
  );
}

// ── SUGGEST ──
function SuggestPanel(){const{suggestions,isSuggesting,suggestStory,readerSimulation,isSimulatingReaders,simulateReaders}=useStore();const[d,setD]=useState('');const[showReaders,setShowReaders]=useState(false);const[selectedPersonas,setSelectedPersonas]=useState(['hardcore','casual','critic']);
const PERSONAS={hardcore:'열혈팬',casual:'캐주얼',critic:'비평가',shipper:'커플러',lurker:'눈팅러',binger:'정주행러'};
const reactionColors={열광:'#22c55e',호의:'#3b82f6',중립:'#a3a3a3',불만:'#f97316',이탈:'#ef4444'};return(<div><p className="text-xs text-surface-500 mb-2">미회수 복선 기반 스토리 전개를 제안합니다</p><div className="flex gap-1 mb-3"><input value={d} onChange={e=>setD(e.target.value)} placeholder="원하는 방향 (선택)" className="flex-1 text-xs px-2 py-1.5 border border-surface-300 dark:border-surface-700 rounded-lg bg-transparent"/><button onClick={()=>suggestStory(d)} disabled={isSuggesting} className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg disabled:opacity-60 flex items-center gap-1">{isSuggesting?<Loader2 className="w-3 h-3 animate-spin"/>:<Lightbulb className="w-3 h-3"/>}제안</button></div>{isSuggesting&&<Loading text="구상 중..."/>}{suggestions?.suggestions?.map((s,i)=><div key={i} className="p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg mb-2 anim-fade"><div className="flex items-center justify-between mb-1"><h4 className="text-sm font-bold">{s.title}</h4>{s.tension&&<span className="text-[10px] px-1.5 py-0.5 bg-neutral-50 dark:bg-neutral-800/30 text-neutral-900 dark:text-white rounded">텐션 {s.tension}</span>}</div><p className="text-xs text-surface-600 dark:text-surface-400 mb-2 leading-relaxed">{s.synopsis}</p>
      {s.reader_reaction&&<div className="flex items-center gap-2 mb-1"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.reader_reaction==='열광'?'bg-neutral-100 text-neutral-700':s.reader_reaction==='분노'||s.reader_reaction==='이탈'?'bg-neutral-100 text-neutral-900 dark:text-neutral-200':'bg-neutral-100 text-neutral-700'}`}>📊 {s.reader_reaction}</span>{s.reader_retention&&<span className={`text-[10px] ${s.reader_retention?.includes('상승')?'text-neutral-600':s.reader_retention?.includes('하락')?'text-neutral-700':'text-surface-400'}`}>{s.reader_retention}</span>}</div>}
      {s.reader_reaction_detail&&<p className="text-[10px] text-surface-400 italic mb-1">💬 &ldquo;{s.reader_reaction_detail}&rdquo;</p>}
      {s.risk&&<p className="text-[10px] text-neutral-600">⚠️ {s.risk}</p>}</div>)}{suggestions?.raw&&<pre className="text-xs text-surface-500 whitespace-pre-wrap">{suggestions.raw}</pre>}

{/* Reader Persona Simulation */}
<div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
  <button onClick={()=>setShowReaders(!showReaders)} className="flex items-center justify-between w-full text-left">
    <span className="text-xs font-medium text-surface-500">👥 독자 반응 시뮬레이션</span>
    {showReaders?<ChevronUp className="w-3 h-3 text-surface-400"/>:<ChevronDown className="w-3 h-3 text-surface-400"/>}
  </button>
  {showReaders&&<div className="mt-3 space-y-3 anim-fade">
    <div className="flex flex-wrap gap-1">
      {Object.entries(PERSONAS).map(([id,name])=>(
        <button key={id} onClick={()=>setSelectedPersonas(prev=>prev.includes(id)?prev.filter(p=>p!==id):[...prev,id])} className={`text-[10px] px-2 py-1 rounded transition ${selectedPersonas.includes(id)?'bg-blue-500 text-white':'bg-surface-100 dark:bg-surface-700 text-surface-600'}`}>{name}</button>
      ))}
    </div>
    <button onClick={()=>simulateReaders(selectedPersonas)} disabled={isSimulatingReaders||selectedPersonas.length===0} className="w-full py-2 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
      {isSimulatingReaders?<Loader2 className="w-3 h-3 animate-spin"/>:null}
      {isSimulatingReaders?'시뮬레이션 중...':'독자 반응 예측'}
    </button>

    {readerSimulation&&<div className="space-y-2">
      <div className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-800 rounded">
        <span className="text-[10px] text-surface-400">예상 독자 잔류율</span>
        <span className="text-sm font-bold" style={{color:readerSimulation.avgRetention>=70?'#22c55e':readerSimulation.avgRetention>=40?'#f97316':'#ef4444'}}>{readerSimulation.avgRetention}%</span>
      </div>
      {readerSimulation.personas?.filter(p=>!p.error).map((p,i)=>(
        <div key={i} className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold">{p.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{backgroundColor:(reactionColors[p.reaction]||'#a3a3a3')+'20',color:reactionColors[p.reaction]||'#a3a3a3'}}>{p.reaction}</span>
            <span className="text-[10px] text-surface-400 ml-auto">잔류 {p.continue_reading}%</span>
          </div>
          {p.comment&&<p className="text-[10px] text-surface-600 dark:text-surface-300 mb-2 italic">💬 "{p.comment}"</p>}
          {p.likes?.length>0&&<div className="flex flex-wrap gap-1 mb-1">{p.likes.map((l,j)=><span key={j} className="text-[9px] px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded">👍 {l}</span>)}</div>}
          {p.concerns?.length>0&&<div className="flex flex-wrap gap-1">{p.concerns.map((c,j)=><span key={j} className="text-[9px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded">⚠ {c}</span>)}</div>}
        </div>
      ))}
    </div>}
  </div>}
</div>
</div>);}

// ── GHOSTWRITE ──
function GhostwritePanel(){const{ghostwriteResult,isGhostwriting,ghostwrite,saveChapter}=useStore();const[idea,setIdea]=useState('');const apply=()=>{if(ghostwriteResult?.content){const html=ghostwriteResult.content.split('\n\n').map(p=>`<p><mark data-color="#f0f0f0" style="background:#f0f0f0;border-left:2px solid #525252;padding-left:4px" title="AI 대필">${p}</mark></p>`).join('');const e=window.__tiptapEditor;if(e){e.commands.insertContent(html);saveChapter(e.getHTML());}}};return(<div><div className="flex items-center gap-2 mb-2"><PenLine className="w-4 h-4 text-neutral-600"/><span className="text-sm font-bold">AI 대필</span></div><p className="text-xs text-surface-500 mb-1">아이디어 → 현재 설정+문체로 한 화 작성</p><p className="text-[10px] text-neutral-400 mb-3">💡 적용 시 AI가 쓴 부분은 보라색으로 표시됩니다</p><textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="예: 보스가 사실 아버지였다" className="w-full text-xs px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-lg h-24 resize-none bg-transparent"/><button onClick={()=>ghostwrite(idea)} disabled={isGhostwriting||!idea.trim()} className="w-full mt-2 py-2 bg-neutral-900 dark:bg-white text-white text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium">{isGhostwriting?<Loader2 className="w-3 h-3 animate-spin"/>:<Send className="w-3 h-3"/>}{isGhostwriting?'집필중...':'대필 시작'}</button>{isGhostwriting&&<Loading text="AI 집필중..."/>}{ghostwriteResult?.content&&<div className="mt-3 anim-fade"><div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-surface-500">결과</span><button onClick={apply} className="text-xs px-3 py-1 bg-neutral-900 dark:bg-white text-white rounded-lg">에디터 삽입</button></div><div className="p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg max-h-96 overflow-y-auto"><div className="text-xs leading-relaxed whitespace-pre-wrap">{ghostwriteResult.content}</div></div></div>}</div>);}

// ── STYLE LEARNING ──
function StylePanel(){const{styleProfile:sp,isLearningStyle,learnStyle}=useStore();const patterns=sp?.unique_patterns?(typeof sp.unique_patterns==='string'?JSON.parse(sp.unique_patterns):sp.unique_patterns):[];return(<div><div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-neutral-600"/><span className="text-sm font-bold">필체 학습</span></div><p className="text-xs text-surface-500 mb-3">기존 원고 분석 → 문체 프로필 → AI 대필 반영. 최소 3화(500자+)</p><button onClick={learnStyle} disabled={isLearningStyle} className="w-full py-2 bg-neutral-500 text-white text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium mb-4">{isLearningStyle?<Loader2 className="w-3 h-3 animate-spin"/>:<GraduationCap className="w-3 h-3"/>}{isLearningStyle?'분석중...':'문체 분석'}</button>{isLearningStyle&&<Loading text="학습중..."/>}{sp&&sp.avg_sentence_length&&<div className="space-y-3 anim-fade"><div className="grid grid-cols-2 gap-2"><M l="문장길이" v={`${Number(sp.avg_sentence_length).toFixed(1)}어절`}/><M l="대화비율" v={`${((sp.dialogue_ratio||0)*100).toFixed(0)}%`}/><M l="묘사밀도" v={`${((sp.description_density||0)*100).toFixed(0)}%`}/><M l="어휘다양성" v={`${((sp.vocab_diversity||0)*100).toFixed(0)}%`}/></div>{sp.tone&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400">톤</div><p className="text-xs">{sp.tone}</p></div>}{patterns.length>0&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400">고유 패턴</div>{patterns.map((p,i)=><p key={i} className="text-xs">• {p}</p>)}</div>}<StyleDetail sp={sp}/><p className="text-[10px] text-surface-400 text-center">AI 대필에 자동 반영됩니다</p></div>}</div>);}

function StyleDetail({sp}){
  // 4-4: Conjunction pattern + active/passive voice display
  if(!sp) return null;
  const conj = sp.conjunction_patterns || null;
  const voice = sp.voice_ratio || null;
  if(!conj && !voice) return null;
  return(<div className="space-y-2 mt-2">{conj&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400 mb-1">접속사 패턴</div><div className="flex flex-wrap gap-1">{(typeof conj==='string'?conj.split(','):Array.isArray(conj)?conj:[]).map((c,i)=><span key={i} className="text-[10px] px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">{c.trim()}</span>)}</div></div>}{voice&&<div className="p-2 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg"><div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-400 mb-1">능동/수동태</div><div className="flex gap-2 items-center"><div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-neutral-600 rounded-full" style={{width:`${(voice.active||70)}%`}}/></div><span className="text-[10px] text-neutral-500">능동 {voice.active||70}%</span></div></div>}</div>);
}

// ── SETTINGS: password, delete, export, terms, usage ──
function SettingsPanel(){
  const{user,changePassword,deleteAccount,changeNickname,logout,darkMode,toggleDark}=useStore();
  const[curPw,setCurPw]=useState('');const[newPw,setNewPw]=useState('');const[delPw,setDelPw]=useState('');
  const[nick,setNick]=useState(user?.nickname||'');const[showDel,setShowDel]=useState(false);
  const[showTerms,setShowTerms]=useState(false);

  const exportData=()=>{const token=localStorage.getItem('sm_token');fetch('/api/export-data',{headers:{Authorization:'Bearer '+token}}).then(r=>r.blob()).then(b=>{const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='storymind_my_data.json';a.click();URL.revokeObjectURL(u);});};

  return(<div className="space-y-4">
    <div className="text-sm font-bold flex items-center gap-2"><Settings className="w-4 h-4"/>설정</div>

    {/* Profile */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1"><User className="w-3 h-3"/>프로필</div>
      <p className="text-xs text-surface-400 mb-2">{user?.email}</p>
      <div className="flex gap-1">
        <input value={nick} onChange={e=>setNick(e.target.value)} className="flex-1 text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent" placeholder="닉네임"/>
        <button onClick={()=>changeNickname(nick)} className="text-xs px-2 py-1 bg-neutral-900 dark:bg-white text-white rounded">변경</button>
      </div>
    </div>

    {/* Dark mode */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 flex items-center justify-between">
      <span className="text-xs font-medium">다크 모드</span>
      <button onClick={toggleDark} className={`w-10 h-5 rounded-full transition ${darkMode?'bg-neutral-900 dark:bg-white':'bg-surface-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${darkMode?'translate-x-5':'translate-x-0.5'}`}/></button>
    </div>

    {/* #10-3 Data export */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2">📦 데이터 관리</div>
      <button onClick={exportData} className="w-full text-xs py-1.5 bg-neutral-900 dark:bg-white text-white rounded mb-1">내 데이터 전체 내보내기 (JSON)</button>
      <p className="text-[10px] text-surface-400">원고, 설정, 사용 기록 등 모든 데이터를 다운로드합니다</p>
    </div>

    {/* Password */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1"><Lock className="w-3 h-3"/>비밀번호 변경</div>
      <input type="password" value={curPw} onChange={e=>setCurPw(e.target.value)} placeholder="현재 비밀번호" className="w-full text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent mb-1"/>
      <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호 (6자+)" className="w-full text-xs px-2 py-1 border dark:border-surface-700 rounded bg-transparent mb-2"/>
      <button onClick={async()=>{try{await changePassword(curPw,newPw);setCurPw('');setNewPw('');}catch(e){alert(e.message);}}} disabled={!curPw||!newPw} className="w-full text-xs py-1.5 bg-neutral-900 dark:bg-white text-white rounded disabled:opacity-40">변경</button>
    </div>

    {/* #10-7 Terms */}
    <div className="p-3 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
      <div className="text-xs font-medium text-surface-500 mb-2">📄 약관</div>
      <button onClick={()=>setShowTerms(!showTerms)} className="text-xs text-neutral-900 dark:text-white underline">{showTerms?'닫기':'이용약관 및 개인정보처리방침 보기'}</button>
      {showTerms&&<div className="mt-2 max-h-60 overflow-y-auto text-[10px] text-surface-500 space-y-2 anim-fade">
        <h4 className="font-bold text-xs">이용약관</h4>
        <p>이용자의 원고 저작권은 전적으로 이용자에게 귀속됩니다. AI 제안을 수락한 경우에도 저작권은 이용자의 것입니다. 명시적 동의 없이 원고를 AI 학습에 사용하지 않습니다.</p>
        <h4 className="font-bold text-xs">개인정보처리방침</h4>
        <p>수집 항목: 이메일, 닉네임. 원고 데이터는 서비스 제공 목적으로만 사용됩니다. 언제든 데이터를 내보내거나 계정을 삭제할 수 있습니다. AI 분석 시 Anthropic API로 전송되며, Anthropic은 API 입력을 모델 학습에 사용하지 않습니다.</p>
      </div>}
    </div>

    {/* Account delete */}
    <div className="p-3 bg-neutral-50 dark:bg-neutral-100 dark:bg-neutral-800/30 rounded-lg border border-neutral-300 dark:border-neutral-700">
      <div className="text-xs font-medium text-neutral-900 dark:text-neutral-200 mb-2 flex items-center gap-1"><Trash2 className="w-3 h-3"/>계정 삭제</div>
      {!showDel?<button onClick={()=>setShowDel(true)} className="text-xs text-neutral-700 underline">계정을 삭제하고 싶어요</button>:(
        <div className="space-y-2 anim-fade">
          <p className="text-[10px] text-neutral-700">모든 작품, 설정, 데이터가 영구 삭제됩니다.</p>
          <input type="password" value={delPw} onChange={e=>setDelPw(e.target.value)} placeholder="비밀번호 확인" className="w-full text-xs px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded bg-transparent"/>
          <div className="flex gap-2"><button onClick={async()=>{try{await deleteAccount(delPw);logout();}catch(e){alert(e.message);}}} disabled={!delPw} className="flex-1 text-xs py-1 bg-neutral-900 text-white rounded disabled:opacity-40">삭제</button><button onClick={()=>setShowDel(false)} className="flex-1 text-xs py-1 bg-surface-200 dark:bg-surface-700 rounded">취소</button></div>
        </div>
      )}
    </div>
  </div>);
}

// #3-7 Vault change approval panel (Smart mode)
function VaultDiffPanel({updates}){
  const{addCharacter,addForeshadow,currentChapter}=useStore();
  const[accepted,setAccepted]=useState(new Set());
  const accept=(type,item,idx)=>{
    if(type==='char')addCharacter({name:item.name,appearance:item.appearance||'',personality:item.personality||'',first_appearance:currentChapter?.number||1});
    else addForeshadow({summary:item.summary,planted_chapter:item.chapter||currentChapter?.number||1});
    setAccepted(s=>{const n=new Set(s);n.add(type+idx);return n;});
  };
  const nc=updates.new_characters||[];const nf=updates.new_foreshadows||[];
  if(nc.length===0&&nf.length===0)return null;
  return(<div className="p-3 bg-neutral-50 dark:bg-neutral-800/20 rounded-lg anim-fade">
    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 dark:text-neutral-400 mb-2">📋 StoryVault 변경 제안 (승인 필요)</div>
    {nc.map((c,i)=>accepted.has('char'+i)?null:<div key={'c'+i} className="flex items-center gap-2 mb-1 p-1.5 bg-white dark:bg-surface-800 rounded"><div className="flex-1"><span className="text-[10px] text-neutral-500 mr-1">캐릭터</span><span className="text-xs font-medium">{c.name}</span></div><button onClick={()=>accept('char',c,i)} className="text-[10px] px-2 py-0.5 bg-neutral-900 text-white rounded">승인</button></div>)}
    {nf.map((f,i)=>accepted.has('fs'+i)?null:<div key={'f'+i} className="flex items-center gap-2 mb-1 p-1.5 bg-white dark:bg-surface-800 rounded"><div className="flex-1"><span className="text-[10px] text-neutral-600 mr-1">복선</span><span className="text-xs">{f.summary}</span></div><button onClick={()=>accept('fs',f,i)} className="text-[10px] px-2 py-0.5 bg-neutral-900 dark:bg-white text-white rounded">승인</button></div>)}
    {accepted.size>0&&<p className="text-[10px] text-neutral-600 mt-1">✓ {accepted.size}건 승인됨</p>}
  </div>);
}

function M({l,v}){return<div className="p-2 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 text-center"><div className="text-[10px] text-surface-400">{l}</div><div className="text-sm font-bold text-neutral-700">{v}</div></div>}
function Loading({text}){return<div className="flex flex-col items-center py-8"><div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin mb-3"/><p className="text-xs text-surface-400">{text}</p></div>}
function Empty({text,icon:I}){return<div className="flex flex-col items-center py-12 text-center"><I className="w-10 h-10 text-surface-300 mb-3"/><p className="text-xs text-surface-400">{text}</p></div>}
