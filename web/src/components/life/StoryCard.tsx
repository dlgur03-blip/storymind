// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Eye, BookOpen, Clock, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'

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
  readRequestStatus: string | null // null, 'pending', 'accepted', 'rejected', 'own'
  recallMode?: string
}

export default function StoryCard({ item, onRequestRead }: { item: FeedItem; onRequestRead?: (storyId: string) => Promise<boolean> }) {
  const router = useRouter()
  const [requestStatus, setRequestStatus] = useState(item.readRequestStatus)
  const [requesting, setRequesting] = useState(false)

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

  return (
    <div
      className={`bg-white dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/60 p-6 card-hover life-fade-in ${canRead ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Author row */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-sm font-medium text-stone-600 dark:text-stone-400 cursor-pointer ring-1 ring-stone-200/60 dark:ring-stone-700/60"
          onClick={(e) => { e.stopPropagation(); router.push(`/life/profile/${item.authorId}`) }}
        >
          {item.authorAvatar ? (
            <img src={item.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            item.authorName?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-rose-700 dark:hover:text-rose-400 transition-colors duration-300 cursor-pointer"
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
          {item.recallMode === 'recall' && (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 rounded-full tracking-wide">
              기억회상
            </span>
          )}
          {item.genre && (
            <span className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full tracking-wide">
              {item.genre}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="font-serif font-medium text-lg leading-snug mb-1.5 text-stone-800 dark:text-stone-200">{item.title}</h3>
      {item.description && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-5 text-xs text-stone-400 dark:text-stone-500 mb-4 pt-1">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          {item.publishedChapters}챕터
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5" />
          {item.totalLikes}
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          {item.totalViews}
        </span>
      </div>

      {/* Read request button */}
      {requestStatus === 'own' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2.5 text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-300"
        >
          내 스토리 보기
        </button>
      ) : requestStatus === 'accepted' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2.5 text-sm font-medium border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/15 transition-all duration-300"
        >
          <CheckCircle className="w-4 h-4" />
          읽기
        </button>
      ) : requestStatus === 'pending' ? (
        <div className="w-full py-2.5 text-sm font-medium bg-amber-50/60 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center gap-1.5 border border-amber-200/40 dark:border-amber-800/20">
          <Clock className="w-4 h-4" />
          요청 대기중
        </div>
      ) : requestStatus === 'rejected' ? (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2.5 text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-xl flex items-center justify-center gap-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-300 disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          다시 요청하기
        </button>
      ) : (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2.5 text-sm font-medium border border-rose-700 dark:border-rose-600 text-rose-700 dark:text-rose-400 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-700 hover:text-white dark:hover:bg-rose-700 dark:hover:text-white transition-all duration-300 disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          읽기 요청
        </button>
      )}
    </div>
  )
}
