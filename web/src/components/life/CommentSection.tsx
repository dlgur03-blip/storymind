// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Send, Trash2, CornerDownRight, Loader2 } from 'lucide-react'

interface Comment {
  id: string
  user_id: string
  content: string
  parent_id: string | null
  is_deleted: boolean
  created_at: string
  authorName: string
  authorAvatar: string
}

export default function CommentSection({ chapterId, userId }: { chapterId: string; userId: string | null }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [chapterId])

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/life/comments?chapterId=${chapterId}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {}
    setLoading(false)
  }

  const handlePost = async () => {
    if (!input.trim() || !userId) return
    setPosting(true)

    try {
      await fetch('/api/life/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          content: input.trim(),
          parent_id: replyTo,
        }),
      })
      setInput('')
      setReplyTo(null)
      await fetchComments()
    } catch {}
    setPosting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await fetch(`/api/life/comments/${commentId}`, { method: 'DELETE' })
    await fetchComments()
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  // Organize: top-level comments and replies
  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)

  const getReplies = (parentId: string) => replies.filter((r) => r.parent_id === parentId)

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-rose-500" />
        댓글 {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Input */}
      {userId ? (
        <div className="mb-6">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-rose-500 mb-2">
              <CornerDownRight className="w-3 h-3" />
              답글 작성 중
              <button onClick={() => setReplyTo(null)} className="text-neutral-400 hover:text-neutral-600">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePost()}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              onClick={handlePost}
              disabled={!input.trim() || posting}
              className="px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-400 mb-4">댓글을 쓰려면 로그인하세요</p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-neutral-400 py-8">아직 댓글이 없습니다</p>
      ) : (
        <div className="space-y-4">
          {topLevel.map((comment) => (
            <div key={comment.id} className="life-fade-in">
              {/* Main comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-xs font-medium text-rose-600 dark:text-rose-400 shrink-0">
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    comment.authorName?.charAt(0) || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{comment.authorName}</span>
                    <span className="text-xs text-neutral-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className={`text-sm ${comment.is_deleted ? 'text-neutral-400 italic' : ''}`}>
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {userId && !comment.is_deleted && (
                      <button
                        onClick={() => setReplyTo(comment.id)}
                        className="text-xs text-neutral-400 hover:text-rose-500 transition"
                      >
                        답글
                      </button>
                    )}
                    {userId === comment.user_id && !comment.is_deleted && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-neutral-400 hover:text-red-500 transition"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="flex gap-3 ml-11 mt-3">
                  <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-medium shrink-0">
                    {reply.authorName?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium">{reply.authorName}</span>
                      <span className="text-[10px] text-neutral-400">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className={`text-xs ${reply.is_deleted ? 'text-neutral-400 italic' : ''}`}>
                      {reply.content}
                    </p>
                    {userId === reply.user_id && !reply.is_deleted && (
                      <button
                        onClick={() => handleDelete(reply.id)}
                        className="text-[10px] text-neutral-400 hover:text-red-500 transition mt-1"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
