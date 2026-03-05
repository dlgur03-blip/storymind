// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import LifeHeader from '@/components/life/LifeHeader'
import CommentSection from '@/components/life/CommentSection'
import {
  Heart, Share2, ChevronLeft, ChevronRight, BookOpen, Lock, Send, Loader2, Clock
} from 'lucide-react'

export default function ChapterReaderClient({ storyId, chapterNum }: { storyId: string; chapterNum: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [author, setAuthor] = useState<any>(null)
  const [totalChapters, setTotalChapters] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [readAccess, setReadAccess] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)

  const num = parseInt(chapterNum)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setUserId(session.user.id)

      // Fetch story info
      const storyRes = await fetch(`/api/life/stories/${storyId}`)
      const storyData = await storyRes.json()
      if (!storyData.story) {
        router.push('/life')
        return
      }
      setStory(storyData.story)
      setAuthor(storyData.author)

      const publishedChaps = (storyData.chapters || []).filter((c: any) => c.is_published)
      setTotalChapters(publishedChaps.length)

      // Check access
      let hasAccess = false
      if (session) {
        if (storyData.story.user_id === session.user.id) {
          setReadAccess('own')
          hasAccess = true
        } else {
          const { data: req } = await supabase
            .from('life_read_requests')
            .select('status')
            .eq('requester_id', session.user.id)
            .eq('story_id', storyId)
            .maybeSingle()
          const status = req?.status || null
          setReadAccess(status)
          hasAccess = status === 'accepted'
        }
      }

      if (!hasAccess) {
        setLoading(false)
        return
      }

      // Find chapter by number
      const ch = publishedChaps.find((c: any) => c.number === num)
      if (!ch) {
        router.push(`/life/story/${storyId}`)
        return
      }

      // Fetch full chapter content
      const chapRes = await fetch(`/api/life/stories/${storyId}/chapters/${ch.id}`)
      const chapData = await chapRes.json()
      setChapter(chapData.chapter)

      // Check like
      if (session) {
        const { data: like } = await supabase
          .from('life_likes')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('chapter_id', ch.id)
          .maybeSingle()
        setIsLiked(!!like)
      }

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark) document.documentElement.classList.add('dark')

      setLoading(false)
    }
    init()
  }, [storyId, chapterNum, router])

  const handleLike = async () => {
    if (!userId) {
      router.push('/')
      return
    }
    if (!chapter) return
    setIsLiked(!isLiked)
    setChapter((c: any) => ({ ...c, total_likes: c.total_likes + (isLiked ? -1 : 1) }))

    await fetch('/api/life/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter_id: chapter.id }),
    })
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/life/story/${storyId}/${chapterNum}`
    try {
      await navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다!')
    } catch {}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canRead = readAccess === 'own' || readAccess === 'accepted'

  // Access denied view
  if (!canRead) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <LifeHeader />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 mb-6 text-sm">
            <button
              onClick={() => router.push(`/life/story/${storyId}`)}
              className="text-rose-500 hover:text-rose-600 transition flex items-center gap-1"
            >
              <BookOpen className="w-4 h-4" />
              {story?.title}
            </button>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-500">챕터 {num}</span>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center life-fade-in">
            <Lock className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">읽기 요청이 필요합니다</h2>
            <p className="text-sm text-neutral-400 mb-6">
              이 챕터를 읽으려면 작가의 승인이 필요합니다
            </p>

            {readAccess === 'pending' ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl font-medium">
                <Clock className="w-4 h-4" />
                읽기 요청 대기중
              </div>
            ) : (
              <button
                onClick={handleRequestRead}
                disabled={requesting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {readAccess === 'rejected' ? '다시 요청하기' : '읽기 요청하기'}
              </button>
            )}

            <button
              onClick={() => router.push(`/life/story/${storyId}`)}
              className="block mx-auto mt-4 text-sm text-neutral-400 hover:text-rose-500 transition"
            >
              스토리 페이지로 돌아가기
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <LifeHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Story info */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => router.push(`/life/story/${storyId}`)}
            className="text-rose-500 hover:text-rose-600 transition flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" />
            {story?.title}
          </button>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-500">챕터 {num}</span>
        </div>

        {/* Chapter content */}
        <article className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 mb-6 life-fade-in">
          <h1 className="text-2xl font-bold mb-2">{chapter?.title}</h1>
          <div className="flex items-center gap-3 text-sm text-neutral-400 mb-8">
            <span
              className="cursor-pointer hover:text-rose-500 transition"
              onClick={() => router.push(`/life/profile/${story?.user_id}`)}
            >
              {author?.display_name}
            </span>
            <span>{chapter?.word_count}자</span>
            {chapter?.published_at && (
              <span>{new Date(chapter.published_at).toLocaleDateString('ko-KR')}</span>
            )}
          </div>

          <div className="prose dark:prose-invert max-w-none text-base leading-[1.9] whitespace-pre-wrap">
            {chapter?.content}
          </div>
        </article>

        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                isLiked
                  ? 'bg-rose-500 text-white'
                  : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-rose-300'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current like-bounce' : ''}`} />
              <span className="text-sm">{chapter?.total_likes || 0}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 hover:border-rose-300 transition"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">공유</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {num > 1 && (
              <button
                onClick={() => router.push(`/life/story/${storyId}/${num - 1}`)}
                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm hover:border-rose-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
            )}
            {num < totalChapters && (
              <button
                onClick={() => router.push(`/life/story/${storyId}/${num + 1}`)}
                className="flex items-center gap-1 px-3 py-2 bg-rose-500 text-white rounded-xl text-sm hover:bg-rose-600 transition"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Comments */}
        {chapter && (
          <CommentSection chapterId={chapter.id} userId={userId} />
        )}
      </main>
    </div>
  )
}
