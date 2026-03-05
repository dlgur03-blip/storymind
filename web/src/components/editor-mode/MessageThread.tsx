// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface MessageThreadProps {
  partnerId: string
  partnerName: string
}

export default function MessageThread({ partnerId, partnerName }: MessageThreadProps) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/editor/messages?partnerId=${partnerId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [partnerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/editor/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: partnerId, content: text.trim() }),
      })
      if (res.ok) {
        setText('')
        fetchMessages()
      }
    } catch {} finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <h3 className="font-medium text-sm">{partnerName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            메시지가 없습니다. 대화를 시작하세요!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id !== partnerId
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-br-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 rounded-bl-md'
                }`}>
                  <p>{msg.content}</p>
                  <div className={`text-[10px] mt-1 ${isMine ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="메시지 입력..."
            className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
