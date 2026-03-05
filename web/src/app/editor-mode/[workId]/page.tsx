// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { useStore } from '@/stores/store'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import {
  ArrowLeft, Moon, Sun, PanelRightClose, BookOpen,
  Loader2, MessageSquare, ChevronRight, ChevronDown
} from 'lucide-react'
import EditorCommentPanel from '@/components/editor-mode/EditorCommentPanel'
import InlineCommentPopover from '@/components/editor-mode/InlineCommentPopover'

export default function EditorViewerPage() {
  const params = useParams()
  const router = useRouter()
  const workId = params.workId as string
  const { darkMode, toggleDark } = useStore()

  const [loading, setLoading] = useState(true)
  const [work, setWork] = useState(null)
  const [chapters, setChapters] = useState([])
  const [currentChapter, setCurrentChapter] = useState(null)
  const [rightOpen, setRightOpen] = useState(true)
  const [leftOpen, setLeftOpen] = useState(true)
  const [comments, setComments] = useState([])
  const [selection, setSelection] = useState(null)
  const [expandedChapters, setExpandedChapters] = useState(new Set())
  const [role, setRole] = useState('editor')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
    ],
    content: '',
    editable: false,
  })

  // Fetch work and chapters
  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      // Fetch the work
      const { data: workData } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .single()

      if (!workData) { router.push('/editor-mode'); return }
      setWork(workData)

      // Fetch chapters
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('*')
        .eq('work_id', workId)
        .order('number')

      setChapters(chaptersData || [])
      if (chaptersData && chaptersData.length > 0) {
        setCurrentChapter(chaptersData[0])
      }

      // Check role
      const { data: collab } = await supabase
        .from('work_collaborators')
        .select('role')
        .eq('work_id', workId)
        .eq('editor_id', session.user.id)
        .eq('status', 'active')
        .single()

      if (collab) setRole(collab.role)

      setLoading(false)

      const savedDark = localStorage.getItem('sm_dark') === 'true'
      if (savedDark !== darkMode) toggleDark()
    }
    init()
  }, [workId])

  // Sync editor content when chapter changes
  useEffect(() => {
    if (editor && currentChapter) {
      editor.commands.setContent(currentChapter.content || '')
    }
  }, [currentChapter?.id, editor])

  // Fetch comments for current chapter
  const fetchComments = async () => {
    if (!currentChapter) return
    try {
      const res = await fetch(`/api/editor/comments?workId=${workId}&chapterId=${currentChapter.id}`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch {}
  }

  useEffect(() => { fetchComments() }, [currentChapter?.id])

  // Handle text selection for inline comments
  const handleMouseUp = useCallback(() => {
    if (role !== 'editor') return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return
    }

    const text = sel.toString().trim()
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // Calculate position relative to the editor content
    const editorEl = document.querySelector('.tiptap-viewer')
    if (!editorEl) return
    const plainText = editorEl.textContent || ''
    const start = plainText.indexOf(text)

    setSelection({
      text,
      start: start >= 0 ? start : 0,
      end: start >= 0 ? start + text.length : text.length,
      rect,
    })
  }, [role])

  // Highlight commented text
  useEffect(() => {
    if (!editor || !comments.length) return
    // Clear existing highlights
    editor.commands.unsetHighlight()

    // Apply highlights for comments with selected_text
    const content = editor.getHTML()
    const plainText = content.replace(/<[^>]+>/g, '')

    comments.forEach(c => {
      if (c.selected_text && c.status === 'open') {
        const idx = plainText.indexOf(c.selected_text)
        if (idx !== -1) {
          // Simple approach: we don't modify TipTap decorations directly
          // Comments are shown in the panel
        }
      }
    })
  }, [comments, editor])

  const selectChapter = (ch: any) => {
    setCurrentChapter(ch)
    setSelection(null)
  }

  if (loading || !work) {
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
        <button onClick={() => router.push('/editor-mode')} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold mr-2">{work.title}</span>
        {currentChapter && (
          <span className="text-xs text-neutral-400">
            / {currentChapter.title || `${currentChapter.number}화`}
          </span>
        )}
        <span className="text-[10px] ml-2 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
          {role === 'editor' ? '편집자 모드' : '열람 모드'}
        </span>
        <div className="flex-1" />
        <button onClick={toggleDark} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg mr-1">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={() => setRightOpen(!rightOpen)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg">
          <PanelRightClose className={`w-4 h-4 transition ${rightOpen ? '' : 'rotate-180'}`} />
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Chapters */}
        {leftOpen && (
          <div className="w-56 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 overflow-y-auto shrink-0">
            <div className="p-3">
              <span className="text-sm font-medium text-neutral-500 mb-3 block">챕터</span>
              <div className="space-y-1">
                {chapters.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(ch)}
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

        {/* Viewer */}
        <div className="flex-1 overflow-y-auto" onMouseUp={handleMouseUp}>
          {currentChapter ? (
            <div className="mx-auto max-w-3xl p-8 tiptap-viewer">
              <EditorContent editor={editor} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              챕터를 선택하세요
            </div>
          )}
        </div>

        {/* Right Panel - Comments */}
        {rightOpen && (
          <div className="w-80 lg:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
            <EditorCommentPanel
              workId={workId}
              chapterId={currentChapter?.id || null}
              onCommentClick={(comment) => {
                // Could scroll to comment location in the future
              }}
            />
          </div>
        )}
      </div>

      {/* Inline Comment Popover */}
      {selection && currentChapter && role === 'editor' && (
        <InlineCommentPopover
          workId={workId}
          chapterId={currentChapter.id}
          selection={selection}
          onClose={() => setSelection(null)}
          onCommentAdded={() => {
            setSelection(null)
            fetchComments()
          }}
        />
      )}
    </div>
  )
}
