export type MacroAction =
  | 'next_flow_sheet'
  | 'insert_5_cells'
  | 'insert_5_rows'
  | 'highlight_cell'
  | 'move_down_4_rows';

export interface KeyboardMacro {
  id: string;
  name: string;
  shortcut: string;
  actions: MacroAction[];
}

export const KEYBOARD_MACROS_STORAGE_KEY = 'bailey-keyboard-macros';
export const KEYBOARD_MACROS_UPDATED_EVENT = 'bailey:keyboard-macros-updated';

export const MACRO_ACTION_OPTIONS: { value: MacroAction; label: string }[] = [
  { value: 'next_flow_sheet', label: 'Next flow sheet' },
  { value: 'insert_5_cells', label: 'Insert 5 cells' },
  { value: 'insert_5_rows', label: 'Insert 5 rows' },
  { value: 'highlight_cell', label: 'Highlight cell' },
  { value: 'move_down_4_rows', label: 'Move down 4 rows' },
];

const MACRO_ACTION_SET = new Set<MacroAction>(MACRO_ACTION_OPTIONS.map((option) => option.value));

export const RESERVED_SHORTCUTS = new Set<string>([
  'Ctrl+N',
  'Ctrl+Shift+N',
  'Ctrl+T',
  'Ctrl+W',
  'Ctrl+L',
  'Ctrl+S',
  'Ctrl+Z',
  'Ctrl+Shift+Z',
  'Ctrl+B',
  'Ctrl+U',
  'Ctrl+E',
]);

export const DEFAULT_KEYBOARD_MACROS: KeyboardMacro[] = [
  {
    id: 'builtin-next-flow',
    name: 'Next Flow Sheet',
    shortcut: 'Alt+N',
    actions: ['next_flow_sheet'],
  },
  {
    id: 'builtin-insert-cells',
    name: 'Insert 5 Cells',
    shortcut: 'Ctrl+I',
    actions: ['insert_5_cells'],
  },
  {
    id: 'builtin-insert-rows',
    name: 'Insert 5 Rows',
    shortcut: 'Ctrl+R',
    actions: ['insert_5_rows'],
  },
  {
    id: 'builtin-highlight-cell',
    name: 'Highlight Cell',
    shortcut: 'Ctrl+H',
    actions: ['highlight_cell'],
  },
  {
    id: 'builtin-move-down',
    name: 'Move Down 4 Rows',
    shortcut: 'Ctrl+M',
    actions: ['move_down_4_rows'],
  },
];

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizePrimaryKey(key: string): string {
  const raw = key.trim();
  if (!raw) return '';
  if (raw === ' ') return 'Space';
  if (raw.length === 1) return raw.toUpperCase();
  const lower = raw.toLowerCase();
  if (lower === 'escape') return 'Esc';
  if (lower.startsWith('arrow')) {
    return `Arrow${lower.slice(5, 6).toUpperCase()}${lower.slice(6)}`;
  }
  if (lower === 'delete') return 'Delete';
  if (lower === 'backspace') return 'Backspace';
  if (lower === 'tab') return 'Tab';
  if (lower === 'enter') return 'Enter';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function normalizeShortcut(shortcut: string): string | null {
  if (!shortcut.trim()) return null;
  const parts = shortcut.split('+').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  let ctrl = false;
  let alt = false;
  let shift = false;
  let primary = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'command' || lower === 'meta') {
      ctrl = true;
      continue;
    }
    if (lower === 'alt' || lower === 'option') {
      alt = true;
      continue;
    }
    if (lower === 'shift') {
      shift = true;
      continue;
    }
    primary = normalizePrimaryKey(part);
  }

  if (!primary) return null;
  const ordered: string[] = [];
  if (ctrl) ordered.push('Ctrl');
  if (alt) ordered.push('Alt');
  if (shift) ordered.push('Shift');
  ordered.push(primary);
  return ordered.join('+');
}

export function shortcutFromKeyboardEvent(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const key = normalizePrimaryKey(event.key);
  if (!key) return null;
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
    return null;
  }

  const ordered: string[] = [];
  if (event.ctrlKey || event.metaKey) ordered.push('Ctrl');
  if (event.altKey) ordered.push('Alt');
  if (event.shiftKey) ordered.push('Shift');
  ordered.push(key);

  // Require at least one modifier for configurable app-level shortcuts.
  if (ordered.length < 2) return null;
  return ordered.join('+');
}

function cloneDefaults(): KeyboardMacro[] {
  return DEFAULT_KEYBOARD_MACROS.map((macro) => ({
    ...macro,
    actions: [...macro.actions],
  }));
}

function coerceMacro(candidate: unknown): KeyboardMacro | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const raw = candidate as Partial<KeyboardMacro>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const shortcut = typeof raw.shortcut === 'string' ? normalizeShortcut(raw.shortcut) : null;
  const actions = Array.isArray(raw.actions)
    ? raw.actions.filter((value): value is MacroAction => typeof value === 'string' && MACRO_ACTION_SET.has(value as MacroAction))
    : [];

  if (!id || !name || !shortcut || actions.length === 0) return null;
  return { id, name, shortcut, actions };
}

export function validateKeyboardMacros(macros: KeyboardMacro[]): string[] {
  const errors: string[] = [];
  const usedShortcuts = new Map<string, string>();

  for (const macro of macros) {
    if (!macro.name.trim()) {
      errors.push('Macro name cannot be empty.');
    }

    const normalizedShortcut = normalizeShortcut(macro.shortcut);
    if (!normalizedShortcut) {
      errors.push(`"${macro.name || 'Unnamed macro'}" must include a shortcut with modifiers.`);
    } else {
      if (RESERVED_SHORTCUTS.has(normalizedShortcut)) {
        errors.push(`"${normalizedShortcut}" is reserved by browser or built-in shortcuts.`);
      }
      const existing = usedShortcuts.get(normalizedShortcut);
      if (existing && existing !== macro.id) {
        errors.push(`"${normalizedShortcut}" is assigned to multiple macros.`);
      }
      usedShortcuts.set(normalizedShortcut, macro.id);
    }

    if (!Array.isArray(macro.actions) || macro.actions.length === 0) {
      errors.push(`"${macro.name || 'Unnamed macro'}" must include at least one action.`);
    } else {
      for (const action of macro.actions) {
        if (!MACRO_ACTION_SET.has(action)) {
          errors.push(`"${macro.name || 'Unnamed macro'}" contains an invalid action.`);
          break;
        }
      }
    }
  }

  return errors;
}

export function loadKeyboardMacros(): KeyboardMacro[] {
  const storage = getStorage();
  if (!storage) return cloneDefaults();

  try {
    const raw = storage.getItem(KEYBOARD_MACROS_STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaults();

    const coerced = parsed
      .map((candidate) => coerceMacro(candidate))
      .filter((macro): macro is KeyboardMacro => macro !== null);
    const errors = validateKeyboardMacros(coerced);
    if (coerced.length === 0 || errors.length > 0) return cloneDefaults();
    return coerced;
  } catch {
    return cloneDefaults();
  }
}

export function saveKeyboardMacros(macros: KeyboardMacro[]): string[] {
  const normalized = macros
    .map((macro) => ({
      ...macro,
      name: macro.name.trim(),
      shortcut: normalizeShortcut(macro.shortcut) ?? '',
      actions: [...macro.actions],
    }));

  const errors = validateKeyboardMacros(normalized);
  if (errors.length > 0) return errors;

  const storage = getStorage();
  if (!storage) return [];

  storage.setItem(KEYBOARD_MACROS_STORAGE_KEY, JSON.stringify(normalized));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(KEYBOARD_MACROS_UPDATED_EVENT));
  }
  return [];
}

export function createEmptyMacro(): KeyboardMacro {
  return {
    id: `macro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: 'New Macro',
    shortcut: '',
    actions: ['next_flow_sheet'],
  };
}
