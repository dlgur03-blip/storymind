// @ts-nocheck
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import LifeHeader from '@/components/life/LifeHeader'
import {
  Heart, Eye, BookOpen, Clock, ChevronRight, Send, Loader2, Lock
} from 'lucide-react'

export default function StoryDetailPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState<any>(null)
  const [author, setAuthor] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [readAccess, setReadAccess] = useState<string | null>(null) // 'own', 'accepted', 'pending', 'rejected', null
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)

      const res = await fetch(`/api/life/stories/${storyId}`)
      const data = await res.json()
      if (!data.story) {
        router.push('/life')
        return
      }
      setStory(data.story)
      setAuthor(data.author)
      setChapters(data.chapters || [])

      // Check access
      if (session) {
        if (data.story.user_id === session.user.id) {
          setReadAccess('own')
        } else {
          // Check read request status
          const { data: req } = await supabase
            .from('life_read_requests')
            .select('status')
            .eq('requester_id', session.user.id)
            .eq('story_id', storyId)
            .maybeSingle()
          setReadAccess(req?.status || null)
        }

        // Check if liked
        const { data: like } = await supabase
          .from('life_likes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('story_id', storyId)
          .maybeSingle()
        setIsLiked(!!like)
      }

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark) document.documentElement.classList.add('dark')

      setLoading(false)
    }
    init()
  }, [storyId, router])

  const handleLike = async () => {
    if (!userId) {
      router.push('/')
      return
    }
    setIsLiked(!isLiked)
    setStory((s: any) => ({ ...s, total_likes: s.total_likes + (isLiked ? -1 : 1) }))

    await fetch('/api/life/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    })
  }

  const handleRequestRead = async () => {
    if (!userId) {
      router.push('/')
      return
    }
    setRequesting(true)
    try {
      const res = await fetch('/api/life/read-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
      })
      const data = await res.json()
      if (data.request) {
        setReadAccess('pending')
      }
    } catch {}
    setRequesting(false)
  }

  const publishedChapters = chapters.filter((c) => c.is_published)
  const canRead = readAccess === 'own' || readAccess === 'accepted'

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

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Story header */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6 life-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-8 h-8 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-1">{story.title}</h1>
              <div className="flex items-center gap-2 mb-2">
                {story.genre && (
                  <span className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full">
                    {story.genre}
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {story.status === 'ongoing' ? '연재 중' : story.status === 'completed' ? '완결' : '휴재'}
                </span>
              </div>
              {story.description && (
                <p className="text-sm text-neutral-500 mb-3">{story.description}</p>
              )}

              {/* Author */}
              <div
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
                onClick={() => router.push(`/life/profile/${story.user_id}`)}
              >
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-xs font-medium text-rose-600">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    author.display_name?.charAt(0) || '?'
                  )}
                </div>
                <span className="text-sm font-medium">{author.display_name}</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-sm text-neutral-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {story.total_views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {story.total_likes}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {publishedChapters.length}챕터
                </span>
              </div>
            </div>
          </div>

          {/* Like button */}
          <button
            onClick={handleLike}
            className={`mt-4 w-full py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
              isLiked
                ? 'bg-rose-500 text-white'
                : 'border border-rose-300 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current like-bounce' : ''}`} />
            {isLiked ? '좋아요 취소' : '좋아요'}
          </button>
        </div>

        {/* Chapters list */}
        <h2 className="font-bold text-lg mb-4">챕터 목록</h2>

        {canRead ? (
          // Has access - show chapters
          publishedChapters.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              아직 발행된 챕터가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {publishedChapters.map((ch) => (
                <div
                  key={ch.id}
                  className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition cursor-pointer flex items-center justify-between life-fade-in"
                  onClick={() => router.push(`/life/story/${storyId}/${ch.number}`)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-rose-500">챕터 {ch.number}</span>
                      <span className="text-sm font-medium">{ch.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span>{ch.word_count}자</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {ch.total_likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ch.published_at ? new Date(ch.published_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400" />
                </div>
              ))}
            </div>
          )
        ) : (
          // No access - show request UI
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 text-center life-fade-in">
            <Lock className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 mb-1">
              {publishedChapters.length}개의 챕터가 있습니다
            </p>
            <p className="text-sm text-neutral-400 mb-6">
              이 스토리를 읽으려면 작가의 승인이 필요합니다
            </p>

            {readAccess === 'pending' ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-medium">
                <Clock className="w-4 h-4" />
                읽기 요청 대기중
              </div>
            ) : readAccess === 'rejected' ? (
              <button
                onClick={handleRequestRead}
                disabled={requesting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition disabled:opacity-50"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                다시 요청하기
              </button>
            ) : (
              <button
                onClick={handleRequestRead}
                disabled={requesting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                읽기 요청하기
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
