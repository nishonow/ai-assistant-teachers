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
      <div className="modal-card max-w-sm p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-semibold">Log out?</p>
            <p className="mt-0.5 text-[13px] text-slate-400">You will need to sign in again to use the admin panel.</p>
          </div>
          <button type="button" className="btn-icon h-8 w-8" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-muted btn-sm" onClick={onCancel} disabled={loading}>
            Stay
          </button>
          <button type="button" className="btn-danger btn-sm" onClick={onConfirm} disabled={loading}>
            <LogOut size={14} />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}



