import { Ban, Check, ChevronDown, Search, ShieldCheck, ShieldOff, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "./PageHeader";
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
        <span className="truncate font-medium text-slate-200">{selected?.label || "-"}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
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
    <span className="admin-pill bg-rose-500/10 text-rose-300">Blocked</span>
  ) : (
    <span className="admin-pill bg-emerald-500/10 text-emerald-300">Active</span>
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

  const renderActions = (user: UserRecord, isSelf: boolean) => {
    const blockKey = `block-${user.id}`;
    const adminKey = `admin-${user.id}`;
    return (
      <div className="flex justify-end gap-1.5">
        <button
          className={`${user.is_blocked ? "btn-good" : "btn-warn"} btn-sm w-[5.75rem]`}
          type="button"
          onClick={() => onToggleBlock(user)}
          disabled={actionLoading === blockKey}
        >
          <Ban size={13} />
          {actionLoading === blockKey ? "…" : user.is_blocked ? "Unblock" : "Block"}
        </button>

        {user.is_admin ? (
          <button
            className="btn-danger btn-sm w-[7.25rem]"
            type="button"
            onClick={() => onRevokeAdmin(user)}
            disabled={actionLoading === adminKey || isSelf}
            title={isSelf ? "You cannot revoke your own admin role" : "Revoke admin"}
          >
            <ShieldOff size={13} />
            {isSelf ? "You" : actionLoading === adminKey ? "…" : "Revoke"}
          </button>
        ) : (
          <button
            className="btn-muted btn-sm w-[7.25rem]"
            type="button"
            onClick={() => onMakeAdmin(user)}
            disabled={actionLoading === adminKey}
          >
            <ShieldCheck size={13} />
            {actionLoading === adminKey ? "…" : "Make admin"}
          </button>
        )}
      </div>
    );
  };

  return (
    <section>
      <PageHeader
        title="Users"
        description={
          filteredUsers.length === users.length
            ? `${users.length} users across web and Telegram`
            : `${filteredUsers.length} of ${users.length} users match the filters`
        }
        actions={<ReloadButton className="btn-sm" loading={loading} onReload={onRefresh} />}
      />

      {/* Toolbar */}
      <div className="mb-2.5 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="input mt-0 h-9 rounded-xl py-0 pl-8 text-[13px]"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or username"
              aria-label="Search users"
            />
          </div>
          <button
            className="btn-muted btn-sm h-9 rounded-xl md:hidden"
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} grid-cols-[1fr_1fr_auto] gap-2 md:flex md:items-center`}>
          <div className="md:w-40">
            <FilterDropdown label="Platform" value={platform} options={platformOptions} onChange={setPlatform} />
          </div>
          <div className="md:w-36">
            <FilterDropdown label="Joined" value={joinSort} options={joinedOptions} onChange={(next) => setJoinSort(next as JoinSort)} />
          </div>
          <button className="h-9 rounded-xl px-3 text-[13px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white" type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card overflow-hidden">
        {/* Phones: one card per user, actions always visible */}
        <ul className="divide-y divide-white/[0.06] md:hidden">
          {pageUsers.length === 0 ? <li className="py-10 text-center text-[13px] text-slate-400">No users found.</li> : null}
          {pageUsers.map((user) => {
            const isSelf = user.is_admin && isCurrentAdminUser(user);
            const displayName = user.name || user.username || "—";
            const handle = user.platform === "telegram" ? `@${user.username || "-"}` : user.username || "-";
            return (
              <li key={user.id} className="p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[13px] font-semibold text-slate-200">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[14px] font-medium text-white">{displayName}</p>
                    <p className="truncate text-[12px] text-slate-500">
                      {handle} · {user.platform === "telegram" ? "Telegram" : user.platform === "web" ? "Web" : user.platform}
                    </p>
                  </div>
                  <StatusTag blocked={user.is_blocked} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  {user.is_admin ? (
                    <span className="admin-pill bg-amber-400/10 text-amber-300">Admin</span>
                  ) : (
                    <span className="admin-pill bg-white/[0.06] text-slate-400">User</span>
                  )}
                  {renderActions(user, isSelf)}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="admin-table min-w-[860px]">
            <thead>
              <tr>
                <th className="w-12">ID</th>
                <th>User</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-slate-400" colSpan={7}>
                    No users found.
                  </td>
                </tr>
              ) : (
                pageUsers.map((user) => {
                  const isSelf = user.is_admin && isCurrentAdminUser(user);
                  const displayName = user.name || user.username || "—";
                  const handle = user.platform === "telegram" ? `@${user.username || "-"}` : user.username || "-";

                  return (
                    <tr key={user.id}>
                      <td className="tabular-nums text-slate-500">{user.id}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-semibold text-slate-200">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate font-medium text-white">{displayName}</p>
                            <p className="truncate text-[12px] text-slate-500">{handle}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-slate-300">{user.platform === "telegram" ? "Telegram" : user.platform === "web" ? "Web" : user.platform}</span>
                        <span className="block text-[11.5px] tabular-nums text-slate-500">{user.platform_user_id}</span>
                      </td>
                      <td>
                        <StatusTag blocked={user.is_blocked} />
                      </td>
                      <td>
                        {user.is_admin ? (
                          <span className="admin-pill bg-amber-400/10 text-amber-300">Admin</span>
                        ) : (
                          <span className="admin-pill bg-white/[0.06] text-slate-400">User</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap tabular-nums text-slate-400">{formatDate(user.created_at)}</td>
                      <td>
                        {renderActions(user, isSelf)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
            <p className="text-[12px] text-slate-500">
              Showing {pageUsers.length} of {filteredUsers.length}
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
