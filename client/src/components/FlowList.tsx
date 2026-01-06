import { Flow } from '../api/client';

interface FlowListProps {
  flows: Flow[];
  onSelectFlow: (flowId: string) => void;
  onCreateFlow: () => void;
  onDeleteFlow: (flowId: string) => void;
}

export default function FlowList({ flows, onSelectFlow, onCreateFlow, onDeleteFlow }: FlowListProps) {
  return (
    <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Flows</h2>
        <button
          onClick={onCreateFlow}
          className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/90 text-sm font-medium transition-colors"
        >
          + New Flow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group bg-card border border-card-04 rounded-lg p-4 hover:border-accent hover:shadow-sm transition-all cursor-pointer relative"
            onClick={() => onSelectFlow(flow.id)}
          >
            <h3 className="font-medium text-lg mb-2 text-foreground group-hover:text-accent transition-colors">
              {flow.name}
            </h3>
            <div className="text-sm text-foreground/60">
              Updated {new Date(flow.updatedAt).toLocaleDateString()}
            </div>
            <div className="mt-4 text-xs text-foreground/40">
              {flow.sheets.length} sheet{flow.sheets.length !== 1 ? 's' : ''}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to delete this flow?')) {
                  onDeleteFlow(flow.id);
                }
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-foreground/40 hover:text-red-600 transition-all"
              title="Delete flow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ))}
        
        {flows.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-foreground/40 border-2 border-dashed border-card-04 rounded-lg">
            <p className="mb-4">No flows yet</p>
            <button
              onClick={onCreateFlow}
              className="text-accent hover:underline"
            >
              Create your first flow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

