import { UploadCloud } from "lucide-react";
import type { FormEvent } from "react";

interface UploadTabProps {
  loading: boolean;
  onUpload: (file: File, uploadedBy: string) => Promise<void>;
}

export default function UploadTab({ loading, onUpload }: UploadTabProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const uploadedBy = `${form.get("uploaded_by") || "web-admin"}`.trim() || "web-admin";

    if (!(file instanceof File) || !file.size) {
      return;
    }

    await onUpload(file, uploadedBy);
    event.currentTarget.reset();
  };

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">Upload Document</h2>

      <article className="panel max-w-2xl p-5">
        <p className="mb-4 text-sm text-slate-400">Supported formats: PDF, TXT, DOCX. Max file size: 20MB.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-300">
            Uploaded By
            <input className="input" name="uploaded_by" type="text" defaultValue="web-admin" placeholder="admin" />
          </label>

          <label className="text-sm text-slate-300">
            Document File
            <input className="input" name="file" type="file" accept=".pdf,.txt,.doc,.docx" required />
          </label>

          <button className="btn-primary" type="submit" disabled={loading}>
            <UploadCloud size={14} />
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </article>
    </section>
  );
}

