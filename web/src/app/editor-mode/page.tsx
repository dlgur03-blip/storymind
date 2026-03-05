// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  BookOpen, FileText, Palette, Clock, Check, X,
  Loader2, MessageSquare, Inbox, Moon, Sun, LogOut, Settings
} from 'lucide-react'
import ServiceSwitcher from '@/components/ServiceSwitcher'

export default function EditorModePage() {
  const router = useRouter()
  const { darkMode, toggleDark, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [collaborations, setCollaborations] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [activeWorks, setActiveWorks] = useState([])

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUser({ id: session.user.id, email: session.user.email || '' })

      try {
        const res = await fetch('/api/editor/collaborators?role=editor')
        const data = await res.json()
        const all = data.collaborations || []
        setPendingInvites(all.filter(c => c.status === 'pending'))
        setActiveWorks(all.filter(c => c.status === 'active'))
        setCollaborations(all)
      } catch {}

      setLoading(false)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()
    }
    init()
  }, [router, setUser, darkMode, toggleDark])

  const handleAccept = async (collabId: string) => {
    await fetch('/api/editor/collaborators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId: collabId, action: 'accept' }),
    })
    // Move from pending to active
    const item = pendingInvites.find(c => c.id === collabId)
    if (item) {
      setPendingInvites(prev => prev.filter(c => c.id !== collabId))
      setActiveWorks(prev => [{ ...item, status: 'active' }, ...prev])
    }
  }

  const handleReject = async (collabId: string) => {
    await fetch('/api/editor/collaborators', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaboratorId: collabId, action: 'reject' }),
    })
    setPendingInvites(prev => prev.filter(c => c.id !== collabId))
  }

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-neutral-700 dark:text-white" />
            <span className="font-bold text-lg">StoryMind</span>
            <ServiceSwitcher activeService="editor" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/editor-mode/messages')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">메시지</span>
            </button>
            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            >
              <Settings className="w-5 h-5 text-neutral-500" />
            </button>
            <button onClick={toggleDark} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              대기중 초대 ({pendingInvites.length})
            </h2>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white dark:bg-neutral-800 rounded-2xl border border-yellow-200 dark:border-yellow-800/50 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{invite.works?.title || '알 수 없는 작품'}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
                      <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">
                        {invite.works?.genre || '미지정'}
                      </span>
                      <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-xs">
                        {invite.role === 'editor' ? '편집자' : '열람자'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(invite.id)}
                      className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAccept(invite.id)}
                      className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-sm font-medium hover:opacity-90 transition flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      수락
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Works */}
        <h2 className="text-2xl font-bold mb-6">담당 작품</h2>
        {activeWorks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-neutral-400 mb-2">담당 작품이 없습니다</h3>
            <p className="text-neutral-400">작가의 초대를 기다리세요</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorks.map(collab => (
              <div
                key={collab.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 hover:shadow-lg transition cursor-pointer group"
                onClick={() => router.push(`/editor-mode/${collab.work_id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                    {collab.works?.work_type === 'webtoon' ? (
                      <Palette className="w-6 h-6 text-neutral-500" />
                    ) : (
                      <FileText className="w-6 h-6 text-neutral-500" />
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                    {collab.role === 'editor' ? '편집자' : '열람자'}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1 truncate">{collab.works?.title}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                    {collab.works?.genre || '미지정'}
                  </span>
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                    {collab.works?.work_type === 'webtoon' ? '웹툰' : '웹소설'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-neutral-400">
                  <Clock className="w-3 h-3" />
                  {new Date(collab.works?.updated_at || collab.created_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
