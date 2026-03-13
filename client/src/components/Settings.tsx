import { useEffect, useMemo, useState } from 'react';
import { MACRO_ACTION_OPTIONS, type KeyboardMacro, shortcutFromKeyboardEvent } from '../keyboardMacros';
import { useKeyboardMacrosContext } from '../contexts/KeyboardMacrosContext';

const FONT_SIZE_KEY = 'bailey-font-size';
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

export default function Settings() {
  const { macros: serverMacros, loading: macrosLoading, save, reset } = useKeyboardMacrosContext();
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [macros, setMacros] = useState<KeyboardMacro[]>([]);
  const [savedMacros, setSavedMacros] = useState<KeyboardMacro[]>([]);
  const [macroErrors, setMacroErrors] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved) {
      const size = parseInt(saved, 10);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        setFontSize(size);
        document.documentElement.style.setProperty('--cell-font-size', `${size}px`);
      }
    } else {
      document.documentElement.style.setProperty('--cell-font-size', `${DEFAULT_FONT_SIZE}px`);
    }
  }, []);

  const handleFontSizeChange = (size: number) => {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    setFontSize(clamped);
    localStorage.setItem(FONT_SIZE_KEY, clamped.toString());
    document.documentElement.style.setProperty('--cell-font-size', `${clamped}px`);
  };

  useEffect(() => {
    if (!isOpen) return;
    setMacros(serverMacros);
    setSavedMacros(serverMacros);
    setMacroErrors([]);
  }, [isOpen, serverMacros]);

  const macrosDirty = useMemo(
    () => JSON.stringify(macros) !== JSON.stringify(savedMacros),
    [macros, savedMacros]
  );

  const updateMacro = (id: string, updater: (macro: KeyboardMacro) => KeyboardMacro) => {
    setMacros((prev) => prev.map((macro) => (macro.id === id ? updater(macro) : macro)));
    setMacroErrors([]);
  };

  const handleShortcutCapture = (id: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const isDelete = event.key === 'Backspace' || event.key === 'Delete';
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
    if (isDelete && !hasModifier) {
      updateMacro(id, (macro) => ({ ...macro, shortcut: '' }));
      return;
    }

    const shortcut = shortcutFromKeyboardEvent({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
    });
    if (!shortcut) return;
    updateMacro(id, (macro) => ({ ...macro, shortcut }));
  };

  const handleSaveMacros = async () => {
    const errors = await save(macros);
    setMacroErrors(errors);
    if (errors.length === 0) {
      setSavedMacros(macros);
    }
  };

  const handleResetMacros = async () => {
    const errors = await reset();
    setMacroErrors(errors);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded hover:bg-card-02 transition-colors"
        title="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/60"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 p-6 w-[min(900px,calc(100vw-2rem))] max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-card-02 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cell Font Size: {fontSize}px</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={MIN_FONT_SIZE}
                  max={MAX_FONT_SIZE}
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                  className="w-1/2 min-w-[180px]"
                />
                <button
                  onClick={() => handleFontSizeChange(DEFAULT_FONT_SIZE)}
                  className="px-2 py-1 text-xs bg-card-02 rounded hover:bg-card-03 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-card-04 space-y-3">
              {macrosLoading && (
                <div className="text-sm text-foreground/60">Loading macros...</div>
              )}
              <div>
                <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
                <p className="text-xs text-foreground/60 mt-1">
                  Change keybinds for built-in actions. Click a shortcut field and press the key combo. Backspace clears it.
                </p>
              </div>

              <div className="space-y-3">
                {macros.map((macro) => (
                  <div key={macro.id} className="border border-card-04 rounded-lg p-3 bg-card-01 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{macro.name}</div>
                      <div className="text-xs text-foreground/60 mt-0.5">
                        {macro.actions
                          .map((a) => MACRO_ACTION_OPTIONS.find((o) => o.value === a)?.label ?? a)
                          .join(' → ')}
                      </div>
                    </div>
                    <input
                      value={macro.shortcut}
                      onKeyDown={(event) => handleShortcutCapture(macro.id, event)}
                      readOnly
                      className="shrink-0 w-[180px] px-2 py-1.5 text-sm font-mono bg-background border border-card-04 rounded focus:outline-none focus:border-accent"
                      placeholder="Press shortcut"
                      title="Click and press a shortcut"
                    />
                  </div>
                ))}
              </div>

              {macroErrors.length > 0 && (
                <div className="text-xs text-red-500 space-y-1">
                  {macroErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleSaveMacros}
                  className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                  disabled={!macrosDirty}
                >
                  Save Shortcuts
                </button>
                <button
                  onClick={handleResetMacros}
                  className="px-3 py-1.5 text-xs border border-card-04 rounded hover:bg-card-02 transition-colors"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
