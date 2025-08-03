import React, { useCallback, useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const DocumentWorkspace = () => {
  const [pageCount, setPageCount] = useState(1);
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start typing...</p>',
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full w-full',
        style: 'font-family: "Times New Roman"; font-size: 12pt; color: rgb(0, 0, 0); line-height: 1.6;'
      }
    }
  });

  const calculatePageCount = useCallback(() => {
    if (!editor) return 1;
    const contentHeight = editor.view.dom.offsetHeight;
    return Math.ceil(contentHeight / 928) || 1;
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.on('update', () => {
        setPageCount(calculatePageCount());
        console.log('📊 Total pages needed:', calculatePageCount());
      });
    }
  }, [editor, calculatePageCount]);

  return (
    <div className="document-workspace" style={{ padding: '64px' }}>
      <div className="document-pages">
        {Array.from({ length: pageCount }).map((_, pageIndex) => (
          <div
            key={pageIndex}
            className="viewport-window"
            style={{
              height: '1056px',
              maxHeight: '928px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(0,150,255,0.3)',
            }}
          >
            <div style={{ maxHeight: '928px', overflow: 'hidden', position: 'absolute', width: '100%' }}>
              <EditorContent
                editor={editor}
                style={{ transform: `translateY(-${pageIndex * 928}px)`, height: 'auto' }}
              />
            </div>
            <div
              className="absolute inset-0 bg-transparent"
              style={{ cursor: 'text', zIndex: 5, pointerEvents: 'auto', padding: '64px' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const documentY = pageIndex * 928 + e.clientY - 64;
                const targetPos = editor?.view.posAtCoords({ left: e.clientX, top: documentY });
                if (targetPos) {
                  editor?.commands.focus();
                  editor?.commands.setTextSelection(targetPos.pos);
                  console.log(`📍 DIRECT EDIT: Page ${pageIndex + 1} at Y=${e.clientY}, Document Y=${documentY}`);
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentWorkspace;