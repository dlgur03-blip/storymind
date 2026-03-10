// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Eye, BookOpen, Clock, Send, CheckCircle, XCircle, Loader2, Hash } from 'lucide-react'

interface FeedItem {
  id: string
  title: string
  genre: string
  description: string
  status: string
  authorId: string
  authorName: string
  authorAvatar: string
  totalLikes: number
  totalViews: number
  publishedChapters: number
  updatedAt: string
  readRequestStatus: string | null
  recallMode?: string
  seriesType?: string
  isLiked?: boolean
  tags?: string[]
}

export default function StoryCard({ item, onRequestRead }: { item: FeedItem; onRequestRead?: (storyId: string) => Promise<boolean> }) {
  const router = useRouter()
  const [requestStatus, setRequestStatus] = useState(item.readRequestStatus)
  const [requesting, setRequesting] = useState(false)
  const [liked, setLiked] = useState(item.isLiked || false)
  const [likeCount, setLikeCount] = useState(item.totalLikes)
  const [likeAnimating, setLikeAnimating] = useState(false)

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}일 전`
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  const canRead = requestStatus === 'accepted' || requestStatus === 'own'

  const handleClick = () => {
    if (canRead) {
      router.push(`/life/story/${item.id}`)
    }
  }

  const handleRequestRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onRequestRead || requesting) return
    setRequesting(true)
    const success = await onRequestRead(item.id)
    if (success) setRequestStatus('pending')
    setRequesting(false)
  }

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(newLiked ? likeCount + 1 : likeCount - 1)
    if (newLiked) {
      setLikeAnimating(true)
      setTimeout(() => setLikeAnimating(false), 500)
    }
    try {
      await fetch('/api/life/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: item.id }),
      })
    } catch {
      setLiked(!newLiked)
      setLikeCount(newLiked ? likeCount : likeCount + 1)
    }
  }

  return (
    <div
      className={`bg-white/80 dark:bg-stone-900/50 rounded-2xl border border-stone-200/50 dark:border-stone-800/30 p-7 md:p-8 card-hover life-fade-in ${canRead ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Author row — wider spacing */}
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center text-sm font-medium text-stone-500 dark:text-stone-400 cursor-pointer ring-1 ring-stone-200/40 dark:ring-stone-700/30"
          onClick={(e) => { e.stopPropagation(); router.push(`/life/profile/${item.authorId}`) }}
        >
          {item.authorAvatar ? (
            <img src={item.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            item.authorName?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-500 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); router.push(`/life/profile/${item.authorId}`) }}
          >
            {item.authorName}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            <Clock className="w-3 h-3" />
            {timeAgo(item.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {item.seriesType === 'long' ? (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-indigo-50 dark:bg-indigo-900/15 text-indigo-700 dark:text-indigo-400 rounded-full tracking-wide border border-indigo-200/40 dark:border-indigo-800/30">
              장편
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-violet-50 dark:bg-violet-900/15 text-violet-700 dark:text-violet-400 rounded-full tracking-wide border border-violet-200/40 dark:border-violet-800/30">
              단편
            </span>
          )}
          {item.recallMode === 'recall' && (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-amber-50/60 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 rounded-full tracking-wide">
              기억회상
            </span>
          )}
          {item.genre && (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-stone-100/80 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 rounded-full tracking-wide">
              {item.genre}
            </span>
          )}
        </div>
      </div>

      {/* Title — serif, italic feel (Valentino reference) */}
      <h3 className="font-serif font-medium text-lg md:text-xl leading-snug mb-2 text-stone-800 dark:text-stone-200 tracking-tight">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      )}

      {/* Prada-style hover preview — first sentence fades in on hover */}
      {!item.description && (
        <div className="story-card-preview">
          <p className="text-sm text-stone-400 dark:text-stone-500 italic font-serif leading-relaxed">
            이야기를 열어보세요...
          </p>
        </div>
      )}

      {/* Tags — more subtle (reduced rose, use stone) */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-2.5 py-0.5 text-[11px] font-medium bg-stone-100/60 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 rounded-full cursor-pointer hover:bg-stone-200/80 dark:hover:bg-stone-700/40 transition-colors duration-500"
              onClick={(e) => { e.stopPropagation(); router.push(`/life/explore?tag=${encodeURIComponent(tag)}`) }}
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats — wider spacing */}
      <div className="flex items-center gap-6 text-xs text-stone-400 dark:text-stone-500 mb-5 pt-2">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {item.publishedChapters}챕터
        </span>
        <button
          onClick={handleLikeToggle}
          className={`flex items-center gap-1.5 transition-colors duration-500 ${
            liked ? 'text-rose-500 dark:text-rose-400' : 'hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''} ${likeAnimating ? 'like-bounce' : ''}`} />
          {likeCount}
        </button>
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          {item.totalViews}
        </span>
      </div>

      {/* CTA — ghost style, no aggressive fills (Chanel reference: "보세요" not "사세요") */}
      {requestStatus === 'own' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2.5 text-sm font-medium text-stone-500 dark:text-stone-400 rounded-xl hover:text-stone-700 dark:hover:text-stone-200 transition-all duration-500 border border-stone-200/60 dark:border-stone-800/30 hover:border-stone-300 dark:hover:border-stone-700"
        >
          내 스토리 보기
        </button>
      ) : requestStatus === 'accepted' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300 rounded-xl flex items-center justify-center gap-1.5 border border-stone-300/60 dark:border-stone-700/40 hover:border-stone-400 dark:hover:border-stone-600 transition-all duration-500"
        >
          <CheckCircle className="w-4 h-4" />
          읽기
        </button>
      ) : requestStatus === 'pending' ? (
        <div className="w-full py-2.5 text-sm font-medium text-stone-400 dark:text-stone-500 rounded-xl flex items-center justify-center gap-1.5 border border-stone-200/40 dark:border-stone-800/20">
          <Clock className="w-4 h-4" />
          요청 대기중
        </div>
      ) : requestStatus === 'rejected' ? (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2.5 text-sm font-medium text-stone-500 dark:text-stone-400 rounded-xl flex items-center justify-center gap-1.5 border border-stone-200/60 dark:border-stone-800/30 hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-all duration-500 disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          다시 요청하기
        </button>
      ) : (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2.5 text-sm font-medium text-stone-600 dark:text-stone-300 rounded-xl flex items-center justify-center gap-1.5 border border-stone-300 dark:border-stone-700 hover:border-stone-500 dark:hover:border-stone-500 transition-all duration-500 disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          읽기 요청
        </button>
      )}
    </div>
  )
}
