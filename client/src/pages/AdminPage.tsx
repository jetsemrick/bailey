import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { listAllProfiles, getUsageStats, type UsageStats } from '../db/api';
import type { Profile } from '../db/types';

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profilesData, statsData] = await Promise.all([
          listAllProfiles(),
          getUsageStats(),
        ]);
        setProfiles(profilesData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Layout breadcrumbs={[{ label: 'Admin' }]}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-foreground/60">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout breadcrumbs={[{ label: 'Admin' }]}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout breadcrumbs={[{ label: 'Admin' }]}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>

          {/* Usage Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Platform Usage</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Users" value={stats?.totalUsers ?? 0} />
              <StatCard label="Tournaments" value={stats?.totalTournaments ?? 0} />
              <StatCard label="Rounds" value={stats?.totalRounds ?? 0} />
              <StatCard label="Flow Tabs" value={stats?.totalFlowTabs ?? 0} />
              <StatCard label="Flow Cells" value={stats?.totalFlowCells ?? 0} />
            </div>
          </section>

          {/* User List */}
          <section>
            <h2 className="text-lg font-semibold mb-4">All Users ({profiles.length})</h2>
            <div className="bg-card border border-card-04 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-card-02">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-04">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-card-01 transition-colors">
                      <td className="px-4 py-3">{profile.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            profile.role === 'Admin'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-card-03 text-foreground/70'
                          }`}
                        >
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/60">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-card-04 rounded-lg p-4">
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm text-foreground/60">{label}</div>
    </div>
  );
}
