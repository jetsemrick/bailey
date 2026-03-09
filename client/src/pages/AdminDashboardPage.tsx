import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import * as api from '../db/api';
import type { AdminUserSummary, PlatformUsageMetrics } from '../db/types';

function formatDateTime(value: string | null): string {
  if (!value) return 'No activity yet';

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [metrics, setMetrics] = useState<PlatformUsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [nextUsers, nextMetrics] = await Promise.all([
        api.listAdminUserSummaries(),
        api.getPlatformUsageMetrics(),
      ]);

      setUsers(nextUsers);
      setMetrics(nextMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metricCards = useMemo(
    () =>
      metrics
        ? [
            { label: 'Users', value: formatCount(metrics.total_users) },
            { label: 'Admins', value: formatCount(metrics.admin_users) },
            { label: 'Active Users', value: formatCount(metrics.active_users) },
            { label: 'Tournaments', value: formatCount(metrics.total_tournaments) },
            { label: 'Rounds', value: formatCount(metrics.total_rounds) },
            { label: 'Flow Tabs', value: formatCount(metrics.total_flow_tabs) },
            { label: 'Flow Cells', value: formatCount(metrics.total_flow_cells) },
            { label: 'Analytics Entries', value: formatCount(metrics.total_analytics_entries) },
          ]
        : [],
    [metrics]
  );

  return (
    <Layout breadcrumbs={[{ label: 'Admin Dashboard' }]}>
      <div className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Admin Dashboard</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Monitor users and platform activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {metrics && (
              <div className="text-xs text-foreground/50">
                Last activity: {formatDateTime(metrics.most_recent_activity_at)}
              </div>
            )}
            <button
              onClick={() => void load()}
              className="px-3 py-1.5 rounded border border-card-04 bg-card text-sm font-medium hover:bg-card-01 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-card-04 bg-card px-4 py-12 text-center text-sm text-foreground/50">
            Loading admin data...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-card-04 bg-card p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {card.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{card.value}</div>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-card-04 bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-card-04 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">Users</h3>
                  <p className="text-xs text-foreground/50 mt-1">
                    Role assignment and usage by account.
                  </p>
                </div>
                <div className="text-xs text-foreground/50">
                  {formatCount(users.length)} total
                </div>
              </div>

              {users.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-foreground/50">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-card-04">
                    <thead className="bg-card-01">
                      <tr className="text-left text-xs font-medium uppercase tracking-wide text-foreground/50">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Tournaments</th>
                        <th className="px-4 py-3">Rounds</th>
                        <th className="px-4 py-3">Flows</th>
                        <th className="px-4 py-3">Cells</th>
                        <th className="px-4 py-3">Analytics</th>
                        <th className="px-4 py-3">Last Activity</th>
                        <th className="px-4 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-04 text-sm">
                      {users.map((summary) => (
                        <tr key={summary.id} className="hover:bg-card-01/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{summary.email}</div>
                            <div className="text-xs text-foreground/45">{summary.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                summary.role === 'Admin'
                                  ? 'bg-accent/10 text-accent'
                                  : 'bg-card-02 text-foreground/70'
                              }`}
                            >
                              {summary.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground/80">
                            {formatCount(summary.tournament_count)}
                          </td>
                          <td className="px-4 py-3 text-foreground/80">
                            {formatCount(summary.round_count)}
                          </td>
                          <td className="px-4 py-3 text-foreground/80">
                            {formatCount(summary.flow_count)}
                          </td>
                          <td className="px-4 py-3 text-foreground/80">
                            {formatCount(summary.cell_count)}
                          </td>
                          <td className="px-4 py-3 text-foreground/80">
                            {formatCount(summary.analytics_count)}
                          </td>
                          <td className="px-4 py-3 text-foreground/60">
                            {formatDateTime(summary.last_activity_at)}
                          </td>
                          <td className="px-4 py-3 text-foreground/60">
                            {formatDateTime(summary.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
