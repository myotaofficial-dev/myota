import React, { useState, useRef } from 'react';
import { Users, Maximize2, BedDouble, Wifi, Coffee, Wind, ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import { format } from 'date-fns';
import { useHotel } from '../../context/HotelContext';

interface RoomData {
  id: string;
  name: string;
  description: string;
  photos: string[];
  basePrice: number;
  price_tiers?: Record<string, number>;
  bedType: string;
  sizeSqft: number;
  capacityAdults?: number;
  amenities?: string[];
  totalInventory?: number;
  min_occupancy?: number;
  cancellation_policy_overrides?: Record<string, string>;
}

/** Returns the lowest price across all tiers, or basePrice if no tiers exist. */
const getLowestPrice = (room: RoomData): number => {
  const minOcc = room.min_occupancy ?? 1;
  const maxOcc = room.capacityAdults ?? 10;

  if (!room.price_tiers || Object.keys(room.price_tiers).length === 0) {
    return room.basePrice;
  }

  // Filter price tiers only for guest counts between min_occupancy and capacityAdults
  const tierValues = Object.entries(room.price_tiers)
    .filter(([guestCountStr]) => {
      const guests = Number(guestCountStr);
      return !isNaN(guests) && guests >= minOcc && guests <= maxOcc;
    })
    .map(([, price]) => Number(price))
    .filter(p => p > 0);

  return tierValues.length > 0 ? Math.min(...tierValues) : room.basePrice;
};

interface InteractiveSelectorProps {
  rooms?: RoomData[];
  pricing?: any;
  checkIn?: string;
  onBookRoom?: (roomId: string) => void;
  title?: string;
  subtitle?: string;
  hotelInfo?: any;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'wifi': <Wifi className="w-3 h-3" />,
  'breakfast': <Coffee className="w-3 h-3" />,
  'ac': <Wind className="w-3 h-3" />,
  'air conditioning': <Wind className="w-3 h-3" />,
};

const FALLBACK_ROOMS: RoomData[] = [
  {
    id: '1',
    name: 'Forest Canopy Suite',
    description: 'Nestled among ancient oaks with panoramic treetop views.',
    photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'],
    basePrice: 9500,
    bedType: 'King Bed',
    sizeSqft: 480,
    capacityAdults: 2,
    amenities: ['wifi', 'breakfast', 'ac'],
    totalInventory: 3,
  },
  {
    id: '2',
    name: 'Lakeside Pavilion',
    description: 'Private deck overlooking the shimmering lake at dawn.',
    photos: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
    basePrice: 14200,
    bedType: 'Queen Bed',
    sizeSqft: 560,
    capacityAdults: 2,
    amenities: ['wifi', 'breakfast'],
    totalInventory: 2,
  },
  {
    id: '3',
    name: 'Meadow Retreat Tent',
    description: 'Luxurious glamping under a canopy of stars.',
    photos: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'],
    basePrice: 6800,
    bedType: 'Double Bed',
    sizeSqft: 320,
    capacityAdults: 2,
    amenities: ['breakfast'],
    totalInventory: 5,
  },
  {
    id: '4',
    name: 'Mountain View Chalet',
    description: 'Rustic elegance with sweeping valley vistas.',
    photos: ['https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80'],
    basePrice: 18000,
    bedType: 'King Bed',
    sizeSqft: 720,
    capacityAdults: 4,
    amenities: ['wifi', 'breakfast', 'ac'],
    totalInventory: 1,
  },
  {
    id: '5',
    name: 'Riverside Bungalow',
    description: 'Wake up to the gentle sound of flowing water.',
    photos: ['https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80'],
    basePrice: 11500,
    bedType: 'King Bed',
    sizeSqft: 400,
    capacityAdults: 2,
    amenities: ['wifi', 'ac'],
    totalInventory: 4,
  },
];

const getCancellationPolicyDescription = (type: string, customPolicies: any[] = []) => {
  if (type === '2d') {
    return 'Full refund if cancelled up to 2 days before check-in.';
  }
  if (type === '7d_4d') {
    return 'Full refund if cancelled up to 7 days before check-in. 50% refund if cancelled up to 4 days before check-in.';
  }
  if (type === '15d_10d') {
    return 'Full refund if cancelled up to 15 days before check-in. 50% refund if cancelled up to 10 days before check-in.';
  }
  if (type === 'non_refundable') {
    return 'Non-cancellable. No refunds will be provided.';
  }
  const found = (customPolicies || []).find((p: any) => p.id === type);
  if (found) {
    return `Full refund if cancelled up to ${found.xx} days before check-in. 50% refund if cancelled up to ${found.yy} days before check-in.`;
  }
  return 'Standard policy: Free cancellation up to 2 days before check-in.';
};

const RoomCard: React.FC<{
  room: RoomData;
  pricing?: any;
  checkIn?: string;
  onBook: (id: string) => void;
  hotelInfo?: any;
}> = ({ room, pricing, checkIn, onBook, hotelInfo }) => {
  const getPrices = () => {
    let base = room.basePrice;
    const targetDate = checkIn || format(new Date(), 'yyyy-MM-dd');
    if (pricing && targetDate) {
      const roomPricing = pricing[room.id];
      if (roomPricing && roomPricing[targetDate]) {
        const override = roomPricing[targetDate];
        if (override.price > 0) {
          base = override.price;
        } else {
          base = getLowestPrice(room);
        }
      } else {
        base = getLowestPrice(room);
      }
    } else {
      base = getLowestPrice(room);
    }

    const isCpBase = hotelInfo?.defaultMealPlan === 'CP';
    const cpRate = isCpBase ? (hotelInfo?.mealPlanCpAdultRate ?? 300) : 0;
    const minOcc = room.min_occupancy ?? 1;
    const originalPrice = base + (minOcc * cpRate);

    // Apply active campaigns
    let discounted = base;
    const activeOffers = (hotelInfo?.offers || []).filter((o: any) => 
      o.dates.includes(targetDate) && (o.roomIds || []).includes(room.id)
    );
    activeOffers.forEach((offer: any) => {
      if (offer.discountType === 'percent') {
        discounted = discounted * (1 - offer.discountValue / 100);
      } else {
        discounted = Math.max(0, discounted - offer.discountValue);
      }
    });

    const finalDiscountedPrice = Math.round(discounted + (minOcc * cpRate));
    
    let discountPct = 0;
    if (originalPrice > finalDiscountedPrice && originalPrice > 0) {
      discountPct = Math.round(((originalPrice - finalDiscountedPrice) / originalPrice) * 100);
    }

    return {
      originalPrice,
      discountedPrice: finalDiscountedPrice,
      discountPercentage: discountPct,
      hasOffer: activeOffers.length > 0 && originalPrice > finalDiscountedPrice,
      activeOffers
    };
  };

  const getGstAmount = (price: number): number => {
    if (price <= 1000) return 0;
    if (price <= 7500) return Math.round(price * 0.05);
    return Math.round(price * 0.18);
  };

  const [imgIdx, setImgIdx] = useState(0);
  const [showDetailed, setShowDetailed] = useState(false);

  const formatRoomName = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const { getAvailableInventory } = useHotel();
  const targetDate = checkIn || format(new Date(), 'yyyy-MM-dd');
  const availableInventory = getAvailableInventory(room.id, targetDate);

  const photos = room.photos?.filter(Boolean);
  const hasMultiple = photos && photos.length > 1;
  const displayPhoto = photos?.[imgIdx] || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80';
  const isLowInventory = availableInventory <= 2;

  const { originalPrice, discountedPrice, discountPercentage, hasOffer, activeOffers } = getPrices();
  const todayPrice = hasOffer ? discountedPrice : originalPrice;
  const gstAmountForOneNight = getGstAmount(todayPrice);

  return (
    <div className="flex-shrink-0 w-[280px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-gray-100 group snap-start relative">
      {/* Image - Height Increased to 240px & Heart icon removed */}
      <div className="relative overflow-hidden h-[240px] bg-gray-100 shrink-0">
        <img
          src={displayPhoto}
          alt={room.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        {/* Low inventory badge */}
        {isLowInventory && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#E07A5F] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {availableInventory === 0 ? 'Sold Out' : `Only ${availableInventory} left`}
          </div>
        )}

        {/* Photo navigation arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImgIdx((prev) => (prev - 1 + photos.length) % photos.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6.5 h-6.5 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center shadow hover:bg-white transition-all cursor-pointer z-15 border border-gray-100/50"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-700" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImgIdx((prev) => (prev + 1) % photos.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6.5 h-6.5 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center shadow hover:bg-white transition-all cursor-pointer z-15 border border-gray-100/50"
            >
              <ChevronRight className="w-4 h-4 text-zinc-700" />
            </button>
          </>
        )}

        {/* Photo dots */}
        {hasMultiple && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                className={`rounded-full transition-all duration-200 cursor-pointer ${i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Name - Bigger and camel case Title Case */}
        <h3 className="font-black text-[#3D405B] text-[20px] leading-snug tracking-wide text-left"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {formatRoomName(room.name)}
        </h3>

        {/* Specs - Beds, size and separate occupancy with Min details */}
        <div className="space-y-1.5 text-gray-500 text-[11px] text-left">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-[#8FA89B]" />
              {room.bedType || 'King Bed'}
            </span>
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-[#8FA89B]" />
              {room.sizeSqft} sqft
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#8FA89B]" />
            <span>Min {room.min_occupancy ?? 1} - Up to {room.capacityAdults || 4} Guests</span>
          </div>
          {hotelInfo?.defaultMealPlan === 'CP' && (
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
              <Coffee className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Complimentary Breakfast Included</span>
            </div>
          )}
        </div>

        {/* Amenity pills - slice to 3 and show + X more */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full capitalize">
                {AMENITY_ICONS[a.toLowerCase()] || null}
                {a}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-[10px] text-gray-400 font-semibold px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                + {room.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Know More - Placed below amenities section */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetailed(true);
          }}
          className="text-[10px] font-bold text-[#E07A5F] hover:text-[#f28e74] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition text-left mr-auto mt-0.5"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Know More</span>
        </button>

        {/* Price + CTA with GST rates */}
        <div className="border-t border-gray-100 pt-3 mt-auto flex items-center justify-between gap-2 text-left">
          <div>
            <div className="flex flex-col text-left">
              <div className="flex items-baseline gap-0.5">
                {hasOffer ? (
                  <div className="flex flex-col text-left">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[18px] font-black text-[#3D405B]">₹{discountedPrice.toLocaleString('en-IN')}</span>
                      <span className="line-through text-gray-400 text-[11px] font-normal">₹{originalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-emerald-600 font-extrabold text-[10px] tracking-wide block leading-none mt-0.5">
                      {discountPercentage}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-[18px] font-black text-[#3D405B]">₹{originalPrice.toLocaleString('en-IN')}</span>
                )}
                <span className="text-[10px] text-gray-400 font-medium ml-0.5">/night</span>
              </div>
              <div className="text-[9.5px] text-zinc-500 font-extrabold tracking-wide uppercase mt-0.5">
                for {room.min_occupancy ?? 1} {(room.min_occupancy ?? 1) === 1 ? 'Guest' : 'Guests'}
              </div>
              <div className="text-[9px] text-[#8FA89B] font-extrabold tracking-wide uppercase mt-0.5">
                + ₹{gstAmountForOneNight.toLocaleString('en-IN')} taxes & fees
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={availableInventory === 0}
            onClick={(e) => { e.stopPropagation(); onBook(room.id); }}
            className={`text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap ${
              availableInventory === 0
                ? 'bg-zinc-400 hover:bg-zinc-400 cursor-not-allowed opacity-50'
                : 'bg-[#3D405B] hover:bg-[#2e3147] active:scale-95'
            }`}
          >
            {availableInventory === 0 ? 'Sold Out' : 'Book Now'}
          </button>
        </div>
      </div>

      {/* Detailed Modal/Drawer Overlay inside Card */}
      {showDetailed && (
        <div className="absolute inset-0 bg-black/95 z-40 p-5 flex flex-col justify-between text-left animate-in fade-in duration-305">
          <div className="space-y-4 overflow-y-auto max-h-[80%] pr-1">
            <div className="flex items-center justify-between pb-2 border-b border-white/15">
              <h4 className="font-bold text-xs uppercase text-[#E07A5F] tracking-wider">About This Space</h4>
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
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white leading-tight">{formatRoomName(room.name)}</h3>
              <p className="text-[10.5px] text-zinc-300 leading-relaxed font-sans">
                {room.description || 'No description provided.'}
              </p>

              {/* Active Campaigns display inside Modal */}
              {hasOffer && activeOffers && activeOffers.length > 0 && (
                <div className="pt-2.5 border-t border-white/10 space-y-1">
                  <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Active Promotion Applied</h5>
                  {activeOffers.map((o: any) => {
                    const val = o.discountType === 'percent' ? `${o.discountValue}%` : `₹${o.discountValue}`;
                    return (
                      <div key={o.id} className="bg-emerald-950/40 border border-emerald-800/30 p-2 rounded-xl text-3xs font-semibold text-emerald-100 flex items-center justify-between">
                        <span>🏷️ {o.name}</span>
                        <span className="text-emerald-400 font-extrabold">{val} OFF</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {room.amenities && room.amenities.length > 0 && (
                <div className="pt-2.5 border-t border-white/10">
                  <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Amenities</h5>
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.map((a) => (
                      <span key={a} className="text-[9px] text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full capitalize">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Policy inside modal */}
              <div className="pt-2.5 border-t border-white/10 space-y-1">
                <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Cancellation Policy</h5>
                <p className="text-[10px] text-zinc-300 leading-relaxed font-sans">
                  {(() => {
                    const targetDate = checkIn || format(new Date(), 'yyyy-MM-dd');
                    const policyType = room.cancellation_policy_overrides?.[targetDate] || hotelInfo?.cancellationPolicyType || '2d';
                    return getCancellationPolicyDescription(policyType, hotelInfo?.customCancellationPolicies);
                  })()}
                </p>
              </div>
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
};

const InteractiveSelector: React.FC<InteractiveSelectorProps> = ({
  rooms = [],
  pricing,
  checkIn,
  onBookRoom,
  title,
  subtitle,
  hotelInfo,
}) => {
  const displayRooms = rooms.length > 0 ? rooms : FALLBACK_ROOMS;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full font-sans">
      {/* Header row with title */}
      <div className="flex items-end justify-between mb-6 text-left">
        <div>
          {title && (
            <h2
              className="text-3xl md:text-4xl font-medium text-[#3D405B] mb-1 leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Horizontal scroll row wrapped with arrows */}
      <div className="relative group">
        {/* Left Arrow next to the cards */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-2 md:-left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#D8E2DC] shadow-sm flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white hover:border-[#8FA89B] transition-all duration-200 cursor-pointer"
        >
          <ChevronLeft className="w-4.5 h-4.5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              pricing={pricing}
              checkIn={checkIn}
              onBook={(id) => onBookRoom?.(id)}
              hotelInfo={hotelInfo}
            />
          ))}
        </div>

        {/* Right Arrow next to the cards */}
        <button
          onClick={() => scroll('right')}
          className="absolute -right-2 md:-right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs border border-[#D8E2DC] shadow-sm flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white hover:border-[#8FA89B] transition-all duration-200 cursor-pointer"
        >
          <ChevronRight className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export default InteractiveSelector;
