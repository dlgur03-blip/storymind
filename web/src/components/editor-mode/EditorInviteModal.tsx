// @ts-nocheck
'use client'

import { useState } from 'react'
import { X, Search, UserPlus, Loader2 } from 'lucide-react'

interface EditorInviteModalProps {
  workId: string
  onClose: () => void
  onInvited: () => void
}

export default function EditorInviteModal({ workId, onClose, onInvited }: EditorInviteModalProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Array<{ user_id: string; display_name: string; avatar_url?: string }>>([])
  const [inviting, setInviting] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setMessage('')
    try {
      const res = await fetch(`/api/editor/find-user?email=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.users || [])
      if ((data.users || []).length === 0) {
        setMessage('검색 결과가 없습니다')
      }
    } catch {
      setMessage('검색 중 오류가 발생했습니다')
    } finally {
      setSearching(false)
    }
  }

  const handleInvite = async (userId: string) => {
    setInviting(userId)
    setMessage('')
    try {
      const res = await fetch('/api/editor/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, editorId: userId }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('초대를 보냈습니다!')
        onInvited()
        // 결과에서 제거
        setResults(prev => prev.filter(u => u.user_id !== userId))
      } else {
        setMessage(data.error || '초대 실패')
      }
    } catch {
      setMessage('초대 중 오류가 발생했습니다')
    } finally {
      setInviting(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-bold">편집자 초대</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="사용자 이름으로 검색..."
              className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {message && (
            <p className={`text-sm mb-3 ${message.includes('보냈습니다') ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'}`}>
              {message}
            </p>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.map(u => (
              <div
                key={u.user_id}
                className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {u.display_name?.[0] || '?'}
                  </div>
                  <span className="text-sm font-medium">{u.display_name}</span>
                </div>
                <button
                  onClick={() => handleInvite(u.user_id)}
                  disabled={inviting === u.user_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {inviting === u.user_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  초대
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
