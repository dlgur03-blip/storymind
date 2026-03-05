// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Loader2 } from 'lucide-react'

interface InlineCommentPopoverProps {
  workId: string
  chapterId: string
  selection: {
    text: string
    start: number
    end: number
    rect: DOMRect
  }
  onClose: () => void
  onCommentAdded: () => void
}

export default function InlineCommentPopover({
  workId, chapterId, selection, onClose, onCommentAdded
}: InlineCommentPopoverProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/editor/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          workId,
          content: content.trim(),
          selectionStart: selection.start,
          selectionEnd: selection.end,
          selectedText: selection.text,
        }),
      })
      if (res.ok) {
        onCommentAdded()
        onClose()
      }
    } catch {} finally {
      setSending(false)
    }
  }

  // Position the popover near the selection
  const top = selection.rect.bottom + window.scrollY + 8
  const left = Math.min(selection.rect.left, window.innerWidth - 320)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-72"
      style={{ top: `${top}px`, left: `${left}px` }}
    >
      <div className="p-3">
        <div className="text-[10px] px-2 py-1 mb-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 text-neutral-600 dark:text-neutral-400 italic truncate">
          "{selection.text.substring(0, 80)}{selection.text.length > 80 ? '...' : ''}"
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="코멘트 입력..."
          className="w-full text-sm px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-transparent resize-none h-20 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-neutral-400">Ctrl+Enter로 전송</span>
          <div className="flex gap-1">
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !content.trim()}
              className="p-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
