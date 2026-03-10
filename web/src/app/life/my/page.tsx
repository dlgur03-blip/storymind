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
  BookOpen, Loader2, Inbox, Check, X, Sunrise, Edit3, ChevronLeft, Hash
} from 'lucide-react'
import { LIFE_GENRES, SERIES_TYPES } from '@/lib/life-constants'

const GENRES = LIFE_GENRES

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
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [newSeriesType, setNewSeriesType] = useState<'short' | 'long'>('short')

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
    setNewTags([])
    setTagInput('')
    setNewSeriesType('short')
  }

  const saveTags = async (storyId: string) => {
    if (newTags.length > 0) {
      try {
        await fetch('/api/life/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story_id: storyId, tags: newTags }),
        })
      } catch {}
    }
  }

  const handleCreateFree = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    const story = await createLifeStory(newTitle.trim(), newGenre, '', undefined, newSeriesType)
    if (story) {
      await saveTags(story.id)
      setCreating(false)
      setShowCreate(false)
      router.push(`/life/write/${story.id}`)
    } else {
      setCreating(false)
    }
  }

  const handleCreateRecall = async () => {
    if (!newTitle.trim() || !recallConfig) return
    setCreating(true)
    const story = await createLifeStory(newTitle.trim(), newGenre, '', recallConfig, newSeriesType)
    if (story) {
      await saveTags(story.id)
      setCreating(false)
      setShowCreate(false)
      router.push(`/life/write/${story.id}`)
    } else {
      setCreating(false)
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
      case 'ongoing': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/15 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/30'
      case 'completed': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/15 dark:text-blue-400 border border-blue-200/40 dark:border-blue-800/30'
      case 'paused': return 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 border border-stone-200/40 dark:border-stone-700/30'
      default: return ''
    }
  }

  const modeLabel = (mode: string) => {
    if (mode === 'recall') return '기억회상'
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-rose-700 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <LifeHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Received Read Requests */}
        {lifeReadRequests.length > 0 && (
          <div className="mb-10">
            <h2 className="font-serif text-lg font-medium flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-200">
              <Inbox className="w-5 h-5 text-rose-700 dark:text-rose-400" />
              받은 읽기 요청
              <span className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200/40 dark:border-rose-800/30">
                {lifeReadRequests.length}
              </span>
            </h2>
            <div className="space-y-2">
              {lifeReadRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white/60 dark:bg-stone-900/40 rounded-xl border border-stone-200/60 dark:border-stone-800/40 p-4 flex items-center gap-3 life-fade-in"
                >
                  <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400 shrink-0 ring-1 ring-stone-200/60 dark:ring-stone-700/60">
                    {req.requesterAvatar ? (
                      <img src={req.requesterAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      req.requesterName?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-stone-700 dark:text-stone-300">
                      <span className="text-rose-700 dark:text-rose-400">{req.requesterName}</span>
                      님이 읽기를 요청했습니다
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{req.storyTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onHandleRequest(req.id, 'accepted')}
                      disabled={processingRequest === req.id}
                      className="p-2 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
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
                      className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-300 disabled:opacity-50"
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

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl font-medium text-stone-800 dark:text-stone-200">내 스토리</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            새 스토리
          </button>
        </div>

        {lifeStories.length === 0 ? (
          <div className="text-center py-24">
            <PenLine className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-5" />
            <h2 className="font-serif text-xl font-medium text-stone-400 dark:text-stone-500 mb-2">아직 스토리가 없습니다</h2>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-8">AI와 대화하며 나만의 이야기를 만들어보세요</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-6 py-3 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              첫 스토리 만들기
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-in">
            {lifeStories.map((story) => (
              <div
                key={story.id}
                className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6 card-hover cursor-pointer group"
                onClick={() => router.push(`/life/write/${story.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, story.id)}
                    className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-serif font-medium text-lg mb-2 truncate text-stone-800 dark:text-stone-200">{story.title}</h3>
                <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                  {story.genre && (
                    <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded text-[11px] font-medium">
                      {story.genre}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColor(story.status)}`}>
                    {statusLabel(story.status)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    story.series_type === 'long'
                      ? 'bg-indigo-50 dark:bg-indigo-900/15 text-indigo-700 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-800/30'
                      : 'bg-violet-50 dark:bg-violet-900/15 text-violet-700 dark:text-violet-400 border-violet-200/40 dark:border-violet-800/30'
                  }`}>
                    {story.series_type === 'long' ? '장편' : '단편'}
                  </span>
                  {modeLabel(story.recall_mode) && (
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 rounded text-[11px] font-medium border border-amber-200/40 dark:border-amber-800/30">
                      {modeLabel(story.recall_mode)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-400 dark:text-stone-500 mt-4">
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
                <div className="flex items-center gap-1 mt-2 text-xs text-stone-400 dark:text-stone-500">
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-md p-8 modal-content max-h-[90vh] overflow-y-auto border border-stone-200/60 dark:border-stone-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: Mode Selection */}
            {createStep === 'mode' && (
              <>
                <h2 className="font-serif text-2xl font-medium mb-2 text-stone-800 dark:text-stone-200">새 스토리 만들기</h2>
                <p className="text-sm text-stone-400 dark:text-stone-500 mb-8">어떤 방식으로 시작할까요?</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setCreateStep('recall_basic')}
                    className="w-full p-6 bg-white dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 rounded-2xl text-left hover:border-rose-300 dark:hover:border-rose-800 card-hover group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/15 rounded-xl flex items-center justify-center border border-rose-200/40 dark:border-rose-800/30">
                        <Sunrise className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                      </div>
                      <h3 className="font-serif font-medium text-base text-stone-800 dark:text-stone-200">기억회상으로 시작하기</h3>
                    </div>
                    <p className="text-sm text-stone-400 dark:text-stone-500 ml-[52px] leading-relaxed">
                      0세부터 현재까지, 나이별로 기억을 소설로 만들어요
                    </p>
                  </button>

                  <button
                    onClick={() => setCreateStep('free')}
                    className="w-full p-6 bg-white dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 rounded-2xl text-left hover:border-stone-400 dark:hover:border-stone-600 card-hover group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-stone-100 dark:bg-stone-700 rounded-xl flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                      </div>
                      <h3 className="font-serif font-medium text-base text-stone-800 dark:text-stone-200">자유롭게 시작하기</h3>
                    </div>
                    <p className="text-sm text-stone-400 dark:text-stone-500 ml-[52px] leading-relaxed">
                      자유로운 주제로 AI와 대화하며 이야기를 만들어요
                    </p>
                  </button>
                </div>

                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full mt-5 py-2.5 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-300"
                >
                  취소
                </button>
              </>
            )}

            {/* Step 2A: Free Mode - Title + Genre */}
            {createStep === 'free' && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <button onClick={() => setCreateStep('mode')} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-300">
                    <ChevronLeft className="w-5 h-5 text-stone-500" />
                  </button>
                  <h2 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">자유 모드</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">스토리 제목</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예: 카페에서 시작된 이야기"
                      className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">장르</label>
                    <div className="grid grid-cols-4 gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => setNewGenre(g)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                            newGenre === g
                              ? 'border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/15'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">연재 유형</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERIES_TYPES.map((st) => (
                        <button
                          key={st.key}
                          onClick={() => setNewSeriesType(st.key as 'short' | 'long')}
                          className={`p-3 rounded-xl text-left transition-all duration-300 ${
                            newSeriesType === st.key
                              ? st.key === 'short'
                                ? 'border border-violet-500 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/15 text-violet-700 dark:text-violet-400'
                                : 'border border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/15 text-indigo-700 dark:text-indigo-400'
                              : 'border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-600'
                          }`}
                        >
                          <div className="font-medium text-sm">{st.label}</div>
                          <div className="text-[11px] mt-0.5 opacity-70">{st.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">태그 (선택, 최대 10개)</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {newTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-50 dark:bg-rose-900/15 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200/40 dark:border-rose-800/30">
                          <Hash className="w-2.5 h-2.5" />
                          {tag}
                          <button
                            onClick={() => setNewTags(newTags.filter(t => t !== tag))}
                            className="ml-0.5 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {newTags.length < 10 && (
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                            e.preventDefault()
                            const clean = tagInput.trim().replace(/^#/, '')
                            if (clean && !newTags.includes(clean)) {
                              setNewTags([...newTags, clean])
                            }
                            setTagInput('')
                          }
                        }}
                        placeholder="태그 입력 후 Enter"
                        className="w-full px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600 text-sm"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setCreateStep('mode')}
                    className="flex-1 py-3 px-4 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleCreateFree}
                    disabled={!newTitle.trim() || creating}
                    className="flex-1 py-3 px-4 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
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
                  <button onClick={() => setCreateStep('mode')} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-300">
                    <ChevronLeft className="w-5 h-5 text-stone-500" />
                  </button>
                  <h2 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">기억회상 모드</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">스토리 제목</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예: 나의 인생 이야기"
                      className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-transparent focus:outline-none focus:border-rose-700 dark:focus:border-rose-600 transition-colors duration-300 text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">장르</label>
                    <div className="grid grid-cols-4 gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g}
                          onClick={() => setNewGenre(g)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                            newGenre === g
                              ? 'border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/15'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600 dark:text-stone-400">연재 유형</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERIES_TYPES.map((st) => (
                        <button
                          key={st.key}
                          onClick={() => setNewSeriesType(st.key as 'short' | 'long')}
                          className={`p-3 rounded-xl text-left transition-all duration-300 ${
                            newSeriesType === st.key
                              ? st.key === 'short'
                                ? 'border border-violet-500 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/15 text-violet-700 dark:text-violet-400'
                                : 'border border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/15 text-indigo-700 dark:text-indigo-400'
                              : 'border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-600'
                          }`}
                        >
                          <div className="font-medium text-sm">{st.label}</div>
                          <div className="text-[11px] mt-0.5 opacity-70">{st.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setCreateStep('mode')}
                    className="flex-1 py-3 px-4 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCreateStep('recall_setup')}
                    disabled={!newTitle.trim()}
                    className="flex-1 py-3 px-4 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
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
                  <button onClick={() => setCreateStep('recall_basic')} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors duration-300">
                    <ChevronLeft className="w-5 h-5 text-stone-500" />
                  </button>
                  <h2 className="font-serif text-xl font-medium text-stone-800 dark:text-stone-200">기억회상 설정</h2>
                </div>

                <RecallSetupForm
                  onChange={(config) => setRecallConfig(config)}
                  initialConfig={recallConfig || undefined}
                />

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setCreateStep('recall_basic')}
                    className="flex-1 py-3 px-4 border border-stone-200 dark:border-stone-700 rounded-xl font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all duration-300"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleCreateRecall}
                    disabled={creating || !recallConfig}
                    className="flex-1 py-3 px-4 border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl font-medium hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
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
