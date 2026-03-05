// @ts-nocheck
'use client'

import EditorCommentPanel from './EditorCommentPanel'

interface WriterCommentTabProps {
  workId: string
  chapterId: string | null
}

export default function WriterCommentTab({ workId, chapterId }: WriterCommentTabProps) {
  if (!workId) return null

  return (
    <EditorCommentPanel
      workId={workId}
      chapterId={chapterId}
      onCommentClick={(comment) => {
        // Scroll to the comment position in the editor if possible
        if (comment.selected_text) {
          const editor = (window as any).__tiptapEditor
          if (editor) {
            const content = editor.getHTML()
            const plainText = content.replace(/<[^>]+>/g, '')
            const idx = plainText.indexOf(comment.selected_text)
            if (idx !== -1) {
              // Try to focus at that position
              editor.commands.focus()
            }
          }
        }
      }}
    />
  )
}
