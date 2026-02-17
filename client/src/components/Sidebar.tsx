import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../db/api';
import type { Round, Flow } from '../db/types';
import { formatRoundName } from '../db/types';

interface FlowEntry {
  flow: Flow;
  round: Round;
}

interface RoundNode {
  round: Round;
  flows: FlowEntry[];
  expanded: boolean;
  teamName?: string | null;
}

interface SidebarProps {
  /** When provided, only show rounds from this tournament */
  tournamentId?: string;
  /** Currently active round ID (highlighted in tree) */
  activeRoundId?: string;
  /** Currently active flow ID (only this gets orange highlight) */
  activeFlowId?: string | null;
  /** Flows for the active round (overrides loaded data when renaming) */
  activeRoundFlows?: Flow[];
  /** Called when user clicks a flow (to switch tabs). Receives roundId and flowId. */
  onFlowClick?: (roundId: string, flowId: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ tournamentId, activeRoundId, activeFlowId, activeRoundFlows, onFlowClick, collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<RoundNode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const roundNodes: RoundNode[] = [];
      for (const t of tournamentId
        ? [await api.getTournament(tournamentId)]
        : await api.listTournaments()) {
        const rounds = await api.listRounds(t.id);
        for (const r of rounds) {
          const flows = await api.listFlows(r.id);
          const flowEntries: FlowEntry[] = flows.map((f) => ({ flow: f, round: r }));
          roundNodes.push({
            round: r,
            flows: flowEntries,
            expanded: r.id === activeRoundId,
            teamName: t.team_name,
          });
        }
      }
      setNodes(roundNodes);
    } catch {
      // Fail silently for sidebar
    } finally {
      setLoading(false);
    }
  }, [tournamentId, activeRoundId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = (id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.round.id === id ? { ...n, expanded: !n.expanded } : n
      )
    );
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="shrink-0 w-8 bg-card border-r border-card-04 flex items-start justify-center pt-3 hover:bg-card-01 transition-colors"
        title="Expand sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="shrink-0 w-56 bg-card border-r border-card-04 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-04">
        <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
          Rounds
        </span>
        <button
          onClick={onToggle}
          className="p-0.5 rounded hover:bg-card-02 transition-colors"
          title="Collapse sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && (
          <div className="px-3 py-2 text-xs text-foreground/40">Loading...</div>
        )}
        {!loading && nodes.length === 0 && (
          <div className="px-3 py-2 text-xs text-foreground/40">No rounds</div>
        )}
        {nodes.map(({ round: r, flows, expanded, teamName }) => (
          <div key={r.id}>
            {/* Round row */}
            <button
              onClick={() => toggleExpand(r.id)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-card-01 transition-colors group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-foreground/30 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span
                className="text-xs font-medium truncate text-foreground/80 group-hover:text-foreground"
                title={formatRoundName(r, teamName)}
              >
                {formatRoundName(r, teamName)}
              </span>
            </button>

            {/* Flow tabs */}
            {expanded && (
              <div className="ml-3">
                {(() => {
                  const displayFlows = r.id === activeRoundId && activeRoundFlows ? activeRoundFlows : flows.map((fe) => fe.flow);
                  if (displayFlows.length === 0) {
                    return (
                      <div className="px-3 py-1 text-[11px] text-foreground/30 italic">
                        No tabs
                      </div>
                    );
                  }
                  return displayFlows.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (r.id === activeRoundId && onFlowClick) {
                        onFlowClick(r.id, f.id);
                      } else {
                        navigate(`/round/${r.id}?flow=${f.id}`);
                      }
                    }}
                    className={`w-full flex items-center gap-1.5 px-3 py-1 text-left transition-colors rounded-sm ${
                      f.id === activeFlowId
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground/60 hover:bg-card-01 hover:text-foreground'
                    }`}
                  >
                    <span className="text-[11px] truncate">
                      {f.position_name}
                    </span>
                  </button>
                  ));
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer link */}
      <button
        onClick={() => navigate('/')}
        className="px-3 py-2 border-t border-card-04 text-xs text-foreground/50 hover:text-foreground hover:bg-card-01 transition-colors text-left"
      >
        View all rounds
      </button>
    </div>
  );
}
