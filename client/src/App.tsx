import { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import FlowGrid from './components/FlowGrid';
import SheetTabs from './components/SheetTabs';
import FlowList from './components/FlowList';
import { api, Flow } from './api/client';
import { useFlow } from './hooks/useFlow';

function App() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const flowData = useFlow(currentFlowId);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadFlows = async () => {
      try {
        const data = await api.flows.list();
        setFlows(data);
      } catch (error) {
        console.error('Failed to load flows:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateFlow = async () => {
    try {
      const newFlow = await api.flows.create('New Flow');
      setFlows((prev) => [newFlow, ...prev]);
      setCurrentFlowId(newFlow.id);
    } catch (error) {
      console.error('Failed to create flow:', error);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    try {
      await api.flows.delete(flowId);
      setFlows((prev) => prev.filter((f) => f.id !== flowId));
      if (currentFlowId === flowId) {
        setCurrentFlowId(null);
      }
    } catch (error) {
      console.error('Failed to delete flow:', error);
    }
  };

  const handleRenameFlow = async (name: string) => {
    if (!currentFlowId) return;
    try {
      const updatedFlow = await api.flows.update(currentFlowId, name);
      // Update local flows list
      setFlows((prev) => prev.map((f) => (f.id === currentFlowId ? updatedFlow : f)));
      // Update current flow data if managed by useFlow (it re-fetches or we need to update it manually? useFlow fetches on mount/change, but here we can force an update or just let useFlow handle it if we trigger a reload)
      // Actually, useFlow doesn't expose a direct "updateFlow" method for the flow object itself, only sheets/cells. 
      // But we can trigger a reload or just rely on the fact that we're passing the name to Layout from `currentFlow` which we just updated in `flows` list? 
      // Wait, `currentFlow` is derived from `flows` list in App.tsx. `flowData.flow` is from useFlow.
      // We should update both to be safe/consistent, but the Layout uses what we pass it.
      // Let's rely on `flows` list for the Layout name.
      
      // Also notify useFlow to reload/update its internal state to match
      flowData.reload();
    } catch (error) {
      console.error('Failed to rename flow:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </Layout>
    );
  }

  // Home Screen / Flow List
  if (!currentFlowId) {
    return (
      <Layout>
        <FlowList
          flows={flows}
          onSelectFlow={setCurrentFlowId}
          onCreateFlow={handleCreateFlow}
          onDeleteFlow={handleDeleteFlow}
        />
      </Layout>
    );
  }

  const currentFlow = flows.find((f) => f.id === currentFlowId);

  // Individual Flow View
  return (
    <Layout 
      onGoHome={() => setCurrentFlowId(null)}
      flowName={currentFlow?.name}
      onRenameFlow={handleRenameFlow}
    >
      <div className="flex flex-col h-full">
        <FlowGrid
          currentSheetId={flowData.currentSheetId}
          getCellContent={flowData.getCellContent}
          onCellUpdate={flowData.updateCell}
        />
        <SheetTabs
          sheets={flowData.flow?.sheets || []}
          currentSheetId={flowData.currentSheetId || null}
          onSelectSheet={(sheetId) => flowData.setCurrentSheetId(sheetId)}
          onAddSheet={() => flowData.addSheet()}
          onRenameSheet={(sheetId, name) => flowData.renameSheet(sheetId, name)}
          onDeleteSheet={(sheetId) => flowData.deleteSheet(sheetId)}
        />
        {flowData.error && (
          <div className="bg-red-50 border-t border-red-100 text-red-600 px-4 py-2 text-sm">
            {flowData.error}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default App;

