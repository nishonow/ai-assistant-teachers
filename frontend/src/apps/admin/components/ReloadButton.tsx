import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface ReloadButtonProps {
  loading: boolean;
  onReload: () => Promise<void>;
  idleLabel?: string;
  loadingLabel?: string;
  successLabel?: string;
  className?: string;
}

const SUCCESS_MS = 1700;

export default function ReloadButton({
  loading,
  onReload,
  idleLabel = "Reload",
  loadingLabel = "Reloading...",
  successLabel = "Updated",
  className = "",
}: ReloadButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;
    const timer = window.setTimeout(() => setShowSuccess(false), SUCCESS_MS);
    return () => window.clearTimeout(timer);
  }, [showSuccess]);

  const handleClick = async () => {
    await onReload();
    setShowSuccess(true);
  };

  const label = loading ? loadingLabel : showSuccess ? successLabel : idleLabel;

  return (
    <button className={`reload-btn ${className}`.trim()} type="button" onClick={handleClick} disabled={loading}>
      <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden>
        <RefreshCw size={14} className={`reload-icon ${loading ? "reload-icon-spin" : ""} ${showSuccess ? "reload-icon-hidden" : ""}`} />
        <CheckCircle2 size={14} className={`reload-icon-success ${showSuccess ? "reload-icon-success-show" : ""}`} />
      </span>
      <span>{label}</span>
    </button>
  );
}
