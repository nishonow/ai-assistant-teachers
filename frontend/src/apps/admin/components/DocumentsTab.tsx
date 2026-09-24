import { Download, FileText, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DocumentRecord } from "../../../core/types";
import { formatDate } from "../../../core/utils";
import PageHeader from "./PageHeader";
import Pagination from "./Pagination";
import ReloadButton from "./ReloadButton";

const PAGE_SIZE = 20;

function formatDocumentName(fileName: string): string {
  return fileName.replace(/_/g, " ");
}

function DocumentStatus({ value, processing }: { value: string; processing: boolean }) {
  const normalized = value.trim().toLowerCase();

  if (processing || normalized === "processing") {
    return <span className="admin-pill bg-amber-400/10 text-amber-300">Indexing…</span>;
  }
  if (normalized === "indexed" || normalized === "ready") {
    return <span className="admin-pill bg-emerald-500/10 text-emerald-300">Indexed</span>;
  }
  if (normalized === "failed") {
    return <span className="admin-pill bg-rose-500/10 text-rose-300">Failed</span>;
  }
  return <span className="admin-pill bg-white/[0.06] text-slate-400">Pending</span>;
}

interface DocumentsTabProps {
  documents: DocumentRecord[];
  loading: boolean;
  actionLoading: string;
  reindexingDocumentId: number | null;
  onRefresh: () => Promise<void>;
  onDownload: (doc: DocumentRecord) => Promise<void>;
  onReindex: (doc: DocumentRecord) => Promise<void>;
  onDelete: (doc: DocumentRecord) => Promise<void>;
}

export default function DocumentsTab({
  documents,
  loading,
  actionLoading,
  reindexingDocumentId,
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
    <section>
      <PageHeader
        title="Documents"
        description={`${documents.length} documents in the knowledge base`}
        actions={<ReloadButton className="btn-sm" loading={loading} onReload={onRefresh} />}
      />

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="hidden w-12 lg:table-cell">ID</th>
                <th>File</th>
                <th className="w-28">Status</th>
                <th className="hidden w-20 text-right sm:table-cell">Chunks</th>
                <th className="w-px text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageDocuments.length === 0 ? (
                <tr>
                  <td className="py-10 text-center text-slate-400" colSpan={5}>
                    No documents yet. Upload some on the Upload page.
                  </td>
                </tr>
              ) : (
                pageDocuments.map((doc) => {
                  const downloadKey = `download-${doc.id}`;
                  const reindexKey = `reindex-${doc.id}`;
                  const deleteKey = `delete-${doc.id}`;
                  const displayName = formatDocumentName(doc.file_name);
                  const rowProcessing = reindexingDocumentId === doc.id;
                  const extension = (doc.file_type || doc.file_name.split(".").pop() || "").toUpperCase().slice(0, 4);

                  return (
                    <tr key={doc.id}>
                      <td className="hidden tabular-nums text-slate-500 lg:table-cell">{doc.id}</td>
                      <td className="max-w-0" title={displayName}>
                        <div className="flex items-center gap-2.5">
                          <span className="hidden h-7 w-9 shrink-0 items-center justify-center sm:flex rounded-md bg-white/[0.06] text-[10px] font-semibold text-slate-400">
                            {extension || <FileText size={13} />}
                          </span>
                          <div className="min-w-0 leading-tight">
                            <p className="truncate font-medium text-white">{displayName}</p>
                            <p className="truncate text-[12px] text-slate-500">
                              {doc.uploaded_by || "admin"}
                              {doc.created_at ? ` · ${formatDate(doc.created_at)}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <DocumentStatus value={doc.status} processing={rowProcessing} />
                      </td>
                      <td className="hidden text-right tabular-nums text-slate-300 sm:table-cell">{doc.chunk_count ?? 0}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            className="btn-icon h-8 w-8"
                            type="button"
                            onClick={() => onDownload(doc)}
                            disabled={actionLoading === downloadKey || rowProcessing}
                            aria-label="Download"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            className="btn-icon h-8 w-8"
                            type="button"
                            onClick={() => onReindex(doc)}
                            disabled={actionLoading === reindexKey || rowProcessing}
                            aria-label="Reindex"
                            title="Reindex"
                          >
                            <RotateCw size={14} className={rowProcessing ? "animate-spin" : ""} />
                          </button>
                          <button
                            className="btn-icon h-8 w-8 hover:!border-rose-400/30 hover:!bg-rose-500/15 hover:!text-rose-300"
                            type="button"
                            onClick={() => onDelete(doc)}
                            disabled={actionLoading === deleteKey || rowProcessing}
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 size={14} />
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

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
            <p className="text-[12px] text-slate-500">
              Showing {pageDocuments.length} of {documents.length}
            </p>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
