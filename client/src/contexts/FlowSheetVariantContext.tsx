import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FlowSheetVariant } from '../components/flowSheetVariant';
import {
  FLOW_SHEET_HIDE_SIDEBAR_CHANGE_EVENT,
  FLOW_SHEET_VARIANT_CHANGE_EVENT,
  readFlowSheetHideSidebar,
  readFlowSheetVariant,
  writeFlowSheetHideSidebar,
  writeFlowSheetVariant,
} from '../lib/flowSheetSettings';

interface FlowSheetVariantContextValue {
  variant: FlowSheetVariant;
  setVariant: (variant: FlowSheetVariant) => void;
  hideSidebar: boolean;
  setHideSidebar: (hideSidebar: boolean) => void;
}

const FlowSheetVariantContext = createContext<FlowSheetVariantContextValue | null>(null);

export function FlowSheetVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<FlowSheetVariant>(readFlowSheetVariant);
  const [hideSidebar, setHideSidebarState] = useState(readFlowSheetHideSidebar);

  useEffect(() => {
    const sync = () => setVariantState(readFlowSheetVariant());
    window.addEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLOW_SHEET_VARIANT_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => setHideSidebarState(readFlowSheetHideSidebar());
    window.addEventListener(FLOW_SHEET_HIDE_SIDEBAR_CHANGE_EVENT, sync);
    return () => window.removeEventListener(FLOW_SHEET_HIDE_SIDEBAR_CHANGE_EVENT, sync);
  }, []);

  const setVariant = useCallback((next: FlowSheetVariant) => {
    writeFlowSheetVariant(next);
    setVariantState(next);
  }, []);

  const setHideSidebar = useCallback((next: boolean) => {
    writeFlowSheetHideSidebar(next);
    setHideSidebarState(next);
  }, []);

  return (
    <FlowSheetVariantContext.Provider value={{ variant, setVariant, hideSidebar, setHideSidebar }}>
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
