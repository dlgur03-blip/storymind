// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import OnboardingGuide, { useOnboarding } from '@/components/OnboardingGuide'
import {
  BookOpen, Plus, Trash2, Folder, Clock, PenLine, Users,
  Settings, LogOut, Moon, Sun, FileText, Palette,
  Upload, Map, Target, HelpCircle, Keyboard, Sparkles
} from 'lucide-react'
import ServiceSwitcher from '@/components/ServiceSwitcher'

export default function Dashboard() {
  const router = useRouter()
  const {
    works, fetchWorks, createWork, deleteWork, selectWork,
    darkMode, toggleDark, setUser, dailyStats, fetchDailyStats
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [showNewWork, setShowNewWork] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newGenre, setNewGenre] = useState('판타지')
  const [newStyle, setNewStyle] = useState('action')
  const [newType, setNewType] = useState<'novel' | 'webtoon'>('novel')
  const [creating, setCreating] = useState(false)

  // Stats state
  const [statsData, setStatsData] = useState<{ today: number; goal: number; weekData: Array<{ date: string; count: number }> }>({
    today: 0,
    goal: 3000,
    weekData: [],
  })

  // Import state
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Onboarding
  const { showOnboarding, closeOnboarding, reopenOnboarding } = useOnboarding()
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
      await fetchWorks()

      // Fetch stats
      try {
        await fetchDailyStats()
      } catch {}

      // Also try API stats endpoint
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStatsData((prev) => ({
            today: data.today ?? prev.today,
            goal: data.goal ?? prev.goal,
            weekData: data.weekData ?? prev.weekData,
          }))
        }
      } catch {}

      setLoading(false)

      // Dark mode init
      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) {
        toggleDark()
      }
    }
    init()
  }, [router, fetchWorks, setUser, darkMode, toggleDark, fetchDailyStats])

  // Sync store dailyStats into local statsData
  useEffect(() => {
    if (dailyStats && (dailyStats.today || dailyStats.weekData?.length)) {
      setStatsData((prev) => ({
        today: dailyStats.today || prev.today,
        goal: prev.goal,
        weekData: dailyStats.weekData?.length ? dailyStats.weekData : prev.weekData,
      }))
    }
  }, [dailyStats])

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCreateWork = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    const work = await createWork(newTitle, newGenre, newStyle, newType, 3000)
    setCreating(false)
    if (work) {
      setShowNewWork(false)
      setNewTitle('')
      await selectWork(work)
      router.push(`/editor/${work.id}`)
    }
  }

  const handleOpenWork = async (work: typeof works[0]) => {
    await selectWork(work)
    router.push(`/editor/${work.id}`)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setImporting(true)

    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const res = await fetch('/api/works/import', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await fetchWorks()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || '임포트에 실패했습니다.')
      }
    } catch {
      alert('임포트 중 오류가 발생했습니다.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Chart data formatting
  const chartData = (statsData.weekData || []).map((d) => {
    const date = new Date(d.date)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    return {
      name: dayNames[date.getDay()],
      글자수: d.count,
    }
  })

  const goalProgress = statsData.goal > 0
    ? Math.min(100, Math.round((statsData.today / statsData.goal) * 100))
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Onboarding */}
      {showOnboarding && <OnboardingGuide onClose={closeOnboarding} />}

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".txt"
        multiple
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-neutral-700 dark:text-white" />
            <span className="font-bold text-lg">StoryMind</span>
            <ServiceSwitcher activeService="mind" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reopenOnboarding}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="가이드 다시 보기"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">가이드</span>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="단축키 보기"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">단축키</span>
            </button>
            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />
            <button
              onClick={() => router.push('/planner')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="StoryPlanner"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">플래너</span>
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="설정"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">설정</span>
            </button>
            <button
              onClick={toggleDark}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Daily Goal & Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Daily Goal Progress */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">
                오늘의 목표
              </h2>
            </div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {statsData.today.toLocaleString()}
                </span>
                <span className="text-sm text-neutral-500 ml-1">
                  / {statsData.goal.toLocaleString()}자
                </span>
              </div>
              <span
                className={`text-sm font-medium ${
                  goalProgress >= 100
                    ? 'text-green-600 dark:text-green-400'
                    : goalProgress >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-neutral-500'
                }`}
              >
                {goalProgress}%
              </span>
            </div>
            <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  goalProgress >= 100
                    ? 'bg-green-500'
                    : goalProgress >= 50
                    ? 'bg-yellow-500'
                    : 'bg-neutral-400 dark:bg-neutral-500'
                }`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            {goalProgress >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                목표를 달성했습니다!
              </p>
            )}
          </div>

          {/* 7-Day Writing Stats Chart */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-200">
                7일 집필 현황
              </h2>
            </div>
            {chartData.length > 0 ? (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#999' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#262626' : '#fff',
                        border: `1px solid ${darkMode ? '#404040' : '#e5e5e5'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: darkMode ? '#fff' : '#171717',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()}자`, '글자수']}
                    />
                    <Bar
                      dataKey="글자수"
                      fill={darkMode ? '#a3a3a3' : '#404040'}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-sm text-neutral-400">
                아직 집필 데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">내 작품</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? '임포트 중...' : '임포트'}
            </button>
            <button
              onClick={() => setShowNewWork(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              새 작품
            </button>
          </div>
        </div>

        {/* Works Grid */}
        {works.length === 0 ? (
          <div className="text-center py-20">
            <Folder className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-neutral-400 mb-2">작품이 없습니다</h2>
            <p className="text-neutral-400 mb-6">새 작품을 만들거나 기존 원고를 임포트하세요</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <Upload className="w-5 h-5" />
                원고 임포트
              </button>
              <button
                onClick={() => setShowNewWork(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium"
              >
                <Plus className="w-5 h-5" />
                첫 작품 만들기
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map((work) => (
              <div
                key={work.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition cursor-pointer group"
                onClick={() => handleOpenWork(work)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                    {work.work_type === 'webtoon' ? (
                      <Palette className="w-6 h-6 text-neutral-500" />
                    ) : (
                      <FileText className="w-6 h-6 text-neutral-500" />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('정말 삭제하시겠습니까?')) deleteWork(work.id)
                    }}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-lg mb-1 truncate">{work.title}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                    {work.genre || '미지정'}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                    {work.work_type === 'webtoon' ? '웹툰' : '웹소설'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-neutral-400">
                  <Clock className="w-3 h-3" />
                  {new Date(work.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Work Modal */}
      {showNewWork && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewWork(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6">새 작품 만들기</h2>

            <div className="space-y-4">
              {/* Work Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewType('novel')}
                  className={`p-4 rounded-xl border-2 transition ${
                    newType === 'novel'
                      ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-700'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <FileText className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-medium">웹소설</div>
                </button>
                <button
                  onClick={() => setNewType('webtoon')}
                  className={`p-4 rounded-xl border-2 transition ${
                    newType === 'webtoon'
                      ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-700'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Palette className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-medium">웹툰</div>
                </button>
              </div>

              {/* Title */}
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

              {/* Genre */}
              <div>
                <label className="block text-sm font-medium mb-1.5">장르</label>
                <select
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="판타지">판타지</option>
                  <option value="로맨스">로맨스</option>
                  <option value="로판">로맨스 판타지</option>
                  <option value="무협">무협</option>
                  <option value="현판">현대 판타지</option>
                  <option value="SF">SF</option>
                  <option value="미스터리">미스터리</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-1.5">문체 스타일</label>
                <select
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="action">액션 (짧은 문장, 빠른 전개)</option>
                  <option value="literary">문학적 (긴 문장, 내면 묘사)</option>
                  <option value="romance">로맨스 (대화 중심, 감정)</option>
                  <option value="mystery">미스터리 (긴장감, 떡밥)</option>
                  <option value="custom">커스텀 (문체 학습 후 적용)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewWork(false)}
                className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
              >
                취소
              </button>
              <button
                onClick={handleCreateWork}
                disabled={!newTitle.trim() || creating}
                className="flex-1 py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {creating ? '생성 중...' : '만들기'}
              </button>
            </div>

            <div className="relative mt-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-neutral-800 px-3 text-neutral-400">또는</span>
              </div>
            </div>

            <button
              onClick={() => { setShowNewWork(false); router.push('/planner') }}
              className="w-full mt-4 py-3 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl font-medium text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 dark:hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI와 함께 기획하기
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                단축키
              </h2>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                <span className="text-neutral-400 text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                ['Ctrl + S', '저장'],
                ['Ctrl + F', '전체 검색'],
                ['Ctrl + Shift + R', 'AI 검수'],
                ['Ctrl + Enter', '포커스 모드'],
                ['Ctrl + \\', '우측 패널 토글'],
                ['Ctrl + [', '좌측 패널 토글'],
                ['Esc', '포커스/모달 닫기'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">{desc}</span>
                  <kbd className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-600">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 text-center mt-5">에디터 화면에서 사용 가능합니다</p>
          </div>
        </div>
      )}
    </div>
  )
}
