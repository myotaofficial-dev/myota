"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const SQRT_5000 = Math.sqrt(5000);

const AVATAR_URLS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
];

const defaultTestimonials = [
  {
    tempId: 0,
    testimonial: "My favorite solution in the market. We work 5x faster with COMPANY.",
    by: "Alex, CEO at TechCorp",
    rating: 5,
    imgSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 1,
    testimonial: "I'm confident my data is safe with COMPANY. I can't say that about other providers.",
    by: "Dan, CTO at SecureNet",
    rating: 5,
    imgSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 2,
    testimonial: "I know it's cliche, but we were lost before we found COMPANY. Can't thank you guys enough!",
    by: "Stephanie, COO at InnovateCo",
    rating: 5,
    imgSrc: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 3,
    testimonial: "COMPANY's products make planning for the future seamless. Can't recommend them enough!",
    by: "Marie, CFO at FuturePlanning",
    rating: 5,
    imgSrc: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  {
    tempId: 4,
    testimonial: "If I could give 11 stars, I'd give 12.",
    by: "Andre, Head of Design at CreativeSolutions",
    rating: 5,
    imgSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  }
];

interface TestimonialCardProps {
  position: number;
  testimonial: {
    tempId: string | number;
    testimonial: string;
    by: string;
    rating?: number;
    imgSrc: string;
  };
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  position, 
  testimonial, 
  handleMove, 
  cardSize 
}) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border p-6 sm:p-8 transition-all duration-500 ease-in-out select-none",
        isCenter 
          ? "z-10 bg-zinc-900 text-white border-zinc-700 shadow-xl" 
          : "z-0 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 opacity-60 scale-90 hover:opacity-90"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.45) * position}px)
          translateY(${isCenter ? -35 : position % 2 ? 10 : -10}px)
          rotate(${isCenter ? 0 : position % 2 ? 2 : -2}deg)
        `,
        boxShadow: isCenter ? "0px 8px 16px rgba(0,0,0,0.15)" : "none"
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-zinc-400 dark:bg-zinc-700"
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 1
        }}
      />
      <div className="flex justify-between items-start mb-3">
        <img
          src={testimonial.imgSrc}
          alt={`${testimonial.by.split(',')[0]}`}
          className="h-12 w-12 rounded-lg bg-zinc-100 object-cover object-top border border-zinc-200 dark:border-zinc-800"
        />
        <div className="flex text-amber-500 gap-0.5">
          {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-current" />
          ))}
        </div>
      </div>
      <h3 className={cn(
        "text-xs sm:text-sm font-medium leading-relaxed font-sans line-clamp-5 text-left",
        isCenter ? "text-white" : "text-zinc-700 dark:text-zinc-300"
      )}>
        "{testimonial.testimonial}"
      </h3>
      <p className={cn(
        "absolute bottom-6 left-6 right-6 text-[10px] font-sans font-medium tracking-wider uppercase text-left truncate border-t pt-3",
        isCenter 
          ? "text-zinc-400 border-zinc-700" 
          : "text-zinc-500 border-zinc-150 dark:border-zinc-800"
      )}>
        — {testimonial.by}
      </p>
    </div>
  );
};

interface StaggerTestimonialsProps {
  customTestimonials?: Array<{
    id?: string | number;
    author?: string;
    content?: string;
    testimonial?: string;
    by?: string;
    rating?: number;
    stayDate?: string;
    imgSrc?: string;
  }>;
  companyName?: string;
}

export const StaggerTestimonials: React.FC<StaggerTestimonialsProps> = ({ 
  customTestimonials,
  companyName = "Hotel Stay"
}) => {
  const [cardSize, setCardSize] = useState(365);
  
  const initialTestimonials = React.useMemo(() => {
    if (customTestimonials && customTestimonials.length > 0) {
      return customTestimonials.map((t, idx) => ({
        tempId: t.id !== undefined ? t.id : idx,
        testimonial: t.testimonial || t.content || "An absolute pleasure staying here.",
        by: t.by || (t.author ? `${t.author}${t.stayDate ? `, Stayed ${t.stayDate}` : ''}` : "Verified Guest"),
        rating: t.rating || 5,
        imgSrc: t.imgSrc || AVATAR_URLS[idx % AVATAR_URLS.length]
      }));
    }
    return defaultTestimonials.map(t => ({
      ...t,
      testimonial: t.testimonial.replace(/COMPANY/g, companyName)
    }));
  }, [customTestimonials, companyName]);

  const [testimonialsList, setTestimonialsList] = useState(initialTestimonials);

  useEffect(() => {
    setTestimonialsList(initialTestimonials);
  }, [initialTestimonials]);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        if (containerWidth < 450) {
          setCardSize(Math.max(260, containerWidth - 40));
        } else {
          setCardSize(365);
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  if (testimonialsList.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-transparent"
      style={{ height: 480 }}
    >
      {testimonialsList.map((testimonial, index) => {
        const position = index - Math.floor(testimonialsList.length / 2);
        
        // Render up to 2 items left/right of center to avoid excessive offscreen elements
        if (Math.abs(position) > 2) return null;

        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      
      {/* Navigation buttons */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 z-20">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-11 w-11 items-center justify-center text-lg transition-all rounded-full shadow-sm cursor-pointer",
            "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95",
            "focus-visible:outline-none"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-11 w-11 items-center justify-center text-lg transition-all rounded-full shadow-sm cursor-pointer",
            "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95",
            "focus-visible:outline-none"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
