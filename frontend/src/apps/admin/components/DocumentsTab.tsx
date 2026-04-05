import { Download, RotateCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DocumentRecord } from "../../../core/types";
import Pagination from "./Pagination";
import ReloadButton from "./ReloadButton";

const PAGE_SIZE = 20;

function formatDocumentName(fileName: string): string {
  return fileName.replace(/_/g, " ");
}

function DocumentStatus({ value, processing }: { value: string; processing: boolean }) {
  if (processing) {
    return (
      <span className="tag border-amber-400/40 bg-amber-500/10 text-amber-200">Reindexing...</span>
    );
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "indexed" || normalized === "ready") {
    return <span className="tag border-emerald-400/40 bg-emerald-500/10 text-emerald-200">Indexed</span>;
  }

  if (normalized === "processing") {
    return <span className="tag border-amber-400/40 bg-amber-500/10 text-amber-200">Reindexing</span>;
  }

  if (normalized === "failed") {
    return <span className="tag border-rose-400/40 bg-rose-500/10 text-rose-200">Failed</span>;
  }

  return <span className="tag border-slate-500/40 bg-slate-500/10 text-slate-300">Pending</span>;
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
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-50">Documents</h2>
          <p className="mt-1 text-sm text-slate-400">
            Showing {pageDocuments.length} of {documents.length} documents
          </p>
        </div>

        <ReloadButton className="shrink-0" loading={loading} onReload={onRefresh} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-600/50 bg-ink-900/35">
        <table className="min-w-full table-auto text-left text-sm lg:min-w-[1024px]">
          <thead className="bg-ink-800/65 text-slate-300">
            <tr>
              <th className="hidden w-16 px-4 py-3 lg:table-cell">ID</th>
              <th className="w-[42%] px-4 py-3">File Name</th>
              <th className="w-32 px-4 py-3">Status</th>
              <th className="w-24 px-4 py-3">Chunks</th>
              <th className="w-[12rem] px-4 py-3 sm:w-[15rem] lg:w-[25rem]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageDocuments.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
                  No documents found.
                </td>
              </tr>
            ) : (
              pageDocuments.map((doc) => {
                const downloadKey = `download-${doc.id}`;
                const reindexKey = `reindex-${doc.id}`;
                const deleteKey = `delete-${doc.id}`;
                const displayName = formatDocumentName(doc.file_name);
                const rowProcessing = reindexingDocumentId === doc.id;

                return (
                  <tr key={doc.id} className="border-t border-ink-600/40 align-top transition-colors hover:bg-ink-900/35">
                    <td className="hidden px-4 py-4 text-slate-400 lg:table-cell">{doc.id}</td>
                    <td className="px-4 py-4" title={displayName}>
                      <p className="break-words text-slate-100 sm:truncate">{displayName}</p>
                    </td>
                    <td className="px-4 py-4">
                      <DocumentStatus value={doc.status} processing={rowProcessing} />
                    </td>
                    <td className="px-4 py-4 text-slate-200">{doc.chunk_count ?? 0}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap">
                        <button
                          className="btn-muted w-full justify-start sm:w-auto"
                          type="button"
                          onClick={() => onDownload(doc)}
                          disabled={actionLoading === downloadKey || rowProcessing}
                        >
                          <Download size={13} />
                          {actionLoading === downloadKey ? "Please wait..." : "Download"}
                        </button>

                        <button
                          className="btn-warn w-full justify-start sm:w-auto"
                          type="button"
                          onClick={() => onReindex(doc)}
                          disabled={actionLoading === reindexKey || rowProcessing}
                        >
                          <RotateCw size={13} />
                          Reindex
                        </button>

                        <button
                          className="btn-danger w-full justify-start sm:w-auto"
                          type="button"
                          onClick={() => onDelete(doc)}
                          disabled={actionLoading === deleteKey || rowProcessing}
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

      {totalPages > 1 ? <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} /> : null}
    </section>
  );
}
