import { Activity, Clock3, FileStack, MessageSquare, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DocumentRecord, StatsResponse, UserRecord } from "../../../core/types";
import ReloadButton from "./ReloadButton";

interface OverviewTabProps {
  stats: StatsResponse | null;
  users: UserRecord[];
  documents: DocumentRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

interface StatItem {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  accent: string;
}

const numberFmt = new Intl.NumberFormat();
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

function useCountUp(target: number, trigger: number, durationMs = 800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    if (safeTarget <= 0 || durationMs <= 0) {
      setValue(Math.max(0, safeTarget));
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(safeTarget * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    setValue(0);
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, trigger, durationMs]);

  return value;
}

function AnimatedNumber({ value, trigger, suffix = "" }: { value: number; trigger: number; suffix?: string }) {
  const animated = useCountUp(value, trigger);
  return <>{numberFmt.format(Math.round(animated))}{suffix}</>;
}

function toPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function isWithinLast7Days(value: string | null | undefined): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= sevenDaysMs;
}

function getPlatformCount(byPlatform: Record<string, number> | undefined, target: string): number {
  if (!byPlatform) return 0;

  return Object.entries(byPlatform).reduce((sum, [platform, count]) => {
    return platform.trim().toLowerCase() === target ? sum + count : sum;
  }, 0);
}

export default function OverviewTab({ stats, users, documents, loading, onRefresh }: OverviewTabProps) {
  const [reloadCycle, setReloadCycle] = useState(0);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      setReloadCycle((prev) => prev + 1);
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  const totalUsers = stats?.total_users ?? users.length;
  const blockedUsers = useMemo(() => users.filter((user) => user.is_blocked).length, [users]);
  const adminUsers = useMemo(() => users.filter((user) => user.is_admin).length, [users]);
  const activeUsers = Math.max(totalUsers - blockedUsers, 0);
  const activeRate = toPercent(activeUsers, totalUsers);

  const totalDocuments = stats?.total_documents ?? documents.length;
  const indexedDocuments = useMemo(
    () => documents.filter((document) => document.status.trim().toLowerCase() === "indexed").length,
    [documents],
  );
  const indexedRate = toPercent(indexedDocuments, totalDocuments);

  const totalChunks = stats?.total_chunks ?? 0;
  const avgChunksPerDocument = totalDocuments > 0 ? Math.round(totalChunks / totalDocuments) : 0;

  const totalMessages = stats?.total_messages ?? 0;
  const webMessages = getPlatformCount(stats?.by_platform, "web");
  const telegramMessages = getPlatformCount(stats?.by_platform, "telegram");
  const webPercent = toPercent(webMessages, totalMessages);
  const telegramPercent = toPercent(telegramMessages, totalMessages);

  const savedWebConversations = stats?.saved_web_conversations ?? 0;
  const savedWebMessages = stats?.saved_web_messages ?? 0;

  const recentUsers = useMemo(() => users.filter((user) => isWithinLast7Days(user.created_at)).length, [users]);
  const recentDocuments = useMemo(() => documents.filter((document) => isWithinLast7Days(document.created_at)), [documents]);
  const recentUploads = recentDocuments.length;

  const topUploader = useMemo(() => {
    const counts = new Map<string, number>();

    for (const document of recentDocuments) {
      const key = (document.uploaded_by || "admin").trim() || "admin";
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "admin";
  }, [recentDocuments]);

  const statItems: StatItem[] = [
    {
      label: "Users",
      value: totalUsers,
      note: `${activeRate}% active`,
      icon: Users,
      accent: "#53f6dc",
    },
    {
      label: "Documents",
      value: totalDocuments,
      note: `${indexedRate}% indexed`,
      icon: FileStack,
      accent: "#60a5fa",
    },
    {
      label: "Messages",
      value: totalMessages,
      note: `${webPercent}% web`,
      icon: MessageSquare,
      accent: "#a78bfa",
    },
    {
      label: "This Week",
      value: recentUsers,
      note: `${numberFmt.format(recentUploads)} uploads`,
      icon: Sparkles,
      accent: "#fb7185",
    },
  ] as const;

  const safeTotal = Math.max(webMessages + telegramMessages, 1);
  const webWidth = Math.round((webMessages / safeTotal) * 100);
  const telegramWidth = Math.round((telegramMessages / safeTotal) * 100);
  const animatedWebWidth = useCountUp(webWidth, reloadCycle, 900);
  const animatedTelegramWidth = useCountUp(telegramWidth, reloadCycle, 900);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-50">Overview</h2>
          <p className="mt-1 text-sm text-slate-400">Simple summary of users, documents, and activity.</p>
        </div>

        <ReloadButton loading={loading} onReload={onRefresh} idleLabel="Reload data" loadingLabel="Reloading" successLabel="Reloaded" />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="rounded-xl border border-ink-600/70 bg-ink-900/45 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink-500/80"
              style={{ animation: "softRise 260ms ease-out both", animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.11em] text-slate-400">{stat.label}</p>
                  <p className="mt-1 font-heading text-3xl font-bold leading-none text-slate-50">
                    <AnimatedNumber value={stat.value} trigger={reloadCycle} />
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{stat.note}</p>
                </div>

                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={{
                    color: stat.accent,
                    borderColor: `${stat.accent}55`,
                    backgroundColor: `${stat.accent}1A`,
                  }}
                  aria-hidden
                >
                  <Icon size={16} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-ink-600/70 bg-ink-900/35 p-4" style={{ animation: "softRise 300ms ease-out both", animationDelay: "120ms" }}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity size={15} className="text-brand-300" />
            Core Health
          </h3>

          <div className="space-y-2 text-sm">
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Active users</span>
              <span className="font-medium text-slate-100">
                <AnimatedNumber value={activeUsers} trigger={reloadCycle} /> / <AnimatedNumber value={totalUsers} trigger={reloadCycle} />
              </span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Indexed documents</span>
              <span className="font-medium text-slate-100">
                <AnimatedNumber value={indexedDocuments} trigger={reloadCycle} /> / <AnimatedNumber value={totalDocuments} trigger={reloadCycle} />
              </span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Average chunks / doc</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={avgChunksPerDocument} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Admin users</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={adminUsers} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Blocked users</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={blockedUsers} trigger={reloadCycle} /></span>
            </p>
          </div>
        </article>

        <article className="rounded-xl border border-ink-600/70 bg-ink-900/35 p-4" style={{ animation: "softRise 300ms ease-out both", animationDelay: "200ms" }}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Clock3 size={15} className="text-amber-300" />
            Activity Snapshot
          </h3>

          <div className="space-y-2 text-sm">
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Web messages</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={webMessages} trigger={reloadCycle} /> (<AnimatedNumber value={webPercent} trigger={reloadCycle} suffix="%" />)</span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Telegram messages</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={telegramMessages} trigger={reloadCycle} /> (<AnimatedNumber value={telegramPercent} trigger={reloadCycle} suffix="%" />)</span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Saved conversations</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={savedWebConversations} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Saved web messages</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={savedWebMessages} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>New users this week</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={recentUsers} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Uploads this week</span>
              <span className="font-medium text-slate-100"><AnimatedNumber value={recentUploads} trigger={reloadCycle} /></span>
            </p>
            <p className="flex items-center justify-between border-b border-ink-700/60 pb-1 text-slate-300">
              <span>Top uploader</span>
              <span className="font-medium text-slate-100">{topUploader}</span>
            </p>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span>Web share</span>
                <span>{numberFmt.format(Math.round(animatedWebWidth))}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-700/80">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(animatedWebWidth, 100))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span>Telegram share</span>
                <span>{numberFmt.format(Math.round(animatedTelegramWidth))}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-700/80">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(animatedTelegramWidth, 100))}%` }}
                />
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
