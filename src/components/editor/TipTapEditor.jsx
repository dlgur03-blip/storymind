import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useStore } from '../../stores/store';

export default function TipTapEditor({ content, onChange }) {
  const { currentChapter, recoverBackup, saveChapter } = useStore();
  const pendingRef = useRef(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight.configure({ multicolor: true }), Placeholder.configure({ placeholder: '여기에 이야기를 시작하세요...' })],
    content: content || '',
    onUpdate: ({ editor }) => { pendingRef.current = editor.getHTML(); onChange(editor.getHTML()); },
  });

  // Sync content from parent
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content && content !== null) editor.commands.setContent(content || '', false);
  }, [content]);

  // Expose editor globally
  useEffect(() => { if (editor) window.__tiptapEditor = editor; return () => { window.__tiptapEditor = null; }; }, [editor]);

  // #1 beforeunload — force save on tab close
  useEffect(() => {
    const handler = (e) => {
      if (pendingRef.current && currentChapter) {
        try { localStorage.setItem('sm_backup_' + currentChapter.id, JSON.stringify({ content: pendingRef.current, t: Date.now() })); } catch {}
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [currentChapter]);

  // #1 Recover backup on mount
  useEffect(() => {
    if (currentChapter && editor) {
      const backup = recoverBackup(currentChapter.id);
      if (backup && backup.t > Date.now() - 300000 && backup.content !== content) {
        if (confirm('저장되지 않은 임시 백업이 있습니다. 복원하시겠습니까?')) {
          editor.commands.setContent(backup.content || '');
          saveChapter(backup.content || '');
        }
        try { localStorage.removeItem('sm_backup_' + currentChapter.id); } catch {}
      }
    }
  }, [currentChapter?.id]);

  return <EditorContent editor={editor} />;
}

// Utility: highlight issues in editor (#4)
export function highlightIssuesInEditor(issues) {
  const editor = window.__tiptapEditor;
  if (!editor) return;
  // Clear existing highlights
  editor.chain().focus().unsetHighlight().run();
  // Apply highlights for each issue with a location
  (issues || []).forEach(issue => {
    if (!issue.location || issue.location.length < 3) return;
    const text = editor.state.doc.textContent;
    const idx = text.indexOf(issue.location);
    if (idx === -1) return;
    const color = { critical: '#fee2e2', warning: '#fef3c7', info: '#dbeafe', suggestion: '#d1fae5' }[issue.severity] || '#dbeafe';
    // Find position in ProseMirror doc
    let pos = 0;
    editor.state.doc.descendants((node, nodePos) => {
      if (node.isText) {
        const nodeText = node.text || '';
        const localIdx = nodeText.indexOf(issue.location);
        if (localIdx !== -1 && pos === 0) {
          pos = nodePos + localIdx;
          return false;
        }
      }
    });
    if (pos > 0) {
      editor.chain().setTextSelection({ from: pos, to: pos + issue.location.length }).setHighlight({ color }).run();
    }
  });
  // Deselect
  editor.commands.setTextSelection(0);
}
