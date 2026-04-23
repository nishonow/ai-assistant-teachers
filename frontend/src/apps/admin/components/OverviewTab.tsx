import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileStack,
  Globe,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
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

interface StatCard {
  label: string;
  value: number;
  note: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  border: string;
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
      if (progress < 1) rafId = requestAnimationFrame(step);
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

interface HealthRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  iconColor: string;
  badge?: { text: string; color: string };
}

function HealthRow({ icon: Icon, label, value, iconColor, badge }: HealthRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-ink-800/40">
      <div className="flex items-center gap-2.5 text-sm text-slate-300">
        <Icon size={14} className={iconColor} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.color}`}>
            {badge.text}
          </span>
        )}
        <span className="text-sm font-semibold text-slate-100">{value}</span>
      </div>
    </div>
  );
}

export default function OverviewTab({ stats, users, documents, loading, onRefresh }: OverviewTabProps) {
  const [reloadCycle, setReloadCycle] = useState(0);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    if (prevLoadingRef.current && !loading) setReloadCycle((prev) => prev + 1);
    prevLoadingRef.current = loading;
  }, [loading]);

  // Users
  const totalUsers = stats?.total_users ?? users.length;
  const blockedUsers = useMemo(() => users.filter((u) => u.is_blocked).length, [users]);
  const adminUsers = useMemo(() => users.filter((u) => u.is_admin).length, [users]);
  const activeUsers = Math.max(totalUsers - blockedUsers, 0);
  const activeRate = toPercent(activeUsers, totalUsers);

  // Documents
  const totalDocuments = stats?.total_documents ?? documents.length;
  const indexedDocuments = useMemo(
    () => documents.filter((d) => d.status.trim().toLowerCase() === "indexed").length,
    [documents],
  );
  const indexedRate = toPercent(indexedDocuments, totalDocuments);
  const totalChunks = stats?.total_chunks ?? 0;
  const avgChunksPerDocument = totalDocuments > 0 ? Math.round(totalChunks / totalDocuments) : 0;

  // Messages
  const totalMessages = stats?.total_messages ?? 0;
  const webMessages = getPlatformCount(stats?.by_platform, "web");
  const telegramMessages = getPlatformCount(stats?.by_platform, "telegram");
  const webPercent = toPercent(webMessages, totalMessages);
  const telegramPercent = toPercent(telegramMessages, totalMessages);
  const savedWebConversations = stats?.saved_web_conversations ?? 0;
  const savedWebMessages = stats?.saved_web_messages ?? 0;

  // This week
  const recentUsers = useMemo(() => users.filter((u) => isWithinLast7Days(u.created_at)).length, [users]);
  const recentDocuments = useMemo(() => documents.filter((d) => isWithinLast7Days(d.created_at)), [documents]);
  const recentUploads = recentDocuments.length;

  const topUploader = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of recentDocuments) {
      const key = (doc.uploaded_by || "admin").trim() || "admin";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "admin";
  }, [recentDocuments]);

  // Platform bar
  const safeTotal = Math.max(webMessages + telegramMessages, 1);
  const webWidth = Math.round((webMessages / safeTotal) * 100);
  const telegramWidth = Math.round((telegramMessages / safeTotal) * 100);
  const animatedWebWidth = useCountUp(webWidth, reloadCycle, 900);
  const animatedTelegramWidth = useCountUp(telegramWidth, reloadCycle, 900);

  const statCards: StatCard[] = [
    {
      label: "Total Users",
      value: totalUsers,
      note: `${activeRate}% active`,
      icon: Users,
      accent: "#53f6dc",
      bg: "bg-teal-500/10",
      border: "border-teal-500/25",
    },
    {
      label: "Documents",
      value: totalDocuments,
      note: `${indexedRate}% indexed`,
      icon: FileStack,
      accent: "#60a5fa",
      bg: "bg-blue-500/10",
      border: "border-blue-500/25",
    },
    {
      label: "Messages",
      value: totalMessages,
      note: `${webPercent}% web · ${telegramPercent}% tg`,
      icon: MessageSquare,
      accent: "#a78bfa",
      bg: "bg-violet-500/10",
      border: "border-violet-500/25",
    },
    {
      label: "This Week",
      value: recentUsers,
      note: `${numberFmt.format(recentUploads)} new uploads`,
      icon: TrendingUp,
      accent: "#fb7185",
      bg: "bg-rose-500/10",
      border: "border-rose-500/25",
    },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-50">Overview</h2>
          <p className="mt-1 text-sm text-slate-400">Live summary of users, documents, and platform activity.</p>
        </div>
        <ReloadButton loading={loading} onReload={onRefresh} idleLabel="Reload" loadingLabel="Reloading" successLabel="Reloaded" />
      </div>

      {/* Top stat cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className={`rounded-xl border ${card.border} ${card.bg} p-4 transition duration-200 hover:-translate-y-0.5`}
              style={{ animation: "softRise 260ms ease-out both", animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
                  <p className="mt-1.5 font-heading text-3xl font-bold leading-none text-slate-50">
                    <AnimatedNumber value={card.value} trigger={reloadCycle} />
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">{card.note}</p>
                </div>
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{ color: card.accent, borderColor: `${card.accent}40`, backgroundColor: `${card.accent}18` }}
                  aria-hidden
                >
                  <Icon size={18} />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* System Health */}
        <article
          className="rounded-xl border border-ink-600/70 bg-ink-900/35 p-4"
          style={{ animation: "softRise 300ms ease-out both", animationDelay: "120ms" }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity size={15} className="text-teal-400" />
            System Health
          </h3>

          <div className="divide-y divide-ink-700/50">
            <HealthRow
              icon={UserCheck}
              label="Active users"
              value={<><AnimatedNumber value={activeUsers} trigger={reloadCycle} /> / <AnimatedNumber value={totalUsers} trigger={reloadCycle} /></>}
              iconColor="text-emerald-400"
              badge={activeRate >= 80 ? { text: "healthy", color: "bg-emerald-500/15 text-emerald-300" } : { text: "low", color: "bg-amber-500/15 text-amber-300" }}
            />
            <HealthRow
              icon={UserX}
              label="Blocked users"
              value={<AnimatedNumber value={blockedUsers} trigger={reloadCycle} />}
              iconColor="text-rose-400"
              badge={blockedUsers > 0 ? { text: `${blockedUsers}`, color: "bg-rose-500/15 text-rose-300" } : undefined}
            />
            <HealthRow
              icon={UserCog}
              label="Admin users"
              value={<AnimatedNumber value={adminUsers} trigger={reloadCycle} />}
              iconColor="text-amber-400"
            />
            <HealthRow
              icon={CheckCircle2}
              label="Indexed documents"
              value={<><AnimatedNumber value={indexedDocuments} trigger={reloadCycle} /> / <AnimatedNumber value={totalDocuments} trigger={reloadCycle} /></>}
              iconColor="text-blue-400"
              badge={indexedRate >= 90 ? { text: "good", color: "bg-blue-500/15 text-blue-300" } : { text: `${indexedRate}%`, color: "bg-amber-500/15 text-amber-300" }}
            />
            <HealthRow
              icon={BookOpen}
              label="Avg chunks / doc"
              value={<AnimatedNumber value={avgChunksPerDocument} trigger={reloadCycle} />}
              iconColor="text-violet-400"
            />
          </div>
        </article>

        {/* Activity Snapshot */}
        <article
          className="rounded-xl border border-ink-600/70 bg-ink-900/35 p-4"
          style={{ animation: "softRise 300ms ease-out both", animationDelay: "200ms" }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Clock3 size={15} className="text-amber-400" />
            Activity Snapshot
          </h3>

          <div className="divide-y divide-ink-700/50">
            <HealthRow
              icon={Globe}
              label="Web messages"
              value={<><AnimatedNumber value={webMessages} trigger={reloadCycle} /> (<AnimatedNumber value={webPercent} trigger={reloadCycle} suffix="%" />)</>}
              iconColor="text-teal-400"
            />
            <HealthRow
              icon={Send}
              label="Telegram messages"
              value={<><AnimatedNumber value={telegramMessages} trigger={reloadCycle} /> (<AnimatedNumber value={telegramPercent} trigger={reloadCycle} suffix="%" />)</>}
              iconColor="text-blue-400"
            />
            <HealthRow
              icon={MessageSquare}
              label="Saved conversations"
              value={<AnimatedNumber value={savedWebConversations} trigger={reloadCycle} />}
              iconColor="text-violet-400"
            />
            <HealthRow
              icon={BarChart3}
              label="Saved web messages"
              value={<AnimatedNumber value={savedWebMessages} trigger={reloadCycle} />}
              iconColor="text-indigo-400"
            />
            <HealthRow
              icon={Sparkles}
              label="New users this week"
              value={<AnimatedNumber value={recentUsers} trigger={reloadCycle} />}
              iconColor="text-rose-400"
            />
            <HealthRow
              icon={Upload}
              label="Uploads this week"
              value={<AnimatedNumber value={recentUploads} trigger={reloadCycle} />}
              iconColor="text-amber-400"
            />
            <HealthRow
              icon={ShieldCheck}
              label="Top uploader"
              value={topUploader}
              iconColor="text-emerald-400"
            />
          </div>

          {/* Platform split bar */}
          <div className="mt-4 rounded-lg border border-ink-700/50 bg-ink-900/50 p-3">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <BarChart3 size={12} />
              Platform message split
            </p>
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-teal-300"><Globe size={11} />Web</span>
                  <span className="font-semibold text-slate-200">{numberFmt.format(Math.round(animatedWebWidth))}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-700/80">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(animatedWebWidth, 100))}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-blue-300"><Send size={11} />Telegram</span>
                  <span className="font-semibold text-slate-200">{numberFmt.format(Math.round(animatedTelegramWidth))}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-700/80">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(animatedTelegramWidth, 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* Quick insights row */}
      <div className="grid gap-3 sm:grid-cols-3" style={{ animation: "softRise 320ms ease-out both", animationDelay: "280ms" }}>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <UserCheck size={16} />
          </span>
          <div>
            <p className="text-xs text-slate-400">User activation rate</p>
            <p className="font-heading text-xl font-bold text-emerald-300">
              <AnimatedNumber value={activeRate} trigger={reloadCycle} suffix="%" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/15 text-blue-400">
            <CheckCircle2 size={16} />
          </span>
          <div>
            <p className="text-xs text-slate-400">Doc index rate</p>
            <p className="font-heading text-xl font-bold text-blue-300">
              <AnimatedNumber value={indexedRate} trigger={reloadCycle} suffix="%" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/8 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/15 text-violet-400">
            <AlertTriangle size={16} />
          </span>
          <div>
            <p className="text-xs text-slate-400">Block rate</p>
            <p className="font-heading text-xl font-bold text-violet-300">
              <AnimatedNumber value={toPercent(blockedUsers, totalUsers)} trigger={reloadCycle} suffix="%" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
