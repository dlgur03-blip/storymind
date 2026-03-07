// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import RecallSetupForm from '@/components/life/RecallSetupForm'
import {
  Plus, Trash2, PenLine, Heart, Eye, Clock,
  BookOpen, Loader2, Inbox, Check, X, Sunrise, Edit3, ChevronLeft
} from 'lucide-react'

const GENRES = ['일상', '로맨스', '성장', '판타지', '감성', '유머', '공포', '기타']

type CreateStep = 'mode' | 'free' | 'recall_basic' | 'recall_setup'

export default function MyStoriesPage() {
  const router = useRouter()
  const { lifeStories, fetchLifeStories, createLifeStory, deleteLifeStory, setUser, darkMode, toggleDark, lifeReadRequests, fetchLifeReadRequests, handleReadRequest } = useStore()
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState<CreateStep>('mode')
  const [newTitle, setNewTitle] = useState('')
  const [newGenre, setNewGenre] = useState('일상')
  const [creating, setCreating] = useState(false)
  const [recallConfig, setRecallConfig] = useState<any>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
      await Promise.all([fetchLifeStories(), fetchLifeReadRequests('pending')])
      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()
      setLoading(false)
    }
    init()
  }, [router])

  const openCreate = () => {
    setShowCreate(true)
    setCreateStep('mode')
    setNewTitle('')
    setNewGenre('일상')
    setRecallConfig(null)
  }

  const handleCreateFree = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    const story = await createLifeStory(newTitle.trim(), newGenre, '')
    setCreating(false)
    if (story) {
      setShowCreate(false)
      router.push(`/life/write/${story.id}`)
    }
  }

  const handleCreateRecall = async () => {
    if (!newTitle.trim() || !recallConfig) return
    setCreating(true)
    const story = await createLifeStory(newTitle.trim(), newGenre, '', recallConfig)
    setCreating(false)
    if (story) {
      setShowCreate(false)
      router.push(`/life/write/${story.id}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation()
    if (confirm('정말 이 스토리를 삭제하시겠습니까?')) {
      await deleteLifeStory(storyId)
    }
  }

  const onHandleRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    setProcessingRequest(requestId)
    await handleReadRequest(requestId, status)
    setProcessingRequest(null)
  }

  const statusLabel = (s: string) => {
    switch (s) {
      case 'ongoing': return '연재 중'
      case 'completed': return '완결'
      case 'paused': return '휴재'
      default: return s
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'ongoing': return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
      case 'completed': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
      case 'paused': return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
      default: return ''
    }
  }

  const modeLabel = (mode: string) => {
    if (mode === 'recall') return '기억회상'
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <LifeHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Received Read Requests */}
        {lifeReadRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Inbox className="w-5 h-5 text-rose-500" />
              받은 읽기 요청
              <span className="px-2 py-0.5 text-xs bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full">
                {lifeReadRequests.length}
              </span>
            </h2>
            <div className="space-y-2">
              {lifeReadRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex items-center gap-3 life-fade-in"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-sm font-medium text-rose-600 dark:text-rose-400 shrink-0">
                    {req.requesterAvatar ? (
                      <img src={req.requesterAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      req.requesterName?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-rose-500">{req.requesterName}</span>
                      님이 읽기를 요청했습니다
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{req.storyTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onHandleRequest(req.id, 'accepted')}
                      disabled={processingRequest === req.id}
                      className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition disabled:opacity-50"
                      title="수락"
                    >
                      {processingRequest === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onHandleRequest(req.id, 'rejected')}
                      disabled={processingRequest === req.id}
                      className="p-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition disabled:opacity-50"
                      title="거절"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">내 스토리</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition"
          >
            <Plus className="w-4 h-4" />
            새 스토리
          </button>
        </div>

        {lifeStories.length === 0 ? (
          <div className="text-center py-20">
            <PenLine className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-neutral-400 mb-2">아직 스토리가 없습니다</h2>
            <p className="text-neutral-400 mb-6">AI와 대화하며 나만의 이야기를 만들어보세요</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition"
            >
              <Plus className="w-5 h-5" />
              첫 스토리 만들기
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifeStories.map((story) => (
              <div
                key={story.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition cursor-pointer group life-fade-in"
                onClick={() => router.push(`/life/write/${story.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-rose-500" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, story.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-lg mb-1 truncate">{story.title}</h3>
                <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                  {story.genre && (
                    <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded text-xs">
                      {story.genre}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColor(story.status)}`}>
                    {statusLabel(story.status)}
                  </span>
                  {modeLabel(story.recall_mode) && (
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded text-xs">
                      {modeLabel(story.recall_mode)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400 mt-3">
                  <span className="flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    {story.total_chapters || 0}챕터
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {story.total_likes || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {story.total_views || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400">
                  <Clock className="w-3 h-3" />
                  {new Date(story.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Multi-Step Create Story Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md p-6 life-fade-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: Mode Selection */}
            {createStep === 'mode' && (
              <>
                <h2 className="text-xl font-bold mb-2">새 스토리 만들기</h2>
                <p className="text-sm text-neutral-500 mb-6">어떤 방식으로 시작할까요?</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setCreateStep('recall_basic')}
                    className="w-full p-5 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-left hover:shadow-md transition group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
                        <Sunrise className="w-5 h-5 text-rose-500" />
                      </div>
                      <h3 className="font-bold text-base">기억회상으로 시작하기</h3>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 ml-[52px]">
                      0세부터 현재까지, 나이별로 기억을 소설로 만들어요
                    </p>
                  </button>

                  <button
                    onClick={() => setCreateStep('free')}
                    className="w-full p-5 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-2xl text-left hover:shadow-md transition group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-600 rounded-xl flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-neutral-500 dark:text-neutral-300" />
                      </div>
                      <h3 className="font-bold text-base">자유롭게 시작하기</h3>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 ml-[52px]">
                      자유로운 주제로 AI와 대화하며 이야기를 만들어요
                    </p>
                  </button>
                </div>

                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full mt-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-600 transition"
                >
                  취소
                </button>
              </>
            )}

            {/* Step 2A: Free Mode - Title + Genre */}
            {createStep === 'free' && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setCreateStep('mode')} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">자유 모드</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">스토리 제목</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예: 카페에서 시작된 이야기"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">장르</label>
                    <div className="grid grid-cols-4 gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => setNewGenre(g)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                            newGenre === g
                              ? 'bg-rose-500 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCreateStep('mode')}
                    className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleCreateFree}
                    disabled={!newTitle.trim() || creating}
                    className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
                  >
                    {creating ? '생성 중...' : '만들기'}
                  </button>
                </div>
              </>
            )}

            {/* Step 2B: Recall Mode - Title + Genre */}
            {createStep === 'recall_basic' && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setCreateStep('mode')} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">기억회상 모드</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">스토리 제목</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예: 나의 인생 이야기"
                      className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">장르</label>
                    <div className="grid grid-cols-4 gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => setNewGenre(g)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                            newGenre === g
                              ? 'bg-rose-500 text-white'
                              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCreateStep('mode')}
                    className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCreateStep('recall_setup')}
                    disabled={!newTitle.trim()}
                    className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Recall Setup */}
            {createStep === 'recall_setup' && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setCreateStep('recall_basic')} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">기억회상 설정</h2>
                </div>

                <RecallSetupForm
                  onChange={(config) => setRecallConfig(config)}
                  initialConfig={recallConfig || undefined}
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCreateStep('recall_basic')}
                    className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleCreateRecall}
                    disabled={creating || !recallConfig}
                    className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
                  >
                    {creating ? '생성 중...' : '시작하기'}
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
