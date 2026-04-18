export function FeedCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(64,34,20,0.1)]">
      {/* Eyebrow */}
      <div className="h-3 w-1/3 rounded-full bg-[#f2ded0]" />
      {/* Title */}
      <div className="mt-2 h-5 w-2/3 rounded-full bg-[#f2ded0]" />
      {/* Photo */}
      <div className="mt-3 aspect-[4/3] rounded-[1.6rem] bg-[#f2ded0]" />
      {/* Metrics */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-[1.4rem] bg-[#f2ded0]" />
        ))}
      </div>
      {/* Footer */}
      <div className="mt-3 h-10 rounded-[1.5rem] bg-[#f2ded0]" />
    </div>
  );
}
