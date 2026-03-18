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
    <div className="modal-backdrop">
      <div className="modal-card max-w-md p-5">
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



