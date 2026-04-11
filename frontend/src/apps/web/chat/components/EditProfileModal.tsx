import useDismissibleLayer from "../hooks/useDismissibleLayer";

interface EditProfileModalProps {
  open: boolean;
  pending: boolean;
  canEdit: boolean;
  name: string;
  email: string;
  password: string;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function EditProfileModal({
  open,
  pending,
  canEdit,
  name,
  email,
  password,
  onChangeName,
  onChangeEmail,
  onChangePassword,
  onCancel,
  onConfirm,
}: EditProfileModalProps) {
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
            if (!canEdit || pending) return;
            onConfirm();
          }}
        >
          <h2 className="font-heading text-xl text-slate-50">Профиль</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Здесь можно изменить имя, email для входа и пароль. Если пароль менять не нужно, оставьте поле пустым.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Имя</span>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(event) => onChangeName(event.target.value)}
                placeholder="Ваше имя"
                disabled={!canEdit || pending}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
              <input
                className="input"
                type="text"
                value={email}
                onChange={(event) => onChangeEmail(event.target.value)}
                placeholder="name@example.com"
                disabled={!canEdit || pending}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Новый пароль</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => onChangePassword(event.target.value)}
                placeholder="Оставьте пустым, если не хотите менять"
                disabled={!canEdit || pending}
              />
            </label>

            {!canEdit ? (
              <p className="rounded-2xl border border-[#284863] bg-[#0d1827] px-4 py-3 text-sm leading-6 text-slate-400">
                Эта учётная запись управляется через системные настройки и не редактируется в веб-приложении.
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" className="btn-muted" onClick={onCancel} disabled={pending}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={!canEdit || pending}>
              {pending ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
