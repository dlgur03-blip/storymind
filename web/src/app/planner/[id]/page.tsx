// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  ArrowLeft, Send, ChevronDown, ChevronRight, Sparkles,
  BookOpen, Users, Globe, FileText, GitBranch,
  Loader2, Play, Download
} from 'lucide-react'

const STEPS = [
  { num: 1, label: '아이디어 분석', short: '분석', icon: Sparkles },
  { num: 2, label: '스토리 아크', short: '아크', icon: GitBranch },
  { num: 3, label: '캐릭터 설계', short: '캐릭터', icon: Users },
  { num: 4, label: '세계관 구축', short: '세계관', icon: Globe },
  { num: 5, label: '에피소드 콘티', short: '콘티', icon: FileText },
  { num: 6, label: '복선 설계', short: '복선', icon: BookOpen },
]

const STEP_GUIDANCE = {
  1: '작품의 아이디어를 AI가 분석합니다. 추가 정보가 있으면 자유롭게 보내주세요.',
  2: '스토리 아크를 설계합니다. 원하는 전개 방향이나 결말에 대해 알려주세요.',
  3: '주요 캐릭터를 설계합니다. 주인공과 히로인, 조연들의 성격이나 능력을 알려주세요.',
  4: '세계관을 구축합니다. 배경, 마법 체계, 사회 구조 등에 대해 설명해주세요.',
  5: '에피소드 콘티를 작성합니다. 각 화의 전개와 클리프행어를 설계합니다.',
  6: '복선을 설계합니다. 회수할 떡밥과 반전 요소를 배치합니다.',
}

export default function PlannerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string
  const { darkMode, toggleDark } = useStore()

  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('chat')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [extending, setExtending] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['analysis', 'arcs', 'characters', 'world', 'foreshadows'])
  )

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const autoStarted = useRef(false)

  // Auth guard + initial load
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) {
        toggleDark()
      }

      await fetchPlan()
      setLoading(false)
    }
    init()
  }, [planId])

  // Auto-start step 1 if idea_text exists but no conversation yet
  useEffect(() => {
    if (!plan || autoStarted.current || sending) return
    const hasIdea = plan.idea_text && plan.idea_text.trim().length > 0
    const noConversation = !plan.conversation || plan.conversation.length === 0
    const isStep1 = (plan.current_step || 1) === 1

    if (hasIdea && noConversation && isStep1) {
      autoStarted.current = true
      autoSendIdea(plan.idea_text.trim())
    }
  }, [plan])

  const autoSendIdea = async (ideaText: string) => {
    setSending(true)

    // Show idea as user message immediately
    const userContent = `[작품 아이디어]\n${ideaText}${plan.genre ? `\n\n장르: ${plan.genre}` : ''}`
    setPlan((prev) => ({
      ...prev,
      conversation: [{ role: 'user', content: userContent, step: 1 }],
    }))

    try {
      const res = await fetch(`/api/planner/${planId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent, step: 1 }),
      })
      const data = await res.json()

      setPlan((prev) => ({
        ...prev,
        conversation: data.conversation || prev.conversation,
        current_step: data.nextStep || prev.current_step,
        ...(data.field && data.data ? { [data.field]: data.data } : {}),
      }))
    } catch {
      // Keep the user message visible, just show error
      setPlan((prev) => ({
        ...prev,
        conversation: [
          ...(prev.conversation || []),
          { role: 'assistant', content: '분석 중 오류가 발생했습니다. 메시지를 다시 보내주세요.', step: 1 },
        ],
      }))
    }
    setSending(false)
  }

  // Auto-scroll chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [plan?.conversation])

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/planner/${planId}`)
      if (!res.ok) {
        router.push('/planner')
        return
      }
      const data = await res.json()
      setPlan(data.plan)
      setTitleDraft(data.plan?.title || '')
    } catch {
      router.push('/planner')
    }
  }

  const handleSend = async () => {
    if (!message.trim() || sending || !plan) return
    setSending(true)

    const userMsg = message.trim()
    setMessage('')

    // Optimistic: show user message immediately
    const optimisticConversation = [
      ...(plan.conversation || []),
      { role: 'user', content: userMsg, step: plan.current_step },
    ]
    setPlan((prev) => ({ ...prev, conversation: optimisticConversation }))

    try {
      const res = await fetch(`/api/planner/${planId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, step: plan.current_step }),
      })
      const data = await res.json()

      setPlan((prev) => ({
        ...prev,
        conversation: data.conversation || prev.conversation,
        current_step: data.nextStep || prev.current_step,
        ...(data.field && data.data ? { [data.field]: data.data } : {}),
      }))
    } catch {
      // Revert optimistic update
      setPlan((prev) => ({
        ...prev,
        conversation: prev.conversation?.slice(0, -1),
      }))
      alert('메시지 전송 중 오류가 발생했습니다.')
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTitleSave = async () => {
    if (!titleDraft.trim() || !plan) return
    setEditingTitle(false)
    try {
      await fetch(`/api/planner/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft.trim() }),
      })
      setPlan((prev) => ({ ...prev, title: titleDraft.trim() }))
    } catch {
      setTitleDraft(plan.title)
    }
  }

  const handleExtend = async () => {
    if (extending) return
    setExtending(true)
    try {
      const res = await fetch(`/api/planner/${planId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 }),
      })
      const data = await res.json()
      if (data.conti) {
        setPlan((prev) => ({ ...prev, conti: data.conti }))
      } else {
        await fetchPlan()
      }
    } catch {
      alert('콘티 연장 중 오류가 발생했습니다.')
    }
    setExtending(false)
  }

  const handleFinalize = async () => {
    if (finalizing) return
    if (!confirm('작품으로 변환하시겠습니까? 기획 데이터를 바탕으로 새 작품이 생성됩니다.'))
      return
    setFinalizing(true)
    try {
      const res = await fetch(`/api/planner/${planId}/finalize`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.workId) {
        router.push(`/editor/${data.workId}`)
      } else {
        alert('변환에 실패했습니다.')
        setFinalizing(false)
      }
    } catch {
      alert('작품 변환 중 오류가 발생했습니다.')
      setFinalizing(false)
    }
  }

  const toggleEpisode = (idx: number) => {
    setExpandedEpisodes((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <span className="text-neutral-500 text-sm">기획 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (!plan) return null

  const currentStep = plan.current_step || 1
  const conversation = plan.conversation || []
  const conti = plan.conti || []

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/planner')}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="text-lg font-bold bg-transparent border-b-2 border-neutral-400 dark:border-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white px-1 min-w-0"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-bold truncate cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                onClick={() => {
                  setTitleDraft(plan.title || '')
                  setEditingTitle(true)
                }}
                title="클릭하여 제목 수정"
              >
                {plan.title || '제목 없음'}
              </h1>
            )}

            {plan.genre && (
              <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs rounded shrink-0">
                {plan.genre}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-neutral-500 shrink-0">
            <span>Step {currentStep}/6</span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex gap-1">
            {STEPS.map((step) => {
              const isActive = step.num === currentStep
              const isComplete = step.num < currentStep
              return (
                <div key={step.num} className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-colors ${
                      isComplete
                        ? 'bg-neutral-900 dark:bg-white'
                        : isActive
                        ? 'bg-neutral-500 dark:bg-neutral-400'
                        : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  />
                  <span
                    className={`block text-center text-[10px] mt-1 transition-colors ${
                      isActive
                        ? 'text-neutral-900 dark:text-white font-semibold'
                        : isComplete
                        ? 'text-neutral-600 dark:text-neutral-400'
                        : 'text-neutral-400 dark:text-neutral-600'
                    }`}
                  >
                    {step.short}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 flex">
          {[
            { key: 'chat', label: '채팅' },
            { key: 'conti', label: '콘티' },
            { key: 'summary', label: '요약' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {activeTab === 'chat' && (
          <ChatTab
            conversation={conversation}
            currentStep={currentStep}
            message={message}
            setMessage={setMessage}
            sending={sending}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            chatEndRef={chatEndRef}
            inputRef={inputRef}
          />
        )}

        {activeTab === 'conti' && (
          <ContiTab
            conti={conti}
            expandedEpisodes={expandedEpisodes}
            toggleEpisode={toggleEpisode}
            extending={extending}
            handleExtend={handleExtend}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            plan={plan}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            finalizing={finalizing}
            handleFinalize={handleFinalize}
          />
        )}
      </div>
    </div>
  )
}

/* =================================================================
   Chat Tab
   ================================================================= */
function ChatTab({
  conversation,
  currentStep,
  message,
  setMessage,
  sending,
  handleSend,
  handleKeyDown,
  chatEndRef,
  inputRef,
}) {
  const stepInfo = STEPS.find((s) => s.num === currentStep)
  const StepIcon = stepInfo?.icon || Sparkles

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Step guidance banner */}
        <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <StepIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">
              Step {currentStep}: {stepInfo?.label}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {STEP_GUIDANCE[currentStep]}
            </p>
          </div>
        </div>

        {/* Messages list */}
        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {msg.role === 'assistant' && msg.step && (
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-medium">
                  Step {msg.step} - {STEPS.find((s) => s.num === msg.step)?.label}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI가 생각 중...
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Step ${currentStep}: ${STEPS.find((s) => s.num === currentStep)?.label}에 대해 이야기해주세요...`}
            rows={1}
            className="flex-1 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none text-sm max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="p-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:opacity-90 transition disabled:opacity-40 shrink-0"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =================================================================
   Conti Tab
   ================================================================= */
function ContiTab({
  conti,
  expandedEpisodes,
  toggleEpisode,
  extending,
  handleExtend,
}) {
  if (!conti || conti.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <FileText className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-4" />
        <h3 className="text-lg font-medium text-neutral-400 mb-2">
          콘티가 아직 없습니다
        </h3>
        <p className="text-sm text-neutral-400 text-center">
          채팅 탭에서 Step 5(에피소드 콘티)까지 진행하면 콘티가 생성됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="space-y-3">
        {conti.map((ep, idx) => {
          const isExpanded = expandedEpisodes.has(idx)
          return (
            <div
              key={idx}
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden"
            >
              {/* Episode Header */}
              <button
                onClick={() => toggleEpisode(idx)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition"
              >
                <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                  {ep.episode || idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {ep.title || `${ep.episode || idx + 1}화`}
                  </p>
                  {ep.summary && (
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {ep.summary}
                    </p>
                  )}
                </div>
                {ep.tension !== undefined && (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (ep.tension || 0) * 10)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 w-4 text-right">
                      {ep.tension}
                    </span>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                )}
              </button>

              {/* Episode Details (expanded) */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-0 border-t border-neutral-100 dark:border-neutral-700">
                  {ep.summary && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-neutral-400 mb-1">
                        요약
                      </p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {ep.summary}
                      </p>
                    </div>
                  )}

                  {ep.key_events && ep.key_events.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-neutral-400 mb-1">
                        주요 이벤트
                      </p>
                      <ul className="space-y-1">
                        {ep.key_events.map((evt, i) => (
                          <li
                            key={i}
                            className="text-sm text-neutral-700 dark:text-neutral-300 flex items-start gap-2"
                          >
                            <span className="text-neutral-400 mt-0.5 shrink-0">
                              -
                            </span>
                            <span>
                              {typeof evt === 'string'
                                ? evt
                                : evt.description ||
                                  evt.event ||
                                  JSON.stringify(evt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ep.cliffhanger && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-neutral-400 mb-1">
                        클리프행어
                      </p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                        {ep.cliffhanger}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400">
                    {ep.tension !== undefined && (
                      <span>긴장도: {ep.tension}/10</span>
                    )}
                    {ep.episode && <span>{ep.episode}화</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Extend button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleExtend}
          disabled={extending}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {extending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              콘티 생성 중...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              콘티 연장 (+10화)
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* =================================================================
   Summary Tab
   ================================================================= */
function SummaryTab({
  plan,
  expandedSections,
  toggleSection,
  finalizing,
  handleFinalize,
}) {
  const sections = [
    { key: 'analysis', label: '아이디어 분석', icon: Sparkles, data: plan.analysis },
    { key: 'arcs', label: '스토리 아크', icon: GitBranch, data: plan.arcs },
    { key: 'characters', label: '캐릭터', icon: Users, data: plan.characters },
    { key: 'world', label: '세계관', icon: Globe, data: plan.world },
    { key: 'foreshadows', label: '복선', icon: BookOpen, data: plan.foreshadows },
  ]

  const hasAnyData = sections.some((s) => s.data)

  if (!hasAnyData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <Download className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-4" />
        <h3 className="text-lg font-medium text-neutral-400 mb-2">
          아직 생성된 데이터가 없습니다
        </h3>
        <p className="text-sm text-neutral-400 text-center">
          채팅 탭에서 AI와 대화하며 각 단계를 진행하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="space-y-3">
        {sections.map((section) => {
          if (!section.data) return null
          const isExpanded = expandedSections.has(section.key)
          const Icon = section.icon

          return (
            <div
              key={section.key}
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition"
              >
                <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </div>
                <span className="font-semibold text-sm flex-1">
                  {section.label}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-700">
                  <SectionContent
                    sectionKey={section.key}
                    data={section.data}
                    selectedArc={plan.selected_arc}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Finalize button */}
      <div className="mt-8 mb-4 flex justify-center">
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="flex items-center gap-2 px-8 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 text-base"
        >
          {finalizing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              작품 변환 중...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              작품으로 변환
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* =================================================================
   Section Content Renderer (for Summary tab)
   ================================================================= */
function SectionContent({ sectionKey, data, selectedArc }) {
  if (!data) return null

  /* ---------- Analysis ---------- */
  if (sectionKey === 'analysis') {
    if (typeof data === 'string') {
      return (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3">
          {data}
        </p>
      )
    }
    const knownKeys = [
      'genre',
      'target_audience',
      'themes',
      'strengths',
      'risks',
      'summary',
    ]
    return (
      <div className="mt-3 space-y-3">
        {data.genre && (
          <FieldBlock label="장르" value={data.genre} />
        )}
        {data.target_audience && (
          <FieldBlock label="타겟 독자" value={data.target_audience} />
        )}
        {data.themes && (
          <div>
            <p className="text-xs font-medium text-neutral-400 mb-1">테마</p>
            {Array.isArray(data.themes) ? (
              <div className="flex flex-wrap gap-1.5">
                {data.themes.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {data.themes}
              </p>
            )}
          </div>
        )}
        {data.strengths && (
          <FieldBlock
            label="강점"
            value={
              Array.isArray(data.strengths)
                ? data.strengths.join('\n')
                : data.strengths
            }
          />
        )}
        {data.risks && (
          <FieldBlock
            label="리스크"
            value={
              Array.isArray(data.risks) ? data.risks.join('\n') : data.risks
            }
          />
        )}
        {data.summary && <FieldBlock label="요약" value={data.summary} />}
        {Object.keys(data)
          .filter((k) => !knownKeys.includes(k))
          .map((key) => (
            <FieldBlock
              key={key}
              label={key}
              value={
                typeof data[key] === 'string'
                  ? data[key]
                  : JSON.stringify(data[key], null, 2)
              }
            />
          ))}
      </div>
    )
  }

  /* ---------- Arcs ---------- */
  if (sectionKey === 'arcs') {
    if (typeof data === 'string') {
      return (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3">
          {data}
        </p>
      )
    }
    const arcs = Array.isArray(data)
      ? data
      : data.options || data.arcs || [data]
    return (
      <div className="mt-3 space-y-3">
        {arcs.map((arc, idx) => {
          const arcName = arc.name || arc.title || `아크 ${idx + 1}`
          const isSelected =
            selectedArc &&
            (selectedArc === arc.name ||
              selectedArc === arc.title ||
              selectedArc === String(idx))
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border ${
                isSelected
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-700/50'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-sm">{arcName}</p>
                {isSelected && (
                  <span className="px-2 py-0.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded text-[10px] font-medium">
                    선택됨
                  </span>
                )}
              </div>
              {arc.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {arc.description}
                </p>
              )}
              {arc.structure && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 whitespace-pre-wrap">
                  {typeof arc.structure === 'string'
                    ? arc.structure
                    : JSON.stringify(arc.structure, null, 2)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* ---------- Characters ---------- */
  if (sectionKey === 'characters') {
    if (typeof data === 'string') {
      return (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3">
          {data}
        </p>
      )
    }
    const chars = Array.isArray(data) ? data : data.characters || [data]
    return (
      <div className="mt-3 space-y-3">
        {chars.map((char, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-neutral-400" />
              <p className="font-semibold text-sm">
                {char.name || `캐릭터 ${idx + 1}`}
              </p>
              {char.role && (
                <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-[10px]">
                  {char.role}
                </span>
              )}
            </div>
            {char.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {char.description}
              </p>
            )}
            {char.personality && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="text-neutral-400">성격:</span>{' '}
                {char.personality}
              </p>
            )}
            {char.ability && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="text-neutral-400">능력:</span> {char.ability}
              </p>
            )}
            {char.motivation && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="text-neutral-400">동기:</span>{' '}
                {char.motivation}
              </p>
            )}
            {char.arc && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="text-neutral-400">캐릭터 아크:</span>{' '}
                {char.arc}
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  /* ---------- World ---------- */
  if (sectionKey === 'world') {
    if (typeof data === 'string') {
      return (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3">
          {data}
        </p>
      )
    }
    const knownKeys = [
      'setting',
      'magic_system',
      'society',
      'geography',
      'history',
      'rules',
    ]
    return (
      <div className="mt-3 space-y-3">
        {data.setting && <FieldBlock label="배경" value={data.setting} />}
        {data.magic_system && (
          <FieldBlock
            label="마법/능력 체계"
            value={
              typeof data.magic_system === 'string'
                ? data.magic_system
                : JSON.stringify(data.magic_system, null, 2)
            }
          />
        )}
        {data.society && (
          <FieldBlock
            label="사회 구조"
            value={
              typeof data.society === 'string'
                ? data.society
                : JSON.stringify(data.society, null, 2)
            }
          />
        )}
        {data.geography && (
          <FieldBlock
            label="지리"
            value={
              typeof data.geography === 'string'
                ? data.geography
                : JSON.stringify(data.geography, null, 2)
            }
          />
        )}
        {data.history && (
          <FieldBlock
            label="역사"
            value={
              typeof data.history === 'string'
                ? data.history
                : JSON.stringify(data.history, null, 2)
            }
          />
        )}
        {data.rules && (
          <FieldBlock
            label="규칙/법칙"
            value={
              typeof data.rules === 'string'
                ? data.rules
                : JSON.stringify(data.rules, null, 2)
            }
          />
        )}
        {Object.keys(data)
          .filter((k) => !knownKeys.includes(k))
          .map((key) => (
            <FieldBlock
              key={key}
              label={key}
              value={
                typeof data[key] === 'string'
                  ? data[key]
                  : JSON.stringify(data[key], null, 2)
              }
            />
          ))}
      </div>
    )
  }

  /* ---------- Foreshadows ---------- */
  if (sectionKey === 'foreshadows') {
    if (typeof data === 'string') {
      return (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3">
          {data}
        </p>
      )
    }
    const foreshadows = Array.isArray(data)
      ? data
      : data.foreshadows || data.items || [data]
    return (
      <div className="mt-3 space-y-3">
        {foreshadows.map((fs, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-neutral-400" />
              <p className="font-semibold text-sm">
                {fs.name || fs.title || `복선 ${idx + 1}`}
              </p>
              {fs.type && (
                <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-[10px]">
                  {fs.type}
                </span>
              )}
            </div>
            {fs.setup && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                <span className="text-neutral-400">설치:</span> {fs.setup}
              </p>
            )}
            {fs.payoff && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                <span className="text-neutral-400">회수:</span> {fs.payoff}
              </p>
            )}
            {fs.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {fs.description}
              </p>
            )}
            {fs.setup_episode && (
              <p className="text-xs text-neutral-400 mt-2">
                설치: {fs.setup_episode}화 / 회수: {fs.payoff_episode || '?'}화
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  /* ---------- Fallback ---------- */
  return (
    <pre className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mt-3 overflow-x-auto">
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  )
}

/* =================================================================
   Shared small component
   ================================================================= */
function FieldBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 mb-1">{label}</p>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
        {value}
      </p>
    </div>
  )
}
