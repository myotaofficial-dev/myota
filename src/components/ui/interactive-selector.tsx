import React, { useState, useRef } from 'react';
import { Heart, Users, Maximize2, BedDouble, Wifi, Coffee, Wind, ChevronLeft, ChevronRight } from 'lucide-react';

interface RoomData {
  id: string;
  name: string;
  description: string;
  photos: string[];
  basePrice: number;
  bedType: string;
  sizeSqft: number;
  capacityAdults?: number;
  amenities?: string[];
  totalInventory?: number;
}

interface InteractiveSelectorProps {
  rooms?: RoomData[];
  onBookRoom?: (roomId: string) => void;
  title?: string;
  subtitle?: string;
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

const RoomCard: React.FC<{
  room: RoomData;
  onBook: (id: string) => void;
}> = ({ room, onBook }) => {
  const [liked, setLiked] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const photos = room.photos?.filter(Boolean);
  const hasMultiple = photos && photos.length > 1;
  const displayPhoto = photos?.[imgIdx] || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80';
  const isLowInventory = (room.totalInventory ?? 10) <= 2;

  return (
    <div className="flex-shrink-0 w-[280px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-gray-100 group snap-start">
      {/* Image */}
      <div className="relative overflow-hidden h-[200px] bg-gray-100 shrink-0">
        <img
          src={displayPhoto}
          alt={room.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        {/* Heart */}
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(l => !l); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition-all duration-200 cursor-pointer z-10"
        >
          <Heart className={`w-4 h-4 transition-colors duration-200 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
        </button>

        {/* Low inventory badge */}
        {isLowInventory && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-[#E07A5F] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Only {room.totalInventory} left
          </div>
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
        {/* Name */}
        <h3 className="font-semibold text-[#3D405B] text-[15px] leading-snug"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {room.name}
        </h3>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-[11px]">
          <span className="flex items-center gap-1">
            <BedDouble className="w-3.5 h-3.5 text-[#8FA89B]" />
            {room.bedType || 'King Bed'}
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-[#8FA89B]" />
            {room.sizeSqft} sqft
          </span>
          {room.capacityAdults && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#8FA89B]" />
              Up to {room.capacityAdults}
            </span>
          )}
        </div>

        {/* Amenity pills */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.amenities.slice(0, 3).map((a) => (
              <span key={a} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full capitalize">
                {AMENITY_ICONS[a.toLowerCase()] || null}
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="border-t border-gray-100 pt-3 mt-auto flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[17px] font-bold text-[#3D405B]">₹{room.basePrice.toLocaleString('en-IN')}</span>
              <span className="text-[11px] text-gray-400 font-medium">/night</span>
            </div>
            <div className="text-[9px] text-gray-400">taxes may apply</div>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBook(room.id); }}
            className="bg-[#3D405B] hover:bg-[#2e3147] active:scale-95 text-white text-[10px] font-semibold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

const InteractiveSelector: React.FC<InteractiveSelectorProps> = ({
  rooms = [],
  onBookRoom,
  title,
  subtitle,
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
      {/* Header row with title + arrow controls */}
      <div className="flex items-end justify-between mb-6">
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

        {/* Scroll arrows */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full border border-[#D8E2DC] flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white hover:border-[#8FA89B] transition-all duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full border border-[#D8E2DC] flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white hover:border-[#8FA89B] transition-all duration-200 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onBook={(id) => onBookRoom?.(id)}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractiveSelector;
