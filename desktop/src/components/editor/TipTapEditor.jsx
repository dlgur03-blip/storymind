import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useStore } from '../../stores/store';

const FONT_MAP = {
  'pretendard': 'Pretendard Variable, Pretendard, sans-serif',
  'nanum-gothic': '"Nanum Gothic", sans-serif',
  'nanum-myeongjo': '"Nanum Myeongjo", serif',
  'spoqa': '"Spoqa Han Sans Neo", sans-serif',
};

const WEBTOON_PLACEHOLDER = `[씬 1 - 장소, 시간대]
(지문) 상황 설명...

캐릭터: "대사"
       (감정/톤)

[씬 2 - 다음 장면]
(SFX) 효과음
`;

const NOVEL_PLACEHOLDER = '여기에 이야기를 시작하세요...';

export default function TipTapEditor({ content, onChange }) {
  const { currentChapter, currentWork, recoverBackup, saveChapter } = useStore();
  const pendingRef = useRef(null);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('pretendard');

  const isWebtoon = currentWork?.work_type === 'webtoon';
  const placeholderText = isWebtoon ? WEBTOON_PLACEHOLDER : NOVEL_PLACEHOLDER;

  // 폰트 설정 로드
  useEffect(() => {
    const savedSize = localStorage.getItem('sm_fontSize');
    const savedFamily = localStorage.getItem('sm_fontFamily');
    if (savedSize) setFontSize(parseInt(savedSize));
    if (savedFamily) setFontFamily(savedFamily);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight.configure({ multicolor: true }), Placeholder.configure({ placeholder: placeholderText })],
    content: content || '',
    onUpdate: ({ editor }) => { pendingRef.current = editor.getHTML(); onChange(editor.getHTML()); },
  }, [placeholderText]);

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

  return (
    <div style={{ fontFamily: FONT_MAP[fontFamily] || FONT_MAP.pretendard, fontSize: `${fontSize}px`, lineHeight: '1.8' }}>
      <EditorContent editor={editor} />
    </div>
  );
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
