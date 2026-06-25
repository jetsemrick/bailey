import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import * as api from '../db/api';
import { MACRO_ACTION_OPTIONS, type KeyboardMacro, shortcutFromKeyboardEvent } from '../keyboardMacros';
import { useKeyboardMacrosContext } from '../contexts/KeyboardMacrosContext';
import { useFlowSheetVariant } from '../contexts/FlowSheetVariantContext';
import type { FlowSheetVariant } from './flowSheetVariant';

const FONT_SIZE_KEY = 'bailey-font-size';
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

type SettingsTab = 'display' | 'profile' | 'shortcuts';

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'display', label: 'Display' },
  { id: 'profile', label: 'Profile' },
  { id: 'shortcuts', label: 'Shortcuts' },
];

interface SettingsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function Settings({ isOpen, onOpenChange }: SettingsProps) {
  const { profile, isAdmin, requestPasswordReset, refreshProfile } = useAuth();
  const { macros: serverMacros, loading: macrosLoading, save, reset } = useKeyboardMacrosContext();
  const {
    variant: flowSheetVariant,
    setVariant: setFlowSheetVariant,
    hideSidebar,
    setHideSidebar,
  } = useFlowSheetVariant();
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [macros, setMacros] = useState<KeyboardMacro[]>([]);
  const [savedMacros, setSavedMacros] = useState<KeyboardMacro[]>([]);
  const [macroErrors, setMacroErrors] = useState<string[]>([]);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [defaultTeamCode, setDefaultTeamCode] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const prevIsOpen = useRef(false);

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
    if (isOpen && !prevIsOpen.current) {
      setActiveTab('display');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setMacros(serverMacros);
    setSavedMacros(serverMacros);
    setMacroErrors([]);
  }, [isOpen, serverMacros]);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setDefaultTeamCode(profile?.default_team_code ?? '');
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    setProfileNotice(null);
    setResetNotice(null);
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

  const handlePasswordResetRequest = async () => {
    setResetNotice(null);
    setResetSubmitting(true);
    const { error } = await requestPasswordReset();
    setResetSubmitting(false);

    if (error) {
      setResetNotice(error);
      return;
    }

    setResetNotice('Password reset email sent. Check your inbox.');
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileNotice(null);
    setProfileSubmitting(true);

    try {
      await api.updateCurrentProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        default_team_code: defaultTeamCode.trim() || null,
      });
      await refreshProfile();
      setProfileNotice('Profile saved.');
    } catch (error) {
      setProfileNotice(error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  return (
    <>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => onOpenChange(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-card-04 rounded-lg shadow-lg z-50 w-[min(900px,calc(100vw-2rem))] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 className="text-base font-semibold">Settings</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 rounded hover:bg-card-02 transition-colors"
                aria-label="Close settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex border-b border-card-04 px-6 shrink-0">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                    activeTab === tab.id
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-foreground/60 hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto px-6 py-6">
              {activeTab === 'display' && (
                <div className="space-y-6">
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
                        type="button"
                        onClick={() => handleFontSizeChange(DEFAULT_FONT_SIZE)}
                        className="px-2 py-1 text-xs bg-card-02 rounded hover:bg-card-03 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Flow Sheet Style</label>
                    <p className="text-xs text-foreground/60 mb-3">
                      Applies to flow grids and tabs in every round. Sharp uses spreadsheet-style grid lines and square corners.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['default', 'sharp'] as const satisfies FlowSheetVariant[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFlowSheetVariant(option)}
                          className={`px-3 py-1.5 text-xs border rounded transition-colors ${
                            flowSheetVariant === option
                              ? 'border-accent bg-accent/10 text-foreground font-medium'
                              : 'border-card-04 bg-card-01 text-foreground/70 hover:bg-card-02 hover:text-foreground'
                          }`}
                        >
                          {option === 'default' ? 'Default' : 'Sharp'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center justify-between gap-4 rounded-lg border border-card-04 bg-card-01 px-3 py-2">
                      <span>
                        <span className="block text-sm font-medium">Hide Flow Sheet Sidebar</span>
                        <span className="block text-xs text-foreground/60 mt-0.5">
                          Gives active flow sheets the full window width. Re-enable this setting to show the round tree again.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={hideSidebar}
                        onChange={(event) => setHideSidebar(event.target.checked)}
                        className="h-4 w-4 accent-accent"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Profile</h3>
                    <p className="text-xs text-foreground/60 mt-1">
                      Update your name and default team code for new competitor tournaments.
                    </p>
                  </div>
                  <form onSubmit={handleProfileSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">First name</label>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                          placeholder="First"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Last name</label>
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                          placeholder="Last"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Default team code</label>
                      <input
                        value={defaultTeamCode}
                        onChange={(event) => setDefaultTeamCode(event.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-card-04 bg-background text-foreground focus:outline-none focus:border-accent text-sm"
                        placeholder="Kansas PS"
                      />
                      <p className="text-xs text-foreground/50 mt-1">
                        Examples: Kansas PS, Shawnee Mission East BS
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={profileSubmitting}
                        className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {profileSubmitting ? 'Saving...' : 'Save Profile'}
                      </button>
                      {profileNotice && (
                        <div className="text-xs text-foreground/60">{profileNotice}</div>
                      )}
                    </div>
                  </form>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => onOpenChange(false)}
                        className="px-3 py-1.5 text-xs border border-card-04 rounded hover:bg-card-02 transition-colors"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handlePasswordResetRequest}
                      disabled={resetSubmitting}
                      className="px-3 py-1.5 text-xs border border-card-04 rounded hover:bg-card-02 transition-colors disabled:opacity-50"
                    >
                      {resetSubmitting ? 'Sending reset email...' : 'Change Password'}
                    </button>
                  </div>
                  {resetNotice && (
                    <div className="text-xs text-foreground/60">{resetNotice}</div>
                  )}
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-3">
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
                      type="button"
                      onClick={handleSaveMacros}
                      className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                      disabled={!macrosDirty}
                    >
                      Save Shortcuts
                    </button>
                    <button
                      type="button"
                      onClick={handleResetMacros}
                      className="px-3 py-1.5 text-xs border border-card-04 rounded hover:bg-card-02 transition-colors"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
