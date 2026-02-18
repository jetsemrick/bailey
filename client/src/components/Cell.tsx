import { useRef, useEffect, useCallback } from 'react';
import type { CellColor } from '../db/types';

export const COLOR_BG: Record<string, string> = {
  yellow: 'bg-yellow-100/60 dark:bg-yellow-900/20',
  green: 'bg-green-100/60 dark:bg-green-900/20',
  blue: 'bg-blue-100/60 dark:bg-blue-900/20',
};

interface CellProps {
  content: string;
  color: CellColor;
  /** Column side for text color: aff=blue, neg=red */
  side?: 'aff' | 'neg';
  onUpdate: (content: string) => void;
  onColorChange?: (color: CellColor) => void;
  /** Whether this cell is selected (has selection ring, arrow keys navigate) */
  selected?: boolean;
  /** Whether this cell is in editing mode (contenteditable focused, arrow keys move caret) */
  editing?: boolean;
  onFocus?: () => void;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
  /** Character to insert when entering edit mode (e.g. from type-to-edit) */
  pendingInput?: string | null;
  onClearPendingInput?: () => void;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

/** Sanitize HTML to only allow b, u, mark tags */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  const allowedColors = ['yellow', 'green', 'blue', ''];
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'b' || tag === 'strong') return `<b>${children}</b>`;
    if (tag === 'u') return `<u>${children}</u>`;
    if (tag === 'mark') {
      const rawColor = el.getAttribute('data-color') || '';
      // Only allow known color values to prevent attribute injection
      const color = allowedColors.includes(rawColor) ? rawColor : '';
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
  side,
  onUpdate,
  selected,
  editing,
  onFocus,
  onStartEditing,
  onStopEditing,
  pendingInput,
  onClearPendingInput,
  onNavigate,
}: CellProps) {
  const divRef = useRef<HTMLDivElement>(null);

  // Focus and place caret at end when entering editing mode
  useEffect(() => {
    if (editing && divRef.current) {
      divRef.current.innerHTML = sanitizeHtml(content);
      divRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      if (pendingInput) {
        document.execCommand('insertText', false, pendingInput);
        onClearPendingInput?.();
      }
    }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps -- only set initial content when entering edit mode

  const commitEdit = useCallback(() => {
    if (!divRef.current) return;
    const newContent = sanitizeHtml(divRef.current.innerHTML);
    if (newContent !== content) {
      onUpdate(newContent);
    }
  }, [content, onUpdate]);

  const applyInlineHighlight = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);

    // Check if we're inside a mark already
    let parentMark: HTMLElement | null = null;
    let node: Node | null = range.startContainer;
    while (node && node !== divRef.current) {
      if (node instanceof HTMLElement && node.tagName === 'MARK') {
        parentMark = node;
        break;
      }
      node = node.parentNode;
    }

    if (parentMark) {
      // Cycle color or remove
      const current = parentMark.getAttribute('data-color') || 'yellow';
      const cycle = ['yellow', 'green', 'blue'];
      const idx = cycle.indexOf(current);
      if (idx >= 0 && idx < cycle.length - 1) {
        parentMark.setAttribute('data-color', cycle[idx + 1]);
      } else {
        // Remove the mark, keep content
        const frag = document.createDocumentFragment();
        while (parentMark.firstChild) frag.appendChild(parentMark.firstChild);
        parentMark.parentNode?.replaceChild(frag, parentMark);
      }
    } else {
      // Wrap selection in mark
      const mark = document.createElement('mark');
      mark.setAttribute('data-color', 'yellow');
      try {
        range.surroundContents(mark);
      } catch {
        // surroundContents fails if selection crosses element boundaries
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (divRef.current) divRef.current.innerHTML = content;
      onStopEditing?.();
      return;
    }
    // Arrow up/down: exit edit mode and navigate
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      commitEdit();
      onStopEditing?.();
      onNavigate?.(e.key === 'ArrowUp' ? 'up' : 'down');
      return;
    }
    // Enter: commit and move down (Shift+Enter inserts newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit();
      onNavigate?.('down');
      return;
    }
    // Bold
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold');
      return;
    }
    // Underline
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      document.execCommand('underline');
      return;
    }
    // Inline highlight: Ctrl+E cycles yellow -> green -> blue -> none
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      applyInlineHighlight();
      return;
    }
    // Tab to move to next cell
    if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      onNavigate?.(e.shiftKey ? 'left' : 'right');
      return;
    }
  };

  const colorClass = color ? COLOR_BG[color] ?? '' : '';
  const sideTextColor = side === 'aff' ? 'text-blue-600 dark:text-blue-400' : side === 'neg' ? 'text-red-600 dark:text-red-400' : 'text-foreground';

  // Sanitize content on load to prevent XSS from imported/database content
  const sanitizedContent = sanitizeHtml(content);

  const selectedClass = selected ? 'border border-accent/25 bg-card-01 rounded-sm' : 'border border-transparent';
  const editingBgClass = editing ? 'bg-card-01' : '';

  return (
    <div
      ref={divRef}
      contentEditable={editing}
      suppressContentEditableWarning
      {...(!editing && { dangerouslySetInnerHTML: { __html: sanitizedContent } })}
      onClick={!editing ? onFocus : undefined}
      onDoubleClick={!editing ? onStartEditing : undefined}
      onBlur={commitEdit}
      onKeyDown={handleKeyDown}
      className={`w-full min-h-[28px] p-1 focus:outline-none cursor-text whitespace-pre-wrap break-words ${selectedClass} ${editingBgClass} ${sideTextColor} ${colorClass}`}
      style={{ fontSize: 'var(--cell-font-size, 14px)' }}
    />
  );
}
