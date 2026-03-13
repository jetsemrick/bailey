import { createContext, useContext, type ReactNode } from 'react';
import { useKeyboardMacros } from '../hooks/useKeyboardMacros';

const KeyboardMacrosContext = createContext<ReturnType<typeof useKeyboardMacros> | null>(null);

export function KeyboardMacrosProvider({ children }: { children: ReactNode }) {
  const value = useKeyboardMacros();
  return (
    <KeyboardMacrosContext.Provider value={value}>
      {children}
    </KeyboardMacrosContext.Provider>
  );
}

export function useKeyboardMacrosContext() {
  const ctx = useContext(KeyboardMacrosContext);
  if (!ctx) throw new Error('useKeyboardMacrosContext must be used within KeyboardMacrosProvider');
  return ctx;
}
