import { Download, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Pagination from "./Pagination";
import { formatDate } from "../lib/utils";
import type { DocumentRecord } from "../lib/types";

const PAGE_SIZE = 8;

function DocumentStatus({ value }: { value: string }) {
  return value === "ready" ? (
    <span className="tag border-emerald-400/40 bg-emerald-500/10 text-emerald-200">ready</span>
  ) : (
    <span className="tag border-amber-400/40 bg-amber-500/10 text-amber-200">{value || "pending"}</span>
  );
}

interface DocumentsTabProps {
  documents: DocumentRecord[];
  loading: boolean;
  actionLoading: string;
  onRefresh: () => Promise<void>;
  onDownload: (doc: DocumentRecord) => Promise<void>;
  onReindex: (doc: DocumentRecord) => Promise<void>;
  onDelete: (doc: DocumentRecord) => Promise<void>;
}

export default function DocumentsTab({
  documents,
  loading,
  actionLoading,
  onRefresh,
  onDownload,
  onReindex,
  onDelete,
}: DocumentsTabProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageDocuments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return documents.slice(start, start + PAGE_SIZE);
  }, [documents, currentPage]);

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-hidden md:h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold">Documents</h2>
        <button className="btn-muted" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      <p className="text-xs text-slate-400">Showing {pageDocuments.length} of {documents.length} documents</p>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-ink-600/50">
        <table className="min-w-[1080px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-ink-800/60 text-slate-300">
            <tr>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">File Name</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Chunks</th>
              <th className="px-3 py-3">Uploaded By</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageDocuments.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-400" colSpan={8}>
                  No documents found.
                </td>
              </tr>
            ) : (
              pageDocuments.map((doc) => {
                const downloadKey = `download-${doc.id}`;
                const reindexKey = `reindex-${doc.id}`;
                const deleteKey = `delete-${doc.id}`;

                return (
                  <tr key={doc.id} className="border-t border-ink-600/40">
                    <td className="px-3 py-3">{doc.id}</td>
                    <td className="max-w-[260px] truncate px-3 py-3" title={doc.file_name}>
                      {doc.file_name}
                    </td>
                    <td className="px-3 py-3">{doc.file_type}</td>
                    <td className="px-3 py-3">
                      <DocumentStatus value={doc.status} />
                    </td>
                    <td className="px-3 py-3">{doc.chunk_count ?? 0}</td>
                    <td className="px-3 py-3">{doc.uploaded_by}</td>
                    <td className="px-3 py-3">{formatDate(doc.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="action-row">
                        <button
                          className="btn-muted action-btn"
                          type="button"
                          onClick={() => onDownload(doc)}
                          disabled={actionLoading === downloadKey}
                        >
                          <Download size={13} />
                          {actionLoading === downloadKey ? "Please wait..." : "Download"}
                        </button>

                        <button
                          className="btn-warn action-btn"
                          type="button"
                          onClick={() => onReindex(doc)}
                          disabled={actionLoading === reindexKey}
                        >
                          <RotateCw size={13} />
                          {actionLoading === reindexKey ? "Please wait..." : "Reindex"}
                        </button>

                        <button
                          className="btn-danger action-btn"
                          type="button"
                          onClick={() => onDelete(doc)}
                          disabled={actionLoading === deleteKey}
                        >
                          <Trash2 size={13} />
                          {actionLoading === deleteKey ? "Please wait..." : "Delete"}
                        </button>
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
