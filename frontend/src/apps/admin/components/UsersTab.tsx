import { Ban, Check, ChevronDown, Search, ShieldCheck, ShieldOff, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "./Pagination";
import ReloadButton from "./ReloadButton";
import { formatDate } from "../../../core/utils";
import type { UserRecord } from "../../../core/types";

const PAGE_SIZE = 20;

type JoinSort = "newest" | "oldest";

interface DropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (next: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, []);

  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`filter-select ${open ? "filter-select-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-slate-200">{selected?.label || "-"}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="filter-menu" role="listbox" aria-label={label}>
          <p className="filter-menu-heading">{label}</p>
          <div className="filter-menu-separator" />
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`filter-menu-item ${active ? "filter-menu-item-active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {active ? <Check size={14} className="text-brand-300" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StatusTag({ blocked }: { blocked: boolean }) {
  return blocked ? (
    <span className="tag border-rose-400/40 bg-rose-500/10 text-rose-200">Blocked</span>
  ) : (
    <span className="tag border-emerald-400/40 bg-emerald-500/10 text-emerald-200">Active</span>
  );
}

interface UsersTabProps {
  users: UserRecord[];
  loading: boolean;
  actionLoading: string;
  onRefresh: () => Promise<void>;
  onToggleBlock: (user: UserRecord) => Promise<void>;
  onMakeAdmin: (user: UserRecord) => void;
  onRevokeAdmin: (user: UserRecord) => Promise<void>;
  isCurrentAdminUser: (user: UserRecord) => boolean;
}

export default function UsersTab({
  users,
  loading,
  actionLoading,
  onRefresh,
  onToggleBlock,
  onMakeAdmin,
  onRevokeAdmin,
  isCurrentAdminUser,
}: UsersTabProps) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [joinSort, setJoinSort] = useState<JoinSort>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const platforms = useMemo(() => {
    const values = Array.from(new Set(users.map((user) => user.platform).filter(Boolean)));
    return values.sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = users.filter((user) => {
      if (platform !== "all" && user.platform !== platform) {
        return false;
      }

      if (query) {
        const name = (user.name || "").toLowerCase();
        const username = (user.username || "").toLowerCase();
        if (!name.includes(query) && !username.includes(query)) {
          return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      const left = Number.isNaN(aTime) ? 0 : aTime;
      const right = Number.isNaN(bTime) ? 0 : bTime;
      return joinSort === "newest" ? right - left : left - right;
    });

    return result;
  }, [users, search, platform, joinSort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, platform, joinSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const clearFilters = () => {
    setSearch("");
    setPlatform("all");
    setJoinSort("newest");
    setPage(1);
  };

  const platformOptions: DropdownOption[] = [
    { value: "all", label: "All platforms" },
    ...platforms.map((item) => ({ value: item, label: item })),
  ];

  const joinedOptions: DropdownOption[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold">Users</h2>

        <div className="flex items-center gap-2">
          <button className="btn-muted md:hidden" type="button" onClick={() => setShowFilters((prev) => !prev)}>
            <SlidersHorizontal size={14} />
            Filters
          </button>
          <ReloadButton loading={loading} onReload={onRefresh} />
        </div>
      </div>

      <div className="panel p-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input mt-0 pl-9"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or username"
          />
        </div>

        <div className={`${showFilters ? "mt-2 grid" : "hidden"} gap-2 sm:grid-cols-3 md:mt-3 md:grid`}>
          <FilterDropdown label="Platform" value={platform} options={platformOptions} onChange={setPlatform} />

          <FilterDropdown
            label="Joined"
            value={joinSort}
            options={joinedOptions}
            onChange={(next) => setJoinSort(next as JoinSort)}
          />

          <button className="btn-muted" type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Showing {pageUsers.length} of {filteredUsers.length} users
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-600/50">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-ink-800/60 text-slate-300">
            <tr>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Platform</th>
              <th className="px-3 py-3">Platform User ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400" colSpan={8}>
                  No users found.
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => {
                const blockKey = `block-${user.id}`;
                const adminKey = `admin-${user.id}`;
                const isSelf = user.is_admin && isCurrentAdminUser(user);

                return (
                  <tr key={user.id} className="border-t border-ink-600/40 transition-colors hover:bg-ink-900/35">
                    <td className="px-3 py-3">{user.id}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{user.name || "-"}</p>
                      <p className="text-xs text-slate-400">
                        {user.platform === "telegram" ? `@${user.username || "-"}` : (user.username || "-")}
                      </p>
                    </td>
                    <td className="px-3 py-3">{user.platform}</td>
                    <td className="px-3 py-3">{user.platform_user_id}</td>
                    <td className="px-3 py-3">
                      <StatusTag blocked={user.is_blocked} />
                    </td>
                    <td className="px-3 py-3">
                      {user.is_admin ? (
                        <span className="tag border-amber-400/35 bg-amber-500/10 text-amber-200">Admin</span>
                      ) : (
                        <span className="tag border-slate-500/40 bg-slate-500/10 text-slate-300">User</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{formatDate(user.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="action-row">
                        <button
                          className={`${user.is_blocked ? "btn-good" : "btn-warn"} action-btn`}
                          type="button"
                          onClick={() => onToggleBlock(user)}
                          disabled={actionLoading === blockKey}
                        >
                          <Ban size={13} />
                          {actionLoading === blockKey ? "Please wait..." : user.is_blocked ? "Unblock" : "Block"}
                        </button>

                        {user.is_admin ? (
                          <button
                            className="btn-danger action-btn"
                            type="button"
                            onClick={() => onRevokeAdmin(user)}
                            disabled={actionLoading === adminKey || isSelf}
                            title={isSelf ? "You cannot revoke your own admin role" : "Revoke admin"}
                          >
                            <ShieldOff size={13} />
                            {isSelf ? "Current Admin" : actionLoading === adminKey ? "Please wait..." : "Revoke Admin"}
                          </button>
                        ) : (
                          <button
                            className="btn-primary action-btn"
                            type="button"
                            onClick={() => onMakeAdmin(user)}
                            disabled={actionLoading === adminKey}
                          >
                            <ShieldCheck size={13} />
                            {actionLoading === adminKey ? "Please wait..." : "Make Admin"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

