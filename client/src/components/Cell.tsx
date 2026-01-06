import { useState, useRef, useEffect } from 'react';

interface CellProps {
  content: string;
  onUpdate: (content: string) => void;
  isHeader?: boolean;
  columnLabel?: string;
}

const COLUMN_STYLES: Record<string, string> = {
  '1AC': 'text-blue-600 border-b-blue-600/20',
  '1NC': 'text-red-600 border-b-red-600/20',
  '2AC': 'text-blue-600 border-b-blue-600/20',
  'Block': 'text-red-600 border-b-red-600/20',
  '1AR': 'text-blue-600 border-b-blue-600/20',
  '2NR': 'text-red-600 border-b-red-600/20',
  '2AR': 'text-blue-600 border-b-blue-600/20',
};

export default function Cell({ content, onUpdate, isHeader = false, columnLabel }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== content) {
      onUpdate(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setValue(content);
      setIsEditing(false);
    }
  };

  if (isHeader) {
    const style = columnLabel ? COLUMN_STYLES[columnLabel] || 'text-foreground' : 'text-foreground';
    return (
      <div className={`px-3 py-3 font-medium text-sm border-b-2 bg-card text-center ${style} transition-colors`}>
        {columnLabel}
      </div>
    );
  }

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-1 border-2 border-accent focus:outline-none resize-none bg-background text-foreground"
        style={{ minHeight: '28px', fontSize: 'var(--cell-font-size, 16px)' }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="w-full h-full p-1 border border-card-04 hover:bg-card-01 cursor-text whitespace-pre-wrap break-words text-foreground transition-colors"
      style={{ minHeight: '28px', fontSize: 'var(--cell-font-size, 16px)' }}
    >
      {content || '\u00A0'}
    </div>
  );
}

