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
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-600/50 pt-3">
      <p className="text-xs text-slate-400">
        Page {page} of {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button className="btn-muted" type="button" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
          Prev
        </button>
        <button className="btn-muted" type="button" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
          Next
        </button>
      </div>
    </div>
  );
}
