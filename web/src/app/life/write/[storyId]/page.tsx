// @ts-nocheck
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import LifeHeader from '@/components/life/LifeHeader'
import ChatPanel from '@/components/life/ChatPanel'
import ChapterPreview from '@/components/life/ChapterPreview'
import { ChevronLeft, MessageCircle, Eye, Plus, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function WritePage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params)
  const router = useRouter()
  const { setUser, darkMode, toggleDark } = useStore()

  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [currentChapter, setCurrentChapter] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat')

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })

      // Fetch story
      const storyRes = await fetch(`/api/life/stories/${storyId}`)
      const storyData = await storyRes.json()
      if (!storyData.story) {
        router.push('/life/my')
        return
      }
      setStory(storyData.story)

      // Fetch chapters
      const chapRes = await fetch(`/api/life/stories/${storyId}/chapters`)
      const chapData = await chapRes.json()
      const chaps = chapData.chapters || []
      setChapters(chaps)

      // Select last chapter or create first one
      if (chaps.length > 0) {
        const last = chaps[chaps.length - 1]
        setCurrentChapter(last)
        setMessages(last.conversation_history || [])
      } else {
        // Create first chapter
        const newRes = await fetch(`/api/life/stories/${storyId}/chapters`, { method: 'POST' })
        const newData = await newRes.json()
        if (newData.chapter) {
          setChapters([newData.chapter])
          setCurrentChapter(newData.chapter)
          setMessages([])
        }
      }

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()
      setLoading(false)
    }
    init()
  }, [storyId, router])

  const handleSendMessage = async (message: string) => {
    const newMessages = [...messages, { role: 'user' as const, content: message }]
    setMessages(newMessages)
    setIsChatLoading(true)

    try {
      const res = await fetch('/api/life/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
          storyContext: {
            genre: story?.genre,
            previousChapterSummary: chapters.length > 1
              ? chapters[chapters.length - 2]?.content?.slice(0, 200)
              : undefined,
          },
        }),
      })
      const data = await res.json()
      const updatedMessages = [...newMessages, { role: 'assistant' as const, content: data.reply || 'AI 응답을 받지 못했습니다.' }]
      setMessages(updatedMessages)

      // Save conversation to chapter
      if (currentChapter) {
        await fetch(`/api/life/stories/${storyId}/chapters/${currentChapter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_history: updatedMessages }),
        })
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant' as const, content: '오류가 발생했어. 다시 시도해볼래?' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleGenerateChapter = async () => {
    if (!currentChapter || messages.length < 2) return
    setIsGenerating(true)
    setActiveTab('preview')

    try {
      const res = await fetch('/api/life/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: messages,
          genre: story?.genre,
          storyTitle: story?.title,
          chapterNumber: currentChapter.number,
          previousChapterSummary: chapters.length > 1
            ? chapters[chapters.length - 2]?.content?.slice(0, 300)
            : undefined,
        }),
      })
      const data = await res.json()

      // Update chapter with generated content
      const patchRes = await fetch(`/api/life/stories/${storyId}/chapters/${currentChapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title || currentChapter.title,
          content: data.content || '',
        }),
      })
      const patchData = await patchRes.json()
      if (patchData.chapter) {
        setCurrentChapter(patchData.chapter)
        setChapters((prev) => prev.map((c) => c.id === patchData.chapter.id ? patchData.chapter : c))
      }
    } catch {
      alert('챕터 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveChapter = async (title: string, content: string) => {
    if (!currentChapter) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/life/stories/${storyId}/chapters/${currentChapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (data.chapter) {
        setCurrentChapter(data.chapter)
        setChapters((prev) => prev.map((c) => c.id === data.chapter.id ? data.chapter : c))
      }
    } catch {
      alert('저장 실패')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!currentChapter) return
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/life/stories/${storyId}/chapters/${currentChapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: true }),
      })
      const data = await res.json()
      if (data.chapter) {
        setCurrentChapter(data.chapter)
        setChapters((prev) => prev.map((c) => c.id === data.chapter.id ? data.chapter : c))
      }
    } catch {
      alert('발행 실패')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleNewChapter = async () => {
    try {
      const res = await fetch(`/api/life/stories/${storyId}/chapters`, { method: 'POST' })
      const data = await res.json()
      if (data.chapter) {
        setChapters((prev) => [...prev, data.chapter])
        setCurrentChapter(data.chapter)
        setMessages([])
        setActiveTab('chat')
      }
    } catch {
      alert('새 챕터 생성 실패')
    }
  }

  const handleSelectChapter = (chapter: any) => {
    setCurrentChapter(chapter)
    setMessages(chapter.conversation_history || [])
    setActiveTab('chat')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canGenerate = messages.filter((m) => m.role === 'user').length >= 2 && !isGenerating && !currentChapter?.content

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <LifeHeader />

      {/* Story header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/life/my')}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-sm">{story?.title}</h1>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                {story?.genre && (
                  <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded">
                    {story.genre}
                  </span>
                )}
                <span>챕터 {currentChapter?.number || 1}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Chapter selector */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[200px]">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition whitespace-nowrap ${
                    currentChapter?.id === ch.id
                      ? 'bg-rose-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 hover:bg-neutral-200'
                  }`}
                >
                  {ch.number}
                </button>
              ))}
            </div>
            <button
              onClick={handleNewChapter}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
              title="새 챕터"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition ${
            activeTab === 'chat'
              ? 'text-rose-500 border-b-2 border-rose-500'
              : 'text-neutral-400'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          대화
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition ${
            activeTab === 'preview'
              ? 'text-rose-500 border-b-2 border-rose-500'
              : 'text-neutral-400'
          }`}
        >
          <Eye className="w-4 h-4" />
          미리보기
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className={`w-full lg:w-1/2 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${activeTab !== 'chat' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-sm text-neutral-500">소설 챕터를 생성하고 있어요...</p>
            </div>
          ) : (
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              onGenerateChapter={handleGenerateChapter}
              canGenerate={canGenerate}
            />
          )}
        </div>

        {/* Preview panel */}
        <div className={`w-full lg:w-1/2 bg-white dark:bg-neutral-900 ${activeTab !== 'preview' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          <ChapterPreview
            title={currentChapter?.title || ''}
            content={currentChapter?.content || ''}
            wordCount={currentChapter?.word_count || 0}
            isPublished={currentChapter?.is_published || false}
            onSave={handleSaveChapter}
            onPublish={handlePublish}
            isSaving={isSaving}
            isPublishing={isPublishing}
          />
        </div>
      </div>
    </div>
  )
}
