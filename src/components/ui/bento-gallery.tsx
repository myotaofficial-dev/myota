import React, { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

const defaultImages = [
  "https://assets.codepen.io/16327/portrait-pattern-1.jpg",
  "https://assets.codepen.io/16327/portrait-image-12.jpg",
  "https://assets.codepen.io/16327/portrait-image-8.jpg",
  "https://assets.codepen.io/16327/portrait-pattern-2.jpg",
  "https://assets.codepen.io/16327/portrait-image-4.jpg",
  "https://assets.codepen.io/16327/portrait-image-3.jpg",
  "https://assets.codepen.io/16327/portrait-pattern-3.jpg",
  "https://assets.codepen.io/16327/portrait-image-6.jpg",
];

interface BentoGalleryProps {
  images?: string[];
  fullscreen?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onImageClick?: (index: number, images: string[]) => void;
}

export const BentoGallery: React.FC<BentoGalleryProps> = ({ images, scrollContainerRef, onImageClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  // Combine custom images with default ones if there are fewer than 8
  const displayImages = React.useMemo(() => {
    const list = [...(images || [])].filter(url => !!url);
    if (list.length >= 8) return list.slice(0, 8);
    
    const padded = [...list];
    for (let i = padded.length; i < 8; i++) {
      padded.push(defaultImages[i % defaultImages.length]);
    }
    return padded;
  }, [images]);

  // Find scrollable parent container dynamically on mount if not provided as prop
  useEffect(() => {
    if (scrollContainerRef?.current) {
      scrollerRef.current = scrollContainerRef.current;
      setScroller(scrollContainerRef.current);
    } else if (containerRef.current) {
      const el = containerRef.current.closest('.overflow-y-auto') as HTMLDivElement;
      if (el) {
        scrollerRef.current = el;
        setScroller(el);
      }
    }
  }, [scrollContainerRef]);

  // Track scroll progress of the container relative to the resolved scroll container
  const { scrollYProgress } = useScroll({
    container: scroller ? scrollerRef : undefined,
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Scale transformations matching Olivier Larose's Zoom Parallax logic
  // Center item (3rd item) scales the least, outer items scale more to fly out
  const scale4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const scale5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const scale6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const scale8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const scale9 = useTransform(scrollYProgress, [0, 1], [1, 9]);

  // Bento positions matching index.css grid areas exactly
  const bentoItems = [
    { src: displayImages[0], scale: scale5, gridArea: "col-start-1 col-end-2 row-start-1 row-end-3" }, // 1 / 1 / 3 / 2
    { src: displayImages[1], scale: scale6, gridArea: "col-start-2 col-end-3 row-start-1 row-end-2" }, // 1 / 2 / 2 / 3
    { src: displayImages[2], scale: scale4, gridArea: "col-start-2 col-end-3 row-start-2 row-end-4" }, // 2 / 2 / 4 / 3 (Center)
    { src: displayImages[3], scale: scale5, gridArea: "col-start-3 col-end-4 row-start-1 row-end-3" }, // 1 / 3 / 3 / 4
    { src: displayImages[4], scale: scale6, gridArea: "col-start-1 col-end-2 row-start-3 row-end-4" }, // 3 / 1 / 4 / 2
    { src: displayImages[5], scale: scale8, gridArea: "col-start-3 col-end-4 row-start-3 row-end-5" }, // 3 / 3 / 5 / 4
    { src: displayImages[6], scale: scale9, gridArea: "col-start-1 col-end-2 row-start-4 row-end-5" }, // 4 / 1 / 5 / 2
    { src: displayImages[7], scale: scale8, gridArea: "col-start-2 col-end-3 row-start-4 row-end-5" }, // 4 / 2 / 5 / 3
  ];

  return (
    <div ref={containerRef} className="relative w-full h-[300vh]">
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden bg-transparent">
        {bentoItems.map((item, idx) => (
          <motion.div
            key={idx}
            style={{ scale: item.scale }}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
          >
            <div 
              className="w-full h-full max-w-[98vw] max-h-[92vh] grid gap-[1vh] p-[1vh] justify-center align-center"
              style={{
                gridTemplateColumns: 'repeat(3, 32.5vw)',
                gridTemplateRows: 'repeat(4, 23vh)'
              }}
            >
              <div 
                onClick={() => onImageClick?.(idx, displayImages)}
                className={`${item.gridArea} pointer-events-auto rounded-xl overflow-hidden border border-zinc-200/10 shadow-sm relative w-full h-full cursor-pointer hover:opacity-90 active:scale-99 transition`}
              >
                <img src={item.src} alt={`Resort View ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
