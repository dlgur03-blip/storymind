// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/stores/store'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BookOpen, Wand2, Lightbulb, PenLine, GraduationCap, TrendingUp, BarChart3,
  Loader2, AlertTriangle, AlertCircle, Info, Sparkles, Settings, MessageSquare,
  ChevronDown, ChevronUp, Plus, Send, X, Ban, User, Type, Sun, Moon, Copy, Check
} from 'lucide-react'
import WriterCommentTab from '@/components/editor-mode/WriterCommentTab'

const TABS = [
  { id: 'vault', icon: BookOpen },
  { id: 'review', icon: Wand2 },
  { id: 'tension', icon: TrendingUp },
  { id: 'analyze', icon: BarChart3 },
  { id: 'suggest', icon: Lightbulb },
  { id: 'ghostwrite', icon: PenLine },
  { id: 'style', icon: GraduationCap },
  { id: 'comments', icon: MessageSquare },
  { id: 'settings', icon: Settings },
]

export default function RightPanel() {
  const { rightPanel } = useStore()
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => useStore.setState({ rightPanel: t.id })}
            className={`flex-1 flex items-center justify-center py-2.5 text-[11px] font-medium transition border-b-2 ${
              rightPanel === t.id
                ? 'border-neutral-500 text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {rightPanel === 'vault' && <VaultPanel />}
        {rightPanel === 'review' && <ReviewPanel />}
        {rightPanel === 'tension' && <TensionPanel />}
        {rightPanel === 'analyze' && <AnalyzePanel />}
        {rightPanel === 'suggest' && <SuggestPanel />}
        {rightPanel === 'ghostwrite' && <GhostwritePanel />}
        {rightPanel === 'style' && <StylePanel />}
        {rightPanel === 'comments' && <CommentsPanel />}
        {rightPanel === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

// ── Helpers ──
function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-4 justify-center text-xs text-neutral-500">
      <Loader2 className="w-4 h-4 animate-spin" />{text}
    </div>
  )
}

function Empty({ text, icon: Icon }: { text: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
      <p className="text-xs text-neutral-500">{text}</p>
    </div>
  )
}

// ── VAULT PANEL ──
function VaultPanel() {
  const { vault, addCharacter, addForeshadow, currentChapter, currentWork, updateVaultMode, isExtracting, updateCharacter } = useStore()
  const [tab, setTab] = useState('chars')
  const [showAddChar, setShowAddChar] = useState(false)
  const [charName, setCharName] = useState('')
  const [charAppearance, setCharAppearance] = useState('')
  const [charPersonality, setCharPersonality] = useState('')
  const mode = currentWork?.vault_mode || 'smart'

  const handleAddCharacter = () => {
    if (charName.trim()) {
      addCharacter({
        name: charName.trim(),
        appearance: charAppearance,
        personality: charPersonality,
        first_appearance: currentChapter?.number || 1,
      })
      setShowAddChar(false)
      setCharName('')
      setCharAppearance('')
      setCharPersonality('')
    }
  }

  const VAULT_TABS = [
    { id: 'chars', label: '캐릭터', count: vault.characters?.length || 0 },
    { id: 'foreshadow', label: '복선', count: vault.foreshadows?.length || 0 },
    { id: 'world', label: '세계관', count: vault.world?.length || 0 },
    { id: 'timeline', label: '시간선', count: vault.timeline?.length || 0 },
    { id: 'relations', label: '관계도', count: null },
  ]

  return (
    <div>
      {isExtracting && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-[10px] text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" /><span>설정 자동 추출 중...</span>
        </div>
      )}
      {/* Vault Mode Selector */}
      <div className="flex items-center gap-1 mb-3 p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        {([
          { id: 'manual', label: '수동', desc: '직접 관리' },
          { id: 'smart', label: '스마트', desc: 'AI 제안 후 승인' },
          { id: 'auto', label: '자동', desc: 'AI 자동 추가' },
        ] as const).map(m => (
          <button
            key={m.id}
            onClick={() => updateVaultMode(m.id)}
            className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${mode === m.id ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-700 dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {VAULT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[50px] text-[10px] py-1.5 px-1 rounded-md font-medium transition whitespace-nowrap ${
              tab === t.id
                ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
                : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {t.label}{t.count !== null && t.count > 0 ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* Characters Tab */}
      {tab === 'chars' && (
        <div className="space-y-2">
          {vault.characters?.length === 0 && !showAddChar && (
            <div className="text-center py-6 text-neutral-400">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs mb-2">등록된 캐릭터가 없습니다</p>
              <p className="text-[10px]">아래 버튼으로 추가하거나<br />AI 검수 시 자동 추출됩니다</p>
            </div>
          )}
          {vault.characters?.map(c => <CharCard key={c.id} c={c} />)}
          {!showAddChar ? (
            <button onClick={() => setShowAddChar(true)} className="w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-500 hover:border-neutral-500 transition flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />캐릭터 추가
            </button>
          ) : (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
              <span className="text-xs font-medium">새 캐릭터</span>
              <input value={charName} onChange={e => setCharName(e.target.value)} placeholder="이름 *" className="w-full text-sm px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" autoFocus />
              <input value={charAppearance} onChange={e => setCharAppearance(e.target.value)} placeholder="외모 (예: 검은 머리, 큰 키)" className="w-full text-sm px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" />
              <input value={charPersonality} onChange={e => setCharPersonality(e.target.value)} placeholder="성격 (예: 냉철하지만 따뜻한)" className="w-full text-sm px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800" />
              <div className="flex gap-2">
                <button onClick={handleAddCharacter} disabled={!charName.trim()} className="flex-1 text-sm py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium disabled:opacity-40">추가</button>
                <button onClick={() => setShowAddChar(false)} className="flex-1 text-sm py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg">취소</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Foreshadow Tab */}
      {tab === 'foreshadow' && (
        <div className="space-y-2">
          {vault.foreshadows?.length === 0 && (
            <div className="text-center py-6 text-neutral-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">등록된 복선이 없습니다</p>
            </div>
          )}
          {vault.foreshadows?.filter(f => f.status === 'open').length > 0 && (
            <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
              미회수 복선 {vault.foreshadows.filter(f => f.status === 'open').length}개
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
            <div className="text-center py-6 text-neutral-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">세계관 정보가 없습니다</p>
              <p className="text-[10px]">AI 검수 실행 시 자동 추출됩니다</p>
            </div>
          ) : vault.world.map(w => (
            <div key={w.id} className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{w.category}</span>
                <span className="text-sm font-medium">{w.name}</span>
              </div>
              <p className="text-xs text-neutral-500">{w.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Timeline Tab */}
      {tab === 'timeline' && <TimelineVisual timeline={vault.timeline || []} />}

      {/* Relations Tab */}
      {tab === 'relations' && <RelationGraph chars={vault.characters || []} />}
    </div>
  )
}

function CharCard({ c }: { c: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${c.is_alive !== false ? 'bg-neutral-500' : 'bg-neutral-400'}`}>{c.name[0]}</div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{c.name}</div>
          <div className="text-[10px] text-neutral-400 truncate">{c.personality || '미설정'}</div>
        </div>
        {c.is_alive === false && <span className="text-[10px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded">사망</span>}
        {open ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-neutral-600 dark:text-neutral-400 space-y-1 border-t border-neutral-100 dark:border-neutral-700 pt-2">
          {c.appearance && <p><b className="text-neutral-500">외모:</b> {c.appearance}</p>}
          {c.personality && <p><b className="text-neutral-500">성격:</b> {c.personality}</p>}
          {c.speech_pattern && <p><b className="text-neutral-500">말투:</b> {c.speech_pattern}</p>}
          <p><b className="text-neutral-500">첫 등장:</b> {c.first_appearance}화</p>
        </div>
      )}
    </div>
  )
}

function FSCard({ f }: { f: any }) {
  const { updateForeshadow } = useStore()
  const col: Record<string, string> = {
    open: 'border-l-neutral-600 bg-neutral-50 dark:bg-neutral-900/20',
    resolved: 'border-l-neutral-400 bg-neutral-50 dark:bg-neutral-800/20',
    abandoned: 'border-l-neutral-400 bg-neutral-50 dark:bg-neutral-800',
  }
  return (
    <div className={`p-2 rounded-lg border-l-[3px] ${col[f.status] || col.open}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium flex-1">{f.summary}</p>
        <select value={f.status} onChange={e => updateForeshadow(f.id, { ...f, status: e.target.value })} className="text-[10px] bg-transparent border-none outline-none text-neutral-500 cursor-pointer">
          <option value="open">미회수</option>
          <option value="resolved">회수</option>
          <option value="abandoned">폐기</option>
        </select>
      </div>
      <p className="text-[10px] text-neutral-400 mt-1">{f.planted_chapter}화 설치</p>
    </div>
  )
}

function AddFS() {
  const { addForeshadow, currentChapter } = useStore()
  const [show, setShow] = useState(false)
  const [text, setText] = useState('')
  if (!show) return (
    <button onClick={() => setShow(true)} className="w-full py-2 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-400 hover:border-neutral-400 transition flex items-center justify-center gap-1">
      <Plus className="w-3 h-3" />복선 추가
    </button>
  )
  return (
    <div className="flex gap-1">
      <input value={text} onChange={e => setText(e.target.value)} placeholder="복선 내용" className="flex-1 text-xs px-2 py-1 border dark:border-neutral-700 rounded bg-transparent" autoFocus />
      <button onClick={() => { if (text) { addForeshadow({ summary: text, planted_chapter: currentChapter?.number || 1 }); setText(''); setShow(false) } }} className="text-xs px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded">추가</button>
    </div>
  )
}

function TimelineVisual({ timeline }: { timeline: any[] }) {
  const [viewMode, setViewMode] = useState('list')
  if (!timeline || timeline.length === 0) return (
    <div className="text-center py-6 text-neutral-400">
      <p className="text-xs">시간선이 비어있습니다</p>
      <p className="text-[10px]">AI 검수 실행 시 자동 구축됩니다</p>
    </div>
  )

  const seasonColors: Record<string, string> = { '봄': '#ec4899', '여름': '#22c55e', '가을': '#f97316', '겨울': '#3b82f6', '미상': '#a3a3a3' }
  const grouped = timeline.reduce((acc: Record<number, any[]>, t) => { if (!acc[t.chapter]) acc[t.chapter] = []; acc[t.chapter].push(t); return acc }, {})
  const chapterNums = Object.keys(grouped).sort((a, b) => +a - +b)

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <button onClick={() => setViewMode('list')} className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${viewMode === 'list' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-400'}`}>리스트</button>
        <button onClick={() => setViewMode('visual')} className={`flex-1 text-[10px] py-1.5 rounded font-medium transition ${viewMode === 'visual' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-400'}`}>타임라인</button>
      </div>
      {viewMode === 'visual' && (
        <div className="relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
          {chapterNums.map(chNum => (
            <div key={chNum} className="relative mb-4 last:mb-0">
              <div className="absolute left-0 w-4 h-4 rounded-full bg-neutral-700 dark:bg-white border-2 border-white dark:border-neutral-900 -translate-x-1.5 z-10" />
              <div className="mb-2 ml-4">
                <span className="text-xs font-bold">{chNum}화</span>
              </div>
              <div className="ml-4 space-y-2">
                {grouped[+chNum].map((event: any, i: number) => (
                  <div key={i} className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
                    <p className="font-medium">{event.event_summary}</p>
                    {event.in_world_time && <p className="text-[10px] text-neutral-400 mt-1">{event.in_world_time}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {timeline.map((t, i) => (
            <div key={i} className="flex gap-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: (seasonColors[t.season] || '#a3a3a3') + '20', color: seasonColors[t.season] || '#a3a3a3' }}>
                {t.chapter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{t.event_summary}</p>
                <div className="flex gap-3 mt-1">
                  {t.in_world_time && <span className="text-[10px] text-neutral-400">{t.in_world_time}</span>}
                  {t.season && <span className="text-[10px]" style={{ color: seasonColors[t.season] }}>{t.season}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-neutral-400 text-center">{timeline.length}개 이벤트 / {chapterNums.length}화</p>
    </div>
  )
}

function RelationGraph({ chars }: { chars: any[] }) {
  const { updateCharacter } = useStore()
  const [selectedChar, setSelectedChar] = useState<any>(null)
  const [showAddRel, setShowAddRel] = useState(false)
  const [relTarget, setRelTarget] = useState('')
  const [relType, setRelType] = useState('')

  if (!chars || chars.length === 0) return (
    <div className="text-center py-6 text-neutral-400">
      <p className="text-xs">관계도를 표시할 캐릭터가 없습니다</p>
    </div>
  )

  const r = Math.min(120, 60 + chars.length * 10)
  const cx = 160; const cy = 150
  const positions = chars.map((c, i) => {
    const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), char: c }
  })

  const relColors: Record<string, string> = { '가족': '#ef4444', '연인': '#ec4899', '친구': '#22c55e', '적': '#f97316', '동료': '#3b82f6', '스승': '#8b5cf6' }
  const lines: { from: typeof positions[0]; to: typeof positions[0]; label: string; color: string }[] = []
  const seenPairs = new Set<string>()
  chars.forEach((c, i) => {
    const rels = Array.isArray(c.relationships) ? c.relationships : []
    rels.forEach((rel: any) => {
      const target = typeof rel === 'string' ? rel : (rel.name || rel.target || '')
      const type = typeof rel === 'object' ? rel.type || '' : ''
      const j = chars.findIndex(ch => ch.name === target)
      const pairKey = [Math.min(i, j), Math.max(i, j)].join('-')
      if (j >= 0 && j < positions.length && !seenPairs.has(pairKey)) {
        seenPairs.add(pairKey)
        lines.push({ from: positions[i], to: positions[j], label: type, color: relColors[type] || '#a3a3a3' })
      }
    })
  })

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 300" className="w-full">
        {lines.map((l, i) => (
          <g key={i}>
            <line x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y} stroke={l.color} strokeWidth="2" strokeOpacity="0.6" />
            {l.label && (
              <g transform={`translate(${(l.from.x + l.to.x) / 2}, ${(l.from.y + l.to.y) / 2})`}>
                <rect x="-18" y="-8" width="36" height="14" rx="4" fill="white" className="dark:fill-neutral-800" />
                <text x="0" y="3" textAnchor="middle" className="text-[8px] font-medium" fill={l.color}>{l.label}</text>
              </g>
            )}
          </g>
        ))}
        {positions.map((p, i) => (
          <g key={i} className="cursor-pointer" onClick={() => setSelectedChar(p.char)}>
            <circle cx={p.x} cy={p.y} r={selectedChar?.id === p.char.id ? 25 : 22} className={p.char.is_alive !== false ? 'fill-neutral-700 dark:fill-neutral-300' : 'fill-neutral-400'} stroke={selectedChar?.id === p.char.id ? '#525252' : 'none'} strokeWidth="3" />
            <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-white dark:fill-neutral-900 font-bold pointer-events-none">{p.char.name.substring(0, 2)}</text>
            <text x={p.x} y={p.y + 36} textAnchor="middle" className="text-[10px] fill-current pointer-events-none">{p.char.name}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-1 justify-center">
        {Object.entries(relColors).map(([type, color]) => (
          <span key={type} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>{type}</span>
        ))}
      </div>
      {selectedChar && (
        <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{selectedChar.name}</span>
            <button onClick={() => setSelectedChar(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"><X className="w-3 h-3" /></button>
          </div>
          <div className="text-[10px] text-neutral-500 space-y-1 mb-3">
            {selectedChar.personality && <p>성격: {selectedChar.personality}</p>}
            {selectedChar.appearance && <p>외모: {selectedChar.appearance}</p>}
          </div>
          {!showAddRel ? (
            <button onClick={() => setShowAddRel(true)} className="w-full text-[10px] py-1.5 border border-dashed border-neutral-300 dark:border-neutral-600 rounded hover:border-neutral-500 transition">+ 관계 추가</button>
          ) : (
            <div className="space-y-2">
              <select value={relTarget} onChange={e => setRelTarget(e.target.value)} className="w-full text-xs px-2 py-1.5 border dark:border-neutral-700 rounded bg-transparent">
                <option value="">대상 선택</option>
                {chars.filter(c => c.id !== selectedChar.id).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={relType} onChange={e => setRelType(e.target.value)} className="w-full text-xs px-2 py-1.5 border dark:border-neutral-700 rounded bg-transparent">
                <option value="">관계 유형</option>
                {Object.keys(relColors).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-1">
                <button onClick={() => { if (relTarget && relType) { const rels = Array.isArray(selectedChar.relationships) ? [...selectedChar.relationships] : []; rels.push({ name: relTarget, type: relType }); updateCharacter(selectedChar.id, { relationships: rels }); setShowAddRel(false); setRelTarget(''); setRelType('') } }} disabled={!relTarget || !relType} className="flex-1 text-xs py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded disabled:opacity-40">추가</button>
                <button onClick={() => setShowAddRel(false)} className="flex-1 text-xs py-1 bg-neutral-200 dark:bg-neutral-700 rounded">취소</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── REVIEW PANEL ──
function ReviewPanel() {
  const { reviewResult: r, isReviewing, runReview, rejectIssue, acceptIssue, tensionHistory, fetchTensionHistory, currentWork } = useStore()

  useEffect(() => { if (currentWork) fetchTensionHistory(currentWork.id) }, [currentWork?.id, r])

  if (isReviewing) return <Loading text="AI가 분석 중..." />
  if (!r) return <Empty text="AI 검수 버튼을 눌러주세요" icon={Wand2} />

  const issues = r.issues || []
  const sIcon: Record<string, any> = { critical: AlertTriangle, warning: AlertCircle, info: Info, suggestion: Sparkles }
  const sCol: Record<string, string> = { critical: 'text-red-600 bg-red-50 dark:bg-red-900/30', warning: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', info: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', suggestion: 'text-neutral-600 bg-neutral-50 dark:bg-neutral-800/20' }

  return (
    <div className="space-y-3">
      {r.tension_score !== undefined && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-500">텐션 점수</span>
            <span className="text-2xl font-bold">{r.tension_score}<span className="text-sm text-neutral-400 font-normal">/10</span></span>
          </div>
          {r.cliffhanger_score > 0 && <div className="flex items-center justify-between mb-1"><span className="text-[10px] text-neutral-400">클리프행어</span><span className="text-xs font-bold">{r.cliffhanger_score}/10</span></div>}
          {r.pacing_warning && <p className="text-[10px] text-neutral-500 mb-1">{r.pacing_warning}</p>}
          {tensionHistory.length > 1 && (
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={tensionHistory.map(t => ({ '화': t.number + '화', '텐션': t.tension_score }))}>
                <XAxis dataKey="화" tick={{ fontSize: 9 }} />
                <Line type="monotone" dataKey="텐션" stroke="#404040" strokeWidth={2} dot={{ r: 2 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {r.overall_feedback && (
        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 mb-1">종합 피드백</div>
          <p className="text-xs leading-relaxed">{r.overall_feedback}</p>
        </div>
      )}

      <div className="text-xs font-medium text-neutral-500">{issues.length > 0 ? `이슈 (${issues.length}건)` : '이슈 없음'}</div>
      {issues.map((is: any, i: number) => {
        const I = sIcon[is.severity] || Info
        const c = sCol[is.severity] || sCol.info
        return (
          <div key={i} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-start gap-2">
              <div className={`p-1 rounded ${c}`}><I className="w-3 h-3" /></div>
              <div className="flex-1">
                <div className="flex gap-2 mb-1">
                  <span className="text-[10px] font-medium uppercase text-neutral-400">{is.type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${c}`}>{is.severity}</span>
                  <button onClick={() => rejectIssue(is.type, is.description)} className="text-[10px] text-neutral-400 hover:text-red-500 flex items-center gap-0.5" title="무시">
                    <Ban className="w-2.5 h-2.5" />무시
                  </button>
                </div>
                <p className="text-xs mb-1">{is.description}</p>
                {is.location && <p className="text-[10px] text-neutral-400 italic mb-1">&ldquo;{is.location}&rdquo;</p>}
                {is.suggestion && <p className="text-xs text-blue-500 mb-2">{is.suggestion}</p>}
                <div className="flex gap-1 mt-1">
                  {is.suggestion && <button onClick={() => acceptIssue(is)} className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 transition">수락</button>}
                  <button onClick={() => rejectIssue(is.type, is.description)} className="text-[10px] px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800 rounded hover:bg-neutral-100 transition">거절</button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {r.popularity_tips?.filter(Boolean).length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">대중성 팁</div>
          {r.popularity_tips.filter(Boolean).map((t: string, i: number) => (
            <div key={i} className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs text-neutral-500 mb-1">{t}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TENSION PANEL ──
function TensionPanel() {
  const { tensionHistory, fetchTensionHistory, currentWork, chapters } = useStore()
  useEffect(() => { if (currentWork) fetchTensionHistory(currentWork.id) }, [currentWork?.id])

  if (!currentWork) return <Empty text="작품을 선택하세요" icon={TrendingUp} />
  if (!tensionHistory || tensionHistory.length === 0) return (
    <div className="text-center py-8">
      <TrendingUp className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
      <p className="text-xs text-neutral-500 mb-2">텐션 데이터가 없습니다</p>
      <p className="text-[10px] text-neutral-400">AI 검수를 실행하면 각 화의 텐션 점수가 기록됩니다</p>
    </div>
  )

  const scores = tensionHistory.map(t => t.tension_score)
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const maxChapter = tensionHistory.find(t => t.tension_score === max)?.number
  const minChapter = tensionHistory.find(t => t.tension_score === min)?.number

  const drops: { from: number; to: number; drop: number }[] = []
  for (let i = 1; i < tensionHistory.length; i++) {
    const diff = tensionHistory[i - 1].tension_score - tensionHistory[i].tension_score
    if (diff >= 3) drops.push({ from: tensionHistory[i - 1].number, to: tensionHistory[i].number, drop: diff })
  }

  const chartData = tensionHistory.map((t, i) => {
    const idealProgress = (i + 1) / tensionHistory.length
    const idealTension = idealProgress < 0.2 ? 4 + idealProgress * 10 : idealProgress < 0.8 ? 6 + (idealProgress - 0.2) * 5 : 9 - (idealProgress - 0.8) * 5
    return { '화': t.number + '화', '텐션': t.tension_score, '이상적': Math.round(idealTension * 10) / 10 }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-bold">텐션 곡선 분석</span>
      </div>

      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="화" tick={{ fontSize: 9 }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="이상적" stroke="#d4d4d4" strokeWidth={1} strokeDasharray="4" dot={false} name="이상적 곡선" />
            <Line type="monotone" dataKey="텐션" stroke="#404040" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-center">
          <div className="text-lg font-bold">{avg}</div>
          <div className="text-[10px] text-neutral-400">평균 텐션</div>
        </div>
        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600">{max}</div>
          <div className="text-[10px] text-neutral-400">최고 ({maxChapter}화)</div>
        </div>
        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-center">
          <div className="text-lg font-bold text-amber-600">{min}</div>
          <div className="text-[10px] text-neutral-400">최저 ({minChapter}화)</div>
        </div>
      </div>

      {drops.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">텐션 급락 감지</div>
          {drops.map((d, i) => (
            <div key={i} className="text-[10px] text-amber-700 dark:text-amber-300">{d.from}화 → {d.to}화: 텐션 {d.drop}점 하락</div>
          ))}
        </div>
      )}

      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/30 rounded-lg">
        <div className="text-xs font-medium mb-2">분석 팁</div>
        <ul className="text-[10px] text-neutral-500 space-y-1">
          <li>이상적 곡선: 초반 낮음 → 중반 상승 → 클라이맥스 → 엔딩</li>
          <li>평균 텐션 6+ 권장 (장르별 상이)</li>
          <li>3화 이상 저텐션 지속 시 독자 이탈 위험</li>
        </ul>
      </div>

      <p className="text-[10px] text-neutral-400 text-center">
        분석 범위: {tensionHistory.length}화 / 전체 {chapters.length}화
      </p>
    </div>
  )
}

// ── ANALYZE PANEL ──
function AnalyzePanel() {
  const { currentChapter, clicheResult, isDetectingCliches, detectCliches, benchmarkResult, isBenchmarking, runBenchmark } = useStore()
  const [dialogueStats, setDialogueStats] = useState<any>(null)

  useEffect(() => {
    if (!currentChapter?.content) { setDialogueStats(null); return }
    const text = currentChapter.content.replace(/<[^>]+>/g, '')
    const lines = text.split(/[.!?。]/).filter((l: string) => l.trim().length > 5)
    let dialogueLines = 0
    let narrativeLines = 0
    lines.forEach((l: string) => {
      if (l.includes('"') || l.includes('\u201C') || l.includes('\u300D')) dialogueLines++
      else narrativeLines++
    })
    const total = dialogueLines + narrativeLines
    const dialogueRatio = total > 0 ? Math.round((dialogueLines / total) * 100) : 0
    setDialogueStats({
      dialogueLines, narrativeLines, dialogueRatio,
      recommendation: dialogueRatio < 30 ? '대화 비율이 낮습니다. 독자 몰입을 위해 대화를 늘려보세요.' : dialogueRatio > 70 ? '대화 비율이 높습니다. 서술로 상황 설명을 보충하세요.' : '적절한 대화/서술 비율입니다.',
    })
  }, [currentChapter?.content])

  if (!currentChapter) return <Empty text="화를 선택하세요" icon={BarChart3} />

  const typeColors: Record<string, string> = { expression: '#ec4899', plot: '#3b82f6', character: '#22c55e', appearance: '#f97316' }
  const typeLabels: Record<string, string> = { expression: '표현', plot: '전개', character: '캐릭터', appearance: '외모묘사' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-bold">텍스트 분석</span>
      </div>

      {/* Dialogue Ratio */}
      {dialogueStats && (
        <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <div className="text-xs font-medium text-neutral-500 mb-3">대화/서술 비율</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500" style={{ width: `${dialogueStats.dialogueRatio}%` }} />
              <div className="h-full bg-neutral-400" style={{ width: `${100 - dialogueStats.dialogueRatio}%` }} />
            </div>
            <span className="text-sm font-bold">{dialogueStats.dialogueRatio}%</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-lg font-bold text-blue-600">{dialogueStats.dialogueLines}</div>
              <div className="text-[10px] text-neutral-400">대화</div>
            </div>
            <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-800/30 rounded">
              <div className="text-lg font-bold text-neutral-600">{dialogueStats.narrativeLines}</div>
              <div className="text-[10px] text-neutral-400">서술</div>
            </div>
          </div>
          <p className="text-[10px] text-neutral-500">{dialogueStats.recommendation}</p>
        </div>
      )}

      {/* Cliche Detection */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-500">클리셰 탐지</span>
          <div className="flex gap-1">
            <button onClick={() => detectCliches(false)} disabled={isDetectingCliches} className="text-[10px] px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 transition disabled:opacity-50">
              {isDetectingCliches ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '빠른 검사'}
            </button>
            <button onClick={() => detectCliches(true)} disabled={isDetectingCliches} className="text-[10px] px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50">
              AI 정밀 검사
            </button>
          </div>
        </div>
        {isDetectingCliches && <Loading text="클리셰 탐지 중..." />}
        {clicheResult && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(clicheResult.by_type || {}).map(([type, count]: [string, any]) => count > 0 && (
                <span key={type} className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: (typeColors[type] || '#a3a3a3') + '20', color: typeColors[type] || '#a3a3a3' }}>
                  {typeLabels[type] || type} {count}
                </span>
              ))}
            </div>
            {clicheResult.cliches?.length === 0 ? (
              <div className="text-center py-4 text-neutral-400">
                <Sparkles className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs">클리셰가 발견되지 않았습니다!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clicheResult.cliches?.map((c: any, i: number) => (
                  <div key={i} className="p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: (typeColors[c.type] || '#a3a3a3') + '20', color: typeColors[c.type] || '#a3a3a3' }}>{typeLabels[c.type] || c.type}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">&ldquo;{c.text}&rdquo;</p>
                        <p className="text-[10px] text-neutral-400">{c.description}</p>
                        {c.suggestion && <p className="text-[10px] text-blue-500 mt-1">{c.suggestion}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!clicheResult && !isDetectingCliches && (
          <p className="text-[10px] text-neutral-400 text-center py-4">버튼을 눌러 클리셰를 탐지하세요</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
        <div className="text-[10px] font-medium text-neutral-500 mb-2">현재 화 통계</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold">{currentChapter.word_count || 0}</div>
            <div className="text-[9px] text-neutral-400">글자 수</div>
          </div>
          <div>
            <div className="text-sm font-bold">{Math.max(1, Math.round((currentChapter.word_count || 0) / 500))}분</div>
            <div className="text-[9px] text-neutral-400">읽기 시간</div>
          </div>
          <div>
            <div className="text-sm font-bold">{dialogueStats?.dialogueRatio || 0}%</div>
            <div className="text-[9px] text-neutral-400">대화 비율</div>
          </div>
        </div>
      </div>

      {/* Benchmark */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-500">경쟁작 벤치마킹</span>
          <button onClick={runBenchmark} disabled={isBenchmarking} className="text-[10px] px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded hover:opacity-80 transition disabled:opacity-50">
            {isBenchmarking ? '분석 중...' : '벤치마크'}
          </button>
        </div>
        {isBenchmarking && <Loading text="벤치마크 분석 중..." />}
        {benchmarkResult && !benchmarkResult.error && (
          <div className="space-y-3">
            <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div className="text-2xl font-bold" style={{ color: benchmarkResult.overallScore >= 80 ? '#22c55e' : benchmarkResult.overallScore >= 60 ? '#f97316' : '#ef4444' }}>
                {benchmarkResult.overallScore}점
              </div>
              <div className="text-[10px] text-neutral-400">{benchmarkResult.benchmark?.genre} 장르 대비</div>
            </div>
            {benchmarkResult.recommendations?.length > 0 && (
              <div className="space-y-1">
                {benchmarkResult.recommendations.map((r: any, i: number) => (
                  <div key={i} className={`text-[10px] p-2 rounded ${r.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : r.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                    {r.type === 'success' ? '✓' : r.type === 'warning' ? '!' : 'i'} {r.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!benchmarkResult && !isBenchmarking && (
          <p className="text-[10px] text-neutral-400 text-center py-4">버튼을 눌러 장르 벤치마크와 비교하세요</p>
        )}
      </div>
    </div>
  )
}

// ── SUGGEST PANEL ──
function SuggestPanel() {
  const { suggestions, isSuggesting, suggestStory, readerSimulation, isSimulatingReaders, simulateReaders } = useStore()
  const [direction, setDirection] = useState('')
  const [showReaders, setShowReaders] = useState(false)
  const [selectedPersonas, setSelectedPersonas] = useState(['hardcore', 'casual', 'critic'])

  const PERSONAS: Record<string, string> = { hardcore: '열혈팬', casual: '캐주얼', critic: '비평가', shipper: '커플러', lurker: '눈팅러', binger: '정주행러' }
  const reactionColors: Record<string, string> = { '열광': '#22c55e', '호의': '#3b82f6', '중립': '#a3a3a3', '불만': '#f97316', '이탈': '#ef4444' }

  return (
    <div>
      <p className="text-xs text-neutral-500 mb-2">미회수 복선 기반 스토리 전개를 제안합니다</p>
      <div className="flex gap-1 mb-3">
        <input value={direction} onChange={e => setDirection(e.target.value)} placeholder="원하는 방향 (선택)" className="flex-1 text-xs px-2 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent" />
        <button onClick={() => suggestStory(direction)} disabled={isSuggesting} className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs rounded-lg disabled:opacity-60 flex items-center gap-1">
          {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lightbulb className="w-3 h-3" />}제안
        </button>
      </div>
      {isSuggesting && <Loading text="구상 중..." />}
      {suggestions?.suggestions?.map((s: any, i: number) => (
        <div key={i} className="p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg mb-2">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold">{s.title}</h4>
            <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">{s.type}</span>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">{s.description}</p>
        </div>
      ))}

      {/* Reader Simulation */}
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button onClick={() => setShowReaders(!showReaders)} className="flex items-center justify-between w-full text-left">
          <span className="text-xs font-medium text-neutral-500">독자 반응 시뮬레이션</span>
          {showReaders ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
        </button>
        {showReaders && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1">
              {Object.entries(PERSONAS).map(([id, name]) => (
                <button key={id} onClick={() => setSelectedPersonas(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])} className={`text-[10px] px-2 py-1 rounded transition ${selectedPersonas.includes(id) ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600'}`}>{name}</button>
              ))}
            </div>
            <button onClick={() => simulateReaders(selectedPersonas)} disabled={isSimulatingReaders || selectedPersonas.length === 0} className="w-full py-2 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
              {isSimulatingReaders ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isSimulatingReaders ? '시뮬레이션 중...' : '독자 반응 예측'}
            </button>
            {readerSimulation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                  <span className="text-[10px] text-neutral-400">예상 독자 잔류율</span>
                  <span className="text-sm font-bold" style={{ color: readerSimulation.avgRetention >= 70 ? '#22c55e' : readerSimulation.avgRetention >= 40 ? '#f97316' : '#ef4444' }}>{readerSimulation.avgRetention}%</span>
                </div>
                {readerSimulation.personas?.filter((p: any) => !p.error).map((p: any, i: number) => (
                  <div key={i} className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold">{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: (reactionColors[p.reaction] || '#a3a3a3') + '20', color: reactionColors[p.reaction] || '#a3a3a3' }}>{p.reaction}</span>
                      <span className="text-[10px] text-neutral-400 ml-auto">잔류 {p.continue_reading}%</span>
                    </div>
                    {p.comment && <p className="text-[10px] text-neutral-500 mb-2 italic">&ldquo;{p.comment}&rdquo;</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── GHOSTWRITE PANEL ──
function GhostwritePanel() {
  const { ghostwriteResult, isGhostwriting, ghostwrite, saveChapter } = useStore()
  const [idea, setIdea] = useState('')

  const apply = () => {
    if (ghostwriteResult?.content) {
      const html = ghostwriteResult.content
      const e = (window as any).__tiptapEditor
      if (e) { e.commands.insertContent(html); saveChapter(e.getHTML()) }
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <PenLine className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-bold">AI 대필</span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">아이디어 → 현재 설정+문체로 한 화 작성</p>
      <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="예: 보스가 사실 아버지였다" className="w-full text-xs px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg h-24 resize-none bg-transparent" />
      <button onClick={() => ghostwrite(idea)} disabled={isGhostwriting || !idea.trim()} className="w-full mt-2 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium">
        {isGhostwriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        {isGhostwriting ? '집필중...' : '대필 시작'}
      </button>
      {isGhostwriting && <Loading text="AI 집필중..." />}
      {ghostwriteResult?.content && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-500">결과</span>
            <button onClick={apply} className="text-xs px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg">에디터 삽입</button>
          </div>
          <div className="p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg max-h-96 overflow-y-auto">
            <div className="text-xs leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: ghostwriteResult.content }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── STYLE PANEL ──
function StylePanel() {
  const { styleProfile: sp, isLearningStyle, learnStyle } = useStore()
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-bold">필체 학습</span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">기존 원고 분석 → 문체 프로필 → AI 대필 반영</p>
      <button onClick={learnStyle} disabled={isLearningStyle} className="w-full py-2 bg-neutral-500 text-white text-xs rounded-lg disabled:opacity-60 flex items-center justify-center gap-1 font-medium mb-4">
        {isLearningStyle ? <Loader2 className="w-3 h-3 animate-spin" /> : <GraduationCap className="w-3 h-3" />}
        {isLearningStyle ? '분석중...' : '문체 분석'}
      </button>
      {isLearningStyle && <Loading text="학습중..." />}
      {sp && (sp.avg_sentence_length || sp.sentence_stats) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg text-center">
              <div className="text-xs text-neutral-400">문장 길이</div>
              <div className="font-bold">{sp.sentence_stats?.avg_length || Number(sp.avg_sentence_length || 0).toFixed(1)}어절</div>
            </div>
            <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg text-center">
              <div className="text-xs text-neutral-400">대화 비율</div>
              <div className="font-bold">{((sp.dialogue_ratio || 0) * 100).toFixed(0)}%</div>
            </div>
          </div>
          {sp.tone && (
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400">톤</div>
              <div className="text-sm">{sp.tone}</div>
            </div>
          )}
          {sp.style_features?.length > 0 && (
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <div className="text-xs text-neutral-400 mb-1">문체 특징</div>
              {sp.style_features.map((f: string, i: number) => <p key={i} className="text-xs">• {f}</p>)}
            </div>
          )}
          <p className="text-[10px] text-neutral-400 text-center">AI 대필에 자동 반영됩니다</p>
        </div>
      )}
    </div>
  )
}

// ── COMMENTS PANEL ──
function CommentsPanel() {
  const { currentWork, currentChapter } = useStore()
  if (!currentWork) return <Empty text="작품을 선택하세요" icon={MessageSquare} />
  return (
    <WriterCommentTab
      workId={currentWork.id}
      chapterId={currentChapter?.id || null}
    />
  )
}

// ── SETTINGS PANEL ──
function SettingsPanel() {
  const { darkMode, toggleDark } = useStore()
  const [fontFamily, setFontFamily] = useState('기본')
  const [fontSize, setFontSize] = useState(16)
  const [nickname, setNickname] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setFontFamily(localStorage.getItem('sm_font_family') || '기본')
    setFontSize(Number(localStorage.getItem('sm_font_size')) || 16)
    setNickname(localStorage.getItem('sm_nickname') || '')
  }, [])

  const saveSettings = () => {
    localStorage.setItem('sm_font_family', fontFamily)
    localStorage.setItem('sm_font_size', String(fontSize))
    localStorage.setItem('sm_nickname', nickname)
    // Apply font to editor
    const editor = document.querySelector('.ProseMirror') as HTMLElement
    if (editor) {
      editor.style.fontFamily = fontFamily === '기본' ? '' : fontFamily
      editor.style.fontSize = `${fontSize}px`
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const FONTS = ['기본', 'Noto Sans KR', 'Noto Serif KR', 'Pretendard', 'D2Coding']
  const SIZES = [14, 16, 18, 20, 22]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        <span className="text-sm font-bold">에디터 설정</span>
      </div>

      {/* Nickname */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="text-xs font-medium text-neutral-500 mb-2">닉네임</div>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full text-xs px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent"
        />
      </div>

      {/* Font Family */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="text-xs font-medium text-neutral-500 mb-2">
          <Type className="w-3 h-3 inline mr-1" />글꼴
        </div>
        <div className="space-y-1">
          {FONTS.map(f => (
            <button
              key={f}
              onClick={() => setFontFamily(f)}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg transition ${
                fontFamily === f
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
              style={{ fontFamily: f === '기본' ? 'inherit' : f }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="text-xs font-medium text-neutral-500 mb-2">글자 크기</div>
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`flex-1 text-xs py-2 rounded-lg transition ${
                fontSize === s
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Dark Mode */}
      <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-500">다크 모드</div>
            <div className="text-[10px] text-neutral-400">{darkMode ? '어두운 테마' : '밝은 테마'}</div>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              darkMode ? 'bg-neutral-600' : 'bg-neutral-300'
            }`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              darkMode ? 'translate-x-6' : 'translate-x-0.5'
            }`}>
              {darkMode ? <Moon className="w-3 h-3 m-1 text-neutral-600" /> : <Sun className="w-3 h-3 m-1 text-amber-500" />}
            </div>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs rounded-lg font-medium flex items-center justify-center gap-1 hover:opacity-90 transition"
      >
        {saved ? <Check className="w-3 h-3" /> : null}
        {saved ? '저장됨!' : '설정 저장'}
      </button>

      {/* Link to full settings */}
      <a
        href="/settings"
        className="block text-center text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
      >
        전체 설정 페이지 →
      </a>
    </div>
  )
}
