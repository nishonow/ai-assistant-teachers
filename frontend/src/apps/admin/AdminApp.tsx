import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../core/auth";
import { apiRequest, ApiRequestError, type ApiRequestOptions } from "../../core/api";
import ToastNotice from "../../core/components/ToastNotice";
import type {
  DocumentRecord,
  LoadingState,
  MakeAdminPayload,
  NoticeState,
  StatsResponse,
  TabId,
  TabItem,
  UserRecord,
} from "../../core/types";
import ConfirmLogoutModal from "./components/ConfirmLogoutModal";
import DocumentsTab from "./components/DocumentsTab";
import MakeAdminModal from "./components/MakeAdminModal";
import OverviewTab from "./components/OverviewTab";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import UploadTab from "./components/UploadTab";
import UsersTab from "./components/UsersTab";

const TABS: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "documents", label: "Documents" },
  { id: "upload", label: "Upload Document" },
];

const TAB_PATHS: Record<TabId, string> = {
  overview: "/admin/overview",
  users: "/admin/users",
  documents: "/admin/documents",
  upload: "/admin/upload",
};

const INITIAL_LOADING: LoadingState = {
  stats: false,
  users: false,
  documents: false,
  upload: false,
};

function getTabFromPath(pathname: string): TabId {
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/documents")) return "documents";
  if (pathname.startsWith("/admin/upload")) return "upload";
  return "overview";
}

export default function AdminApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout: clearSession } = useAuth();

  const token = session?.token || "";
  const username = session?.user.username || "admin";

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const [loading, setLoading] = useState<LoadingState>(INITIAL_LOADING);
  const [actionLoading, setActionLoading] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [makeAdminUser, setMakeAdminUser] = useState<UserRecord | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const activeTab = useMemo(() => getTabFromPath(location.pathname), [location.pathname]);

  const showNotice = useCallback((type: NoticeState["type"], message: string) => setNotice({ type, message }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const logout = useCallback(() => {
    clearSession();
    setStats(null);
    setUsers([]);
    setDocuments([]);
    setSidebarOpen(false);
    setLogoutConfirmOpen(false);
    navigate("/", { replace: true });
  }, [clearSession, navigate]);

  const authorizedRequest = useCallback(
    async <T,>(args: ApiRequestOptions): Promise<T> => {
      if (!token) {
        throw new Error("Missing auth token.");
      }

      try {
        return await apiRequest<T>({ ...args, token });
      } catch (error) {
        if (error instanceof ApiRequestError && error.unauthorized) {
          logout();
          showNotice("error", "Session expired. Please login again.");
        }
        throw error;
      }
    },
    [logout, showNotice, token]
  );

  const loadStats = useCallback(async () => {
    setLoading((prev) => ({ ...prev, stats: true }));
    try {
      setStats(await authorizedRequest<StatsResponse>({ path: "/api/v1/admin/stats" }));
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to load stats.");
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  }, [authorizedRequest, showNotice]);

  const loadUsers = useCallback(async () => {
    setLoading((prev) => ({ ...prev, users: true }));
    try {
      const data = await authorizedRequest<UserRecord[]>({ path: "/api/v1/admin/users" });
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to load users.");
    } finally {
      setLoading((prev) => ({ ...prev, users: false }));
    }
  }, [authorizedRequest, showNotice]);

  const loadDocuments = useCallback(async () => {
    setLoading((prev) => ({ ...prev, documents: true }));
    try {
      const data = await authorizedRequest<DocumentRecord[]>({ path: "/api/v1/documents/" });
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to load documents.");
    } finally {
      setLoading((prev) => ({ ...prev, documents: false }));
    }
  }, [authorizedRequest, showNotice]);

  const refreshOverview = useCallback(async () => {
    await Promise.all([loadStats(), loadUsers(), loadDocuments()]);
  }, [loadStats, loadUsers, loadDocuments]);

  useEffect(() => {
    if (!token) return;
    void loadStats();
    void loadUsers();
    void loadDocuments();
  }, [token, loadStats, loadUsers, loadDocuments]);

  const handleToggleBlock = async (user: UserRecord): Promise<void> => {
    const key = `block-${user.id}`;
    setActionLoading(key);

    try {
      await authorizedRequest({
        path: user.is_blocked ? "/api/v1/admin/users/unblock" : "/api/v1/admin/users/block",
        method: "POST",
        body: {
          platform_user_id: user.platform_user_id,
          platform: user.platform,
        },
      });
      showNotice("success", `${user.name || "User"} updated.`);
      await loadUsers();
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setActionLoading("");
    }
  };

  const handleMakeAdmin = async ({ login, password }: MakeAdminPayload): Promise<void> => {
    if (!makeAdminUser) return;

    const key = `admin-${makeAdminUser.id}`;
    setActionLoading(key);

    try {
      if (makeAdminUser.platform !== "web" && (!login?.trim() || !password?.trim())) {
        showNotice("error", "Login and password are required.");
        return;
      }

      await authorizedRequest({
        path: `/api/v1/admin/users/${makeAdminUser.id}/make-admin`,
        method: "POST",
        body: makeAdminUser.platform === "web" ? {} : { login, password },
      });
      showNotice("success", `${makeAdminUser.name || "User"} is now admin.`);
      setMakeAdminUser(null);
      await loadUsers();
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to grant admin.");
    } finally {
      setActionLoading("");
    }
  };

  const requestMakeAdmin = useCallback(
    async (user: UserRecord) => {
      if (user.platform !== "web") {
        setMakeAdminUser(user);
        return;
      }

      const key = `admin-${user.id}`;
      setActionLoading(key);

      try {
        await authorizedRequest({
          path: `/api/v1/admin/users/${user.id}/make-admin`,
          method: "POST",
          body: {},
        });
        showNotice("success", `${user.name || "User"} is now admin.`);
        await loadUsers();
      } catch (error) {
        showNotice("error", error instanceof Error ? error.message : "Failed to grant admin.");
      } finally {
        setActionLoading("");
      }
    },
    [authorizedRequest, loadUsers, showNotice]
  );

  const matchesCurrentAdmin = useCallback(
    (value: string | null | undefined): boolean => {
      if (!value) return false;
      return value.trim().toLowerCase() === username.trim().toLowerCase();
    },
    [username]
  );

  const isCurrentAdminUser = useCallback(
    (user: UserRecord): boolean =>
      matchesCurrentAdmin(user.login) ||
      matchesCurrentAdmin(user.platform_user_id) ||
      matchesCurrentAdmin(user.username) ||
      matchesCurrentAdmin(user.name),
    [matchesCurrentAdmin]
  );

  const handleRevokeAdmin = async (user: UserRecord): Promise<void> => {
    if (isCurrentAdminUser(user)) {
      showNotice("error", "You cannot revoke your own admin access.");
      return;
    }

    const key = `admin-${user.id}`;
    setActionLoading(key);

    try {
      await authorizedRequest({
        path: `/api/v1/admin/users/${user.id}/remove-admin`,
        method: "POST",
      });
      showNotice("success", `${user.name || "User"} is no longer admin.`);
      await loadUsers();
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Failed to revoke admin.");
    } finally {
      setActionLoading("");
    }
  };

  const handleUploadDocument = async (file: File, uploadedBy: string): Promise<void> => {
    setLoading((prev) => ({ ...prev, upload: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      await authorizedRequest({
        path: `/api/v1/documents/upload?uploaded_by=${encodeURIComponent(uploadedBy)}`,
        method: "POST",
        body: formData,
        isForm: true,
      });

      showNotice("success", `${file.name} uploaded successfully.`);
      navigate("/admin/documents");
      await loadDocuments();
      await loadStats();
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
  };

  const watchReindexCompletion = useCallback(
    async (documentId: number, fileName: string): Promise<void> => {
      const pollIntervalMs = 2500;
      const maxAttempts = 48;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        try {
          const data = await authorizedRequest<{ status?: string }>({
            path: `/api/v1/documents/${documentId}`,
          });
          const status = data.status?.toLowerCase();

          if (status === "indexed") {
            showNotice("success", `${fileName} indexed successfully.`);
            await loadDocuments();
            await loadStats();
            return;
          }

          if (status === "failed") {
            showNotice("error", `${fileName} indexing failed.`);
            await loadDocuments();
            return;
          }
        } catch {
          // Ignore transient polling errors and continue until timeout.
        }
      }

      showNotice("error", `${fileName} indexing is taking longer than expected.`);
      await loadDocuments();
    },
    [authorizedRequest, loadDocuments, loadStats, showNotice]
  );

  const handleReindexDocument = async (doc: DocumentRecord): Promise<void> => {
    const key = `reindex-${doc.id}`;
    setActionLoading(key);

    try {
      await authorizedRequest({ path: `/api/v1/documents/${doc.id}/reindex`, method: "POST" });
      showNotice("success", `${doc.file_name} indexing started.`);
      await loadDocuments();
      void watchReindexCompletion(doc.id, doc.file_name);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Reindex failed.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteDocument = async (doc: DocumentRecord): Promise<void> => {
    const key = `delete-${doc.id}`;
    setActionLoading(key);

    try {
      await authorizedRequest({ path: `/api/v1/documents/${doc.id}`, method: "DELETE" });
      showNotice("success", `${doc.file_name} deleted.`);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDownloadDocument = async (doc: DocumentRecord): Promise<void> => {
    const key = `download-${doc.id}`;
    setActionLoading(key);

    try {
      const blob = await authorizedRequest<Blob>({
        path: `/api/v1/documents/${doc.id}/file`,
        responseType: "blob",
      });

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = doc.file_name || `document-${doc.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      showNotice("error", error instanceof Error ? error.message : "Download failed.");
    } finally {
      setActionLoading("");
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar
        items={TABS}
        activeTab={activeTab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(tab) => {
          navigate(TAB_PATHS[tab]);
          setSidebarOpen(false);
        }}
      />

      <main className="flex min-h-screen flex-col gap-3 p-4 md:ml-72 md:gap-4 md:p-6">
        <Topbar username={username} onOpenMenu={() => setSidebarOpen(true)} onRequestLogout={() => setLogoutConfirmOpen(true)} />
        <ToastNotice notice={notice} />

        <section className="panel p-4 md:p-5">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route
              path="overview"
              element={
                <OverviewTab
                  stats={stats}
                  users={users}
                  documents={documents}
                  loading={loading.stats || loading.users || loading.documents}
                  onRefresh={refreshOverview}
                />
              }
            />
            <Route
              path="users"
              element={
                <UsersTab
                  users={users}
                  loading={loading.users}
                  actionLoading={actionLoading}
                  onRefresh={loadUsers}
                  onToggleBlock={handleToggleBlock}
                  onMakeAdmin={requestMakeAdmin}
                  onRevokeAdmin={handleRevokeAdmin}
                  isCurrentAdminUser={isCurrentAdminUser}
                />
              }
            />
            <Route
              path="documents"
              element={
                <DocumentsTab
                  documents={documents}
                  loading={loading.documents}
                  actionLoading={actionLoading}
                  onRefresh={loadDocuments}
                  onDownload={handleDownloadDocument}
                  onReindex={handleReindexDocument}
                  onDelete={handleDeleteDocument}
                />
              }
            />
            <Route path="upload" element={<UploadTab loading={loading.upload} onUpload={handleUploadDocument} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </section>
      </main>

      <MakeAdminModal
        user={makeAdminUser}
        loading={makeAdminUser ? actionLoading === `admin-${makeAdminUser.id}` : false}
        onClose={() => setMakeAdminUser(null)}
        onSubmit={handleMakeAdmin}
      />

      <ConfirmLogoutModal open={logoutConfirmOpen} onCancel={() => setLogoutConfirmOpen(false)} onConfirm={logout} />
    </div>
  );
}




