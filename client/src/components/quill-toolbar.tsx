import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo2, Redo2, 
  Strikethrough, Plus, Minus, Type, Palette
} from 'lucide-react';
import { QuillEditorRef } from './quill-editor';

interface QuillToolbarProps {
  editorRef: React.RefObject<QuillEditorRef>;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  onToast: (message: { title: string }) => void;
}

const QuillToolbar: React.FC<QuillToolbarProps> = ({
  editorRef,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  textColor,
  setTextColor,
  onToast
}) => {
  const applyFormat = (format: string, value?: any) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection && selection.length > 0) {
      editor.formatText(selection.index, selection.length, format, value);
      onToast({ title: `Applied ${format} formatting to selected text` });
    } else {
      onToast({ title: "Please select text to format" });
    }
  };

  const applyAlignment = (align: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection) {
      editor.formatText(selection.index, selection.length, 'align', align);
      onToast({ title: `Text aligned ${align}` });
    }
  };

  const applyList = (listType: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection) {
      editor.formatText(selection.index, selection.length, 'list', listType);
      onToast({ title: `Applied ${listType} list` });
    }
  };

  const changeFontSize = (increment: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const newSize = Math.max(8, Math.min(72, fontSize + increment));
    const selection = editor.getSelection();
    
    if (selection && selection.length > 0) {
      editor.formatText(selection.index, selection.length, 'size', `${newSize}pt`);
      onToast({ title: `Font size changed to ${newSize}pt for selected text` });
    } else {
      setFontSize(newSize);
      onToast({ title: "Font size set for next typed text" });
    }
  };

  const changeFontFamily = (family: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection && selection.length > 0) {
      editor.formatText(selection.index, selection.length, 'font', family);
      onToast({ title: `Font changed to ${family} for selected text` });
    } else {
      setFontFamily(family);
      onToast({ title: "Font family set for next typed text" });
    }
  };

  const changeTextColor = (color: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection && selection.length > 0) {
      editor.formatText(selection.index, selection.length, 'color', color);
      onToast({ title: "Color changed for selected text" });
    } else {
      setTextColor(color);
      onToast({ title: "Text color set for next typed text" });
    }
  };

  const applyHighlight = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection && selection.length > 0) {
      editor.formatText(selection.index, selection.length, 'background', '#ffff00');
      onToast({ title: "Text highlighted" });
    } else {
      onToast({ title: "Please select text to highlight" });
    }
  };

  return (
    <div className="flex items-center space-x-4 p-2 border-b border-gray-300 bg-white">
      {/* Undo/Redo */}
      <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
        <Button size="sm" variant="outline" onClick={() => editorRef.current?.focus()}>
          <Undo2 className="w-4 h-4 mr-1" />
          Undo
        </Button>
        <Button size="sm" variant="outline" onClick={() => editorRef.current?.focus()}>
          <Redo2 className="w-4 h-4 mr-1" />
          Redo
        </Button>
      </div>

      {/* Font controls */}
      <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
        <Select value={fontFamily} onValueChange={changeFontFamily}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Calibri">Calibri</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
          <SelectTrigger className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="16">16</SelectItem>
            <SelectItem value="18">18</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="24">24</SelectItem>
            <SelectItem value="36">36</SelectItem>
            <SelectItem value="48">48</SelectItem>
            <SelectItem value="72">72</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" variant="outline" onClick={() => changeFontSize(2)} disabled={fontSize >= 72}>
          <Plus className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => changeFontSize(-2)} disabled={fontSize <= 8}>
          <Minus className="w-3 h-3" />
        </Button>
      </div>

      {/* Text formatting */}
      <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
        <Button size="sm" variant="outline" onClick={() => applyFormat('bold', true)}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyFormat('italic', true)}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyFormat('underline', true)}>
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyFormat('strike', true)}>
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={applyHighlight}>
          <div className="w-4 h-4 bg-yellow-300 border rounded" />
        </Button>
        <input
          type="color"
          value={textColor}
          onChange={(e) => changeTextColor(e.target.value)}
          className="w-8 h-6 border rounded cursor-pointer"
          title="Font Color"
        />
      </div>

      {/* Text alignment */}
      <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
        <Button size="sm" variant="outline" onClick={() => applyAlignment('left')}>
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyAlignment('center')}>
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyAlignment('right')}>
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyAlignment('justify')}>
          <AlignJustify className="w-4 h-4" />
        </Button>
      </div>

      {/* Lists */}
      <div className="flex items-center space-x-1">
        <Button size="sm" variant="outline" onClick={() => applyList('bullet')}>
          <List className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => applyList('ordered')}>
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuillToolbar;