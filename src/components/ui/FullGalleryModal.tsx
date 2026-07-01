import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryPhoto {
  url: string;
  tags: string[];
}

interface FullGalleryModalProps {
  photos: GalleryPhoto[];
  initialCategory?: string;
  onClose: () => void;
}

const MASONRY_COLS = 3;

export const FullGalleryModal: React.FC<FullGalleryModalProps> = ({
  photos,
  initialCategory = 'all',
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // All unique tags across photos
  const allTags = Array.from(new Set(photos.flatMap(p => p.tags))).filter(Boolean);

  const filteredPhotos = activeCategory === 'all'
    ? photos
    : photos.filter(p => p.tags.includes(activeCategory));

  // Distribute into masonry columns
  const columns: GalleryPhoto[][] = Array.from({ length: MASONRY_COLS }, () => []);
  filteredPhotos.forEach((photo, i) => {
    columns[i % MASONRY_COLS].push(photo);
  });

  // Keyboard nav
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIdx === null) {
      if (e.key === 'Escape') onClose();
      return;
    }
    if (e.key === 'Escape') setLightboxIdx(null);
    if (e.key === 'ArrowLeft') setLightboxIdx(prev => prev !== null ? Math.max(0, prev - 1) : null);
    if (e.key === 'ArrowRight') setLightboxIdx(prev => prev !== null ? Math.min(filteredPhotos.length - 1, prev + 1) : null);
  }, [lightboxIdx, filteredPhotos.length, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col font-sans">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-base font-semibold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Property Gallery
          </h2>
          <span className="text-white/40 text-xs">· {filteredPhotos.length} photos</span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto shrink-0 border-b border-white/10">
        {['all', ...allTags].map(tag => (
          <button
            key={tag}
            onClick={() => { setActiveCategory(tag); setLightboxIdx(null); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition capitalize cursor-pointer ${
              activeCategory === tag
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {tag === 'all' ? `All (${photos.length})` : `${tag} (${photos.filter(p => p.tags.includes(tag)).length})`}
          </button>
        ))}
      </div>

      {/* ── Masonry Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
            <span className="text-5xl">🖼️</span>
            <p className="text-sm">No photos in this category yet.</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${MASONRY_COLS}, 1fr)` }}>
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3">
                {col.map((photo, rowIdx) => {
                  const globalIdx = rowIdx * MASONRY_COLS + ci;
                  return (
                    <div
                      key={photo.url + rowIdx}
                      onClick={() => setLightboxIdx(globalIdx)}
                      className="relative overflow-hidden rounded-xl cursor-pointer group"
                      style={{ aspectRatio: (ci === 1 && rowIdx % 2 === 0) ? '3/4' : (ci === 0 ? '4/3' : '1/1') }}
                    >
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
                        <div className="flex flex-wrap gap-1">
                          {photo.tags.map(t => (
                            <span key={t} className="text-[9px] bg-white/20 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full capitalize font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer z-10 transition"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(prev => prev !== null ? Math.max(0, prev - 1) : null); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer z-10 transition disabled:opacity-30"
            disabled={lightboxIdx === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={filteredPhotos[lightboxIdx]?.url}
              alt=""
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
            {/* Tags + counter */}
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs">{lightboxIdx + 1} / {filteredPhotos.length}</span>
              <div className="flex gap-1.5">
                {filteredPhotos[lightboxIdx]?.tags.map(t => (
                  <span key={t} className="text-[10px] bg-white/15 text-white/80 px-2 py-0.5 rounded-full capitalize">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(prev => prev !== null ? Math.min(filteredPhotos.length - 1, prev + 1) : null); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer z-10 transition disabled:opacity-30"
            disabled={lightboxIdx === filteredPhotos.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
