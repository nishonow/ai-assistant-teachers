import { Trash2, X } from "lucide-react";

import useDismissibleLayer from "./useDismissibleLayer";

interface DeleteAllHistoryModalProps {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteAllHistoryModal({
  open,
  pending,
  onCancel,
  onConfirm,
}: DeleteAllHistoryModalProps) {
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open,
    onDismiss: onCancel,
    disabled: pending,
  });

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} className="modal-card max-w-md p-5" role="dialog" aria-modal="true">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) return;
            onConfirm();
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-xl font-bold">Удалить всю историю</p>
              <p className="mt-1 text-sm text-slate-300">
                Все сохранённые диалоги и сообщения из вашего веб-аккаунта будут удалены без возможности восстановления.
              </p>
            </div>
            <button type="button" className="btn-muted p-2" onClick={onCancel} aria-label="Закрыть" disabled={pending}>
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-muted" onClick={onCancel} disabled={pending}>
              Отмена
            </button>
            <button type="submit" className="btn-danger" disabled={pending}>
              <Trash2 size={14} />
              {pending ? "Удаление..." : "Удалить всё"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
