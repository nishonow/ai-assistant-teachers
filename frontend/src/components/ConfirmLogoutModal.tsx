import { LogOut, X } from "lucide-react";

interface ConfirmLogoutModalProps {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmLogoutModal({ open, loading = false, onCancel, onConfirm }: ConfirmLogoutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-brand-400/30 bg-ink-700/95 p-5 shadow-panel ring-1 ring-ink-950/50">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-xl font-bold">Confirm Logout</p>
            <p className="mt-1 text-sm text-slate-300">Are you sure you want to end this admin session?</p>
          </div>
          <button type="button" className="btn-muted p-2" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-muted" onClick={onCancel} disabled={loading}>
            Stay
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
