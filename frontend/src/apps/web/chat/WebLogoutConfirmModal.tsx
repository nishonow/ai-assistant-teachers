import { LogOut, X } from "lucide-react";

import useDismissibleLayer from "./useDismissibleLayer";

interface WebLogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function WebLogoutConfirmModal({ open, onCancel, onConfirm }: WebLogoutConfirmModalProps) {
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open,
    onDismiss: onCancel,
  });

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} className="modal-card max-w-md p-5" role="dialog" aria-modal="true">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-xl font-bold">Подтвердите выход</p>
              <p className="mt-1 text-sm text-slate-300">Вы уверены, что хотите выйти?</p>
            </div>
            <button type="button" className="btn-muted p-2" onClick={onCancel} aria-label="Закрыть">
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-muted" onClick={onCancel}>
              Остаться
            </button>
            <button type="submit" className="btn-danger">
              <LogOut size={14} />
              Выйти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
