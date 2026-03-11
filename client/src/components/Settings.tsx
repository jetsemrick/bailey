import { useEffect, useMemo, useState } from 'react';
import {
  createEmptyMacro,
  DEFAULT_KEYBOARD_MACROS,
  MACRO_ACTION_OPTIONS,
  type MacroAction,
  type KeyboardMacro,
  loadKeyboardMacros,
  saveKeyboardMacros,
  shortcutFromKeyboardEvent,
} from '../keyboardMacros';

const FONT_SIZE_KEY = 'bailey-font-size';
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [macros, setMacros] = useState<KeyboardMacro[]>(() => loadKeyboardMacros());
  const [savedMacros, setSavedMacros] = useState<KeyboardMacro[]>(() => loadKeyboardMacros());
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
    const latest = loadKeyboardMacros();
    setMacros(latest);
    setSavedMacros(latest);
    setMacroErrors([]);
  }, [isOpen]);

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

  const handleAddMacro = () => {
    setMacros((prev) => [...prev, createEmptyMacro()]);
    setMacroErrors([]);
  };

  const handleSaveMacros = () => {
    const errors = saveKeyboardMacros(macros);
    setMacroErrors(errors);
    if (errors.length > 0) return;
    const latest = loadKeyboardMacros();
    setMacros(latest);
    setSavedMacros(latest);
  };

  const handleResetMacros = () => {
    const errors = saveKeyboardMacros(DEFAULT_KEYBOARD_MACROS);
    setMacroErrors(errors);
    if (errors.length > 0) return;
    const latest = loadKeyboardMacros();
    setMacros(latest);
    setSavedMacros(latest);
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
                  className="flex-1"
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Keyboard Macros</h3>
                  <p className="text-xs text-foreground/60 mt-1">
                    Bind shortcuts to one or more actions. Click a shortcut field and press the key combo. Backspace clears it.
                  </p>
                </div>
                <button
                  onClick={handleAddMacro}
                  className="px-2.5 py-1.5 text-xs bg-card-02 rounded hover:bg-card-03 transition-colors"
                >
                  Add Macro
                </button>
              </div>

              <div className="space-y-3">
                {macros.map((macro) => (
                  <div key={macro.id} className="border border-card-04 rounded-lg p-3 bg-card-01 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
                      <input
                        value={macro.name}
                        onChange={(event) =>
                          updateMacro(macro.id, (current) => ({ ...current, name: event.target.value }))
                        }
                        className="px-2 py-1.5 text-sm bg-background border border-card-04 rounded focus:outline-none focus:border-accent"
                        placeholder="Macro name"
                      />
                      <input
                        value={macro.shortcut}
                        onKeyDown={(event) => handleShortcutCapture(macro.id, event)}
                        readOnly
                        className="px-2 py-1.5 text-sm font-mono bg-background border border-card-04 rounded focus:outline-none focus:border-accent"
                        placeholder="Press shortcut"
                        title="Click and press a shortcut"
                      />
                      <button
                        onClick={() => setMacros((prev) => prev.filter((item) => item.id !== macro.id))}
                        className="px-2 py-1.5 text-xs text-red-500 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-foreground/70">Action sequence</div>
                      {macro.actions.map((action, index) => (
                        <div key={`${macro.id}-action-${index}`} className="flex items-center gap-2">
                          <select
                            value={action}
                            onChange={(event) =>
                              updateMacro(macro.id, (current) => ({
                                ...current,
                                actions: current.actions.map((step, stepIndex) =>
                                  stepIndex === index ? (event.target.value as MacroAction) : step
                                ),
                              }))
                            }
                            className="px-2 py-1.5 text-sm bg-background border border-card-04 rounded focus:outline-none focus:border-accent"
                          >
                            {MACRO_ACTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              updateMacro(macro.id, (current) => ({
                                ...current,
                                actions:
                                  current.actions.length > 1
                                    ? current.actions.filter((_, stepIndex) => stepIndex !== index)
                                    : current.actions,
                              }))
                            }
                            className="px-2 py-1.5 text-xs rounded border border-card-04 hover:bg-card-02 transition-colors"
                            disabled={macro.actions.length <= 1}
                            title={macro.actions.length <= 1 ? 'Macros require at least one action' : 'Remove action'}
                          >
                            Remove Step
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          updateMacro(macro.id, (current) => ({
                            ...current,
                            actions: [...current.actions, 'next_flow_sheet'],
                          }))
                        }
                        className="px-2 py-1 text-xs rounded bg-card-02 hover:bg-card-03 transition-colors"
                      >
                        Add Step
                      </button>
                    </div>
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
                  Save Macros
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
