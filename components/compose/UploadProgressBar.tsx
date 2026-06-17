/** Thin upload progress bar shown while media uploads to R2. */
export function UploadProgressBar({ value, label = "Uploading" }: { value: number; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-scrolls-blue transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-right text-xs text-white/50">
        {pct >= 100 ? "Finishing…" : `${label}… ${pct}%`}
      </p>
    </div>
  );
}
