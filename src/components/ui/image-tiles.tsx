

interface ImageRevealProps {
  images: string[];
  handle?: string;
}

// Inline Instagram SVG — avoids lucide-react version mismatch
const InstagramSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function ImageReveal({ images, handle }: ImageRevealProps) {
  if (!images || images.length === 0) return null;

  const displayImages = images.slice(0, 5);

  return (
    <div className="w-full max-w-5xl mx-auto py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {displayImages.map((url, idx) => (
          <div
            key={idx}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-[#D8E2DC]/80 bg-white shadow-xs cursor-pointer"
          >
            <img
              src={url}
              alt={`Instagram post ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />

            {/* Sleek Instagram Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-1">
              <InstagramSVG />
              {handle && (
                <span className="text-[10px] font-bold tracking-wider text-white/90 font-sans">
                  @{handle}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
