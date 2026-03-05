// @ts-nocheck
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import EditorToolbar from '@/components/editor/EditorToolbar'
import RightPanel from '@/components/editor/RightPanel'
import EditorInviteModal from '@/components/editor-mode/EditorInviteModal'
import CollaboratorList from '@/components/editor-mode/CollaboratorList'
import {
  ArrowLeft, Moon, Sun, PanelLeftClose, PanelRightClose,
  Plus, Wand2, Loader2, BookOpen, Lightbulb, PenLine,
  GraduationCap, AlertTriangle, AlertCircle, Info, Sparkles,
  Download, Maximize2, Minimize2, Search, X, List, Users,
  Volume2, VolumeX, Pause, Play, ChevronDown, ChevronRight, Check, Pencil
} from 'lucide-react'

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const workId = params.workId as string

  const {
    works, currentWork, currentChapter, chapters,
    fetchWorks, selectWork, fetchChapters, selectChapter, createChapter, saveChapter,
    vault, fetchVault,
    isReviewing, reviewResult, runReview,
    styleProfile, fetchStyleProfile,
    darkMode, toggleDark, rightPanel, isSaving, dailyStats, fetchDailyStats,
    tensionHistory, fetchTensionHistory
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ chapterId: string; chapterTitle: string; preview: string }>>([])
  const [showOutline, setShowOutline] = useState(false)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [ttsRate, setTtsRate] = useState(1)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [showEditorInvite, setShowEditorInvite] = useState(false)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const isWebtoon = currentWork?.work_type === 'webtoon'
  const placeholderText = isWebtoon
    ? '[씬 1 - 장소, 시간대]\n(지문) 상황 설명...\n\n캐릭터: "대사"\n       (감정/톤)'
    : '여기에 이야기를 시작하세요...'

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholderText }),
    ],
    content: currentChapter?.content || '',
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveChapter(editor.getHTML())
      }, 2000)
    },
    onCreate: ({ editor }) => {
      (window as any).__tiptapEditor = editor
    },
  })

  // Sync editor content when chapter changes
  useEffect(() => {
    if (editor && currentChapter) {
      const currentContent = editor.getHTML()
      if (currentContent !== currentChapter.content) {
        editor.commands.setContent(currentChapter.content || '')
      }
    }
  }, [currentChapter?.id, editor])

  // TTS Functions
  const startTTS = () => {
    if (!currentChapter?.content) return
    const text = currentChapter.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ko-KR'
      utterance.rate = ttsRate
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false) }
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false) }
      window.speechSynthesis.speak(utterance)
      setIsSpeaking(true)
      setIsPaused(false)
    }
  }

  const toggleTTS = () => {
    if (!isSpeaking) {
      startTTS()
    } else if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }

  const stopTTS = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) { setFocusMode(false); return }
      if (e.key === 'Escape' && showSearch) { setShowSearch(false); return }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault()
          const c = useStore.getState().currentChapter
          const ed = (window as any).__tiptapEditor
          if (c && ed) saveChapter(ed.getHTML())
        }
        if (e.shiftKey && e.key === 'R') { e.preventDefault(); runReview() }
        if (e.key === '\\') { e.preventDefault(); setRightOpen(p => !p) }
        if (e.key === '[') { e.preventDefault(); setLeftOpen(p => !p) }
        if (e.key === 'f') { e.preventDefault(); setShowSearch(p => !p) }
        if (e.key === 'Enter') { e.preventDefault(); setFocusMode(p => !p) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusMode, showSearch, saveChapter, runReview])

  // Search function
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) { setSearchResults([]); return }
    const results: typeof searchResults = []
    chapters.forEach(ch => {
      if (!ch.content) return
      const text = ch.content.replace(/<[^>]+>/g, '')
      const idx = text.toLowerCase().indexOf(query.toLowerCase())
      if (idx !== -1) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(text.length, idx + query.length + 30)
        results.push({ chapterId: ch.id, chapterTitle: ch.title || `${ch.number}화`, preview: '...' + text.slice(start, end) + '...' })
      }
    })
    setSearchResults(results)
  }

  // Export function
  const exportWork = async (fmt: string, platform = 'generic') => {
    if (!chapters.length) return
    const suffix = platform !== 'generic' ? `_${platform}` : ''

    let content = ''
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number)

    if (fmt === 'txt') {
      content = sortedChapters.map(ch => {
        const title = ch.title || `${ch.number}화`
        const text = (ch.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
        if (platform === 'naver') return `${title}\n\n${text}\n\n---\n`
        if (platform === 'kakao') return `[${title}]\n\n${text}\n\n===\n`
        if (platform === 'munpia') return `# ${title}\n\n${text}\n\n`
        if (platform === 'ridi') return `${title}\n\n${text}\n\n* * *\n`
        return `${title}\n\n${text}\n\n---\n`
      }).join('\n')
    } else if (fmt === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${currentWork?.title}</title><style>body{max-width:800px;margin:0 auto;padding:40px;font-family:serif;line-height:1.8}</style></head><body><h1>${currentWork?.title}</h1>${sortedChapters.map(ch => `<h2>${ch.title || `${ch.number}화`}</h2>${ch.content || ''}`).join('<hr>')}</body></html>`
    }

    const blob = new Blob([content], { type: fmt === 'html' ? 'text/html' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentWork?.title || 'export'}${suffix}.${fmt}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Inline title editing
  const startEditTitle = () => {
    if (!currentChapter) return
    setTitleInput(currentChapter.title || '')
    setEditingTitle(true)
  }

  const saveTitle = () => {
    if (currentChapter && titleInput.trim()) {
      saveChapter(currentChapter.content || '', titleInput.trim())
    }
    setEditingTitle(false)
  }

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      if (works.length === 0) await fetchWorks()

      const work = useStore.getState().works.find((w) => w.id === workId)
      if (work) {
        await selectWork(work)
        await fetchStyleProfile(work.id)
        await fetchTensionHistory(work.id)
        fetchDailyStats()
      } else {
        router.push('/dashboard')
        return
      }
      setLoading(false)
    }
    init()
  }, [workId])

  if (loading || !currentWork) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Top Bar */}
      <header className="flex items-center h-11 px-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
        <button onClick={() => router.push('/dashboard')} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold mr-2">{currentWork.title}</span>
        {currentChapter && !editingTitle && (
          <span className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600" onClick={startEditTitle}>
            / {currentChapter.title || `${currentChapter.number}화`} <Pencil className="w-3 h-3 inline ml-0.5" />
          </span>
        )}
        {editingTitle && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400">/</span>
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
              className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded bg-transparent w-32"
              autoFocus
            />
            <button onClick={saveTitle} className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">
              <Check className="w-3 h-3 text-green-500" />
            </button>
          </div>
        )}
        {currentChapter?.content && (() => {
          const text = (currentChapter.content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
          const charCount = text.replace(/\s+/g, '').length
          const readingMin = Math.max(1, Math.round(charCount / 500))
          return (
            <span className="text-xs text-neutral-400 ml-2 px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">
              약 {readingMin}분
            </span>
          )
        })()}
        {isSaving && <span className="text-xs text-neutral-400 ml-2">저장 중...</span>}
        <div className="flex-1" />

        {/* Editor Management */}
        <div className="relative group mr-1">
          <button className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg" title="편집자 관리">
            <Users className="w-4 h-4 text-neutral-400" />
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
            <button onClick={() => setShowEditorInvite(true)} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">편집자 초대</button>
            <button onClick={() => setShowCollaborators(true)} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">편집자 목록</button>
          </div>
        </div>

        {/* Outline */}
        <button onClick={() => setShowOutline(true)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1" title="아웃라인">
          <List className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Search */}
        <button onClick={() => setShowSearch(true)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1" title="검색 (Ctrl+F)">
          <Search className="w-4 h-4 text-neutral-400" />
        </button>

        {/* TTS Controls */}
        <div className="flex items-center gap-1 mr-1">
          {isSpeaking ? (
            <>
              <button onClick={toggleTTS} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg" title={isPaused ? '재생' : '일시정지'}>
                {isPaused ? <Play className="w-4 h-4 text-blue-500" /> : <Pause className="w-4 h-4 text-blue-500" />}
              </button>
              <button onClick={stopTTS} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg" title="정지">
                <VolumeX className="w-4 h-4 text-red-500" />
              </button>
            </>
          ) : (
            <button onClick={startTTS} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg" title="TTS 읽기">
              <Volume2 className="w-4 h-4 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Export */}
        <div className="relative group">
          <button className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1">
            <Download className="w-4 h-4 text-neutral-400" />
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
            <div className="px-3 py-1 text-[10px] text-neutral-400 border-b border-neutral-100 dark:border-neutral-700">일반</div>
            <button onClick={() => exportWork('txt')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">TXT</button>
            <button onClick={() => exportWork('html')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">HTML</button>
            <div className="px-3 py-1 text-[10px] text-neutral-400 border-b border-t border-neutral-100 dark:border-neutral-700 mt-1">플랫폼별</div>
            <button onClick={() => exportWork('txt', 'naver')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">네이버 시리즈</button>
            <button onClick={() => exportWork('txt', 'kakao')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">카카오페이지</button>
            <button onClick={() => exportWork('txt', 'munpia')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">문피아</button>
            <button onClick={() => exportWork('txt', 'ridi')} className="w-full px-3 py-1.5 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700">리디북스</button>
          </div>
        </div>

        {/* Focus Mode */}
        <button onClick={() => setFocusMode(!focusMode)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1" title="집중 모드 (Ctrl+Enter)">
          {focusMode ? <Minimize2 className="w-4 h-4 text-blue-500" /> : <Maximize2 className="w-4 h-4 text-neutral-400" />}
        </button>

        <button onClick={toggleDark} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {!focusMode && (
          <>
            <button onClick={() => setLeftOpen(!leftOpen)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1">
              <PanelLeftClose className={`w-4 h-4 transition ${leftOpen ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={() => setRightOpen(!rightOpen)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg">
              <PanelRightClose className={`w-4 h-4 transition ${rightOpen ? '' : 'rotate-180'}`} />
            </button>
          </>
        )}
      </header>

      {/* Toolbar */}
      <EditorToolbar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chapters */}
        {leftOpen && !focusMode && (
          <div className="w-56 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto shrink-0">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-500">챕터</span>
                <button onClick={createChapter} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(ch.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      currentChapter?.id === ch.id
                        ? 'bg-neutral-200 dark:bg-neutral-700 font-medium'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {ch.title || `${ch.number}화`}
                    <div className="text-xs text-neutral-400">{ch.word_count || 0}자</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className={`flex-1 overflow-y-auto ${focusMode ? 'max-w-4xl mx-auto' : ''}`}>
          {currentChapter ? (
            <div className={`mx-auto p-8 tiptap-editor ${focusMode ? 'max-w-2xl' : 'max-w-3xl'}`}>
              <EditorContent editor={editor} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              화를 선택하세요
            </div>
          )}
        </div>

        {/* Right Panel */}
        {rightOpen && !focusMode && (
          <div className="w-80 lg:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto shrink-0">
            <RightPanel />
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-20 z-50" onClick={() => setShowSearch(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-800">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="작품 내 검색..."
                className="flex-1 bg-transparent outline-none text-neutral-900 dark:text-white"
                autoFocus
              />
              <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && (
                <div className="p-4 text-center text-neutral-400 text-sm">검색 결과가 없습니다</div>
              )}
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { selectChapter(r.chapterId); setShowSearch(false) }}
                  className="w-full p-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800"
                >
                  <div className="text-sm font-medium">{r.chapterTitle}</div>
                  <div className="text-xs text-neutral-500 truncate">{r.preview}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Invite Modal */}
      {showEditorInvite && currentWork && (
        <EditorInviteModal
          workId={currentWork.id}
          onClose={() => setShowEditorInvite(false)}
          onInvited={() => {}}
        />
      )}

      {/* Collaborator List Modal */}
      {showCollaborators && currentWork && (
        <CollaboratorList
          workId={currentWork.id}
          onClose={() => setShowCollaborators(false)}
        />
      )}

      {/* Outline Modal */}
      {showOutline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOutline(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <span className="text-lg font-bold">아웃라인</span>
                <span className="text-xs text-neutral-400">{chapters.length}화</span>
              </div>
              <button onClick={() => setShowOutline(false)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>화가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch) => {
                    const isExpanded = expandedChapters.has(ch.id)
                    const text = (ch.content || '').replace(/<[^>]+>/g, '')
                    const wordCount = text.replace(/\s+/g, '').length
                    const summary = ch.summary as { summary?: string; keyPoints?: string[] } | null
                    return (
                      <div key={ch.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            const next = new Set(expandedChapters)
                            if (isExpanded) next.delete(ch.id); else next.add(ch.id)
                            setExpandedChapters(next)
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />}
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold shrink-0">
                            {ch.number}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium truncate">{ch.title || `${ch.number}화`}</div>
                            <div className="text-[10px] text-neutral-400">{wordCount}자</div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); selectChapter(ch.id); setShowOutline(false) }}
                            className="text-[10px] px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                          >
                            이동
                          </button>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 bg-neutral-50 dark:bg-neutral-800/50">
                            {summary?.summary ? (
                              <div className="space-y-2">
                                <p className="text-xs text-neutral-600 dark:text-neutral-300">{summary.summary}</p>
                                {summary.keyPoints && summary.keyPoints.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.keyPoints.map((kp, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                        {kp}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-neutral-400 truncate">{text.substring(0, 200)}...</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
