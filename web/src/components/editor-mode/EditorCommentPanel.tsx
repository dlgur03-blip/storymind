// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Check, Send, Loader2, Filter } from 'lucide-react'

interface EditorCommentPanelProps {
  workId: string
  chapterId: string | null
  onCommentClick?: (comment: any) => void
}

export default function EditorCommentPanel({ workId, chapterId, onCommentClick }: EditorCommentPanelProps) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchComments = async () => {
    try {
      let url = `/api/editor/comments?workId=${workId}`
      if (chapterId) url += `&chapterId=${chapterId}`
      if (filter !== 'all') url += `&status=${filter}`
      const res = await fetch(url)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComments() }, [workId, chapterId, filter])

  const handleResolve = async (commentId: string) => {
    await fetch('/api/editor/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, status: 'resolved' }),
    })
    fetchComments()
  }

  const handleReply = async (parentId: string) => {
    if (!replyText.trim() || !chapterId) return
    setSending(true)
    try {
      await fetch('/api/editor/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          workId,
          content: replyText.trim(),
          parentId,
        }),
      })
      setReplyText('')
      setReplyTo(null)
      fetchComments()
    } catch {} finally {
      setSending(false)
    }
  }

  // Group comments: top-level and replies
  const topLevel = comments.filter(c => !c.parent_id)
  const replies = comments.filter(c => c.parent_id)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          코멘트 ({topLevel.length})
        </span>
        <div className="flex items-center gap-1">
          {(['all', 'open', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 rounded font-medium ${
                filter === f
                  ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {f === 'all' ? '전체' : f === 'open' ? '미해결' : '해결'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : topLevel.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">코멘트가 없습니다</p>
          </div>
        ) : (
          topLevel.map(comment => {
            const threadReplies = replies.filter(r => r.parent_id === comment.id)
            return (
              <div
                key={comment.id}
                className={`rounded-xl border ${
                  comment.status === 'resolved'
                    ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-t-xl"
                  onClick={() => onCommentClick?.(comment)}
                >
                  {comment.selected_text && (
                    <div className="text-[10px] px-2 py-1 mb-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 text-neutral-600 dark:text-neutral-400 italic truncate">
                      "{comment.selected_text}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-[10px] font-medium">
                      {comment.author?.display_name?.[0] || '?'}
                    </div>
                    <span className="text-xs font-medium">{comment.author?.display_name || '알 수 없음'}</span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    {comment.status === 'resolved' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 rounded">해결</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.content}</p>
                </div>

                {/* Replies */}
                {threadReplies.length > 0 && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800">
                    {threadReplies.map(r => (
                      <div key={r.id} className="px-3 py-2 ml-4 border-l-2 border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium">{r.author?.display_name || '알 수 없음'}</span>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(r.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
                  {comment.status === 'open' && (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className="text-[10px] px-2 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> 해결
                    </button>
                  )}
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-[10px] px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                  >
                    답글
                  </button>
                </div>

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="px-3 pb-3 flex gap-2">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReply(comment.id)}
                      placeholder="답글 입력..."
                      className="flex-1 text-xs px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={sending || !replyText.trim()}
                      className="p-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
