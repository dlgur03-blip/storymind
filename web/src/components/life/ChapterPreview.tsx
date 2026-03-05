// @ts-nocheck
'use client'

import { useState } from 'react'
import { Check, Edit3, Eye, Loader2 } from 'lucide-react'

interface ChapterPreviewProps {
  title: string
  content: string
  wordCount: number
  isPublished: boolean
  onSave: (title: string, content: string) => Promise<void>
  onPublish: () => Promise<void>
  isSaving: boolean
  isPublishing: boolean
}

export default function ChapterPreview({
  title,
  content,
  wordCount,
  isPublished,
  onSave,
  onPublish,
  isSaving,
  isPublishing,
}: ChapterPreviewProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editContent, setEditContent] = useState(content)

  const handleSave = async () => {
    await onSave(editTitle, editContent)
    setEditing(false)
  }

  // Sync with props when content changes from outside
  if (!editing && (editTitle !== title || editContent !== content)) {
    setEditTitle(title)
    setEditContent(content)
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8">
        <Eye className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm text-center">AI와 대화를 나눈 후<br />챕터를 생성하면 여기에 미리보기가 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-500">미리보기</span>
          {wordCount > 0 && (
            <span className="text-xs text-neutral-400">{wordCount}자</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${
              editing
                ? 'bg-rose-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {editing ? (
          <div className="space-y-4">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xl font-bold bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-2 focus:outline-none focus:border-rose-500"
              placeholder="챕터 제목"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-transparent focus:outline-none resize-none text-sm leading-relaxed min-h-[300px]"
              placeholder="챕터 내용"
            />
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
              {content}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 flex gap-2">
        {editing && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            저장
          </button>
        )}
        {!isPublished && content && (
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPublished ? '발행됨' : '발행하기'}
          </button>
        )}
        {isPublished && (
          <div className="flex-1 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-medium text-center flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            발행 완료
          </div>
        )}
      </div>
    </div>
  )
}
