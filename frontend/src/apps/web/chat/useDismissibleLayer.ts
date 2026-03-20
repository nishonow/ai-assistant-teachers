import { useEffect, useRef } from "react";

interface UseDismissibleLayerOptions {
  open: boolean;
  onDismiss: () => void;
  disabled?: boolean;
}

export default function useDismissibleLayer<T extends HTMLElement>({
  open,
  onDismiss,
  disabled = false,
}: UseDismissibleLayerOptions) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open || disabled) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && ref.current && !ref.current.contains(target)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onDismiss, open]);

  return ref;
}
