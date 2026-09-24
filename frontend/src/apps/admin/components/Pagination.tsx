import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <button className="btn-icon h-8 w-8" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={15} />
      </button>
      <p className="min-w-[3.5rem] text-center text-xs tabular-nums text-slate-400">
        {page} / {totalPages}
      </p>
      <button className="btn-icon h-8 w-8" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
