import { BarChart3, MessageSquare, Users, FileStack } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StatsResponse } from "../lib/types";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number | null | undefined;
}

function StatCard({ icon: Icon, title, value }: StatCardProps) {
  return (
    <article className="panel p-4">
      <div className="flex items-center justify-between text-slate-400">
        <p className="text-sm">{title}</p>
        <Icon size={16} />
      </div>
      <p className="mt-3 font-heading text-3xl font-bold">{value ?? "-"}</p>
    </article>
  );
}

interface OverviewTabProps {
  stats: StatsResponse | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export default function OverviewTab({ stats, loading, onRefresh }: OverviewTabProps) {
  const platforms = Object.entries(stats?.by_platform || {});

  return (
    <section className="space-y-4 md:h-full md:overflow-auto md:pr-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold">Overview</h2>
        <button className="btn-muted" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} title="Total Users" value={stats?.total_users} />
        <StatCard icon={MessageSquare} title="Total Messages" value={stats?.total_messages} />
        <StatCard icon={FileStack} title="Total Documents" value={stats?.total_documents} />
        <StatCard icon={BarChart3} title="Total Chunks" value={stats?.total_chunks} />
      </div>

      <article className="panel p-4">
        <h3 className="font-heading text-lg font-semibold">Messages by Platform</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {platforms.length === 0 ? (
            <p className="text-sm text-slate-400">No platform data yet.</p>
          ) : (
            platforms.map(([platform, count]) => (
              <span key={platform} className="tag border-brand-400/35 bg-brand-500/10 text-brand-300">
                {platform}: {count}
              </span>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

