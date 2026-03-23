import { BarChart3, FileStack, MessageSquare, RefreshCw, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

import type { DocumentRecord, StatsResponse, UserRecord } from "../../../core/types";

interface OverviewCardStat {
  text: string;
  healthy?: boolean;
}

interface OverviewCardProps {
  icon: LucideIcon;
  accent: string;
  label: string;
  value: string;
  stats: readonly OverviewCardStat[];
}

interface OverviewTabProps {
  stats: StatsResponse | null;
  users: UserRecord[];
  documents: DocumentRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const numberFmt = new Intl.NumberFormat();
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

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

function OverviewCard({ icon: Icon, accent, label, value, stats }: OverviewCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-ink-600/55 bg-ink-900/55 p-5">
      <span className="absolute inset-y-5 left-0 w-[3px] rounded-full" style={{ backgroundColor: accent }} />

      <div className="flex h-full flex-col justify-between gap-5 pl-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-4xl font-bold leading-none text-slate-50 md:text-[2.6rem]">{value}</p>
            <p className="mt-2 text-sm font-medium text-slate-300">{label}</p>
          </div>

          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{
              color: accent,
              borderColor: `${accent}55`,
              backgroundColor: `${accent}16`,
            }}
          >
            <Icon size={17} />
          </span>
        </div>

        <div className="space-y-2.5">
          {stats.map((item) => (
            <p key={item.text} className="flex items-center gap-2 text-xs leading-5 text-slate-400">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.healthy ? "bg-emerald-400" : "bg-slate-600"}`} />
              <span>{item.text}</span>
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function OverviewTab({ stats, users, documents, loading, onRefresh }: OverviewTabProps) {
  const totalUsers = stats?.total_users ?? users.length;
  const blockedUsers = useMemo(() => users.filter((user) => user.is_blocked).length, [users]);
  const adminUsers = useMemo(() => users.filter((user) => user.is_admin).length, [users]);
  const activeUsers = Math.max(totalUsers - blockedUsers, 0);

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

  const cards = [
    {
      icon: Users,
      accent: "#53f6dc",
      label: "Users",
      value: numberFmt.format(totalUsers),
      stats: [
        { text: `${numberFmt.format(activeUsers)} active`, healthy: activeUsers > 0 },
        { text: `${numberFmt.format(adminUsers)} admin` },
        { text: `${numberFmt.format(blockedUsers)} blocked`, healthy: blockedUsers === 0 },
      ],
    },
    {
      icon: FileStack,
      accent: "#60a5fa",
      label: "Documents",
      value: numberFmt.format(totalDocuments),
      stats: [
        { text: `${numberFmt.format(totalDocuments)} uploaded` },
        {
          text: indexedRate === 100 ? `all indexed (${indexedRate}%)` : `${numberFmt.format(indexedDocuments)} indexed (${indexedRate}%)`,
          healthy: indexedRate === 100,
        },
      ],
    },
    {
      icon: BarChart3,
      accent: "#f59e0b",
      label: "Chunks",
      value: numberFmt.format(totalChunks),
      stats: [{ text: `avg ${numberFmt.format(avgChunksPerDocument)} per document` }],
    },
    {
      icon: MessageSquare,
      accent: "#a78bfa",
      label: "Messages",
      value: numberFmt.format(totalMessages),
      stats: [
        { text: `${webPercent}% from web`, healthy: webPercent >= telegramPercent },
        { text: `${telegramPercent}% from Telegram` },
      ],
    },
    {
      icon: MessageSquare,
      accent: "#22c55e",
      label: "Web Chats",
      value: numberFmt.format(savedWebConversations),
      stats: [
        { text: `${numberFmt.format(savedWebConversations)} conversations`, healthy: savedWebConversations > 0 },
        { text: `${numberFmt.format(savedWebMessages)} messages` },
      ],
    },
    {
      icon: Sparkles,
      accent: "#fb7185",
      label: "This Week",
      value: numberFmt.format(recentUsers),
      stats: [
        { text: `${numberFmt.format(recentUsers)} new users`, healthy: recentUsers > 0 },
        { text: `${numberFmt.format(recentUploads)} uploads`, healthy: recentUploads > 0 },
        { text: `top uploader: ${topUploader}` },
      ],
    },
  ] as const;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-50">Overview</h2>
          <p className="mt-1 text-sm text-slate-400">Welcome, admin</p>
        </div>

        <button className="btn-muted" type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid flex-1 auto-rows-fr gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <OverviewCard key={card.label} icon={card.icon} accent={card.accent} label={card.label} value={card.value} stats={card.stats} />
        ))}
      </div>
    </section>
  );
}
