// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import {
  BookOpen, FileText, Palette, Clock, Check, X,
  Loader2, MessageSquare, Inbox, Moon, Sun, LogOut, Settings,
  HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import ServiceSwitcher from '@/components/ServiceSwitcher'

export default function EditorModePage() {
  const router = useRouter()
  const { darkMode, toggleDark, setUser } = useStore()
  const [loading, setLoading] = useState(true)
  const [collaborations, setCollaborations] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [activeWorks, setActiveWorks] = useState([])
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sm_editor_guide_collapsed') !== 'true'
    }
    return true
  })

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
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            <span className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200">StoryMind</span>
            <ServiceSwitcher activeService="editor" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push('/editor-mode/messages')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">메시지</span>
            </button>
            <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1" />
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
            >
              <Settings className="w-5 h-5 text-stone-500" />
            </button>
            <button onClick={toggleDark} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-stone-500 transition">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-lg font-medium mb-4 flex items-center gap-2 text-stone-800 dark:text-stone-200">
              <Inbox className="w-5 h-5 text-stone-500 dark:text-stone-400" />
              대기중 초대 ({pendingInvites.length})
            </h2>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{invite.works?.title || '알 수 없는 작품'}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded font-medium text-xs">
                        {invite.works?.genre || '미지정'}
                      </span>
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded font-medium text-xs">
                        {invite.role === 'editor' ? '편집자' : '열람자'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(invite.id)}
                      className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-sm hover:bg-stone-50 dark:hover:bg-stone-700 transition"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => handleAccept(invite.id)}
                      className="px-4 py-2 border border-stone-800 dark:border-stone-300 text-stone-800 dark:text-stone-300 rounded-xl text-sm font-medium hover:bg-stone-800 hover:text-white dark:hover:bg-stone-300 dark:hover:text-stone-900 transition-all duration-300 flex items-center gap-1.5"
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

        {/* Editor Guide */}
        <div className="mb-8 bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 overflow-hidden">
          <button
            onClick={() => {
              const next = !showGuide
              setShowGuide(next)
              localStorage.setItem('sm_editor_guide_collapsed', next ? 'false' : 'true')
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-stone-500 dark:text-stone-400" />
              <span className="font-serif text-base font-medium text-stone-800 dark:text-stone-200">편집자 가이드</span>
            </div>
            {showGuide ? (
              <ChevronUp className="w-4 h-4 text-stone-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-stone-400" />
            )}
          </button>
          {showGuide && (
            <div className="px-5 pb-5 space-y-4 border-t border-stone-200/40 dark:border-stone-800/30 pt-4">
              <div>
                <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">작가가 나를 초대하는 방법</h4>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  대시보드 → 작품 열기 → 👥 아이콘 → 편집자 초대 → 이름 검색
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">초대를 받으면</h4>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  이 페이지 상단에 표시 → 수락 → 담당 작품에 추가
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">편집자가 할 수 있는 일</h4>
                <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  원고 인라인 코멘트, 메시지, 피드백
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Active Works */}
        <h2 className="font-serif text-2xl font-medium text-stone-800 dark:text-stone-200 mb-6">담당 작품</h2>
        {activeWorks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium text-stone-400 dark:text-stone-500 mb-2">담당 작품이 없습니다</h3>
            <p className="text-stone-400 dark:text-stone-500">작가의 초대를 기다리세요</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
            {activeWorks.map(collab => (
              <div
                key={collab.id}
                className="bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/60 dark:border-stone-800/40 p-6 card-hover cursor-pointer group"
                onClick={() => router.push(`/editor-mode/${collab.work_id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center">
                    {collab.works?.work_type === 'webtoon' ? (
                      <Palette className="w-6 h-6 text-stone-500" />
                    ) : (
                      <FileText className="w-6 h-6 text-stone-500" />
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                    {collab.role === 'editor' ? '편집자' : '열람자'}
                  </span>
                </div>
                <h3 className="font-serif font-medium text-lg mb-1 truncate text-stone-800 dark:text-stone-200">{collab.works?.title}</h3>
                <div className="flex items-center gap-2 text-sm text-stone-500">
                  <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded font-medium">
                    {collab.works?.genre || '미지정'}
                  </span>
                  <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded font-medium">
                    {collab.works?.work_type === 'webtoon' ? '웹툰' : '웹소설'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-stone-400">
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
