import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info, X } from "lucide-react";

// Define the props for the TravelCard component
interface TravelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  imageAlt: string;
  logo?: React.ReactNode;
  discountPercent?: number; // Show discount percentage in place of logo
  title: string;
  location: string;
  overview: string;
  longDescription?: string; // Long description details
  price: number;
  originalPrice?: number; // Struck out original price
  pricePeriod: string;
  slotsAvailableText?: string; // e.g. "5 SLOTS LEFT"
  isSoldOut?: boolean;
  onBookNow: (e: React.MouseEvent) => void;
}

const TravelCard = React.forwardRef<HTMLDivElement, TravelCardProps>(
  (
    {
      className,
      imageUrl,
      imageAlt,
      logo,
      discountPercent,
      title,
      location,
      overview,
      longDescription,
      price,
      originalPrice,
      pricePeriod,
      slotsAvailableText,
      isSoldOut = false,
      onBookNow,
      ...props
    },
    ref
  ) => {
    const [showDetailed, setShowDetailed] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "group relative w-full h-[380px] overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-900 shadow-md",
          "transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1.5",
          className
        )}
        {...props}
      >
        {/* Background Image with Zoom Effect on Hover */}
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=600"}
          alt={imageAlt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
        />

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10"></div>

        {/* Content Container */}
        <div className="relative flex h-full flex-col justify-between p-5 text-white">
          {/* Top Section: Discount Badge instead of mountain logo */}
          <div className="flex items-start justify-between">
            {discountPercent && discountPercent > 0 ? (
              <span className="bg-[#E07A5F] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm select-none tracking-wide">
                {discountPercent}% OFF
              </span>
            ) : (
              <div />
            )}

            {slotsAvailableText && (
              <span className={cn(
                "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full select-none backdrop-blur-xs border",
                isSoldOut
                  ? "bg-rose-500/20 text-rose-350 border-rose-500/20"
                  : "bg-black/30 text-white/90 border-white/10"
              )}>
                {slotsAvailableText}
              </span>
            )}
          </div>
          
          {/* Middle Section: Details (slides up on hover) */}
          <div className="space-y-3 transition-transform duration-500 ease-in-out group-hover:-translate-y-16 text-left">
            <div>
              <h3 className="text-xl font-bold leading-tight tracking-wide text-white drop-shadow-xs">{title}</h3>
              <p className="text-[10px] text-zinc-350 mt-1 uppercase font-semibold tracking-wider font-mono">{location}</p>
            </div>
            
            <div className="space-y-1.5">
              <p className="text-[11px] text-zinc-350 leading-relaxed font-sans line-clamp-2">
                {overview}
              </p>
              {longDescription && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailed(true);
                  }}
                  className="text-[10px] font-extrabold text-[#E07A5F] hover:text-[#f28e74] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Know More</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Section: Price and Button (revealed on hover) */}
          <div className="absolute -bottom-20 left-0 w-full p-5 opacity-0 transition-all duration-500 ease-in-out group-hover:bottom-0 group-hover:opacity-100 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="flex items-center justify-between gap-2">
              <div className="text-left leading-tight">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {originalPrice && originalPrice > price && (
                    <span className="text-xs text-zinc-400 line-through font-medium">
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-xl font-black text-[#E07A5F]">
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-400 font-semibold block">{pricePeriod}</span>
              </div>
              <Button
                type="button"
                disabled={isSoldOut}
                onClick={onBookNow}
                className="bg-white text-zinc-900 hover:bg-white/90 active:scale-[0.96] rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1 shadow-md border border-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSoldOut ? 'Sold Out' : 'Book Now'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Modal/Drawer Overlay inside Card */}
        {showDetailed && longDescription && (
          <div className="absolute inset-0 bg-black/95 z-40 p-5 flex flex-col justify-between text-left animate-in fade-in duration-300">
            <div className="space-y-4 overflow-y-auto max-h-[80%] pr-1">
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <h4 className="font-bold text-xs uppercase text-[#E07A5F] tracking-wider">About This Event</h4>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailed(false);
                  }}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-[10.5px] text-zinc-300 leading-relaxed font-sans">
                  {overview}
                </p>
                <div 
                  className="text-[10.5px] text-zinc-400 leading-relaxed font-sans pt-2 border-t border-white/10 space-y-2 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: longDescription }}
                />
              </div>
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailed(false);
              }}
              className="w-full py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-bold transition uppercase tracking-wider cursor-pointer"
            >
              Close Info
            </button>
          </div>
        )}
      </div>
    );
  }
);
TravelCard.displayName = "TravelCard";

export { TravelCard };
