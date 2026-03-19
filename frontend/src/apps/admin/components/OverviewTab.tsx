import {
  BarChart3,
  FileStack,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DocumentRecord, StatsResponse, UserRecord } from "../../../core/types";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  helper: string;
}

interface BreakdownItem {
  label: string;
  count: number;
  color: string;
}

interface PlatformItem {
  platform: string;
  count: number;
  percent: number;
  color: string;
}

interface InsightCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "good" | "warn" | "danger";
}

interface OverviewTabProps {
  stats: StatsResponse | null;
  users: UserRecord[];
  documents: DocumentRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const numberFmt = new Intl.NumberFormat();
const palette = ["#17dfc1", "#53f6dc", "#22c55e", "#f59e0b", "#fb7185", "#60a5fa"];
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

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

function toPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function isWithinLast7Days(value: string | null | undefined): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= sevenDaysMs;
}

function StatCard({ icon: Icon, title, value, helper }: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <article className="panel overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{title}</p>
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {subtitle ? <p className="text-xs uppercase tracking-[0.08em] text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function ProgressRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = toPercent(count, total);
  const animatedCount = useCountUp(count, 850);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    setBarWidth(0);
    const timer = window.setTimeout(() => setBarWidth(percent), 100);
    return () => window.clearTimeout(timer);
  }, [percent, count]);

  return (
    <article className="rounded-xl border border-ink-600 bg-ink-900/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <p className="truncate text-sm font-medium text-slate-100">{label}</p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          {numberFmt.format(Math.round(animatedCount))} ({percent.toFixed(1)}%)
        </p>
      </div>
      <div className="h-2 rounded-full bg-ink-700">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            transition: "width 850ms cubic-bezier(0.2, 0.9, 0.2, 1)",
          }}
        />
      </div>
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
    return <p className="text-sm text-slate-400">No platform message data yet.</p>;
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

function InsightCard({ icon: Icon, label, value, hint, tone = "brand" }: InsightCardProps) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : "border-brand-500/30 bg-brand-500/10 text-brand-200";

  return (
    <article className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <span className={`rounded-lg border px-2 py-1 ${toneClass}`}>
          <Icon size={13} />
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </article>
  );
}

export default function OverviewTab({ stats, users, documents, loading, onRefresh }: OverviewTabProps) {
  const totalUsers = stats?.total_users ?? users.length;
  const legacyMessages = stats?.total_messages ?? 0;
  const savedWebMessages = stats?.saved_web_messages ?? 0;
  const savedWebConversations = stats?.saved_web_conversations ?? 0;
  const totalDocuments = stats?.total_documents ?? documents.length;
  const totalChunks = stats?.total_chunks ?? 0;

  const blockedUsers = useMemo(() => users.filter((user) => user.is_blocked).length, [users]);
  const adminUsers = useMemo(() => users.filter((user) => user.is_admin).length, [users]);
  const activeUsers = Math.max(users.length - blockedUsers, 0);
  const newUsers7d = useMemo(() => users.filter((user) => isWithinLast7Days(user.created_at)).length, [users]);

  const userBreakdown = useMemo<BreakdownItem[]>(
    () => [
      { label: "Active Users", count: activeUsers, color: "#22c55e" },
      { label: "Blocked Users", count: blockedUsers, color: "#fb7185" },
      { label: "Admins", count: adminUsers, color: "#60a5fa" },
    ],
    [activeUsers, blockedUsers, adminUsers]
  );

  const userPlatformItems = useMemo<PlatformItem[]>(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      const key = (user.platform || "unknown").trim().toLowerCase() || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const total = users.length;

    return sorted.map(([platform, count], index) => ({
      platform,
      count,
      percent: toPercent(count, total),
      color: palette[index % palette.length],
    }));
  }, [users]);

  const documentStatus = useMemo(() => {
    const counts = { indexed: 0, processing: 0, pending: 0, failed: 0, other: 0 };

    for (const document of documents) {
      const status = (document.status || "").trim().toLowerCase();
      if (status === "indexed") counts.indexed += 1;
      else if (status === "processing") counts.processing += 1;
      else if (status === "pending") counts.pending += 1;
      else if (status === "failed") counts.failed += 1;
      else counts.other += 1;
    }

    return counts;
  }, [documents]);

  const documentBreakdown = useMemo<BreakdownItem[]>(
    () => [
      { label: "Indexed", count: documentStatus.indexed, color: "#22c55e" },
      { label: "Processing", count: documentStatus.processing, color: "#60a5fa" },
      { label: "Pending", count: documentStatus.pending, color: "#f59e0b" },
      { label: "Failed", count: documentStatus.failed, color: "#fb7185" },
      { label: "Other", count: documentStatus.other, color: "#a78bfa" },
    ],
    [documentStatus]
  );

  const recentUploads7d = useMemo(() => documents.filter((document) => isWithinLast7Days(document.created_at)).length, [documents]);

  const topUploader = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents) {
      const key = (document.uploaded_by || "unknown").trim() || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [documents]);

  const messagePlatformItems = useMemo<PlatformItem[]>(() => {
    const entries = Object.entries(stats?.by_platform || {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return entries.map(([platform, count], index) => ({
      platform,
      count,
      percent: toPercent(count, total),
      color: palette[index % palette.length],
    }));
  }, [stats?.by_platform]);

  const messagePlatformTotal = messagePlatformItems.reduce((sum, item) => sum + item.count, 0);
  const topMessagePlatform = messagePlatformItems[0] || null;
  const indexedRate = toPercent(documentStatus.indexed, documents.length);
  const blockedRate = toPercent(blockedUsers, users.length);
  const adminRate = toPercent(adminUsers, users.length);
  const avgChunksPerIndexedDoc = documentStatus.indexed > 0 ? totalChunks / documentStatus.indexed : 0;

  return (
    <section className="flex flex-col gap-4 md:gap-5">
      <div className="panel overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold">Overview</h2>
            <p className="mt-1 text-sm text-slate-300">Real-time dashboard from users, documents, legacy messages, saved web chats, and chunks</p>
          </div>
          <button className="btn-muted" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2 text-sm text-slate-300">
            Active users: <span className="font-semibold text-slate-100">{numberFmt.format(activeUsers)}</span>
          </div>
          <div className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2 text-sm text-slate-300">
            Indexed docs: <span className="font-semibold text-slate-100">{indexedRate.toFixed(1)}%</span>
          </div>
          <div className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2 text-sm text-slate-300">
            New users (7d): <span className="font-semibold text-slate-100">{numberFmt.format(newUsers7d)}</span>
          </div>
          <div className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2 text-sm text-slate-300">
            Top legacy platform: <span className="font-semibold text-slate-100">{topMessagePlatform?.platform || "No data"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} title="Total Users" value={totalUsers} helper="Live registered users" />
        <StatCard icon={MessageSquare} title="Legacy Messages" value={legacyMessages} helper="Legacy ask/message records" />
        <StatCard icon={MessageSquare} title="Saved Web Messages" value={savedWebMessages} helper="Messages in saved web chats" />
        <StatCard icon={MessageSquare} title="Saved Web Chats" value={savedWebConversations} helper="Persisted web conversations" />
        <StatCard icon={FileStack} title="Total Documents" value={totalDocuments} helper="Live document records" />
        <StatCard icon={BarChart3} title="Total Chunks" value={totalChunks} helper="Live knowledge chunks" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-4">
          <SectionHeader title="User Access Breakdown" subtitle={`Base: ${numberFmt.format(users.length)} users`} />
          <div className="space-y-3">
            {userBreakdown.map((item) => (
              <ProgressRow key={item.label} label={item.label} count={item.count} total={users.length} color={item.color} />
            ))}
          </div>
        </article>

        <article className="panel p-4">
          <SectionHeader title="Document Index Status" subtitle={`Base: ${numberFmt.format(documents.length)} docs`} />
          <div className="space-y-3">
            {documentBreakdown.map((item) => (
              <ProgressRow key={item.label} label={item.label} count={item.count} total={documents.length} color={item.color} />
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <article className="panel p-4">
          <SectionHeader title="Legacy Message Platform Distribution" subtitle={`${messagePlatformItems.length} platforms`} />

          <div className="space-y-4">
            <div className="rounded-xl border border-ink-600 bg-ink-900/55 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-slate-400">Legacy Message Share by Platform</p>
              <StackedMixBar items={messagePlatformItems} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {messagePlatformItems.length === 0 ? (
                <p className="text-sm text-slate-400">No platform message data yet.</p>
              ) : (
                messagePlatformItems.map((item) => (
                  <ProgressRow
                    key={item.platform}
                    label={item.platform}
                    count={item.count}
                    total={messagePlatformTotal}
                    color={item.color}
                  />
                ))
              )}
            </div>
          </div>
        </article>

        <article className="panel p-4">
          <SectionHeader title="Computed Metrics" subtitle="Derived from live data" />
          <div className="grid gap-3 sm:grid-cols-2">
            <InsightCard icon={ShieldAlert} label="Blocked User Rate" value={`${blockedRate.toFixed(1)}%`} tone="danger" />
            <InsightCard icon={ShieldCheck} label="Admin User Rate" value={`${adminRate.toFixed(1)}%`} tone="brand" />
            <InsightCard icon={Sparkles} label="Indexed Document Rate" value={`${indexedRate.toFixed(1)}%`} tone="good" />
            <InsightCard icon={BarChart3} label="Avg Chunks / Indexed Doc" value={avgChunksPerIndexedDoc.toFixed(1)} tone="warn" />
            <InsightCard icon={MessageSquare} label="Saved Web Messages" value={numberFmt.format(savedWebMessages)} hint="Separate from legacy messages" />
            <InsightCard icon={MessageSquare} label="Saved Web Chats" value={numberFmt.format(savedWebConversations)} hint="Persisted user conversations" />
            <InsightCard icon={Users} label="New Users (7 Days)" value={numberFmt.format(newUsers7d)} hint="Last 7 days window" />
            <InsightCard icon={UploadCloud} label="Uploads (7 Days)" value={numberFmt.format(recentUploads7d)} hint="Last 7 days window" />
            <InsightCard
              icon={FileStack}
              label="Top Uploader"
              value={topUploader ? `${topUploader[0]} (${numberFmt.format(topUploader[1])})` : "No data"}
              hint="Most uploads"
            />
            <InsightCard
              icon={MessageSquare}
              label="Top Message Platform"
              value={topMessagePlatform ? `${topMessagePlatform.platform} (${topMessagePlatform.percent.toFixed(1)}%)` : "No data"}
              hint="Highest legacy message share"
            />
          </div>
        </article>
      </div>

      <article className="panel p-4">
        <SectionHeader title="User Platform Breakdown" subtitle={`Base: ${numberFmt.format(users.length)} users`} />
        <div className="grid gap-3 md:grid-cols-2">
          {userPlatformItems.length === 0 ? (
            <p className="text-sm text-slate-400">No user platform data yet.</p>
          ) : (
            userPlatformItems.map((item) => (
              <ProgressRow key={item.platform} label={item.platform} count={item.count} total={users.length} color={item.color} />
            ))
          )}
        </div>
      </article>
    </section>
  );
}






