export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-label="Scrolls"
      className={`scrolls-wordmark block text-white ${compact ? "text-4xl" : "text-5xl"}`}
    >
      Scrolls
    </span>
  );
}
