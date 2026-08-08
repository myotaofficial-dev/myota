import React from 'react';

const defaultImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200"
];

interface BentoGalleryProps {
  images?: string[];
  fullscreen?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onImageClick?: (index: number, images: string[]) => void;
}

export const BentoGallery: React.FC<BentoGalleryProps> = ({ images, onImageClick }) => {
  // All images
  const allImages = React.useMemo(() => {
    const list = (images || []).filter(url => !!url);
    if (list.length > 0) return list;
    return defaultImages;
  }, [images]);

  // Display top 5 photos in a perfectly balanced 4-column x 2-row Bento grid
  const top5Images = React.useMemo(() => {
    return allImages.slice(0, 5);
  }, [allImages]);

  const remainingCount = allImages.length - 4; // Remaining count after top 4

  // Bento layout mapping: 5 items filling a 4x2 grid with 0 empty gaps
  const getItemClasses = (index: number) => {
    switch (index) {
      case 0:
        return 'col-span-1 sm:col-span-2 row-span-2 h-72 sm:h-[420px] md:h-[450px]';
      case 1:
        return 'col-span-1 row-span-1 h-36 sm:h-[203px] md:h-[217px]';
      case 2:
        return 'col-span-1 row-span-1 h-36 sm:h-[203px] md:h-[217px]';
      case 3:
        return 'col-span-1 row-span-1 h-36 sm:h-[203px] md:h-[217px]';
      case 4:
        return 'col-span-1 row-span-1 h-36 sm:h-[203px] md:h-[217px]';
      default:
        return 'col-span-1 row-span-1 h-36 sm:h-[203px] md:h-[217px]';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {top5Images.map((src, idx) => {
          const is5thItem = idx === 4 && remainingCount > 1;

          return (
            <div
              key={idx}
              onClick={() => onImageClick?.(idx, allImages)}
              className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D8E2DC]/60 shadow-xs cursor-pointer ${getItemClasses(idx)}`}
            >
              {/* Image with subtle hover zoom effect */}
              <img
                src={src}
                alt={`Resort View ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />

              {/* 5th item overlay showing remaining photos count */}
              {is5thItem ? (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-all group-hover:bg-black/70">
                  <span className="text-xl sm:text-2xl font-black tracking-tight font-sans">
                    +{remainingCount}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 mt-0.5 font-sans">
                    More Photos
                  </span>
                </div>
              ) : (
                /* Hover-only overlay for VIEW PHOTO button */
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs font-semibold uppercase tracking-widest bg-black/50 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
                    View Photo
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
