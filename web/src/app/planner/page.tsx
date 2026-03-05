// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  Map, Plus, Trash2, ArrowLeft, Clock, ChevronRight, Sparkles,
  Zap, FileText, Loader2, Upload, MessageSquare
} from 'lucide-react'

const STEP_LABELS = ['분석', '아크', '캐릭터', '세계관', '콘티', '복선']

const GENRE_OPTIONS = [
  '판타지', '로맨스', '로판', '무협', '현판', 'SF', '미스터리', '기타'
]

export default function PlannerListPage() {
  const router = useRouter()
  const { storyPlans, fetchPlans, darkMode, toggleDark, works, fetchWorks } = useStore()

  const [loading, setLoading] = useState(true)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newIdea, setNewIdea] = useState('')
  const [newGenre, setNewGenre] = useState('판타지')
  const [creating, setCreating] = useState(false)
  const [createMode, setCreateMode] = useState<'chat' | 'auto' | 'manuscript'>('auto')
  const [autoProgress, setAutoProgress] = useState<{ step: number; label: string } | null>(null)
  const [selectedWorkId, setSelectedWorkId] = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      await Promise.all([fetchPlans(), fetchWorks()])
      setLoading(false)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) {
        toggleDark()
      }
    }
    init()
  }, [router, fetchPlans, darkMode, toggleDark])

  const handleCreate = async () => {
    if (createMode === 'manuscript') {
      if (!selectedWorkId) return
      setCreating(true)
      const selectedWork = works.find((w: any) => w.id === selectedWorkId)
      try {
        // 1. Create plan
        const res = await fetch('/api/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedWork?.title || '원고 분석',
            idea_text: '',
            genre: selectedWork?.genre || '',
          }),
        })
        const data = await res.json()
        if (!data.plan) throw new Error('플랜 생성 실패')

        // 2. Run manuscript analysis
        setAutoProgress({ step: 0, label: '원고 읽는 중...' })
        const analyzeRes = await fetch(`/api/planner/${data.plan.id}/analyze-manuscript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workId: selectedWorkId }),
        })
        const analyzeData = await analyzeRes.json()

        if (analyzeData.success) {
          setAutoProgress(null)
          router.push(`/planner/${data.plan.id}`)
        } else {
          setAutoProgress(null)
          alert(analyzeData.error || '분석 중 오류가 발생했습니다.')
          router.push(`/planner/${data.plan.id}`)
        }
      } catch {
        setAutoProgress(null)
        alert('원고 분석 중 오류가 발생했습니다.')
      }
      setCreating(false)
      return
    }

    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          idea_text: newIdea,
          genre: newGenre,
        }),
      })
      const data = await res.json()
      if (!data.plan) throw new Error('플랜 생성 실패')

      if (createMode === 'auto' && newIdea.trim()) {
        // Run auto-generate
        const STEP_LABELS = ['아이디어 분석', '스토리 아크', '캐릭터 설계', '세계관 구축', '에피소드 콘티', '복선 설계']
        setAutoProgress({ step: 1, label: STEP_LABELS[0] })

        const autoRes = await fetch(`/api/planner/${data.plan.id}/auto-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const autoData = await autoRes.json()

        setAutoProgress(null)
        if (autoData.success) {
          router.push(`/planner/${data.plan.id}`)
        } else {
          alert(autoData.error || '자동 생성 중 오류가 발생했습니다.')
          router.push(`/planner/${data.plan.id}`)
        }
      } else {
        // Chat mode — go to detail page
        router.push(`/planner/${data.plan.id}`)
      }
    } catch {
      setAutoProgress(null)
      alert('기획 생성 중 오류가 발생했습니다.')
    }
    setCreating(false)
  }

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation()
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await fetch(`/api/planner/${planId}`, { method: 'DELETE' })
      await fetchPlans()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const getStepProgress = (plan: any) => {
    if (plan.status === 'complete' || plan.status === 'finalized') return 6
    return Math.max(1, (plan.current_step || 1) - 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="대시보드로 돌아가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Map className="w-6 h-6 text-neutral-700 dark:text-white" />
              <span className="font-bold text-lg">StoryPlanner</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">스토리 기획</h1>
            <p className="text-neutral-500 mt-1">AI와 함께 6단계로 스토리를 기획하세요</p>
          </div>
          <button
            onClick={() => setShowNewPlan(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            새 기획
          </button>
        </div>

        {/* Plans Grid */}
        {storyPlans.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-neutral-400 mb-2">기획이 없습니다</h2>
            <p className="text-neutral-400 mb-6">새 기획을 만들어 AI와 스토리를 설계하세요</p>
            <button
              onClick={() => setShowNewPlan(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              첫 기획 시작
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storyPlans.map((plan: any) => {
              const progress = getStepProgress(plan)
              const isComplete = plan.status === 'complete' || plan.status === 'finalized'

              return (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition cursor-pointer group"
                  onClick={() => router.push(`/planner/${plan.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                      <Map className="w-6 h-6 text-neutral-500" />
                    </div>
                    <div className="flex items-center gap-1">
                      {isComplete && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                          완료
                        </span>
                      )}
                      {plan.status === 'finalized' && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                          변환됨
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, plan.id)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 truncate">{plan.title || '제목 없음'}</h3>

                  {plan.idea_text && (
                    <p className="text-sm text-neutral-500 mb-3 line-clamp-2">{plan.idea_text}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3">
                    {plan.genre && (
                      <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                        {plan.genre}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                      Step {plan.current_step || 1}/6
                    </span>
                  </div>

                  {/* Step Progress Bar */}
                  <div className="flex gap-1 mb-1">
                    {STEP_LABELS.map((label, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < progress
                            ? 'bg-neutral-900 dark:bg-white'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                        title={label}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 mb-3">
                    {STEP_LABELS.map((label, i) => (
                      <span key={i} className={i < progress ? 'text-neutral-600 dark:text-neutral-300' : ''}>
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="w-3 h-3" />
                      {new Date(plan.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* New Plan Modal */}
      {showNewPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !creating && setShowNewPlan(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">새 스토리 기획</h2>

            {/* Auto-generate progress overlay */}
            {autoProgress && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-neutral-500 mb-4" />
                <p className="text-lg font-semibold mb-2">AI가 기획 중...</p>
                <p className="text-sm text-neutral-500">{autoProgress.label}</p>
                <p className="text-xs text-neutral-400 mt-4">보통 30초~1분 소요됩니다</p>
              </div>
            )}

            {!autoProgress && (
              <>
                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <button
                    onClick={() => setCreateMode('auto')}
                    className={`p-3 rounded-xl border-2 transition text-center ${
                      createMode === 'auto'
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-1.5" />
                    <div className="text-xs font-medium">원샷 자동</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">아이디어→완성</div>
                  </button>
                  <button
                    onClick={() => setCreateMode('chat')}
                    className={`p-3 rounded-xl border-2 transition text-center ${
                      createMode === 'chat'
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 mx-auto mb-1.5" />
                    <div className="text-xs font-medium">채팅 기획</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">AI와 대화</div>
                  </button>
                  <button
                    onClick={() => setCreateMode('manuscript')}
                    className={`p-3 rounded-xl border-2 transition text-center ${
                      createMode === 'manuscript'
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <FileText className="w-5 h-5 mx-auto mb-1.5" />
                    <div className="text-xs font-medium">원고 분석</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">기존 원고→기획</div>
                  </button>
                </div>

                {/* Manuscript mode */}
                {createMode === 'manuscript' ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        기존 작품을 선택하면 AI가 원고를 읽고 캐릭터, 세계관, 콘티, 복선을 자동 추출합니다.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">분석할 작품 선택</label>
                      {works.length === 0 ? (
                        <p className="text-sm text-neutral-400 py-4 text-center">작품이 없습니다. 먼저 대시보드에서 작품을 만들어주세요.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {works.map((work: any) => (
                            <button
                              key={work.id}
                              onClick={() => setSelectedWorkId(work.id)}
                              className={`w-full text-left p-3 rounded-xl border-2 transition ${
                                selectedWorkId === work.id
                                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <div className="font-medium text-sm">{work.title}</div>
                              <div className="text-xs text-neutral-400 mt-0.5">
                                {work.genre || '장르 미지정'} · {new Date(work.updated_at).toLocaleDateString('ko-KR')}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Chat / Auto mode */
                  <div className="space-y-4">
                    {createMode === 'auto' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          아이디어를 붙여넣으면 AI가 6단계(분석→아크→캐릭터→세계관→콘티→복선)를 한번에 자동 생성합니다.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1.5">작품 제목</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="예: 회귀한 천재 마법사"
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">장르</label>
                      <select
                        value={newGenre}
                        onChange={(e) => setNewGenre(e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500"
                      >
                        {GENRE_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {createMode === 'auto' ? '아이디어 (상세할수록 좋습니다)' : '아이디어 / 시놉시스 (선택)'}
                      </label>
                      <textarea
                        value={newIdea}
                        onChange={(e) => setNewIdea(e.target.value)}
                        placeholder={createMode === 'auto'
                          ? '메모장에 적어둔 아이디어를 통째로 붙여넣으세요.\n설정, 캐릭터, 전개, 분위기 등 무엇이든 좋습니다.\n길면 길수록 더 정확한 기획이 나옵니다.'
                          : '스토리 아이디어를 자유롭게 적어주세요. (선택사항)'}
                        rows={createMode === 'auto' ? 8 : 4}
                        className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowNewPlan(false)}
                    className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={
                      creating ||
                      (createMode === 'manuscript' ? !selectedWorkId : !newTitle.trim()) ||
                      (createMode === 'auto' && !newIdea.trim())
                    }
                    className="flex-1 py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        처리 중...
                      </>
                    ) : createMode === 'auto' ? (
                      <>
                        <Zap className="w-4 h-4" />
                        자동 생성
                      </>
                    ) : createMode === 'manuscript' ? (
                      <>
                        <FileText className="w-4 h-4" />
                        원고 분석
                      </>
                    ) : (
                      '기획 시작'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
