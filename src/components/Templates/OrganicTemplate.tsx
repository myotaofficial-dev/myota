import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import { CustomPageRenderer } from './CustomPageRenderer';
import { BentoGallery } from '../ui/bento-gallery';
import { StaggerTestimonials } from '@/components/ui/stagger-testimonials';
import { 
  Star, Phone, Mail, 
  MapPin, Check, ChevronRight, X, Sparkles, MessageCircle,
  Clock, Shield, ArrowLeft, ArrowRight, Calendar
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const OrganicTemplate: React.FC = () => {
  const { 
    hotelInfo, rooms, pricing, addons, coupons, 
    testimonials, faqs, policies, addBooking, canvasMode, setSelectedView, setEditorFocus,
    guestEvents, customPages, previewPath, setPreviewPath
  } = useHotel();

  // Navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Booking Widget States
  const [checkIn, setCheckIn] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [guestsCount, setGuestsCount] = useState(2);
  const [promoCode, setPromoCode] = useState('');
  
  // Modal / Drawer state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'success'>('details');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<string | null>(null);

  // Standalone Event Booking drawer state
  const [isEventBookingOpen, setIsEventBookingOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventGuestsCount, setEventGuestsCount] = useState(1);
  const [eventBookingStep, setEventBookingStep] = useState<'details' | 'success'>('details');

  // Guest details form
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);
  
  // Contact Form inside Need Help Section
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // FAQ states
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Active Hero Slide Index (For Carousel Hero Style)
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);

  // Room Carousel Ref
  const roomScrollRef = useRef<HTMLDivElement>(null);

  // About section popup
  const [isAboutPopupOpen, setIsAboutPopupOpen] = useState(false);

  // Amenities popup
  const [isAmenitiesPopupOpen, setIsAmenitiesPopupOpen] = useState(false);

  // Review read-more popup
  const [reviewPopupContent, setReviewPopupContent] = useState<{ author: string; content: string; rating: number; stayDate: string } | null>(null);

  // Gallery lightbox
  const [galleryLightboxIdx, setGalleryLightboxIdx] = useState<number | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const selectedEvent = guestEvents.find(e => e.id === selectedEventId);

  // Auto cycle hero carousel
  useEffect(() => {
    if (hotelInfo.heroStyle === 'carousel') {
      const interval = setInterval(() => {
        setHeroSlideIdx(prev => (prev + 1) % (hotelInfo.heroImages?.length || 3));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [hotelInfo.heroStyle, hotelInfo.heroImages]);

  // Scroll detection for glassmorphic navbar
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 80);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Sync addon quantities to selectedAddons array to maintain pricing calculation compatibility
  useEffect(() => {
    const list: string[] = [];
    Object.entries(addonQuantities).forEach(([name, qty]) => {
      for (let i = 0; i < qty; i++) {
        list.push(name);
      }
    });
    setSelectedAddons(list);
  }, [addonQuantities]);

  // Price calculations
  const calculateTotal = () => {
    if (!selectedRoom) return { subtotal: 0, discount: 0, addonTotal: 0, grandTotal: 0, nights: 0 };
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = differenceInDays(end, start);
    
    if (isNaN(nights) || nights <= 0) return { subtotal: 0, discount: 0, addonTotal: 0, grandTotal: 0, nights: 0 };

    let subtotal = 0;
    const roomPricing = pricing[selectedRoom.id] || {};

    for (let i = 0; i < nights; i++) {
      const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
      const override = roomPricing[dateStr];
      const dayPrice = override && override.price > 0 ? override.price : selectedRoom.basePrice;
      subtotal += dayPrice;
    }

    let addonTotal = 0;
    selectedAddons.forEach(addonName => {
      const addon = addons.find(a => a.name === addonName);
      if (addon) addonTotal += addon.price;
    });

    let discount = 0;
    if (appliedCouponCode) {
      const coupon = coupons.find(c => c.code === appliedCouponCode && c.active);
      if (coupon) {
        if (coupon.discountType === 'percent') {
          discount = (subtotal * coupon.discountValue) / 100;
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - discount + addonTotal);
    return { subtotal, discount, addonTotal, grandTotal, nights };
  };

  const totals = calculateTotal();

  const handleApplyCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setCouponError(null);
    const coupon = coupons.find(c => c.code === promoCode.toUpperCase() && c.active);
    
    if (coupon) {
      setAppliedCouponCode(coupon.code);
    } else {
      setCouponError('Invalid or expired coupon code.');
      setAppliedCouponCode('');
    }
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !selectedRoom) return;

    addBooking({
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      totalPrice: totals.grandTotal,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      addons: selectedAddons,
      couponCode: appliedCouponCode || undefined
    });

    const ref = `OG-${Math.floor(1000 + Math.random() * 9000)}`;
    setConfirmedBookingRef(ref);
    setBookingStep('success');
  };

  const handleCreateEventBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !selectedEvent) return;

    addBooking({
      roomId: 'event-booking',
      roomName: `Day Event: ${selectedEvent.title}`,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: selectedEvent.date || selectedEvent.fromDate || '',
      checkOut: selectedEvent.date || selectedEvent.toDate || selectedEvent.fromDate || '',
      totalPrice: selectedEvent.price * eventGuestsCount,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      addons: []
    });

    setEventBookingStep('success');
  };

  const incrementAddon = (name: string) => {
    setAddonQuantities(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const decrementAddon = (name: string) => {
    setAddonQuantities(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) - 1)
    }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactMessage('');
    }, 3000);
  };

  const scrollRooms = (direction: 'left' | 'right') => {
    if (roomScrollRef.current) {
      const scrollAmount = 260;
      roomScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const triggerEdit = (view: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedView(view);
    setEditorFocus('form');
  };

  // Amenity icon helper — returns a styled SVG based on amenity keyword
  const getAmenityIcon = (amenity: string) => {
    const a = amenity.toLowerCase();
    const cls = "w-5 h-5 text-[#8FA89B] shrink-0";
    if (a.includes('wifi') || a.includes('internet'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>;
    if (a.includes('pool') || a.includes('swim'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 17c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 7c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" /></svg>;
    if (a.includes('parking') || a.includes('car'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4M12 14v3" /></svg>;
    if (a.includes('ac') || a.includes('air'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364" /></svg>;
    if (a.includes('breakfast') || a.includes('food') || a.includes('meal') || a.includes('dining'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9M9 21h6" /></svg>;
    if (a.includes('security') || a.includes('safe') || a.includes('guard'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
    if (a.includes('room service') || a.includes('concierge'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    if (a.includes('water') || a.includes('drinking'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.2 4.2-6 7.5-6 10a6 6 0 0012 0c0-2.5-1.8-5.8-6-10z" /></svg>;
    if (a.includes('shower') || a.includes('bath'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12a8 8 0 0116 0M4 12V6a2 2 0 012-2h3M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7" /></svg>;
    if (a.includes('housekeep') || a.includes('laundry') || a.includes('clean'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
    if (a.includes('view') || a.includes('scenic') || a.includes('lake') || a.includes('mountain'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    if (a.includes('power') || a.includes('backup') || a.includes('generator'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    if (a.includes('front desk') || a.includes('reception') || a.includes('check-in') || a.includes('checkin'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    if (a.includes('caretaker') || a.includes('staff') || a.includes('assistant'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    if (a.includes('fuel') || a.includes('pump') || a.includes('gas'))
      return <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m0 0h2a2 2 0 012 2v6.5a1.5 1.5 0 003 0V10a1 1 0 00-1-1h-2" /></svg>;
    // Default sparkle
    return <Sparkles className={cls} />;
  };

  const instagramMock = [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=200"
  ];

  // Dynamic order states
  const sectionOrder = hotelInfo.sectionOrder || ['hero', 'tagline', 'about', 'amenities', 'events', 'rooms', 'reviews', 'bento-gallery', 'policies', 'addons', 'faqs', 'location', 'instagram'];
  const disabledSections = hotelInfo.disabledSections || [];
  const menuItemsOrder = hotelInfo.menuItemsOrder || ['about', 'amenities', 'rooms', 'reviews', 'faqs', 'location'];
  const disabledMenuItems = hotelInfo.disabledMenuItems || [];

  const menuMap: Record<string, { label: string; href: string }> = {
    about: { label: "About", href: "#about" },
    amenities: { label: "Amenities", href: "#amenities" },
    rooms: { label: "Rooms", href: "#rooms" },
    reviews: { label: "Reviews", href: "#reviews" },
    faqs: { label: "FAQs", href: "#faqs" },
    location: { label: "Location", href: "#location" }
  };

  const activeMenuItems = menuItemsOrder.filter(id => !disabledMenuItems.includes(id));

  // Dynamic Section Components mapping
  const sectionComponents: Record<string, React.ReactNode> = {
    hero: (
      <section 
        key="hero"
        onClick={(e) => triggerEdit('hero', e)}
        className={`relative h-[80vh] shrink-0 overflow-hidden flex items-end justify-start text-left px-6 sm:px-12 pb-16 sm:pb-20 pt-28 group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-[-2px]' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-20 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Hero & Banner
          </span>
        )}

        {/* Background styles */}
        {hotelInfo.heroStyle === 'single' && (
          <div className="absolute inset-0 bg-[#333D29]">
            <img 
              src={hotelInfo.heroImages?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"} 
              alt="Organic Facade"
              className="w-full h-full object-cover opacity-60 sepia-[15%]" 
            />
          </div>
        )}

        {hotelInfo.heroStyle === 'single' && (
          <div className="absolute inset-0 bg-[#333D29]">
            <img 
              src={hotelInfo.heroImages?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"} 
              alt="Organic Facade"
              className="w-full h-full object-cover opacity-60 sepia-[15%]" 
            />
          </div>
        )}

        {hotelInfo.heroStyle === 'carousel' && (
          <div className="absolute inset-0 bg-[#333D29]">
            {((hotelInfo.heroImages && hotelInfo.heroImages.filter(url => url).length > 0) 
              ? hotelInfo.heroImages.filter(url => url).slice(0, 5) 
              : heroSlides
            ).map((slide, idx) => (
              <img 
                key={idx}
                src={slide}
                alt={`Slide ${idx}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0 ${idx === heroSlideIdx ? '!opacity-60' : ''}`} 
              />
            ))}
          </div>
        )}

        {hotelInfo.heroStyle === 'collage' && (
          <div className="absolute inset-0 h-full w-full opacity-55">
            {/* Mobile Collage Mosaic Grid view */}
            <div className="grid md:hidden grid-cols-2 gap-1.5 p-1.5 h-full w-full">
              <div className="col-span-2 aspect-video overflow-hidden rounded-lg">
                <img src={hotelInfo.heroImages?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square overflow-hidden rounded-lg">
                <img src={hotelInfo.heroImages?.[1] || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square overflow-hidden rounded-lg">
                <img src={hotelInfo.heroImages?.[2] || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square overflow-hidden rounded-lg">
                <img src={hotelInfo.heroImages?.[3] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Desktop Grid Collage */}
            <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-1.5 p-1.5 h-full w-full">
              <div className="col-span-2 row-span-2 overflow-hidden h-full">
                <img src={hotelInfo.heroImages?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-1 row-span-1 overflow-hidden h-full">
                <img src={hotelInfo.heroImages?.[1] || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-1 row-span-1 overflow-hidden h-full">
                <img src={hotelInfo.heroImages?.[2] || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-1 row-span-1 overflow-hidden h-full">
                <img src={hotelInfo.heroImages?.[3] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}

        {hotelInfo.heroStyle === 'video' && (
          <div className="absolute inset-0 bg-[#333D29]">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-55"
              src={hotelInfo.heroVideo || "https://assets.mixkit.co/videos/preview/mixkit-swimming-pool-in-a-resort-40244-large.mp4"}
            />
          </div>
        )}

        {/* Ambient Dark Gradient Vignette for perfect text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15 pointer-events-none" />

        {/* Hero Content — Bend Club left aligned */}
        <div className="relative z-10 space-y-5 max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-700 select-none">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-white/80 block">
            {hotelInfo.tagline || "Discover a natural escape in Poolampatti"}
          </span>
          <h2 
            className="text-[clamp(2.5rem,6.5vw,5.5rem)] font-light text-white tracking-[-0.02em] leading-[0.95] uppercase font-serif"
            style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}
          >
            {hotelInfo.name}
          </h2>
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex gap-0.5 text-[#E07A5F]">
              {Array.from({ length: hotelInfo.starRating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="text-white/60 text-4xs font-bold uppercase tracking-widest pl-1 border-l border-white/20">
              {hotelInfo.starRating} Star Stay
            </span>
          </div>
          {/* Keys count below stars */}
          {rooms.length > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="text-white/55 text-4xs font-semibold uppercase tracking-widest">
                {rooms.reduce((sum, r) => sum + (r.totalInventory || 0), 0)} Keys
              </span>
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={() => {
                setSelectedRoomId(rooms[0]?.id || '');
                setIsBookingOpen(true);
                setBookingStep('details');
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold text-[10px] uppercase tracking-[0.2em] rounded-full hover:bg-white/20 transition-all duration-350 cursor-pointer"
            >
              Reserve a Room
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    ),
    tagline: (
      <section 
        key="tagline"
        onClick={(e) => triggerEdit('property', e)}
        className={`bg-[#E8E2D6] py-3 px-6 relative flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-1/2 -translate-y-1/2 right-4 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Tagline
          </span>
        )}
        <div className="flex items-center gap-2 text-left">
          <span className="text-xs font-bold text-[#3D405B]">
            {hotelInfo.name} : <span className="text-[#E07A5F] italic font-serif text-sm animate-none" style={{ fontFamily: "'Fraunces', serif" }}>{hotelInfo.tagline}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#556B2F] font-semibold">
          <MapPin className="w-3.5 h-3.5 text-[#E07A5F]" />
          <span>No.1 Poolampatti, Odakattur</span>
          <span className="w-1 h-1 rounded-full bg-[#556B2F]"></span>
          <span className="text-[#E07A5F] font-bold">⭐ {hotelInfo.starRating}.0 Rating</span>
        </div>
      </section>
    ),
    about: (
      <section 
        key="about"
        id="about"
        onClick={(e) => triggerEdit('description', e)}
        className={`py-14 px-6 max-w-2xl mx-auto text-center space-y-5 relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit About
          </span>
        )}
        <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Our Philosophy)</span>
        <h3 className="text-[clamp(1.6rem,3.5vw,2.8rem)] font-medium text-[#3D405B] leading-[1.05] tracking-[-0.01em]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>
          Earth, Water, and Calm
        </h3>
        <p className="text-[0.875rem] leading-[1.75] text-zinc-500 font-light max-w-lg mx-auto">
          {hotelInfo.shortDescription || hotelInfo.description}
        </p>
        {hotelInfo.detailedDescription && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsAboutPopupOpen(true); }}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8FA89B] border-b border-[#8FA89B]/40 hover:text-[#E07A5F] hover:border-[#E07A5F]/40 transition-colors duration-200 cursor-pointer pb-0.5"
          >
            Read More
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </section>
    ),
    amenities: (
      <section 
        key="amenities"
        id="amenities"
        onClick={(e) => triggerEdit('amenities', e)}
        className={`py-12 px-6 bg-[#EBF0EC] border-y border-[#D8E2DC] relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Amenities
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Natural Luxuries)</span>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Property Amenities</h3>
          </div>
          
          {/* 2x5 grid desktop: 10 items always */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(hotelInfo.generalAmenities || []).slice(0, 10).map((amenity, idx) => (
              <div 
                key={idx} 
                className="bg-[#FAF6F0] border border-[#D8E2DC] p-3.5 text-center rounded-xl hover:shadow-sm hover:border-[#8FA89B]/50 transition duration-300 flex flex-col items-center justify-center gap-2"
              >
                {getAmenityIcon(amenity)}
                <span className="text-[9px] text-[#333D29] font-bold tracking-wide uppercase leading-tight">{amenity}</span>
              </div>
            ))}
          </div>

          {(hotelInfo.generalAmenities || []).length > 10 && (
            <div className="text-center">
              <button
                onClick={(e) => { e.stopPropagation(); setIsAmenitiesPopupOpen(true); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#8FA89B]/50 text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition duration-200 cursor-pointer"
              >
                Show All {hotelInfo.generalAmenities.length} Amenities
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>
    ),
    events: (
      <section 
        key="events"
        id="events"
        onClick={(e) => triggerEdit('events-admin', e)}
        className={`py-12 px-6 relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Events
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Gatherings & Day Outs)</span>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Resort Packages & Scheduled Activities</h3>
            <p className="text-[11px] text-zinc-400 lowercase tracking-wider font-light">Book individually — no room reservation needed</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {guestEvents.map((evt) => (
              <div key={evt.id} className="bg-white border border-[#D8E2DC] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] hover:border-[#8FA89B]/60 transition duration-300 ease-out text-left cursor-pointer">
                {/* Event Photo */}
                <div className="h-44 bg-zinc-100 relative">
                  <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2.5 left-2.5 bg-zinc-950/70 text-[#E07A5F] text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    {evt.category}
                  </span>
                </div>
                
                {/* Info & Booking button */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-4xs font-bold text-[#3D405B] uppercase leading-tight">{evt.title}</h4>
                    <p className="text-5xs text-zinc-550 leading-relaxed font-sans">{evt.description}</p>
                    
                    {/* Date range + Time + Price */}
                    <div className="pt-2 border-t border-zinc-100 space-y-1.5 text-[8px] font-extrabold uppercase text-[#556B2F] font-sans">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="text-zinc-500 font-bold">
                          {evt.fromDate ? evt.fromDate : evt.date || ''}
                          {evt.toDate && evt.fromDate !== evt.toDate ? ` → ${evt.toDate}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-zinc-400" /> {evt.time}</span>
                        <span className="text-[#E07A5F] text-4xs font-black">₹{evt.price} / GUEST</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEventId(evt.id);
                      setEventGuestsCount(1);
                      setEventBookingStep('details');
                      setIsEventBookingOpen(true);
                    }}
                    className="w-full py-3 bg-[#3D405B] hover:bg-[#2d304a] active:scale-[0.97] text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer shadow-sm"
                  >
                    Book Day Pass
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    rooms: (
      <section 
        key="rooms"
        id="rooms"
        onClick={(e) => triggerEdit('rooms', e)}
        className={`py-12 px-6 bg-[#FAF6F0] border-y border-[#D8E2DC] relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Rooms
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#D8E2DC] pb-4">
            <div className="text-left space-y-1.5">
              <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Eco Suites)</span>
              <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Our Sanctuary Spaces</h3>
            </div>
            <div className="flex gap-2.5 mt-4 sm:mt-0">
              <button 
                onClick={(e) => { e.stopPropagation(); scrollRooms('left'); }}
                className="w-8 h-8 rounded-full border border-[#8FA89B] flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); scrollRooms('right'); }}
                className="w-8 h-8 rounded-full border border-[#8FA89B] flex items-center justify-center text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div 
            ref={roomScrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          >
            {rooms.map((room) => {
              return (
                <div 
                  key={room.id}
                  className="min-w-[280px] max-w-[280px] bg-[#FAF6F0] border border-[#D8E2DC] rounded-2xl flex-col flex overflow-hidden snap-start group/card hover:border-[#8FA89B]/65 hover:scale-[1.01] active:scale-[0.99] transition duration-300 relative cursor-pointer text-left"
                >
                  <div className="aspect-4/3 bg-zinc-100 overflow-hidden relative shrink-0">
                    <img 
                      src={room.photos[0] || "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600"} 
                      alt={room.name} 
                      className="w-full h-full object-cover group-hover/card:scale-103 transition duration-500" 
                    />
                    
                    {room.totalInventory <= 2 && (
                      <div className="absolute top-3 left-3 bg-[#E07A5F] text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm z-10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span>ONLY {room.totalInventory} LEFT!</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 bg-[#FAF6F0]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#3D405B] font-extrabold">
                      ${room.basePrice}/night
                    </div>
                  </div>

                  <div className="p-4 space-y-4 flex-1 flex flex-col justify-between font-sans">
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-[#3D405B] text-xs uppercase tracking-wider">{room.name}</h4>
                      
                      <div className="flex flex-col gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                        <div className="flex justify-between items-center border-b border-[#D8E2DC]/40 pb-1">
                          <span>Size:</span>
                          <span className="text-[#3D405B] font-extrabold">{room.sizeSqft} sqft</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-[#D8E2DC]/40 pb-1">
                          <span>Available Rooms:</span>
                          <span className="text-[#3D4530] font-extrabold">{room.totalInventory} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Beds:</span>
                          <span className="text-[#3D405B] font-extrabold">{room.bedType || 'King size'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoomId(room.id);
                        setIsBookingOpen(true);
                        setBookingStep('details');
                      }}
                      className="w-full py-2 bg-[#8FA89B] hover:bg-[#7D9387] active:scale-[0.97] text-white rounded-xl transition duration-200 text-4xs uppercase tracking-wider font-extrabold cursor-pointer"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    reviews: (
      <section 
        key="reviews"
        id="reviews"
        onClick={(e) => triggerEdit('testimonials-admin', e)}
        className={`py-12 px-6 relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Reviews
          </span>
        )}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Guest Feedback)</span>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Guest Reviews</h3>
            <span className="text-[10px] text-[#8FA89B] font-medium block tracking-[0.1em]">Verified reviews · {testimonials.length > 0 ? (testimonials.reduce((s,t)=>s+t.rating,0)/testimonials.length).toFixed(1) : '5.0'} / 5.0</span>
          </div>

          <StaggerTestimonials 
            customTestimonials={testimonials}
            companyName={hotelInfo.name}
          />
        </div>
      </section>
    ),
    'bento-gallery': (
      <section key="bento-gallery" className="bg-[#FAF6F0] py-4 border-t border-[#D8E2DC] relative">
        <div className="max-w-7xl mx-auto text-center space-y-1.5 mb-6">
          <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Portrait Diary)</span>
          <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Natural Vignettes</h3>
        </div>
        <BentoGallery 
          images={hotelInfo.heroImages} 
          scrollContainerRef={scrollContainerRef} 
          onImageClick={(idx, imgs) => {
            setLightboxImages(imgs);
            setGalleryLightboxIdx(idx);
          }}
        />
      </section>
    ),
    policies: (
      <section 
        key="policies"
        onClick={(e) => triggerEdit('policies-admin', e)}
        className={`py-12 px-6 bg-[#EBF0EC] border-y border-[#D8E2DC] relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Policies & Rules
          </span>
        )}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
          {/* Rules */}
          <div className="space-y-4 text-left font-sans">
            <h3 className="text-lg font-serif text-[#3D405B] border-b border-[#8FA89B]/20 pb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Resort Guidelines
            </h3>
            <ul className="space-y-3 text-zinc-600 text-2xs font-semibold uppercase tracking-wider font-sans">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8FA89B]" />
                <span>Arrival: {hotelInfo.checkInTime || '14:00'} • Departure: {hotelInfo.checkOutTime || '11:00'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#8FA89B]" />
                <span>Eco friendliness: Limit plastic consumption in suite zones.</span>
              </li>
              {policies.map(p => (
                <li key={p.id} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{p.title}: {p.description}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Need help */}
          <div className="bg-[#FAF6F0] border border-[#D8E2DC] p-5 rounded-2xl space-y-3 text-left">
            <h4 className="font-bold text-[#3D405B] text-xs uppercase tracking-wide flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-[#8FA89B]" />
              <span>Contact Concierge Desk</span>
            </h4>
            <p className="text-5xs text-zinc-500 leading-relaxed font-sans font-medium">
              Need assistance or special room upgrades? Submit your contact inquiry and we will get back shortly.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-2">
              <textarea 
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Message concierge desk..."
                rows={2}
                className="w-full bg-[#FAF6F0] border border-[#D8E2DC] focus:border-[#8FA89B] text-3xs p-2 rounded-xl outline-hidden"
              />
              <button 
                type="submit"
                className="bg-[#8FA89B] hover:bg-[#7D9387] text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1.8 w-full rounded-lg transition cursor-pointer"
              >
                Send Request
              </button>
              {contactSuccess && (
                <p className="text-[10px] text-emerald-600 font-bold font-serif">Logged successfully!</p>
              )}
            </form>
          </div>
        </div>
      </section>
    ),
    addons: (
      addons.length > 0 ? (
        <section 
          key="addons"
          onClick={(e) => triggerEdit('addons', e)}
          className={`py-12 px-6 bg-[#FAF6F0] border-y border-[#D8E2DC] relative group transition cursor-pointer ${
            canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
        >
          {canvasMode === 'editor' && (
            <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
              ✏️ Edit Addons
            </span>
          )}
          <div className="max-w-4xl mx-auto space-y-6 text-center">
            <div className="space-y-1.5">
              <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Experiences)</span>
              <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Eco-Upsells & Local Experiences</h3>
            </div>
            
            {/* Visual Add-ons Redesigned cards (matching image 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
              {addons.map((addon) => {
                const qty = addonQuantities[addon.name] || 0;
                return (
                  <div key={addon.id} className="bg-white border border-[#D8E2DC] rounded-2xl overflow-hidden flex shadow-xs hover:border-[#8FA89B]/65 hover:scale-[1.01] active:scale-[0.99] transition duration-300 ease-out cursor-pointer">
                    {/* Left: image */}
                    <div className="w-24 h-24 shrink-0 bg-zinc-50 border-r border-[#D8E2DC]">
                      <img 
                        src={addon.image || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=300"} 
                        alt={addon.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    {/* Right: info */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-[#3D405B] uppercase text-4xs tracking-wider line-clamp-1">{addon.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-sans mt-0.5 line-clamp-2 leading-snug">{addon.description}</p>
                      </div>
                      
                      {/* Price & Quantity Selector */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-4xs font-extrabold text-[#E07A5F]">${addon.price}</span>
                        
                        {/* Quantity Pill Selector */}
                        <div className="flex items-center bg-[#FAF6F0] border border-[#D8E2DC] rounded-full p-0.5 text-4xs font-bold">
                          <button
                            type="button"
                            onClick={() => decrementAddon(addon.name)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-[#3D405B]">{qty}</span>
                          <button
                            type="button"
                            onClick={() => incrementAddon(addon.name)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null
    ),
    faqs: (
      <section 
        key="faqs"
        id="faqs"
        onClick={(e) => triggerEdit('faqs-admin', e)}
        className={`py-12 px-6 relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit FAQs
          </span>
        )}
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Answers)</span>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Resort FAQs</h3>
          </div>

          <div className="space-y-1.5 font-sans font-semibold">
            {faqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="bg-[#FAF6F0] border border-[#D8E2DC] rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFaqId(isOpen ? null : faq.id);
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#3D405B] hover:text-[#E07A5F] transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className={`text-[#8FA89B] font-extrabold text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div 
                      className="px-4 pb-3.5 text-2xs text-zinc-500 leading-relaxed font-sans border-t border-[#D8E2DC]/50 pt-2.5"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    location: (
      <section 
        key="location"
        id="location"
        onClick={(e) => triggerEdit('location-map', e)}
        className={`py-12 px-6 relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Location Map
          </span>
        )}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3.5 text-left font-sans">
            <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Location)</span>
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}>Resort Location</h3>
            <p className="text-2xs text-zinc-550 leading-relaxed font-semibold">
              {hotelInfo.address}
            </p>
            <div className="pt-1.5">
              <a 
                href={`https://maps.google.com/?q=${hotelInfo.latitude},${hotelInfo.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#8FA89B]/55 text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white text-4xs uppercase tracking-widest font-extrabold rounded-full transition cursor-pointer font-sans"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Google Maps Navigation</span>
              </a>
            </div>
          </div>

          {/* Real Embedded Google Map Iframe */}
          <div className="aspect-video bg-[#E8E2D6] border border-[#D8E2DC] rounded-2xl relative overflow-hidden flex items-center justify-center p-0">
            {hotelInfo.latitude && hotelInfo.longitude ? (
              <iframe
                title="Google Map Embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&q=${hotelInfo.latitude},${hotelInfo.longitude}&zoom=15`}
              />
            ) : (
              <div className="text-center z-10 space-y-1.5 p-4">
                <MapPin className="w-6 h-6 text-[#E07A5F] animate-bounce mx-auto" />
                <span className="text-[10px] text-[#3D405B] font-bold block uppercase tracking-wider font-serif" style={{ fontFamily: "'Fraunces', serif" }}>{hotelInfo.name} Mapping</span>
                <span className="text-4xs text-[#556B2F] font-sans block font-semibold">{hotelInfo.latitude}° N, {hotelInfo.longitude}° E</span>
              </div>
            )}
          </div>
        </div>
      </section>
    ),
    instagram: (
      <section 
        key="instagram"
        onClick={(e) => {
          if (!hotelInfo.instagramHandle) {
            triggerEdit('contact', e);
          } else {
            window.open(`https://instagram.com/${hotelInfo.instagramHandle}`, '_blank');
          }
        }}
        className={`py-8 px-4 bg-[#EBF0EC] border-t border-[#D8E2DC] relative group transition cursor-pointer ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Media Links
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-2 text-[#556B2F] text-5xs tracking-widest font-bold uppercase justify-center font-sans">
            <InstagramIcon className="w-3.5 h-3.5 text-[#E07A5F]" />
            <span>
              {hotelInfo.instagramHandle 
                ? `Follow Our Natural Escape @${hotelInfo.instagramHandle}` 
                : "Connect Instagram in Contact settings to show feed"}
            </span>
          </div>
          {hotelInfo.instagramHandle ? (
            <div className="grid grid-cols-5 gap-1.5">
              {instagramMock.map((url, index) => (
                <div key={index} className="aspect-square relative overflow-hidden rounded-xl border border-[#D8E2DC] group/insta">
                  <img src={url} alt="Social feed" className="w-full h-full object-cover group-hover/insta:scale-103 transition duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/insta:opacity-100 flex items-center justify-center transition duration-200">
                    <span className="text-[8px] font-bold tracking-wider text-white font-sans">FOLLOW</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-100/50 rounded-xl border border-zinc-200 font-medium">
              No Instagram handle configured. Click to add your Instagram ID in Contact settings.
            </div>
          )}
        </div>
      </section>
    )
  };

  const activeCustomPage = customPages.find(p => `/pages/${p.slug}` === previewPath);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto bg-[#FAF6F0] text-[#333D29] relative"
      style={{ fontFamily: "'Lexend', 'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="bg-[#FAF6F0] relative z-10 shadow-2xl">
      {/* 1. HEADER (LOGO + MENU BAR) — TRANS-OVERLAY */}
      <nav className={`px-5 lg:px-8 py-3.5 flex items-center justify-between transition-all duration-500 ease-in-out z-30 sticky top-0 left-0 right-0 w-full mb-[-58px] ${
        isScrolled 
          ? 'bg-[#FAF6F0]/75 backdrop-blur-lg border-b border-[#D8E2DC]/70 shadow-[0_4px_30px_rgba(61,64,43,0.05)]' 
          : 'bg-transparent border-b border-white/10'
      }`}>

        {/* Logo */}
        <div 
          onClick={(e) => triggerEdit('property', e)}
          className={`flex items-center gap-2 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-1 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-4' : ''}`}
        >
          {canvasMode === 'editor' && (
            <span className="absolute -top-7 -left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-40 opacity-0 group-hover:opacity-100 transition whitespace-nowrap font-sans font-normal">
              ✏️ Edit Logo
            </span>
          )}
          {hotelInfo.logoUrl ? (
            <img src={hotelInfo.logoUrl} alt={hotelInfo.name} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <h1 
              onClick={() => setPreviewPath('/')} 
              className={`font-semibold text-xs tracking-[0.2em] uppercase transition-colors duration-500`}
              style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif", color: isScrolled ? '#3D405B' : '#ffffff' }}
            >
              {hotelInfo.name}
            </h1>
          )}
        </div>

        {/* Desktop Nav — The Bend Club style: uppercase tight tracking with '+' separators */}
        <div className={`hidden lg:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-medium transition-colors duration-500 ${
          isScrolled ? 'text-[#556B2F]' : 'text-white/90'
        }`}>
          {activeMenuItems.map((id, idx) => {
            const item = menuMap[id];
            if (!item) return null;
            return (
              <React.Fragment key={id}>
                <a 
                  href={item.href} 
                  onClick={(e) => {
                    e.preventDefault();
                    setPreviewPath('/');
                    setTimeout(() => {
                      const target = document.querySelector(item.href);
                      if (target) target.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isScrolled 
                      ? 'hover:text-[#E07A5F] opacity-90 hover:bg-[#E8E2D6]/50' 
                      : 'hover:text-white opacity-85 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </a>
                {idx < activeMenuItems.length - 1 && (
                  <span className={`text-[8px] select-none opacity-40 ${
                    isScrolled ? 'text-[#8FA89B]' : 'text-white'
                  }`}>+</span>
                )}
              </React.Fragment>
            );
          })}
          {customPages.filter(p => p.active).map(page => (
            <button
              key={page.id}
              onClick={() => setPreviewPath(`/pages/${page.slug}`)}
              className={`px-3 py-1.5 rounded-lg bg-transparent border-none cursor-pointer font-medium text-[9px] uppercase tracking-[0.22em] transition-all duration-200 ${
                isScrolled 
                  ? 'text-[#556B2F] hover:text-[#E07A5F] opacity-90 hover:bg-[#E8E2D6]/50' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>

        {/* Right: CTA + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedRoomId(rooms[0]?.id || '');
              setIsBookingOpen(true);
              setBookingStep('details');
            }}
            className={`font-bold text-[9px] uppercase tracking-[0.2em] px-5 py-2 rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${
              isScrolled 
                ? 'bg-[#8FA89B] hover:bg-[#7D9387] text-white shadow-sm' 
                : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/40'
            }`}
          >
            Book Now
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className={`lg:hidden p-2 rounded-lg transition-all duration-300 cursor-pointer ${
              isScrolled 
                ? 'border border-[#D8E2DC] text-[#556B2F] hover:bg-[#E8E2D6]' 
                : 'border border-white/25 text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="21" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hamburger overlay drawer — glassmorphic panel */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Blurred backdrop — tap to close */}
          <div 
            className="absolute inset-0 bg-[#1C2416]/65 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          {/* Slide-in panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-[#FAF6F0]/97 backdrop-blur-2xl border-l border-[#D8E2DC]/60 shadow-[−20px_0_60px_rgba(0,0,0,0.15)] flex flex-col animate-in slide-in-from-right duration-300">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D8E2DC]/70">
              <span 
                className="font-medium text-xs uppercase tracking-[0.22em] text-[#3D405B]"
                style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}
              >
                {hotelInfo.name}
              </span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#556B2F] hover:bg-[#E8E2D6] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav links — styled like The Bend Club with generous padding */}
            <div className="flex-1 py-4 px-3 overflow-y-auto">
              {activeMenuItems.map(id => {
                const item = menuMap[id];
                if (!item) return null;
                return (
                  <a
                    key={id}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      setPreviewPath('/');
                      setTimeout(() => {
                        const target = document.querySelector(item.href);
                        if (target) target.scrollIntoView({ behavior: 'smooth' });
                      }, 150);
                    }}
                    className="flex items-center justify-between px-3 py-3.5 rounded-xl text-[10px] uppercase tracking-[0.22em] font-medium text-[#333D29] hover:text-[#E07A5F] hover:bg-[#E8E2D6]/60 transition-all duration-200 cursor-pointer block"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3 h-3 opacity-30" />
                  </a>
                );
              })}
              {customPages.filter(p => p.active).map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setPreviewPath(`/pages/${page.slug}`);
                  }}
                  className="flex items-center justify-between w-full px-3 py-3.5 rounded-xl text-[10px] uppercase tracking-[0.22em] font-medium text-[#333D29] hover:text-[#E07A5F] hover:bg-[#E8E2D6]/60 transition-all duration-200 cursor-pointer bg-transparent border-none"
                >
                  <span>{page.title}</span>
                  <ChevronRight className="w-3 h-3 opacity-30" />
                </button>
              ))}
            </div>

            {/* Book CTA at bottom */}
            <div className="p-5 border-t border-[#D8E2DC]/70">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setSelectedRoomId(rooms[0]?.id || '');
                  setIsBookingOpen(true);
                  setBookingStep('details');
                }}
                className="bg-[#8FA89B] hover:bg-[#7D9387] active:scale-[0.98] text-white font-semibold text-[10px] uppercase tracking-[0.22em] py-3 rounded-full transition-all duration-200 w-full shadow-sm text-center block cursor-pointer"
              >
                Book Your Stay
              </button>
              <p className="text-center text-[9px] text-zinc-400 mt-3 tracking-wider uppercase">Check availability online</p>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Path Router Content Switch */}
      {previewPath === '/' ? (
        // Homepage Layout sections loop
        sectionOrder
          .filter(id => !disabledSections.includes(id))
          .map(id => sectionComponents[id])
      ) : activeCustomPage ? (
        // Individual preset layout custom page renderer
        <CustomPageRenderer page={activeCustomPage} />
      ) : (
        <div className="py-24 text-center space-y-4">
          <h2 className="text-lg font-serif text-[#3D405B] uppercase font-bold">404: Page Not Found</h2>
          <button onClick={() => setPreviewPath('/')} className="bg-[#8FA89B] text-white font-bold text-xs px-5 py-2 rounded-full uppercase tracking-wider">
            Back to Home
          </button>
        </div>
      )}

      </div>

      {/* 14. FOOTER — Creative Redesign WITH CURTAIN REVEAL */}
      <footer 
        onClick={(e) => triggerEdit('contact', e)}
        className={`bg-[#1C2416] text-[#D8E2DC] overflow-hidden group transition cursor-pointer sticky bottom-0 z-0 ${
          canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
        }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Contact Info
          </span>
        )}

        {/* Decorative top border gradient */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#8FA89B]/50 to-transparent" />

        {/* Main footer grid */}
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-10 grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          {/* Brand column */}
          <div className="space-y-4 md:col-span-1">
            {hotelInfo.logoUrl ? (
              <img src={hotelInfo.logoUrl} alt={hotelInfo.name} className="h-10 max-w-[160px] object-contain brightness-0 invert" />
            ) : (
              <h4 
                className="text-white font-light text-xl tracking-[0.12em] uppercase"
                style={{ fontFamily: "'Cormorant Garamond', 'Fraunces', serif" }}
              >
                {hotelInfo.name}
              </h4>
            )}
            <p className="text-[11px] text-[#8FA89B] leading-relaxed font-light">
              {hotelInfo.shortDescription || hotelInfo.description || 'A natural escape crafted for your soul.'}
            </p>
            {/* Star rating dots */}
            <div className="flex gap-1 items-center">
              {Array.from({ length: hotelInfo.starRating }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 text-[#E07A5F] fill-current" />
              ))}
              <span className="text-[9px] text-[#8FA89B] uppercase tracking-widest ml-1">{hotelInfo.starRating} Star</span>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-5">
            <h5 className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8FA89B] border-b border-[#8FA89B]/20 pb-2">Contact Us</h5>
            <ul className="space-y-3 text-[11px] font-light">
              {hotelInfo.phone && (
                <li className="flex items-center gap-2.5 text-[#D8E2DC]">
                  <Phone className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                  <span>{hotelInfo.phone}</span>
                </li>
              )}
              {hotelInfo.email && (
                <li className="flex items-center gap-2.5 text-[#D8E2DC]">
                  <Mail className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                  <span>{hotelInfo.email}</span>
                </li>
              )}
              {hotelInfo.address && (
                <li className="flex items-start gap-2.5 text-[#D8E2DC]">
                  <MapPin className="w-3.5 h-3.5 text-[#E07A5F] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{hotelInfo.address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Stay info */}
          <div className="space-y-5">
            <h5 className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8FA89B] border-b border-[#8FA89B]/20 pb-2">Stay Info</h5>
            <ul className="space-y-3 text-[11px] font-light text-[#D8E2DC]">
              <li className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[#8FA89B]">Check-in</span>
                  <span>After {hotelInfo.checkInTime || '14:00'}</span>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-[#8FA89B]">Check-out</span>
                  <span>Before {hotelInfo.checkOutTime || '11:00'}</span>
                </div>
              </li>
              {hotelInfo.instagramHandle && (
                <li className="flex items-center gap-2.5">
                  <InstagramIcon className="w-3.5 h-3.5 text-[#E07A5F] shrink-0" />
                  <span>@{hotelInfo.instagramHandle}</span>
                </li>
              )}
            </ul>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedRoomId(rooms[0]?.id || ''); setIsBookingOpen(true); setBookingStep('details'); }}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white text-[9px] font-bold uppercase tracking-widest rounded-full transition duration-200 cursor-pointer"
            >
              Book Your Stay
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#8FA89B]/15 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[9px] text-[#556B2F] uppercase tracking-[0.2em] font-sans">
            © {new Date().getFullYear()} {hotelInfo.name.toUpperCase()} · All Rights Reserved
          </p>
          <p className="text-[9px] text-[#556B2F]/60 uppercase tracking-[0.15em] font-sans">
            Powered by BoltLabs
          </p>
        </div>
      </footer>

      {/* ===== POPUPS / OVERLAYS ===== */}

      {/* About Read More Popup */}
      {isAboutPopupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAboutPopupOpen(false)}>
          <div className="bg-[#FAF6F0] rounded-3xl max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#D8E2DC] animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#D8E2DC] flex items-center justify-between">
              <h3 className="font-medium text-[#3D405B] text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>About {hotelInfo.name}</h3>
              <button onClick={() => setIsAboutPopupOpen(false)} className="w-8 h-8 rounded-full bg-[#E8E2D6] flex items-center justify-center text-[#3D405B] hover:bg-[#D8E2DC] transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="text-[0.9rem] leading-[1.8] text-zinc-655 font-light text-left [&_p]:mb-3.5 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:bg-zinc-150 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:font-mono [&_a]:text-blue-600 [&_a]:underline whitespace-normal"
                dangerouslySetInnerHTML={{ __html: hotelInfo.detailedDescription || '' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Amenities Show More Popup */}
      {isAmenitiesPopupOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAmenitiesPopupOpen(false)}>
          <div className="bg-[#FAF6F0] rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#D8E2DC] animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#D8E2DC] flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#3D405B] text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>All Amenities</h3>
                <p className="text-[10px] text-[#8FA89B] uppercase tracking-wider mt-0.5">{hotelInfo.generalAmenities?.length || 0} amenities available</p>
              </div>
              <button onClick={() => setIsAmenitiesPopupOpen(false)} className="w-8 h-8 rounded-full bg-[#E8E2D6] flex items-center justify-center text-[#3D405B] hover:bg-[#D8E2DC] transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(hotelInfo.generalAmenities || []).map((amenity, idx) => (
                <div key={idx} className="bg-white border border-[#D8E2DC] rounded-xl p-3 flex items-center gap-3 hover:border-[#8FA89B]/50 transition">
                  {getAmenityIcon(amenity)}
                  <span className="text-[11px] text-[#333D29] font-semibold leading-tight">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Read More Popup */}
      {reviewPopupContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewPopupContent(null)}>
          <div className="bg-[#FAF6F0] rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#D8E2DC] animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#D8E2DC] flex items-center justify-between">
              <div className="flex gap-0.5 text-[#E07A5F]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < reviewPopupContent.rating ? 'fill-current' : 'opacity-20'}`} />
                ))}
              </div>
              <button onClick={() => setReviewPopupContent(null)} className="w-8 h-8 rounded-full bg-[#E8E2D6] flex items-center justify-center text-[#3D405B] hover:bg-[#D8E2DC] transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[0.9rem] leading-[1.8] text-zinc-600 font-light">&ldquo;{reviewPopupContent.content}&rdquo;</p>
              <div className="border-t border-[#D8E2DC]/50 pt-4">
                <p className="text-[12px] text-zinc-600 font-medium">{reviewPopupContent.author}</p>
                {reviewPopupContent.stayDate && <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{reviewPopupContent.stayDate}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Lightbox */}
      {galleryLightboxIdx !== null && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setGalleryLightboxIdx(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryLightboxIdx(prev => prev !== null ? Math.max(0, prev - 1) : null); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={(lightboxImages.length > 0 ? lightboxImages : hotelInfo.heroImages || [])[galleryLightboxIdx]}
              alt={`Gallery image ${galleryLightboxIdx + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
              {galleryLightboxIdx + 1} / {(lightboxImages.length > 0 ? lightboxImages : hotelInfo.heroImages || []).length}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryLightboxIdx(prev => prev !== null ? Math.min((lightboxImages.length > 0 ? lightboxImages : hotelInfo.heroImages || []).length - 1, prev + 1) : null); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer z-10"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setGalleryLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Booking Drawer overlay */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-0 font-sans">
          <div className="bg-[#FAF6F0] w-full max-w-md rounded-t-3xl border-t border-[#8FA89B] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 border-b border-[#D8E2DC] flex items-center justify-between bg-[#EBF0EC]">
              <h3 className="font-bold text-[#3D405B] text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-[#8FA89B]" />
                <span>Reserve Room Checkout</span>
              </h3>
              <button onClick={() => setIsBookingOpen(false)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left text-zinc-700">
              {bookingStep === 'details' ? (
                <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
                  
                  {/* dates selected display */}
                  <div className="bg-[#8FA89B]/10 border border-[#8FA89B]/25 p-3 rounded-2xl flex justify-between items-center text-3xs text-[#333D29] font-bold tracking-wider uppercase">
                    <div>
                      <span className="text-[8px] text-zinc-400 block">CHECK-IN</span>
                      <span>{checkIn}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#8FA89B]" />
                    <div>
                      <span className="text-[8px] text-zinc-400 block">CHECK-OUT</span>
                      <span>{checkOut}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-zinc-400 block">LENGTH</span>
                      <span>{totals.nights} Nights</span>
                    </div>
                  </div>

                  {/* Date Changer inputs inside drawer */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Change Check-In</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-2.5 py-1.5 text-3xs text-zinc-800 outline-hidden font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Change Check-Out</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-2.5 py-1.5 text-3xs text-zinc-800 outline-hidden font-mono"
                      />
                    </div>
                  </div>

                  {/* Guest count */}
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Guests Count</label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full bg-white border border-[#D8E2DC] rounded-xl px-2.5 py-1.5 text-3xs text-zinc-800 outline-hidden"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                    </select>
                  </div>

                  {/* Room Config Summary */}
                  {selectedRoom && (
                    <div className="space-y-1.5 p-3 bg-white border border-[#D8E2DC] rounded-2xl">
                      <span className="text-[8px] text-zinc-400 font-bold uppercase">Suite Selected</span>
                      <h4 className="font-bold text-[#3D405B] text-xs tracking-wide uppercase">{selectedRoom.name}</h4>
                      <span className="text-[10px] font-black text-[#E07A5F] block">
                        Rate: ${selectedRoom.basePrice}/night
                      </span>
                    </div>
                  )}

                  {/* Upsell Addons cards inside Booking Drawer */}
                  {addons.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[8px] text-zinc-400 font-bold uppercase block">Add Upsells to stay</span>
                      <div className="space-y-2.5">
                        {addons.map(addon => {
                          const qty = addonQuantities[addon.name] || 0;
                          return (
                            <div
                              key={addon.id}
                              className="flex items-center justify-between p-2.5 border rounded-2xl bg-white border-[#D8E2DC] text-left"
                            >
                              <div className="pr-2 max-w-[65%]">
                                <span className="block font-bold uppercase text-[#3D405B] truncate text-3xs">{addon.name}</span>
                                <span className="text-[8px] text-zinc-450 leading-none block mt-0.5 line-clamp-1">{addon.description}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#E07A5F] text-[10px] shrink-0">+${addon.price}</span>
                                
                                {/* Quantity selector inside checkout */}
                                <div className="flex items-center bg-[#FAF6F0] border border-[#D8E2DC] rounded-full p-0.5 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() => decrementAddon(addon.name)}
                                    className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center text-[#3D405B] text-[10px]">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => incrementAddon(addon.name)}
                                    className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Coupons codes */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] text-zinc-400 font-bold uppercase block">Coupon / Promo Code</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="WELCOME10"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.5 text-xs text-zinc-800 outline-hidden uppercase font-bold tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-1.5 bg-[#8FA89B] text-white rounded-xl text-xs font-bold hover:bg-[#7D9387] transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-rose-500 font-bold">{couponError}</p>}
                    {appliedCouponCode && (
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5 font-bold" />
                        <span>Promo Code {appliedCouponCode} Applied!</span>
                      </p>
                    )}
                  </div>

                  {/* Checkout guest inputs */}
                  <div className="space-y-2.5 pt-2.5 border-t border-[#D8E2DC]">
                    <span className="text-[8px] text-zinc-450 font-bold uppercase block">Guest Details</span>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        required
                        placeholder="Your Full Name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                        />
                        <input
                          type="tel"
                          placeholder="Phone Number"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown summary */}
                  <div className="p-4 bg-white rounded-2xl border border-[#D8E2DC] space-y-2 text-3xs font-semibold uppercase tracking-wider font-sans">
                    <div className="flex justify-between text-zinc-450">
                      <span>Stay Subtotal ({totals.nights} Nights)</span>
                      <span>${totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Promo Coupon discount</span>
                        <span>-${totals.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.addonTotal > 0 && (
                      <div className="flex justify-between text-zinc-455">
                        <span>Stay Add-ons</span>
                        <span>+${totals.addonTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-xs text-[#3D405B] border-t border-[#D8E2DC] pt-2">
                      <span>Total Invoice</span>
                      <span className="text-[#E07A5F]">${totals.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm duration-300 cursor-pointer"
                  >
                    Confirm & Book Stay
                  </button>

                </form>
              ) : (
                <div className="py-8 text-center space-y-4 font-sans animate-in fade-in duration-300">
                  <div className="w-12 h-12 bg-[#8FA89B]/10 text-[#8FA89B] rounded-full border border-[#8FA89B]/25 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-[#3D405B] text-xs uppercase tracking-wider">Booking Logged Successfully!</h4>
                    <p className="text-[10px] text-zinc-450 tracking-wider">REFERENCE REF: {confirmedBookingRef}</p>
                    <p className="text-2xs text-zinc-550 max-w-[240px] mx-auto pt-2 leading-relaxed lowercase">
                      Thanks for booking. We have logged this reservation on your administrator dashboard.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsBookingOpen(false)}
                    className="px-6 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-500 text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standalone Event Booking Drawer Overlay */}
      {isEventBookingOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-0 font-sans animate-in fade-in duration-150">
          <div className="bg-[#FAF6F0] w-full max-w-md rounded-t-3xl border-t border-[#8FA89B] overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom duration-350">
            {/* Header */}
            <div className="p-4 border-b border-[#D8E2DC] flex items-center justify-between bg-[#EBF0EC]">
              <h3 className="font-bold text-[#3D405B] text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-[#8FA89B]" />
                <span>Reserve Event Pass</span>
              </h3>
              <button onClick={() => setIsEventBookingOpen(false)} className="p-1 rounded-lg text-zinc-550 hover:text-zinc-900 transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left text-zinc-700">
              {eventBookingStep === 'details' ? (
                <form onSubmit={handleCreateEventBooking} className="space-y-4 text-xs font-sans">
                  
                  {/* Event Detail Summary Card */}
                  <div className="p-4 bg-white border border-[#D8E2DC] rounded-2xl space-y-2 relative">
                    <span className="bg-[#8FA89B]/10 text-[#8FA89B] border border-[#8FA89B]/25 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                      {selectedEvent.category}
                    </span>
                    <h4 className="font-bold text-[#3D405B] text-xs uppercase leading-tight pt-1">{selectedEvent.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">{selectedEvent.description}</p>
                    
                    <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] font-extrabold uppercase text-[#556B2F]">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-zinc-400" /> {selectedEvent.time}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-zinc-400" /> {selectedEvent.date}</span>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between p-3 bg-white border border-[#D8E2DC] rounded-2xl">
                    <span className="font-bold text-[#3D405B] uppercase text-[10px]">Number of Guests</span>
                    <div className="flex items-center bg-[#FAF6F0] border border-[#D8E2DC] rounded-full p-0.5 font-bold">
                      <button
                        type="button"
                        onClick={() => setEventGuestsCount(prev => Math.max(1, prev - 1))}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-[#3D405B]">{eventGuestsCount}</span>
                      <button
                        type="button"
                        onClick={() => setEventGuestsCount(prev => Math.min(selectedEvent.capacity, prev + 1))}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="Email Address"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-450 font-bold uppercase tracking-wider block">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-1.8 text-xs text-zinc-800 outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Invoice Summary */}
                  <div className="p-4 bg-white rounded-2xl border border-[#D8E2DC] flex justify-between font-black text-xs text-[#3D405B]">
                    <span>Total Day Pass Price</span>
                    <span className="text-[#E07A5F]">${(selectedEvent.price * eventGuestsCount).toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Confirm Event Booking
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4 font-sans animate-in fade-in duration-300">
                  <div className="w-12 h-12 bg-[#8FA89B]/10 text-[#8FA89B] rounded-full border border-[#8FA89B]/25 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 font-bold" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h4 className="font-bold text-[#3D405B] text-xs uppercase tracking-wider">Event Pass Booked!</h4>
                    <p className="text-2xs text-zinc-550 max-w-[240px] mx-auto pt-2 leading-relaxed lowercase">
                      Your day package details have been logged in the administrator bookings calendar.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEventBookingOpen(false)}
                    className="px-6 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-500 text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Seeding slides helper
const heroSlides = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200"
];
