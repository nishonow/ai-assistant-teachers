import { Activity, BarChart3, FileStack, MessageSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StatsResponse } from "../lib/types";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  helper: string;
}

interface CircleMetric {
  label: string;
  value: number;
  color: string;
  percent: number;
}

interface PlatformItem {
  platform: string;
  count: number;
  percent: number;
  color: string;
}

const numberFmt = new Intl.NumberFormat();
const palette = ["#17dfc1", "#53f6dc", "#22c55e", "#f59e0b", "#fb7185", "#60a5fa"];

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const previousRef = useRef(0);

  useEffect(() => {
    const start = previousRef.current;
    const end = target;

    if (start === end) {
      setValue(end);
      return;
    }

    const startTime = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(start + (end - start) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previousRef.current = end;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function StatCard({ icon: Icon, title, value, helper }: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <article className="panel overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-slate-400">{title}</p>
          <p className="mt-2 font-heading text-3xl font-bold text-slate-50">{numberFmt.format(Math.round(animatedValue))}</p>
        </div>
        <span className="rounded-xl border border-brand-400/35 bg-brand-500/10 p-2 text-brand-300">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

function CircleCard({ label, value, color, percent }: CircleMetric) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const [drawPercent, setDrawPercent] = useState(0);
  const animatedValue = useCountUp(value, 950);

  useEffect(() => {
    setDrawPercent(0);
    const timer = window.setTimeout(() => setDrawPercent(clampedPercent), 80);
    return () => window.clearTimeout(timer);
  }, [clampedPercent]);

  const offset = circumference * (1 - drawPercent / 100);

  return (
    <article className="panel flex flex-col items-center p-4">
      <div className="relative grid h-32 w-32 place-items-center">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={radius} stroke="rgba(47,79,116,0.5)" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2, 0.9, 0.2, 1)" }}
          />
        </svg>
        <div className="absolute text-center">
          <p className="font-heading text-xl font-bold text-slate-50">{numberFmt.format(Math.round(animatedValue))}</p>
          <p className="text-[11px] text-slate-400">{Math.round(drawPercent)}%</p>
        </div>
      </div>
      <p className="mt-3 font-medium text-slate-100">{label}</p>
      <p className="text-xs text-slate-400">scaled to top metric</p>
    </article>
  );
}

function StackedMixBar({ items }: { items: PlatformItem[] }) {
  const [ready, setReady] = useState(false);
  const signature = items.map((item) => `${item.platform}:${item.count}`).join("|");

  useEffect(() => {
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(timer);
  }, [signature]);

  if (!items.length) {
    return <p className="text-sm text-slate-400">No platform data yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-600 bg-ink-900/45">
      <div className="flex h-4 w-full">
        {items.map((item, index) => (
          <div
            key={item.platform}
            className="h-full"
            title={`${item.platform}: ${item.percent.toFixed(1)}%`}
            style={{
              width: ready ? `${item.percent}%` : "0%",
              backgroundColor: item.color,
              transition: `width 900ms cubic-bezier(0.2, 0.9, 0.2, 1) ${index * 70}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformRow({ item, rank }: { item: PlatformItem; rank: number }) {
  const animatedCount = useCountUp(item.count, 850);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    setBarWidth(0);
    const timer = window.setTimeout(() => setBarWidth(item.percent), 120 + rank * 70);
    return () => window.clearTimeout(timer);
  }, [item.percent, rank, item.count]);

  return (
    <article className="rounded-xl border border-ink-600 bg-ink-900/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <p className="truncate text-sm font-medium text-slate-100">{item.platform}</p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          {numberFmt.format(Math.round(animatedCount))} ({item.percent.toFixed(1)}%)
        </p>
      </div>
      <div className="h-2 rounded-full bg-ink-700">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: item.color,
            transition: "width 950ms cubic-bezier(0.2, 0.9, 0.2, 1)",
          }}
        />
      </div>
    </article>
  );
}

interface OverviewTabProps {
  stats: StatsResponse | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export default function OverviewTab({ stats, loading, onRefresh }: OverviewTabProps) {
  const totalUsers = stats?.total_users ?? 0;
  const totalMessages = stats?.total_messages ?? 0;
  const totalDocuments = stats?.total_documents ?? 0;
  const totalChunks = stats?.total_chunks ?? 0;

  const platformItems = useMemo(() => {
    const entries = Object.entries(stats?.by_platform || {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return entries.map(([platform, count], index) => ({
      platform,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      color: palette[index % palette.length],
    }));
  }, [stats?.by_platform]);

  const messagesPerUser = totalUsers > 0 ? totalMessages / totalUsers : 0;
  const chunksPerDoc = totalDocuments > 0 ? totalChunks / totalDocuments : 0;
  const docsPerUser = totalUsers > 0 ? totalDocuments / totalUsers : 0;
  const topPlatform = platformItems[0];

  const circleMax = Math.max(totalUsers, totalMessages, totalDocuments, 1);
  const usersCirclePercent = (totalUsers / circleMax) * 100;
  const messagesCirclePercent = (totalMessages / circleMax) * 100;
  const documentsCirclePercent = (totalDocuments / circleMax) * 100;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-2xl font-bold">Overview</h2>
          <p className="text-sm text-slate-400">Operational health and usage analytics</p>
        </div>
        <button className="btn-muted" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} title="Total Users" value={totalUsers} helper="All registered users" />
          <StatCard icon={MessageSquare} title="Total Messages" value={totalMessages} helper="Messages handled by bot" />
          <StatCard icon={FileStack} title="Total Documents" value={totalDocuments} helper="Indexed source files" />
          <StatCard icon={BarChart3} title="Total Chunks" value={totalChunks} helper="Chunks available for RAG" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <article className="panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-semibold">Circle Analytics</h3>
              <span className="tag border-brand-400/35 bg-brand-500/10 text-brand-300">Scale max: {numberFmt.format(circleMax)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CircleCard label="Users" value={totalUsers} percent={usersCirclePercent} color="#17dfc1" />
              <CircleCard label="Messages" value={totalMessages} percent={messagesCirclePercent} color="#53f6dc" />
              <CircleCard label="Documents" value={totalDocuments} percent={documentsCirclePercent} color="#22c55e" />
            </div>
          </article>

          <article className="panel p-4">
            <h3 className="font-heading text-lg font-semibold">Ratios</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-ink-600 bg-ink-900/50 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Messages / User</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">{messagesPerUser.toFixed(1)}</p>
              </div>
              <div className="rounded-xl border border-ink-600 bg-ink-900/50 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Chunks / Document</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">{chunksPerDoc.toFixed(1)}</p>
              </div>
              <div className="rounded-xl border border-ink-600 bg-ink-900/50 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Documents / User</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-50">{docsPerUser.toFixed(2)}</p>
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <article className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">Message Platform Distribution</h3>
              <span className="tag border-ink-500 bg-ink-900/60 text-slate-300">{platformItems.length} platforms</span>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.08em] text-slate-400">Traffic Mix</p>
                <StackedMixBar items={platformItems} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {platformItems.length === 0 ? (
                  <p className="text-sm text-slate-400">No platform data yet.</p>
                ) : (
                  platformItems.map((item, index) => <PlatformRow key={item.platform} item={item} rank={index} />)
                )}
              </div>
            </div>
          </article>

          <article className="panel p-4">
            <h3 className="font-heading text-lg font-semibold">Quick Insights</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Top Platform</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{topPlatform?.platform || "No data"}</p>
              </div>
              <div className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Active Platforms</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{platformItems.length}</p>
              </div>
              <div className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Knowledge Density</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {chunksPerDoc >= 10 ? "Strong" : chunksPerDoc >= 5 ? "Good" : "Growing"}
                </p>
              </div>
              <div className="rounded-xl border border-ink-600 bg-gradient-to-r from-brand-500/12 to-ink-900 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">System Pulse</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-brand-300">
                  <Activity size={14} />
                  {loading ? "Refreshing metrics..." : "Metrics healthy"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
