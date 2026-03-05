// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  ArrowLeft, MessageSquare, Loader2, Moon, Sun
} from 'lucide-react'
import MessageThread from '@/components/editor-mode/MessageThread'

export default function EditorMessagesPage() {
  const router = useRouter()
  const { darkMode, toggleDark, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [selectedPartner, setSelectedPartner] = useState(null)

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUser({ id: session.user.id, email: session.user.email || '' })

      try {
        const res = await fetch('/api/editor/messages/conversations')
        const data = await res.json()
        setConversations(data.conversations || [])
      } catch {}

      setLoading(false)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()
    }
    init()
  }, [router, setUser, darkMode, toggleDark])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="flex items-center h-11 px-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
        <button onClick={() => router.push('/editor-mode')} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <MessageSquare className="w-4 h-4 mr-1.5 text-neutral-500" />
        <span className="text-sm font-semibold">메시지</span>
        <div className="flex-1" />
        <button onClick={toggleDark} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Conversation List */}
        <div className="w-72 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto shrink-0">
          <div className="p-3">
            <span className="text-sm font-medium text-neutral-500 mb-3 block">대화</span>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                대화가 없습니다
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(conv => (
                  <button
                    key={conv.partnerId}
                    onClick={() => setSelectedPartner(conv)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition ${
                      selectedPartner?.partnerId === conv.partnerId
                        ? 'bg-neutral-200 dark:bg-neutral-700'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                          {conv.partner?.display_name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {conv.partner?.display_name || '알 수 없음'}
                          </div>
                          <div className="text-xs text-neutral-400 truncate">
                            {conv.lastMessage}
                          </div>
                        </div>
                      </div>
                      {conv.unread > 0 && (
                        <span className="ml-2 w-5 h-5 bg-blue-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1 pl-10">
                      {new Date(conv.lastAt).toLocaleDateString('ko-KR')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Message Thread */}
        <div className="flex-1">
          {selectedPartner ? (
            <MessageThread
              partnerId={selectedPartner.partnerId}
              partnerName={selectedPartner.partner?.display_name || '알 수 없음'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">대화를 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
