interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center gap-2">
      <button className="btn-muted px-2" type="button" onClick={() => onPageChange(page - 1)} disabled={!canPrev} aria-label="Previous page">
        ←
      </button>
      <p className="text-xs text-slate-400 tabular-nums">
        {page} / {totalPages}
      </p>
      <button className="btn-muted px-2" type="button" onClick={() => onPageChange(page + 1)} disabled={!canNext} aria-label="Next page">
        →
      </button>
    </div>
  );
}

