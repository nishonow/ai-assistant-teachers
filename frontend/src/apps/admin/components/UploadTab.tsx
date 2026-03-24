import { FileText, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

interface UploadTabProps {
  loading: boolean;
  onUpload: (files: File[], uploadedBy: string) => Promise<void>;
}

const ACCEPTED_TYPES = ".pdf,.txt,.docx";

function formatFileSize(size: number): string {
  if (size <= 0) {
    return "0 KB";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function UploadTab({ loading, onUpload }: UploadTabProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const totalSizeLabel = useMemo(
    () => formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0)),
    [selectedFiles]
  );

  const addFiles = (incoming: FileList | File[]) => {
    const nextFiles = Array.from(incoming).filter((file) => file.size > 0);
    setSelectedFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const merged = [...current];
      nextFiles.forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (!known.has(key)) {
          known.add(key);
          merged.push(file);
        }
      });
      return merged;
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const uploadedBy = `${form.get("uploaded_by") || "web-admin"}`.trim() || "web-admin";

    if (!selectedFiles.length) {
      return;
    }

    await onUpload(selectedFiles, uploadedBy);
    setSelectedFiles([]);
    event.currentTarget.reset();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Upload Documents</h2>
          <p className="text-sm text-slate-400">Drag files in or browse to upload one file or many at once.</p>
        </div>
        <div className="rounded-xl border border-ink-600/70 bg-ink-900/55 px-3 py-2 text-xs text-slate-300">
          Supported: PDF, TXT, DOCX. Max 20MB per file.
        </div>
      </div>

      <article className="panel max-w-3xl p-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-300">
            Uploaded By
            <input className="input" name="uploaded_by" type="text" defaultValue="web-admin" placeholder="admin" />
          </label>

          <div className="space-y-3">
            <button
              className={`w-full rounded-2xl border border-dashed px-5 py-8 text-left transition-colors ${
                dragActive
                  ? "border-brand-400 bg-brand-500/10"
                  : "border-ink-500 bg-ink-900/40 hover:border-ink-400 hover:bg-ink-800/60"
              }`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="rounded-2xl border border-brand-400/30 bg-brand-500/10 p-4 text-brand-300">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-100">Drop files here or click to browse</p>
                  <p className="mt-1 text-sm text-slate-400">You can select multiple documents in one upload.</p>
                </div>
              </div>
            </button>

            <input
              ref={inputRef}
              className="hidden"
              name="files"
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileChange}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected</span>
              <span className="text-slate-600">-</span>
              <span>Total size {totalSizeLabel}</span>
            </div>
          </div>

          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-600/70 bg-ink-900/55 px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl border border-ink-500/70 bg-ink-800/70 p-2 text-slate-300">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>

                  <button
                    className="rounded-lg border border-ink-500 bg-ink-800/70 p-2 text-slate-300 transition-colors hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-200"
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-ink-600/70 bg-ink-900/30 px-4 py-5 text-sm text-slate-400">
              No files selected yet.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" type="submit" disabled={loading || selectedFiles.length === 0}>
              <UploadCloud size={14} />
              {loading ? "Uploading..." : selectedFiles.length > 1 ? `Upload ${selectedFiles.length} Documents` : "Upload Document"}
            </button>

            <button
              className="btn-muted"
              type="button"
              disabled={loading || selectedFiles.length === 0}
              onClick={() => setSelectedFiles([])}
            >
              Clear Selection
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
