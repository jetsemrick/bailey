import { useState } from 'react';
import { Link } from 'react-router-dom';
import FlowGrid from '../components/FlowGrid';
import FlowTabs from '../components/FlowTabs';
import NewFlowDialog from '../components/NewFlowDialog';
import { KeyboardMacrosProvider } from '../contexts/KeyboardMacrosContext';
import { useFlowGridPrototype } from '../hooks/useFlowGridPrototype';
import { useFlowSheetVariant } from '../hooks/useFlowSheetVariant';
import type { FlowTabKind } from '../db/types';

export default function FlowPrototypePage() {
  return (
    <KeyboardMacrosProvider>
      <FlowPrototypeInner />
    </KeyboardMacrosProvider>
  );
}

function FlowPrototypeInner() {
  const grid = useFlowGridPrototype();
  const { variant: flowSheetVariant, setVariant: setFlowSheetVariant } = useFlowSheetVariant();
  const [showNewFlow, setShowNewFlow] = useState(false);

  const handleAddFlow = async (
    initiatedBy: 'aff' | 'neg',
    count: number,
    tabKind: FlowTabKind = 'standard'
  ) => {
    const ok = await grid.addFlow(initiatedBy, count, tabKind);
    if (ok) setShowNewFlow(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="bg-card border-b border-card-04 px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition-opacity shrink-0">
            Bailey
          </Link>
          <span className="text-foreground/20">/</span>
          <span className="text-sm font-medium truncate">Sharp Flow Prototype</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex border border-card-04 text-xs">
            <button
              type="button"
              onClick={() => setFlowSheetVariant('default')}
              className={`px-2 py-0.5 transition-colors ${
                flowSheetVariant === 'default' ? 'bg-accent/10 font-medium' : 'hover:bg-card-02'
              }`}
            >
              Default
            </button>
            <button
              type="button"
              onClick={() => setFlowSheetVariant('sharp')}
              className={`px-2 py-0.5 border-l border-card-04 transition-colors ${
                flowSheetVariant === 'sharp' ? 'bg-accent/10 font-medium' : 'hover:bg-card-02'
              }`}
            >
              Sharp
            </button>
          </div>
          <span className="text-xs text-foreground/50 border border-card-04 px-2 py-0.5">
            In-memory demo
          </span>
        </div>
      </header>

      <div className="shrink-0 border-b border-card-04 bg-card px-4 py-2 text-xs text-foreground/60">
        {flowSheetVariant === 'sharp' ? 'Sharp' : 'Default'} flow sheet style. Double-click to edit, drag to reorder.
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <div className="shrink-0 flex border-b border-card-04 bg-card">
          <span className="px-4 py-2 text-sm font-medium text-accent border-b-2 border-accent -mb-px">
            Flow
          </span>
        </div>

        <div className="shrink-0 flex items-center justify-between border-b border-card-04 bg-card px-4 py-1.5 text-sm">
          <span className="font-medium">Michigan State v. Northwestern</span>
          <span className="text-foreground/50 text-xs">Round 4 — AFF 1 sample loaded</span>
        </div>

        <FlowGrid grid={grid} variant={flowSheetVariant} />

        <FlowTabs
          flows={grid.flows}
          activeFlowId={grid.activeFlowId}
          onSelect={grid.selectFlow}
          onAdd={() => setShowNewFlow(true)}
          onRename={grid.renameFlow}
          onDelete={grid.removeFlow}
          onReorder={grid.reorderFlows}
          variant={flowSheetVariant}
        />
      </div>

      {showNewFlow && (
        <NewFlowDialog
          hasCxTab={grid.flows.some((f) => f.tab_kind === 'cx')}
          onSubmit={handleAddFlow}
          onCancel={() => setShowNewFlow(false)}
        />
      )}
    </div>
  );
}
