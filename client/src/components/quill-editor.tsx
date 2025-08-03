import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export interface QuillEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  getSelection: () => { index: number; length: number } | null;
  setSelection: (index: number, length?: number) => void;
  focus: () => void;
  insertText: (index: number, text: string) => void;
  deleteText: (index: number, length: number) => void;
  formatText: (index: number, length: number, format: string, value: any) => void;
  getLength: () => number;
  getText: (index?: number, length?: number) => string;
  getFormat: (index?: number, length?: number) => any;
  insertEmbed: (index: number, type: string, value: any) => void;
}

interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  onSelectionChange?: (range: any, source: string, editor: any) => void;
  placeholder?: string;
  readOnly?: boolean;
  theme?: string;
  style?: React.CSSProperties;
  className?: string;
}

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(({
  value,
  onChange,
  onSelectionChange,
  placeholder = "Start writing...",
  readOnly = false,
  theme = "snow",
  style,
  className
}, ref) => {
  const quillRef = useRef<ReactQuill>(null);

  useImperativeHandle(ref, () => ({
    getContent: () => {
      const editor = quillRef.current?.getEditor();
      return editor?.root.innerHTML || '';
    },
    setContent: (content: string) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.root.innerHTML = content;
      }
    },
    getSelection: () => {
      const editor = quillRef.current?.getEditor();
      return editor?.getSelection() || null;
    },
    setSelection: (index: number, length: number = 0) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.setSelection(index, length);
      }
    },
    focus: () => {
      const editor = quillRef.current?.getEditor();
      editor?.focus();
    },
    insertText: (index: number, text: string) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.insertText(index, text);
      }
    },
    deleteText: (index: number, length: number) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.deleteText(index, length);
      }
    },
    formatText: (index: number, length: number, format: string, value: any) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.formatText(index, length, format, value);
      }
    },
    getLength: () => {
      const editor = quillRef.current?.getEditor();
      return editor?.getLength() || 0;
    },
    getText: (index?: number, length?: number) => {
      const editor = quillRef.current?.getEditor();
      return editor?.getText(index, length) || '';
    },
    getFormat: (index?: number, length?: number) => {
      const editor = quillRef.current?.getEditor();
      return editor?.getFormat(index, length) || {};
    },
    insertEmbed: (index: number, type: string, value: any) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.insertEmbed(index, type, value);
      }
    }
  }));

  const modules = {
    toolbar: false, // We'll use custom toolbar
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    },
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'color', 'background',
    'align', 'script'
  ];

  return (
    <div className={className} style={style}>
      <ReactQuill
        ref={quillRef}
        theme={theme}
        value={value}
        onChange={onChange}
        onSelectionChange={onSelectionChange}
        readOnly={readOnly}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{ height: '100%' }}
      />
    </div>
  );
});

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor;