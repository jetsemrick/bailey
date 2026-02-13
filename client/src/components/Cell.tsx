import { useState, useRef, useEffect, useCallback } from 'react';
import type { CellColor } from '../db/types';

const COLOR_BG: Record<string, string> = {
  yellow: 'bg-yellow-100/60 dark:bg-yellow-900/20',
  green: 'bg-green-100/60 dark:bg-green-900/20',
  blue: 'bg-blue-100/60 dark:bg-blue-900/20',
};

interface CellProps {
  content: string;
  color: CellColor;
  onUpdate: (content: string) => void;
  onColorChange?: (color: CellColor) => void;
  /** Whether this cell currently has keyboard focus */
  focused?: boolean;
  onFocus?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** For drag-and-drop data */
  cellId?: string;
}

/** Sanitize HTML to only allow b, u, mark tags */
function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'b' || tag === 'strong') return `<b>${children}</b>`;
    if (tag === 'u') return `<u>${children}</u>`;
    if (tag === 'mark') {
      const color = el.getAttribute('data-color') || '';
      return `<mark data-color="${color}">${children}</mark>`;
    }
    if (tag === 'br') return '\n';
    if (tag === 'div' || tag === 'p') return children ? children + '\n' : '';
    return children;
  };
  return Array.from(div.childNodes).map(walk).join('').replace(/\n+$/, '');
}

export default function Cell({
  content,
  color,
  onUpdate,
  onColorChange,
  focused,
  onFocus,
  onNavigate,
}: CellProps) {
  const [editing, setEditing] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (focused && !editing && wrapperRef.current) {
      wrapperRef.current.focus();
    }
  }, [focused, editing]);

  const commitEdit = useCallback(() => {
    if (!divRef.current) return;
    const newContent = sanitizeHtml(divRef.current.innerHTML);
    setEditing(false);
    if (newContent !== content) {
      onUpdate(newContent);
    }
  }, [content, onUpdate]);

  const startEditing = useCallback(() => {
    setEditing(true);
    onFocus?.();
  }, [onFocus]);

  useEffect(() => {
    if (editing && divRef.current) {
      divRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      if (divRef.current.childNodes.length > 0) {
        range.selectNodeContents(divRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editing) {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Revert
        if (divRef.current) divRef.current.innerHTML = content;
        setEditing(false);
      }
      // Bold
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      // Underline
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline');
      }
      // Tab to move to next cell
      if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        onNavigate?.(e.shiftKey ? 'left' : 'right');
      }
    } else {
      // Not editing
      if (e.key === 'Enter') {
        e.preventDefault();
        startEditing();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate?.('up');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate?.('down');
      }
      if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        onNavigate?.('left');
      }
      if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        onNavigate?.('right');
      }
    }
  };

  const colorClass = color ? COLOR_BG[color] ?? '' : '';

  if (editing) {
    return (
      <div className={`relative ring-2 ring-accent ring-inset ${colorClass}`}>
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: content }}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[28px] p-1 focus:outline-none text-foreground bg-background/80"
          style={{ fontSize: 'var(--cell-font-size, 14px)' }}
        />
        {/* Color picker strip */}
        {onColorChange && (
          <div className="absolute -top-6 right-0 flex gap-0.5 bg-card border border-card-04 rounded shadow-sm p-0.5 z-20">
            {(['yellow', 'green', 'blue', null] as CellColor[]).map((c) => (
              <button
                key={c ?? 'none'}
                onMouseDown={(e) => {
                  e.preventDefault(); // Don't steal focus
                  onColorChange(c);
                }}
                className={`w-5 h-5 rounded text-[10px] flex items-center justify-center transition-colors ${
                  c === null
                    ? 'bg-card-02 hover:bg-card-03'
                    : c === 'yellow'
                    ? 'bg-yellow-300'
                    : c === 'green'
                    ? 'bg-green-300'
                    : 'bg-blue-300'
                } ${color === c ? 'ring-1 ring-accent' : ''}`}
                title={c ?? 'No color'}
              >
                {c === null ? 'x' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      onClick={startEditing}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      className={`w-full min-h-[28px] p-1 hover:bg-card-01 cursor-text whitespace-pre-wrap break-words text-foreground transition-colors ${colorClass} ${
        focused ? 'ring-1 ring-accent/50' : ''
      }`}
      style={{ fontSize: 'var(--cell-font-size, 14px)' }}
      dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }}
    />
  );
}
