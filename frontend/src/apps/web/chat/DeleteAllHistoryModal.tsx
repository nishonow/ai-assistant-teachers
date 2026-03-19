import { Trash2, X } from "lucide-react";

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
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-xl font-bold">{"Удалить всю историю"}</p>
            <p className="mt-1 text-sm text-slate-300">
              {"Все сохранённые диалоги и сообщения из вашего веб-аккаунта будут удалены без возможности восстановления."}
            </p>
          </div>
          <button type="button" className="btn-muted p-2" onClick={onCancel} aria-label={"Закрыть"}>
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-muted" onClick={onCancel} disabled={pending}>
            {"Отмена"}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={pending}>
            <Trash2 size={14} />
            {pending ? "Удаление..." : "Удалить всё"}
          </button>
        </div>
      </div>
    </div>
  );
}
