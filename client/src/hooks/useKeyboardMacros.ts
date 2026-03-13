import { useState, useEffect, useCallback } from 'react';
import type { KeyboardMacro } from '../keyboardMacros';
import {
  DEFAULT_KEYBOARD_MACROS,
  validateKeyboardMacros,
} from '../keyboardMacros';
import * as api from '../db/api';

export function useKeyboardMacros() {
  const [macros, setMacros] = useState<KeyboardMacro[]>(() => [...DEFAULT_KEYBOARD_MACROS]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchKeyboardMacros();
      setMacros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load macros');
      setMacros([...DEFAULT_KEYBOARD_MACROS]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (nextMacros: KeyboardMacro[]): Promise<string[]> => {
    const errors = validateKeyboardMacros(nextMacros);
    if (errors.length > 0) return errors;
    try {
      await api.saveKeyboardMacrosRemote(nextMacros);
      setMacros(nextMacros);
      return [];
    } catch (err) {
      return [err instanceof Error ? err.message : 'Failed to save macros'];
    }
  }, []);

  const reset = useCallback(async (): Promise<string[]> => {
    try {
      await api.saveKeyboardMacrosRemote(DEFAULT_KEYBOARD_MACROS);
      setMacros([...DEFAULT_KEYBOARD_MACROS]);
      return [];
    } catch (err) {
      return [err instanceof Error ? err.message : 'Failed to reset macros'];
    }
  }, []);

  return { macros, loading, error, reload: load, save, reset };
}
