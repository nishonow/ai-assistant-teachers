import useDismissibleLayer from "../hooks/useDismissibleLayer";

interface RenameConversationModalProps {
  open: boolean;
  pending: boolean;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RenameConversationModal({
  open,
  pending,
  value,
  onChange,
  onCancel,
  onConfirm,
}: RenameConversationModalProps) {
  const modalRef = useDismissibleLayer<HTMLDivElement>({
    open,
    onDismiss: onCancel,
    disabled: pending,
  });

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div ref={modalRef} className="modal-card max-w-md p-6" role="dialog" aria-modal="true">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pending || !value.trim()) return;
            onConfirm();
          }}
        >
          <h2 className="font-heading text-xl text-slate-50">Переименовать чат</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Введите новое название для выбранного диалога.</p>

          <div className="mt-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Название</span>
              <input
                className="input"
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Название чата"
                maxLength={120}
                disabled={pending}
                autoFocus
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" className="btn-muted" onClick={onCancel} disabled={pending}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={pending || !value.trim()}>
              {pending ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
