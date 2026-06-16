export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-8 w-14">
        <div className="absolute left-0 top-0 h-8 w-8 rounded-full border-4 border-white/90" />
        <div className="absolute left-5 top-0 h-8 w-8 rounded-full border-4 border-scrolls-gold/80" />
      </div>
      {!compact && <span className="text-2xl font-semibold tracking-normal">Scrolls</span>}
    </div>
  );
}
