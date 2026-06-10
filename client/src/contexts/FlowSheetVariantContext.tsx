import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FlowSheetVariant } from '../components/flowSheetVariant';
import {
  FLOW_SHEET_VARIANT_CHANGE_EVENT,
  readFlowSheetVariant,
  writeFlowSheetVariant,
} from '../lib/flowSheetSettings';

interface FlowSheetVariantContextValue {
  variant: FlowSheetVariant;
  setVariant: (variant: FlowSheetVariant) => void;
}

const FlowSheetVariantContext = createContext<FlowSheetVariantContextValue | null>(null);

export function FlowSheetVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<FlowSheetVariant>(readFlowSheetVariant);

  useEffect(() => {
    const sync = () => setVariantState(readFlowSheetVariant());
    window.addEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
  }, []);

  const setVariant = useCallback((next: FlowSheetVariant) => {
    writeFlowSheetVariant(next);
    setVariantState(next);
  }, []);

  return (
    <FlowSheetVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </FlowSheetVariantContext.Provider>
  );
}

export function useFlowSheetVariant() {
  const ctx = useContext(FlowSheetVariantContext);
  if (!ctx) {
    throw new Error('useFlowSheetVariant must be used within FlowSheetVariantProvider');
  }
  return ctx;
}
