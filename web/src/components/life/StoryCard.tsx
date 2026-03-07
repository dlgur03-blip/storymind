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
      className={`bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition life-fade-in ${canRead ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {/* Author row */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-sm font-medium text-rose-600 dark:text-rose-400 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); router.push(`/life/profile/${item.authorId}`) }}
        >
          {item.authorAvatar ? (
            <img src={item.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            item.authorName?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-medium hover:text-rose-500 transition cursor-pointer"
            onClick={(e) => { e.stopPropagation(); router.push(`/life/profile/${item.authorId}`) }}
          >
            {item.authorName}
          </span>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Clock className="w-3 h-3" />
            {timeAgo(item.updatedAt)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {item.recallMode === 'recall' && (
            <span className="px-2 py-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full">
              기억회상
            </span>
          )}
          {item.genre && (
            <span className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full">
              {item.genre}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="font-semibold text-base mb-1">{item.title}</h3>
      {item.description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-neutral-400 mb-3">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {item.publishedChapters}챕터
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5" />
          {item.totalLikes}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {item.totalViews}
        </span>
      </div>

      {/* Read request button */}
      {requestStatus === 'own' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2 text-sm font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
        >
          내 스토리 보기
        </button>
      ) : requestStatus === 'accepted' ? (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/life/story/${item.id}`) }}
          className="w-full py-2 text-sm font-medium bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition"
        >
          <CheckCircle className="w-4 h-4" />
          읽기
        </button>
      ) : requestStatus === 'pending' ? (
        <div className="w-full py-2 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4" />
          요청 대기중
        </div>
      ) : requestStatus === 'rejected' ? (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2 text-sm font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-xl flex items-center justify-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          다시 요청하기
        </button>
      ) : (
        <button
          onClick={handleRequestRead}
          disabled={requesting}
          className="w-full py-2 text-sm font-medium bg-rose-500 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-600 transition disabled:opacity-50"
        >
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          읽기 요청
        </button>
      )}
    </div>
  )
}
