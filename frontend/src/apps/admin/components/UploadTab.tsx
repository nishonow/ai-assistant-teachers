import { FileText, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";

import PageHeader from "./PageHeader";

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
    <section>
      <PageHeader title="Upload" description="Add documents to the knowledge base. PDF, TXT or DOCX, up to 20 MB each." />

      <form className="grid gap-2.5 lg:grid-cols-[1fr_320px]" onSubmit={handleSubmit}>
        {/* Drop zone + selected files */}
        <div className="admin-card p-3">
          <button
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
              dragActive ? "border-brand-400 bg-brand-400/10" : "border-white/15 hover:border-brand-400/40 hover:bg-white/[0.02]"
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15 text-brand-300">
              <UploadCloud size={19} />
            </span>
            <span className="text-[14px] font-medium text-white">Drop files here or click to browse</span>
            <span className="text-[12px] text-slate-400">You can add several files at once</span>
          </button>

          <input ref={inputRef} className="hidden" name="files" type="file" accept={ACCEPTED_TYPES} multiple onChange={handleFileChange} />

          {selectedFiles.length > 0 ? (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText size={15} className="shrink-0 text-slate-400" />
                    <p className="truncate text-[13px] text-white">{file.name}</p>
                    <span className="shrink-0 text-[12px] tabular-nums text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Details + submit */}
        <div className="admin-card flex flex-col gap-3 p-4">
          <label className="block">
            <span className="text-[12px] font-medium text-slate-400">Uploaded by</span>
            <input className="input mt-1 h-9 rounded-xl py-0 text-[13px]" name="uploaded_by" type="text" defaultValue="web-admin" placeholder="admin" />
          </label>

          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[12px]">
            <span className="text-slate-400">Selected</span>
            <span className="tabular-nums text-white">
              {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} · {totalSizeLabel}
            </span>
          </div>

          <div className="mt-auto flex gap-2 pt-1">
            <button className="btn-primary btn-sm h-9 flex-1" type="submit" disabled={loading || selectedFiles.length === 0}>
              <UploadCloud size={14} />
              {loading ? "Uploading…" : selectedFiles.length > 1 ? `Upload ${selectedFiles.length}` : "Upload"}
            </button>
            <button
              className="btn-muted btn-sm h-9"
              type="button"
              disabled={loading || selectedFiles.length === 0}
              onClick={() => setSelectedFiles([])}
            >
              Clear
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
