import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useHotel } from '../../context/HotelContext';
import { CustomPageRenderer } from './CustomPageRenderer';
import { BentoGallery } from '../ui/bento-gallery';
import { StaggerTestimonials } from '@/components/ui/stagger-testimonials';
import InteractiveSelector from '@/components/ui/interactive-selector';
import ImageReveal from '@/components/ui/image-tiles';
import { FullGalleryModal } from '@/components/ui/FullGalleryModal';
import { TravelCard } from '@/components/ui/card-7';
import {
  Star, Phone, Mail,
  MapPin, Check, ChevronRight, X, Sparkles, MessageCircle,
  Clock, Shield, Calendar, ChevronDown, ChevronUp, ArrowRight,
  ChevronLeft, Tag, Search, Compass, Car
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { searchPlaces } from '../../services/PlacesService';

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

const formatDateToDDMMYYYY = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

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

const getRoomPriceForGuests = (room: any, guestCount: number) => {
  if (!room.price_tiers || Object.keys(room.price_tiers).length === 0) {
    return room.basePrice;
  }
  const key = String(guestCount);
  if (room.price_tiers[key] !== undefined) {
    return room.price_tiers[key];
  }
  const sortedTiers = Object.entries(room.price_tiers)
    .map(([g, price]) => ({ guests: Number(g), price: Number(price) }))
    .sort((a, b) => a.guests - b.guests);
  
  if (sortedTiers.length === 0) return room.basePrice;

  let match = sortedTiers[0].price;
  for (const tier of sortedTiers) {
    if (guestCount >= tier.guests) {
      match = tier.price;
    }
  }
  return match;
};



const distributeAdultsAndChildren = (roomsList: any[], adults: number, children: number) => {
  const distribution = roomsList.map(() => ({ adults: 0, children: 0 }));
  if (roomsList.length === 0) return distribution;
  
  let remainingAdults = adults;
  let remainingChildren = children;

  // Phase 1: Give 1 adult to each room first (activation)
  for (let i = 0; i < roomsList.length && remainingAdults > 0; i++) {
    distribution[i].adults = 1;
    remainingAdults--;
  }
  
  // If we ran out of adults, use children to activate remaining rooms
  if (remainingAdults === 0) {
    for (let i = 0; i < roomsList.length && remainingChildren > 0; i++) {
      if (distribution[i].adults === 0) {
        distribution[i].children = 1;
        remainingChildren--;
      }
    }
  }
  
  // Phase 2: Fill up to base occupancy (adults first, then children)
  for (let i = 0; i < roomsList.length; i++) {
    const baseOcc = roomsList[i].base_occupancy || roomsList[i].capacityAdults || 2;
    
    // Fill with adults up to base occupancy
    const currentGuests = distribution[i].adults + distribution[i].children;
    const adultSpace = Math.max(0, baseOcc - currentGuests);
    const addAdults = Math.min(adultSpace, remainingAdults);
    distribution[i].adults += addAdults;
    remainingAdults -= addAdults;
    
    // Fill with children up to base occupancy
    const currentGuestsAfterAdults = distribution[i].adults + distribution[i].children;
    const childSpace = Math.max(0, baseOcc - currentGuestsAfterAdults);
    const addChilds = Math.min(childSpace, remainingChildren);
    distribution[i].children += addChilds;
    remainingChildren -= addChilds;
  }
  
  // Phase 3: Fill up to max capacity
  for (let i = 0; i < roomsList.length; i++) {
    const maxCap = roomsList[i].capacityAdults || 2;
    
    // Fill with adults up to max capacity
    const currentGuests = distribution[i].adults + distribution[i].children;
    const adultSpace = Math.max(0, maxCap - currentGuests);
    const addAdults = Math.min(adultSpace, remainingAdults);
    distribution[i].adults += addAdults;
    remainingAdults -= addAdults;
    
    // Fill with children up to max capacity
    const currentGuestsAfterAdults = distribution[i].adults + distribution[i].children;
    const childSpace = Math.max(0, maxCap - currentGuestsAfterAdults);
    const addChilds = Math.min(childSpace, remainingChildren);
    distribution[i].children += addChilds;
    remainingChildren -= addChilds;
  }
  
  // Fallback: put remaining guests in the first room
  if (remainingAdults > 0) {
    distribution[0].adults += remainingAdults;
  }
  if (remainingChildren > 0) {
    distribution[0].children += remainingChildren;
  }
  
  return distribution;
};

const getRecommendationDescription = (roomList: any[], distribution: any[]) => {
  const parts = roomList.map((room, idx) => {
    const dist = distribution[idx] || { adults: 1, children: 0 };
    const totalGuestsInRoom = dist.adults + dist.children;
    const baseOcc = room.base_occupancy || room.capacityAdults || 2;
    const extraBedsNeeded = Math.max(0, totalGuestsInRoom - baseOcc);
    
    let desc = `${room.bedType || 'Queen Bed'}`;
    if (extraBedsNeeded > 0) {
      desc += ` + ${extraBedsNeeded} Extra Bed${extraBedsNeeded > 1 ? 's' : ''}`;
    }
    return `${room.name} (${desc})`;
  });
  return parts.join(' and ');
};

export const OrganicTemplate: React.FC = () => {
  const {
    hotelInfo, rooms, pricing, addons, coupons, bookings,
    testimonials, faqs, policies, addBooking, canvasMode, setSelectedView, setEditorFocus,
    guestEvents, customPages, previewPath, setPreviewPath,
    managedPhotos, getAvailableInventory, gstSettings
  } = useHotel();

  const policyEnabled = hotelInfo.childPolicyEnabled !== false;
  const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;

  // Distance / Map Navigation calculator states
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [mapDistanceInfo, setMapDistanceInfo] = useState<{
    distance: number;
    time: string;
    origin: string;
  } | null>(null);
  const [isMapLocating, setIsMapLocating] = useState(false);
  const [mapLocateError, setMapLocateError] = useState<string | null>(null);
  const [mapRouteOrigin, setMapRouteOrigin] = useState<string | null>(null);
  const preventSearchRef = useRef(false);

  // Haversine formula helper
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatTravelTime = (distanceKm: number) => {
    const totalMinutes = Math.round(distanceKm * 1.35 + 5); // 1.35 mins/km average driving + 5m buffer
    if (totalMinutes < 60) {
      return `${totalMinutes} mins`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
  };

  // Debounced places autocomplete search
  useEffect(() => {
    if (preventSearchRef.current) {
      preventSearchRef.current = false;
      return;
    }
    if (!mapSearchQuery.trim() || mapSearchQuery === 'Your Current Location' || mapSearchQuery.length < 3) {
      setMapSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(mapSearchQuery);
        setMapSuggestions(results);
      } catch (err) {
        console.error('Error fetching places:', err);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  const handleSelectMapSuggestion = (place: any) => {
    preventSearchRef.current = true;
    setMapSearchQuery(place.formattedAddress);
    setMapSuggestions([]);

    if (place.location && hotelInfo.latitude && hotelInfo.longitude) {
      const dist = getHaversineDistance(
        place.location.latitude,
        place.location.longitude,
        hotelInfo.latitude,
        hotelInfo.longitude
      );
      const driveDist = Math.round(dist * 1.3 * 10) / 10;
      setMapDistanceInfo({
        distance: driveDist,
        time: formatTravelTime(driveDist),
        origin: place.displayName || place.formattedAddress,
      });
      setMapRouteOrigin(`${place.location.latitude},${place.location.longitude}`);
    } else {
      setMapRouteOrigin(place.formattedAddress);
      setMapDistanceInfo(null);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapLocateError('Geolocation not supported by browser.');
      return;
    }
    setIsMapLocating(true);
    setMapLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (hotelInfo.latitude && hotelInfo.longitude) {
          const dist = getHaversineDistance(
            latitude,
            longitude,
            hotelInfo.latitude,
            hotelInfo.longitude
          );
          const driveDist = Math.round(dist * 1.3 * 10) / 10;
          setMapDistanceInfo({
            distance: driveDist,
            time: formatTravelTime(driveDist),
            origin: 'Your Current Location',
          });
          setMapRouteOrigin(`${latitude},${longitude}`);
          setMapSearchQuery('Your Current Location');
        }
        setIsMapLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setMapLocateError('Unable to get current location. Please type manually.');
        setIsMapLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Booking Widget States
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const handleCheckInChange = (newVal: string) => {
    setCheckIn(newVal);
    const start = new Date(newVal);
    const end = new Date(checkOut);
    if (!isNaN(start.getTime())) {
      if (isNaN(end.getTime()) || end <= start) {
        const nextDay = addDays(start, 1);
        setCheckOut(format(nextDay, 'yyyy-MM-dd'));
      }
    }
  };

  const handleCheckOutChange = (newVal: string) => {
    setCheckOut(newVal);
    const start = new Date(checkIn);
    const end = new Date(newVal);
    if (!isNaN(end.getTime())) {
      if (isNaN(start.getTime()) || end <= start) {
        const prevDay = addDays(end, -1);
        setCheckIn(format(prevDay, 'yyyy-MM-dd'));
      }
    }
  };
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [promoCode, setPromoCode] = useState('');

  // Active offers slider states
  const [activeOfferIdx, setActiveOfferIdx] = useState(0);
  const offersList = hotelInfo.offers || [];
  useEffect(() => {
    if (offersList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveOfferIdx(prev => (prev + 1) % offersList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [offersList.length]);

  // Modal / Drawer state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'success'>('details');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<string | null>(null);

  // Standalone Event Booking drawer state
  const [isEventBookingOpen, setIsEventBookingOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventBookingStep, setEventBookingStep] = useState<'details' | 'success'>('details');
  const [eventSelectedSlotId, setEventSelectedSlotId] = useState<string>('');
  const [eventAdultsCount, setEventAdultsCount] = useState(1);
  const [eventChildrenCount, setEventChildrenCount] = useState(0);
  const [eventChildrenAges, setEventChildrenAges] = useState<number[]>([]);

  // Guest details form
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isOtpPopupOpen, setIsOtpPopupOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [paymentSelection, setPaymentSelection] = useState<'full' | 'partial'>('full');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const [showGstBreakdown, setShowGstBreakdown] = useState(false);

  // FAQ states
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Policy states
  const [openPolicyId, setOpenPolicyId] = useState<string | null>(null);
  const [isPoliciesPopupOpen, setIsPoliciesPopupOpen] = useState(false);

  // Active Hero Slide Index (For Carousel Hero Style)
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);


  // About section popup
  const [isAboutPopupOpen, setIsAboutPopupOpen] = useState(false);

  // Amenities popup
  const [isAmenitiesPopupOpen, setIsAmenitiesPopupOpen] = useState(false);

  // Review read-more popup
  const [reviewPopupContent, setReviewPopupContent] = useState<{ author: string; content: string; rating: number; stayDate: string } | null>(null);
  const [popoverCombo, setPopoverCombo] = useState<any | null>(null);

  // Full gallery modal
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedAddonDetail, setSelectedAddonDetail] = useState<any | null>(null);
  const [showAllAddons, setShowAllAddons] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Dynamic Multi-Room Booking & Occupancy States
  const [selectedRoomsList, setSelectedRoomsList] = useState<any[]>([]);
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1);
  const [selectedMealPlan, setSelectedMealPlan] = useState<'ep' | 'cp' | 'map' | 'ap'>('ep');

  const [activeSelectionTab, setActiveSelectionTab] = useState<'smart' | 'custom'>('smart');
  const [roomAdultsCount, setRoomAdultsCount] = useState<Record<string, number>>({});
  const [roomKidsCount, setRoomKidsCount] = useState<Record<string, number>>({});
  const [roomKidsAges, setRoomKidsAges] = useState<Record<string, number[]>>({});

  const stayNights = differenceInDays(new Date(checkOut), new Date(checkIn)) || 0;

  // Generate stay dates list
  const stayDatesList = useMemo(() => {
    if (!checkIn || !checkOut || stayNights <= 0) return [];
    try {
      const start = new Date(checkIn);
      return Array.from({ length: stayNights }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return {
          dateStr: format(d, 'yyyy-MM-dd'),
          displayStr: format(d, 'dd.MM.yy')
        };
      });
    } catch {
      return [];
    }
  }, [checkIn, checkOut, stayNights]);

  // Check inventory status for all room categories across select stay dates
  const roomInventoryStatuses = useMemo(() => {
    const statusMap: Record<string, { selectable: boolean; datesInfo: { dateStr: string; displayStr: string; avail: number }[] }> = {};
    
    rooms.forEach(r => {
      let selectable = true;
      const datesInfo = stayDatesList.map((item: any) => {
        const avail = getAvailableInventory(r.id, item.dateStr);
        if (avail <= 0) {
          selectable = false;
        }
        return {
          dateStr: item.dateStr,
          displayStr: item.displayStr,
          avail
        };
      });
      statusMap[r.id] = { selectable, datesInfo };
    });

    return statusMap;
  }, [rooms, stayDatesList, getAvailableInventory]);

  // Automatically sync childrenAges whenever childrenCount changes
  useEffect(() => {
    setChildrenAges(prev => {
      const next = [...prev];
      if (childrenCount > next.length) {
        for (let i = next.length; i < childrenCount; i++) {
          next.push(8);
        }
      }
      return next.slice(0, childrenCount);
    });
  }, [childrenCount]);

  // Calculate adultsCount and childrenCount dynamically when activeSelectionTab is 'custom'
  useEffect(() => {
    if (activeSelectionTab === 'custom') {
      let totalAdults = 0;
      let totalKids = 0;
      const allKidsAges: number[] = [];
      rooms.forEach(r => {
        const qty = selectedRoomsList.filter(x => x.id === r.id).length;
        if (qty > 0) {
          totalAdults += roomAdultsCount[r.id] || (qty * 2);
          const kids = roomKidsCount[r.id] || 0;
          totalKids += kids;
          const ages = roomKidsAges[r.id] || Array(kids).fill(8);
          allKidsAges.push(...ages);
        }
      });
      setAdultsCount(Math.max(1, totalAdults));
      setChildrenCount(totalKids);
      setChildrenAges(allKidsAges);
    }
  }, [activeSelectionTab, roomAdultsCount, roomKidsCount, roomKidsAges, selectedRoomsList, rooms]);

  // Reset custom occupancy mappings when booking modal opens/closes
  useEffect(() => {
    if (isBookingOpen) {
      setActiveSelectionTab('smart');
      // Initialize roomAdultsCount and roomKidsCount based on initial selection
      const nextAdults: Record<string, number> = {};
      const nextKids: Record<string, number> = {};
      const nextKidsAges: Record<string, number[]> = {};
      rooms.forEach(r => {
        const count = selectedRoomsList.filter(x => x.id === r.id).length;
        if (count > 0) {
          nextAdults[r.id] = count * 2;
          nextKids[r.id] = 0;
          nextKidsAges[r.id] = [];
        }
      });
      setRoomAdultsCount(nextAdults);
      setRoomKidsCount(nextKids);
      setRoomKidsAges(nextKidsAges);
    } else {
      setSelectedRoomsList([]);
      setRoomAdultsCount({});
      setRoomKidsCount({});
      setRoomKidsAges({});
    }
  }, [isBookingOpen]);

  const handleCustomRoomQuantityChange = (roomId: string, val: number) => {
    const r = rooms.find(x => x.id === roomId);
    if (!r) return;

    setSelectedRoomsList(prev => {
      const currentOfCategory = prev.filter(x => x.id === roomId);
      const otherCategories = prev.filter(x => x.id !== roomId);
      const nextCategoryRooms = [...currentOfCategory];
      if (val > currentOfCategory.length) {
        const diff = val - currentOfCategory.length;
        for (let i = 0; i < diff; i++) {
          nextCategoryRooms.push(r);
        }
      } else if (val < currentOfCategory.length) {
        nextCategoryRooms.splice(val);
      }
      return [...otherCategories, ...nextCategoryRooms];
    });

    if (val > 0) {
      setRoomAdultsCount(prev => ({
        ...prev,
        [roomId]: val * 2
      }));
      setRoomKidsCount(prev => ({
        ...prev,
        [roomId]: prev[roomId] || 0
      }));
      setRoomKidsAges(prev => ({
        ...prev,
        [roomId]: prev[roomId] || []
      }));
    } else {
      setRoomAdultsCount(prev => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      setRoomKidsCount(prev => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      setRoomKidsAges(prev => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    }
  };

  const handleCustomRoomGuestsChange = (roomId: string, type: 'adults' | 'kids', val: number) => {
    if (type === 'adults') {
      setRoomAdultsCount(prev => ({ ...prev, [roomId]: val }));
    } else {
      setRoomKidsCount(prev => ({ ...prev, [roomId]: val }));
      setRoomKidsAges(prev => {
        const currentAges = prev[roomId] || [];
        const nextAges = [...currentAges];
        if (val > nextAges.length) {
          for (let i = nextAges.length; i < val; i++) {
            nextAges.push(8);
          }
        } else if (val < nextAges.length) {
          nextAges.splice(val);
        }
        return {
          ...prev,
          [roomId]: nextAges
        };
      });
    }
  };

  useEffect(() => {
    const def = hotelInfo.defaultMealPlan?.toLowerCase();
    if (def === 'cp' && hotelInfo.mealPlanCpEnabled !== false) {
      setSelectedMealPlan('cp');
    } else {
      setSelectedMealPlan('ep');
    }
  }, [hotelInfo.defaultMealPlan, hotelInfo.mealPlanCpEnabled]);

  const currentSelectedRooms = selectedRoomsList;

  useEffect(() => {
    if (isBookingOpen) {
      if (selectedRoomsList.length === 0 && selectedRoomId) {
        const r = rooms.find(room => room.id === selectedRoomId);
        if (r) {
          setSelectedRoomsList([r]);
        }
      }
    } else {
      setSelectedRoomsList([]);
    }
  }, [isBookingOpen, selectedRoomId, rooms]);

  const selectedEvent = guestEvents.find(e => e.id === selectedEventId);

  const formatTime12h = (time24: string) => {
    if (!time24) return '';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    let hr = parseInt(parts[0]);
    const min = parts[1];
    const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12;
    if (hr === 0) hr = 12;
    return `${String(hr).padStart(2, '0')}:${min} ${ampm}`;
  };

  const convertToDDMMYYYY = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2 && parts[2].length === 4) {
        return dStr;
      }
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dStr;
  };

  const calculateEventBookingPrice = (evt: any, adults: number, childAges: number[]) => {
    if (!evt) return 0;
    const disc = evt.discount ?? 0;
    const baseAdult = evt.priceAdult ?? evt.price ?? 0;
    const baseChild = evt.priceChild ?? evt.price ?? 0;

    const adultPrice = disc > 0 ? Math.round(baseAdult * (1 - disc / 100)) : baseAdult;
    const childPrice = disc > 0 ? Math.round(baseChild * (1 - disc / 100)) : baseChild;

    const policyEnabled = hotelInfo.childPolicyEnabled !== false;
    const minAge = policyEnabled ? (hotelInfo.childPolicyMinAge ?? 5) : 5;
    const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;

    let total = adults * adultPrice;
    childAges.forEach(age => {
      if (age > maxAge) {
        total += adultPrice;
      } else if (age > minAge) {
        total += childPrice;
      } else {
        total += 0; // Free for age <= minAge
      }
    });

    return total;
  };

  const renderEventPrice = (evt: any) => {
    const originalPrice = evt.priceAdult ?? evt.price ?? 0;
    const disc = evt.discount ?? 0;
    if (disc > 0) {
      const discountedPrice = Math.round(originalPrice * (1 - disc / 100));
      return (
        <span className="flex items-center gap-1">
          <span className="line-through text-zinc-400 font-normal">₹{originalPrice.toLocaleString('en-IN')}</span>
          <span className="text-[#E07A5F] font-black">₹{discountedPrice.toLocaleString('en-IN')}</span>
          <span className="text-red-650 font-extrabold text-[8.5px]">({disc}% OFF)</span>
        </span>
      );
    }
    return <span className="text-[#E07A5F] font-black">₹{originalPrice.toLocaleString('en-IN')}</span>;
  };

  const renderEventChildPrice = (evt: any) => {
    const originalPrice = evt.priceChild ?? evt.price ?? 0;
    const disc = evt.discount ?? 0;
    if (disc > 0) {
      const discountedPrice = Math.round(originalPrice * (1 - disc / 100));
      return (
        <span className="flex items-center gap-1">
          <span className="line-through text-zinc-400 font-normal">₹{originalPrice.toLocaleString('en-IN')}</span>
          <span className="text-zinc-650 font-bold">₹{discountedPrice.toLocaleString('en-IN')}</span>
        </span>
      );
    }
    return <span className="text-zinc-650 font-bold">₹{originalPrice.toLocaleString('en-IN')}</span>;
  };

  const [comboValidationError, setComboValidationError] = useState<string | null>(null);

  const calculateAllRoomsStayPrice = (roomList: any[], effAdults: number, effChildren: number, skipOffers?: boolean) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = differenceInDays(end, start);
    if (isNaN(nights) || nights <= 0) return 0;

    const distribution = distributeAdultsAndChildren(roomList, effAdults, effChildren);
    
    let total = 0;
    roomList.forEach((room, idx) => {
      const roomPricing = pricing[room.id] || {};
      const dist = distribution[idx] || { adults: 1, children: 0 };
      
      const baseOcc = room.base_occupancy || room.capacityAdults || 2;
      const baseAdults = Math.min(dist.adults, baseOcc);
      const baseChildren = Math.min(dist.children, baseOcc - baseAdults);
      const baseGuests = baseAdults + baseChildren;
      
      const extraAdults = dist.adults - baseAdults;
      const extraChildren = dist.children - baseChildren;
      
      const baseRate = getRoomPriceForGuests(room, baseGuests);
      const extraAdultRate = hotelInfo.extraAdultRate ?? 0;
      const extraChildRate = hotelInfo.extraChildRate ?? 0;
      
      const isCpBase = hotelInfo.defaultMealPlan === 'CP';
      const cpAdultRate = isCpBase ? (hotelInfo.mealPlanCpAdultRate ?? 300) : 0;
      const cpChildRate = isCpBase ? (hotelInfo.mealPlanCpChildRate ?? 250) : 0;
      
      const cpCostPerNight = (dist.adults * cpAdultRate) + (dist.children * cpChildRate);
      const extraCostPerNight = (extraAdults * extraAdultRate) + (extraChildren * extraChildRate);
      
      for (let i = 0; i < nights; i++) {
        const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
        const override = roomPricing[dateStr];
        const dayBasePrice = override && override.price > 0 ? override.price : baseRate;
        
        let dayCost = dayBasePrice + extraCostPerNight + cpCostPerNight;
        
        // Apply active campaigns for 'rooms' on this date targeting this specific room category
        if (!skipOffers) {
          const activeOffers = (hotelInfo.offers || []).filter(
            (o: any) => o.dates.includes(dateStr) && (o.roomIds || []).includes(room.id)
          );
          activeOffers.forEach((offer: any) => {
            if (offer.discountType === 'percent') {
              dayCost = dayCost * (1 - offer.discountValue / 100);
            } else {
              dayCost = Math.max(0, dayCost - offer.discountValue);
            }
          });
        }
        
        total += Math.round(dayCost);
      }
    });
    return total;
  };

  const calculateRoomsGST = (roomList: any[], effAdults: number, effChildren: number) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = differenceInDays(end, start);
    if (isNaN(nights) || nights <= 0) return 0;

    const distribution = distributeAdultsAndChildren(roomList, effAdults, effChildren);
    
    let totalGST = 0;
    roomList.forEach((room, idx) => {
      const roomPricing = pricing[room.id] || {};
      const dist = distribution[idx] || { adults: 1, children: 0 };
      
      const baseOcc = room.base_occupancy || room.capacityAdults || 2;
      const baseAdults = Math.min(dist.adults, baseOcc);
      const baseChildren = Math.min(dist.children, baseOcc - baseAdults);
      const baseGuests = baseAdults + baseChildren;
      
      const extraAdults = dist.adults - baseAdults;
      const extraChildren = dist.children - baseChildren;
      
      const baseRate = getRoomPriceForGuests(room, baseGuests);
      const extraAdultRate = hotelInfo.extraAdultRate ?? 0;
      const extraChildRate = hotelInfo.extraChildRate ?? 0;
      
      const isCpBase = hotelInfo.defaultMealPlan === 'CP';
      const cpAdultRate = isCpBase ? (hotelInfo.mealPlanCpAdultRate ?? 300) : 0;
      const cpChildRate = isCpBase ? (hotelInfo.mealPlanCpChildRate ?? 250) : 0;
      
      const cpCostPerNight = (dist.adults * cpAdultRate) + (dist.children * cpChildRate);
      const extraCostPerNight = (extraAdults * extraAdultRate) + (extraChildren * extraChildRate);
      
      for (let i = 0; i < nights; i++) {
        const dateStr = format(addDays(start, i), 'yyyy-MM-dd');
        const override = roomPricing[dateStr];
        const dayBasePrice = override && override.price > 0 ? override.price : baseRate;
        
        let dayCost = dayBasePrice + extraCostPerNight + cpCostPerNight;
        
        // Apply active campaigns for 'rooms' on this date targeting this specific room category
        const activeOffers = (hotelInfo.offers || []).filter(
          (o: any) => o.dates.includes(dateStr) && (o.roomIds || []).includes(room.id)
        );
        activeOffers.forEach((offer: any) => {
          if (offer.discountType === 'percent') {
            dayCost = dayCost * (1 - offer.discountValue / 100);
          } else {
            dayCost = Math.max(0, dayCost - offer.discountValue);
          }
        });
        
        const finalDayCost = Math.round(dayCost);
        let rate = 0;
        if (gstSettings && gstSettings.room_slabs && gstSettings.room_slabs.length > 0) {
          const slab = gstSettings.room_slabs.find(
            (s: any) => finalDayCost >= s.min && finalDayCost <= s.max
          );
          if (slab) {
            rate = slab.rate / 100;
          }
        } else {
          if (finalDayCost > 7500) rate = 0.18;
          else if (finalDayCost > 1000) rate = 0.05;
        }
        
        totalGST += Math.round(finalDayCost * rate);
      }
    });
    return totalGST;
  };

  const checkTooManyRooms = (selectedRooms: any[], adults: number, children: number) => {
    // Validate minimum occupancy of the selected rooms
    const combinedMinOccupancy = selectedRooms.reduce((sum, r) => sum + (r.min_occupancy || 1), 0);
    if (adults + children < combinedMinOccupancy) {
      const messages = selectedRooms
        .filter(r => (r.min_occupancy || 1) > 1)
        .map(r => `${r.name} requires a minimum of ${r.min_occupancy} guests`);
      
      return {
        enoughRoomsCount: selectedRooms.length,
        message: messages.length > 0 
          ? messages.join(', ')
          : `Selected rooms require at least ${combinedMinOccupancy} guests total.`
      };
    }

    if (selectedRooms.length <= 1) return null;
    
    // Sort selected rooms by capacityAdults descending
    const sortedRooms = [...selectedRooms].sort((a, b) => {
      const capA = a.capacityAdults || 2;
      const capB = b.capacityAdults || 2;
      return capB - capA;
    });

    // Check if we can accommodate the group with fewer rooms
    for (let k = 1; k < selectedRooms.length; k++) {
      // Take the k largest rooms
      const subRooms = sortedRooms.slice(0, k);
      const combinedAdultsCap = subRooms.reduce((sum, r) => sum + (r.capacityAdults || 2), 0);
      
      if (combinedAdultsCap >= (adults + children)) {
        return {
          enoughRoomsCount: k,
          message: `You have selected too many rooms. Minimum ${k} room${k > 1 ? 's are' : ' is'} enough for your group.`
        };
      }
    }
    return null;
  };

  useEffect(() => {
    setComboValidationError(null);
  }, [selectedRoomsList, adultsCount, childrenCount, selectedRoomId]);

  const getAvailableSlots = (evt: any, slotId?: string) => {
    if (!evt) return 0;

    // 1. If event has no slots configured, use the main event capacity
    if (!evt.slots || evt.slots.length === 0) {
      const bookingsForEvent = bookings.filter(b => 
        b.roomId === `event-booking-${evt.id}` && 
        b.bookingStatus !== 'cancelled'
      );
      const standaloneCount = bookingsForEvent.reduce((sum, b) => sum + (b.adults ?? 1) + (b.children ?? 0), 0);

      const roomBookingsWithEvent = bookings.filter(b => 
        b.roomId !== 'event-booking' && 
        !b.roomId.startsWith('event-booking-') &&
        b.bookingStatus !== 'cancelled' &&
        b.addons && 
        b.addons.some(a => a.startsWith(`Event: ${evt.title}`))
      );
      const roomBookingsCount = roomBookingsWithEvent.reduce((sum, b) => sum + (b.adults ?? 1) + (b.children ?? 0), 0);

      const totalBooked = standaloneCount + roomBookingsCount;
      return Math.max(0, evt.capacity - totalBooked);
    }

    // 2. If slotId is specified, check that slot
    if (slotId) {
      const slot = evt.slots.find((s: any) => s.id === slotId);
      if (!slot) return 0;
      
      const bookingsForSlot = bookings.filter(b => 
        b.roomId === `event-booking-${evt.id}` && 
        b.bookingStatus !== 'cancelled' &&
        b.selectedSlot === slotId
      );
      const standaloneCount = bookingsForSlot.reduce((sum, b) => sum + (b.adults ?? 1) + (b.children ?? 0), 0);

      const slotTimeRange = `${formatTime12h(slot.fromTime)} - ${formatTime12h(slot.toTime)}`;
      const roomBookingsWithSlot = bookings.filter(b => 
        b.roomId !== 'event-booking' && 
        !b.roomId.startsWith('event-booking-') &&
        b.bookingStatus !== 'cancelled' &&
        b.addons && 
        b.addons.includes(`Event: ${evt.title} (${slotTimeRange})`)
      );
      const roomBookingsCount = roomBookingsWithSlot.reduce((sum, b) => sum + (b.adults ?? 1) + (b.children ?? 0), 0);

      const totalBooked = standaloneCount + roomBookingsCount;
      return Math.max(0, slot.capacity - totalBooked);
    }

    // 3. Return sum of available space across all slots
    let totalAvail = 0;
    evt.slots.forEach((s: any) => {
      totalAvail += getAvailableSlots(evt, s.id);
    });
    return totalAvail;
  };

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

  const handleChildrenCountChange = (val: number) => {
    setChildrenCount(val);
    setChildrenAges(prev => {
      const next = [...prev];
      if (val > next.length) {
        for (let i = next.length; i < val; i++) {
          next.push(8); // Default child age is 8
        }
      }
      return next.slice(0, val);
    });
  };

  const getMinAvailableInventoryDuringStay = (roomId: string): number => {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        return getAvailableInventory(roomId, checkIn);
      }
      
      let minAvail = 999;
      let current = new Date(start);
      while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
        const availOnDate = getAvailableInventory(roomId, dateStr);
        if (availOnDate < minAvail) {
          minAvail = availOnDate;
        }
        current.setDate(current.getDate() + 1);
      }
      return minAvail === 999 ? 0 : minAvail;
    } catch {
      return 0;
    }
  };

  const getSmartRecommendations = () => {
    const totalRequired = adultsCount + childrenCount;
    const recommendations: Array<{
      type: 'single' | 'combo';
      rooms: any[];
      price: number;
      originalPrice: number;
      label: string;
      description: string;
    }> = [];

    // Helper to calculate total price for a room list for the selected dates
    const getRoomListPrice = (roomList: any[], skipOffers?: boolean) => {
      const policyEnabled = hotelInfo.childPolicyEnabled !== false;
      const minAge = policyEnabled ? (hotelInfo.childPolicyMinAge ?? 5) : 5;
      const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;

      const payingChildren = childrenAges.filter(age => age > minAge && age <= maxAge).length;
      const adultChildren = childrenAges.filter(age => age > maxAge).length;

      const effAdults = adultsCount + adultChildren;
      const effChildren = payingChildren;

      return calculateAllRoomsStayPrice(roomList, effAdults, effChildren, skipOffers);
    };

    // 1. Single Room Recommendations
    rooms.forEach(room => {
      const maxCap = room.capacityAdults || 2;
      const minCap = room.min_occupancy || 1;
      const policyEnabled = hotelInfo.childPolicyEnabled !== false;
      const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;
      const adultChildren = childrenAges.filter(age => age > maxAge).length;
      const effAdults = adultsCount + adultChildren;

      const availInventory = getMinAvailableInventoryDuringStay(room.id);
      if (maxCap >= totalRequired && totalRequired >= minCap && (room.capacityAdults || 2) >= effAdults && availInventory > 0) {
        const distribution = distributeAdultsAndChildren([room], effAdults, totalRequired - effAdults);
        const desc = getRecommendationDescription([room], distribution);
        const price = getRoomListPrice([room]);
        const originalPrice = getRoomListPrice([room], true);
        recommendations.push({
          type: 'single',
          rooms: [room],
          price,
          originalPrice,
          label: room.name,
          description: desc
        });
      }
    });

    // 2. Combo Options (pairs of rooms)
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i; j < rooms.length; j++) {
        const r1 = rooms[i];
        const r2 = rooms[j];

        const avail1 = getMinAvailableInventoryDuringStay(r1.id);
        const avail2 = getMinAvailableInventoryDuringStay(r2.id);

        // Check if there is enough inventory for both rooms
        if (r1.id === r2.id) {
          if (avail1 < 2) continue;
        } else {
          if (avail1 < 1 || avail2 < 1) continue;
        }

        const maxCap1 = r1.capacityAdults || 2;
        const maxCap2 = r2.capacityAdults || 2;
        const combinedCapacity = maxCap1 + maxCap2;
        const combinedAdultsCapacity = (r1.capacityAdults || 2) + (r2.capacityAdults || 2);
        
        const policyEnabled = hotelInfo.childPolicyEnabled !== false;
        const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;
        const adultChildren = childrenAges.filter(age => age > maxAge).length;
        const effAdults = adultsCount + adultChildren;

        const combinedMinCap = (r1.min_occupancy || 1) + (r2.min_occupancy || 1);

        if (combinedCapacity >= totalRequired && totalRequired >= combinedMinCap && combinedAdultsCapacity >= effAdults) {
          const distribution = distributeAdultsAndChildren([r1, r2], effAdults, totalRequired - effAdults);
          const desc = getRecommendationDescription([r1, r2], distribution);
          const price = getRoomListPrice([r1, r2]);
          const originalPrice = getRoomListPrice([r1, r2], true);
          recommendations.push({
            type: 'combo',
            rooms: [r1, r2],
            price,
            originalPrice,
            label: r1.id === r2.id ? `2x ${r1.name}` : `${r1.name} + ${r2.name}`,
            description: desc
          });
        }
      }
    }

    return recommendations.sort((a, b) => a.price - b.price).slice(0, 3);
  };

  const recommendations = getSmartRecommendations();

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
    if (currentSelectedRooms.length === 0) return { subtotal: 0, originalSubtotal: 0, discount: 0, addonTotal: 0, mealPlanTotal: 0, gstTotal: 0, gstBreakdown: { roomsGst: 0, eventsGst: 0, addonsGst: 0, mealPlanGst: 0 }, grandTotal: 0, nights: 0 };

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = differenceInDays(end, start);

    if (isNaN(nights) || nights <= 0) return { subtotal: 0, originalSubtotal: 0, discount: 0, addonTotal: 0, mealPlanTotal: 0, gstTotal: 0, gstBreakdown: { roomsGst: 0, eventsGst: 0, addonsGst: 0, mealPlanGst: 0 }, grandTotal: 0, nights: 0 };

    // 1. Child age categories based on hotelInfo policies
    const policyEnabled = hotelInfo.childPolicyEnabled !== false;
    const minAge = policyEnabled ? (hotelInfo.childPolicyMinAge ?? 5) : 5;
    const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;

    const payingChildren = childrenAges.filter(age => age > minAge && age <= maxAge).length;
    const adultChildren = childrenAges.filter(age => age > maxAge).length;

    const effectiveAdults = adultsCount + adultChildren;
    const effectiveChildren = payingChildren;

    // 2. Room subtotal (with pricing tiers + calendar overrides + extra beds)
    const subtotal = calculateAllRoomsStayPrice(currentSelectedRooms, effectiveAdults, effectiveChildren);
    const originalSubtotal = calculateAllRoomsStayPrice(currentSelectedRooms, effectiveAdults, effectiveChildren, true);

    let addonTotal = 0;
    selectedAddons.forEach(addonName => {
      if (addonName.startsWith('Event: ')) {
        const cleanTitle = addonName.replace('Event: ', '').split(' (')[0];
        const evt = guestEvents.find(e => e.title === cleanTitle);
        if (evt) {
          addonTotal += calculateEventBookingPrice(evt, adultsCount, childrenAges);
        }
      } else {
        const addon = addons.find(a => a.name === addonName);
        if (addon) {
          if (addon.pricingType === 'per_head') {
            const totalGuests = Math.max(1, adultsCount + childrenCount);
            addonTotal += addon.price * totalGuests;
          } else {
            addonTotal += addon.price;
          }
        }
      }
    });

    // 5. Meal Plan calculation
    let mealPlanTotal = 0;
    const isCpBase = hotelInfo.defaultMealPlan === 'CP';
    const cpAdultRate = hotelInfo.mealPlanCpAdultRate ?? 300;
    const cpChildRate = hotelInfo.mealPlanCpChildRate ?? 250;

    if (isCpBase) {
      if (selectedMealPlan === 'map') {
        const upgradeAdultRate = Math.max(0, (hotelInfo.mealPlanMapAdultRate ?? 1000) - cpAdultRate);
        const upgradeChildRate = Math.max(0, (hotelInfo.mealPlanMapChildRate ?? 750) - cpChildRate);
        mealPlanTotal = ((effectiveAdults * upgradeAdultRate) + (effectiveChildren * upgradeChildRate)) * nights;
      } else if (selectedMealPlan === 'ap') {
        const upgradeAdultRate = Math.max(0, (hotelInfo.mealPlanApAdultRate ?? 1500) - cpAdultRate);
        const upgradeChildRate = Math.max(0, (hotelInfo.mealPlanApChildRate ?? 1250) - cpChildRate);
        mealPlanTotal = ((effectiveAdults * upgradeAdultRate) + (effectiveChildren * upgradeChildRate)) * nights;
      }
    } else {
      if (selectedMealPlan !== 'ep') {
        const isCp = selectedMealPlan === 'cp';
        const isMap = selectedMealPlan === 'map';

        const adultRate = isCp 
          ? (hotelInfo.mealPlanCpAdultRate ?? 300) 
          : isMap 
          ? (hotelInfo.mealPlanMapAdultRate ?? 1000) 
          : (hotelInfo.mealPlanApAdultRate ?? 1500);

        const childRate = isCp 
          ? (hotelInfo.mealPlanCpChildRate ?? 250) 
          : isMap 
          ? (hotelInfo.mealPlanMapChildRate ?? 750) 
          : (hotelInfo.mealPlanApChildRate ?? 1250);

        mealPlanTotal = ((effectiveAdults * adultRate) + (effectiveChildren * childRate)) * nights;
      }
    }

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

    // 6. GST Calculation
    const roomsGst = calculateRoomsGST(currentSelectedRooms, effectiveAdults, effectiveChildren);
    
    let eventsGst = 0;
    let addonsGst = 0;
    const eventTaxRate = (gstSettings?.events_rate ?? 18) / 100;
    const addonTaxRate = (gstSettings?.addons_rate ?? 18) / 100;
    const mealTaxRate = (gstSettings?.meal_plans_rate ?? 18) / 100;

    selectedAddons.forEach(addonName => {
      if (addonName.startsWith('Event: ')) {
        const cleanTitle = addonName.replace('Event: ', '').split(' (')[0];
        const evt = guestEvents.find(e => e.title === cleanTitle);
        if (evt) {
          const eventPrice = calculateEventBookingPrice(evt, adultsCount, childrenAges);
          eventsGst += Math.round(eventPrice * eventTaxRate);
        }
      } else {
        const addon = addons.find(a => a.name === addonName);
        if (addon) {
          let addonPrice = 0;
          if (addon.pricingType === 'per_head') {
            const totalGuests = Math.max(1, adultsCount + childrenCount);
            addonPrice = addon.price * totalGuests;
          } else {
            addonPrice = addon.price;
          }
          addonsGst += Math.round(addonPrice * addonTaxRate);
        }
      }
    });

    const mealPlanGst = Math.round(mealPlanTotal * mealTaxRate);
    const gstTotal = roomsGst + eventsGst + addonsGst + mealPlanGst;

    const grandTotal = Math.max(0, subtotal - discount + addonTotal + mealPlanTotal + gstTotal);
    return { 
      subtotal, 
      originalSubtotal, 
      discount, 
      addonTotal, 
      mealPlanTotal, 
      gstTotal,
      gstBreakdown: { roomsGst, eventsGst, addonsGst, mealPlanGst },
      grandTotal, 
      nights 
    };
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

  const handleCreateBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guestName || !guestEmail || currentSelectedRooms.length === 0) return;
 
    const isPartial = paymentSelection === 'partial';
    const finalPaymentStatus = isPartial ? 'partially_paid' : 'paid';
    const finalPaidAmount = isPartial 
      ? Math.round(totals.grandTotal * (hotelInfo.paymentCollectionPercent || 50) / 100)
      : totals.grandTotal;

    const bookingId = await addBooking({
      roomId: currentSelectedRooms.map(r => r.id).join(','),
      roomName: currentSelectedRooms.map(r => r.name).join(' + '),
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      totalPrice: totals.grandTotal,
      paymentStatus: finalPaymentStatus as any,
      bookingStatus: 'confirmed',
      addons: selectedAddons,
      couponCode: appliedCouponCode || undefined,
      adults: adultsCount,
      children: childrenCount,
      paidAmount: finalPaidAmount
    });
 
    setConfirmedBookingRef(bookingId);
    setBookingStep('success');
  };
 
  const handleCreateEventBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !selectedEvent) return;
 
    if (selectedEvent.slots && selectedEvent.slots.length > 0 && !eventSelectedSlotId) {
      alert('Please select a timing slot.');
      return;
    }

    const availSlots = selectedEvent.slots && selectedEvent.slots.length > 0
      ? getAvailableSlots(selectedEvent, eventSelectedSlotId)
      : getAvailableSlots(selectedEvent);

    const totalGuests = eventAdultsCount + eventChildrenCount;
    if (totalGuests > availSlots) {
      alert(`Sorry, only ${availSlots} slots are available.`);
      return;
    }

    const priceTotal = calculateEventBookingPrice(selectedEvent, eventAdultsCount, eventChildrenAges);

    const eventBookingId = await addBooking({
      roomId: `event-booking-${selectedEvent.id}`,
      roomName: `Day Event: ${selectedEvent.title}`,
      guestName,
      guestEmail,
      guestPhone,
      checkIn: selectedEvent.date || selectedEvent.fromDate || '',
      checkOut: selectedEvent.date || selectedEvent.toDate || selectedEvent.fromDate || '',
      totalPrice: priceTotal,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      addons: [],
      adults: eventAdultsCount,
      children: eventChildrenCount,
      selectedSlot: eventSelectedSlotId || undefined
    });
 
    setConfirmedBookingRef(eventBookingId);
    setEventBookingStep('success');
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
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600"
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
        className={`relative h-[100dvh] shrink-0 overflow-hidden flex items-end justify-start text-left px-6 sm:px-12 pb-16 sm:pb-20 pt-28 group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-[-2px]' : ''
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
            style={{ fontFamily: "'Playfair Display', serif" }}
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
        className={`bg-[#1C1917] text-white py-3 px-6 relative overflow-hidden flex flex-col items-center justify-center group transition select-none ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-3 right-4 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Manage Offers
          </span>
        )}

        <div className="w-full max-w-2xl mx-auto flex items-center justify-between min-h-[38px]">
          {/* Left Arrow */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (offersList.length > 0) {
                setActiveOfferIdx(prev => (prev - 1 + offersList.length) % offersList.length);
              }
            }}
            className="p-1 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Card Content with Slide/Fade Transition */}
          <div 
            onClick={(e) => triggerEdit('offers-promotions', e)}
            className="flex-1 px-4 text-center cursor-pointer transition-all duration-300 transform"
          >
            {offersList.length > 0 ? (
              (() => {
                const currentOffer = offersList[activeOfferIdx % offersList.length];
                if (!currentOffer) return null;
                const discVal = currentOffer.discountType === 'percent' ? `${currentOffer.discountValue}%` : `₹${currentOffer.discountValue}`;
                const targetNames = currentOffer.roomIds.map((rid: string) => rooms.find((r: any) => r.id === rid)?.name).filter(Boolean).join(', ');
                return (
                  <div className="animate-in fade-in slide-in-from-right-3 duration-300 flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 justify-center">
                      <Tag className="w-3 h-3 animate-pulse" />
                      <span>{currentOffer.name}</span>
                    </span>
                    <span className="text-3xs font-extrabold tracking-widest text-zinc-100 uppercase mt-0.5">
                      Get {discVal} Off on <span className="text-amber-400 font-black">{targetNames || 'selected'}</span> category bookings!
                    </span>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 justify-center">
                  <Tag className="w-3 h-3" />
                  <span>Welcome Offer</span>
                </span>
                <span className="text-3xs font-extrabold tracking-widest text-zinc-100 uppercase mt-0.5">
                  It's Sale Time: Up to 40% Off on select premium category stays!
                </span>
              </div>
            )}
          </div>

          {/* Right Arrow */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (offersList.length > 0) {
                setActiveOfferIdx(prev => (prev + 1) % offersList.length);
              }
            }}
            className="p-1 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white cursor-pointer shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel Dots Indicators */}
        {offersList.length > 1 && (
          <div className="flex justify-center gap-1 mt-1">
            {offersList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveOfferIdx(idx);
                }}
                className={`w-1 h-1 rounded-full transition-all duration-300 ${
                  idx === (activeOfferIdx % offersList.length) ? 'w-2.5 bg-amber-400' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </section>
    ),
    about: (
      <section
        key="about"
        id="about"
        onClick={(e) => triggerEdit('description', e)}
        className={`py-14 px-6 max-w-2xl mx-auto text-center space-y-5 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit About
          </span>
        )}
        <h3 className="text-[clamp(1.6rem,3.5vw,2.8rem)] font-medium text-[#3D405B] leading-[1.05] tracking-[-0.01em]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {hotelInfo.aboutTitle || "Earth, Water, and Calm"}
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
        className={`py-12 px-6 bg-[#EBF0EC] border-y border-[#D8E2DC] relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Amenities
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Natural Luxuries)</span> */}
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hotelInfo.amenitiesTitle || "Property Amenities"}
            </h3>
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
        className={`py-12 px-6 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Events
          </span>
        )}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-1.5">
            {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Gatherings & Day Outs)</span> */}
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hotelInfo.eventsTitle || "Resort Packages & Scheduled Activities"}
            </h3>
            <p className="text-[11px] text-zinc-400 lowercase tracking-wider font-light">Book individually — no room reservation needed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guestEvents.map((evt) => {
              const originalPrice = evt.priceAdult ?? 0;
              const disc = evt.discount ?? 0;
              const discountedPrice = disc > 0 ? Math.round(originalPrice * (1 - disc / 100)) : originalPrice;
              const dateText = convertToDDMMYYYY(evt.fromDate || evt.date || '');
              const toDateText = evt.toDate && evt.fromDate !== evt.toDate ? ` → ${convertToDDMMYYYY(evt.toDate)}` : '';
              const formattedDate = `${dateText}${toDateText} | ${evt.time}`;
              const slotsVal = getAvailableSlots(evt);
              const slotsText = slotsVal === 0 ? 'SOLD OUT' : slotsVal <= 5 ? `${slotsVal} LEFT!` : `${slotsVal} SLOTS`;
              const isSoldOut = slotsVal === 0;

              return (
                <div key={evt.id} className="relative">
                  <TravelCard
                    imageUrl={evt.image}
                    imageAlt={evt.title}
                    discountPercent={disc}
                    title={evt.title}
                    location={formattedDate}
                    overview={evt.description || ''}
                    longDescription={evt.aboutText || evt.longDescription || ''}
                    price={discountedPrice}
                    originalPrice={disc > 0 ? originalPrice : undefined}
                    pricePeriod="per adult day pass"
                    slotsAvailableText={slotsText}
                    isSoldOut={isSoldOut}
                    onBookNow={(e) => {
                      e.stopPropagation();
                      if (evt.target === 'room_guest') {
                        alert('This event can only be booked along with a room booking.');
                        return;
                      }
                      setSelectedEventId(evt.id);
                      setEventSelectedSlotId('');
                      setEventAdultsCount(1);
                      setEventChildrenCount(0);
                      setEventChildrenAges([]);
                      setEventBookingStep('details');
                      setIsEventBookingOpen(true);
                    }}
                  />
                  {evt.target === 'room_guest' && (
                    <div className="absolute top-3 right-3 bg-amber-500/90 text-white font-extrabold text-[8px] uppercase px-2.5 py-0.5 rounded-full select-none z-10 shadow-md border border-amber-400">
                      Room Guest Only
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    rooms: (
      <section
        key="rooms"
        id="rooms"
        onClick={(e) => triggerEdit('rooms', e)}
        className={`py-14 px-6 bg-[#FAF6F0] border-y border-[#D8E2DC] relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400">
            ✏️ Edit Rooms
          </span>
        )}
        <div className="max-w-6xl mx-auto">
          <InteractiveSelector
            rooms={rooms}
            pricing={pricing}
            checkIn={checkIn}
            hotelInfo={hotelInfo}
            title={hotelInfo.roomsTitle || 'Our Sanctuary Spaces'}
            subtitle="Choose from our carefully curated retreat spaces, each designed for pure immersion in nature."
            onBookRoom={(roomId) => {
              const r = rooms.find(room => room.id === roomId);
              if (r) {
                setSelectedRoomsList([r]);
                setSelectedRoomId(roomId);
              }
              setCheckoutStep(1);
              setIsBookingOpen(true);
              setBookingStep('details');
            }}
          />
        </div>
      </section>
    ),
    reviews: (
      <section
        key="reviews"
        id="reviews"
        onClick={(e) => triggerEdit('testimonials-admin', e)}
        className={`py-12 px-6 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Reviews
          </span>
        )}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Guest Feedback)</span> */}
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hotelInfo.reviewsTitle || "Guest Reviews"}
            </h3>
            <span className="text-[10px] text-[#8FA89B] font-medium block tracking-[0.1em]">Verified reviews · {testimonials.length > 0 ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1) : '5.0'} / 5.0</span>
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
          {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Portrait Diary)</span> */}
          <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {hotelInfo.galleryTitle || "Natural Vignettes"}
          </h3>
        </div>
        <BentoGallery
          images={managedPhotos.length > 0 ? managedPhotos.map(p => p.url) : hotelInfo.heroImages}
          scrollContainerRef={scrollContainerRef}
          onImageClick={() => setIsGalleryOpen(true)}
        />
      </section>
    ),
    policies: (
      <section
        key="policies"
        onClick={(e) => triggerEdit('policies-admin', e)}
        className={`py-12 px-6 bg-[#EBF0EC] border-y border-[#D8E2DC] relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit Policies & Rules
          </span>
        )}
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hotelInfo.policiesTitle || "Resort Guidelines"}
            </h3>
          </div>

          <div className="space-y-1.5 font-sans font-semibold">
            {(() => {
              const allPolicyItems = [
                {
                  id: 'arrival-departure',
                  title: 'Check-In & Check-Out Hours',
                  isHours: true,
                  description: ''
                },
                ...policies.map((p) => ({
                  id: p.id,
                  title: p.title,
                  isHours: false,
                  description: p.description
                }))
              ];

              const visiblePolicies = allPolicyItems.slice(0, 4);

              return (
                <>
                  {visiblePolicies.map((item) => {
                    const isOpen = openPolicyId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FAF6F0] border border-[#D8E2DC] rounded-xl overflow-hidden text-left"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPolicyId(isOpen ? null : item.id);
                          }}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#3D405B] hover:text-[#E07A5F] transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            {item.isHours ? (
                              <Clock className="w-4 h-4 text-[#8FA89B] shrink-0" />
                            ) : (
                              <Shield className="w-4 h-4 text-[#8FA89B] shrink-0" />
                            )}
                            <span>{item.title}</span>
                          </span>
                          <span className={`text-[#8FA89B] font-extrabold text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                            {isOpen ? '−' : '+'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 text-2xs text-zinc-550 leading-relaxed font-sans border-t border-[#D8E2DC]/50 pt-2.5 font-medium">
                            {item.isHours ? (
                              <div className="space-y-1">
                                <p><strong>Check-In Time:</strong> {hotelInfo.checkInTime || '14:00'}</p>
                                <p><strong>Check-Out Time:</strong> {hotelInfo.checkOutTime || '11:00'}</p>
                              </div>
                            ) : (
                              item.description
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {allPolicyItems.length > 4 && (
                    <div className="pt-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPoliciesPopupOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-5 py-2 border border-[#8FA89B]/40 text-[#8FA89B] hover:bg-[#8FA89B] hover:text-white text-3xs font-extrabold uppercase tracking-widest rounded-full transition cursor-pointer"
                      >
                        <span>Show More</span>
                      </button>
                    </div>
                  )}

                  {/* Policies Popup Modal */}
                  {isPoliciesPopupOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4" onClick={(e) => { e.stopPropagation(); setIsPoliciesPopupOpen(false); }}>
                      <div className="bg-[#FAF6F0] w-full max-w-lg rounded-2xl shadow-xl border border-[#D8E2DC] overflow-hidden flex flex-col relative max-h-[80vh] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-[#D8E2DC] flex items-center justify-between bg-white">
                          <h3 className="font-bold text-[#3D405B] text-xs uppercase tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {hotelInfo.policiesTitle || "Resort Guidelines"}
                          </h3>
                          <button
                            onClick={() => setIsPoliciesPopupOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-gray-150 text-[#8FA89B] hover:text-[#3D405B] transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 font-sans text-left">
                          {allPolicyItems.map((item, idx) => (
                            <div key={item.id} className="space-y-1 pb-3 border-b border-[#D8E2DC]/50 last:border-b-0">
                              <h4 className="text-2xs font-extrabold text-[#3D405B] uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-[#EBF0EC] text-[#8FA89B] flex items-center justify-center text-3xs font-black">{idx + 1}</span>
                                <span>{item.title}</span>
                              </h4>
                              <div className="text-3xs text-zinc-650 font-semibold pl-6 leading-relaxed font-sans">
                                {item.isHours ? (
                                  <div className="space-y-0.5 font-sans font-semibold">
                                    <p><strong>Check-In Time:</strong> {hotelInfo.checkInTime || '14:00'}</p>
                                    <p><strong>Check-Out Time:</strong> {hotelInfo.checkOutTime || '11:00'}</p>
                                  </div>
                                ) : (
                                  item.description
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#D8E2DC] flex justify-end bg-white">
                          <button
                            onClick={() => setIsPoliciesPopupOpen(false)}
                            className="bg-[#8FA89B] hover:bg-[#7D9387] text-white font-extrabold text-3xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            Close Guidelines
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </section>
    ),
    addons: (
      addons.length > 0 ? (
        <section
          key="addons"
          onClick={(e) => triggerEdit('addons', e)}
          className={`py-12 px-6 bg-[#FAF6F0] border-y border-[#D8E2DC] relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
            }`}
        >
          {canvasMode === 'editor' && (
            <span className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
              ✏️ Edit Addons
            </span>
          )}
          <div className="max-w-4xl mx-auto space-y-6 text-center">
            <div className="space-y-1.5">
              {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Experiences)</span> */}
              <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {hotelInfo.addonsTitle || "Eco-Upsells & Local Experiences"}
              </h3>
            </div>

            {/* Visual Add-ons Redesigned cards (matching image 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left font-sans">
              {addons.map((addon) => {
                return (
                  <div
                    key={addon.id}
                    onClick={() => setSelectedAddonDetail(addon)}
                    className="bg-white border border-[#D8E2DC] rounded-2xl overflow-hidden flex shadow-xs hover:border-[#8FA89B]/65 hover:scale-[1.01] transition duration-300 ease-out cursor-pointer"
                  >
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

                      {/* Price only */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-4xs font-extrabold text-[#E07A5F] flex items-center gap-1">
                          <span>₹{addon.price}</span>
                          <span className="text-[8px] font-normal text-zinc-500 lowercase">
                            {addon.pricingType === 'per_head' ? 'per guest' : 'flat stay'}
                          </span>
                        </span>

                        <span className="text-[9px] font-bold text-[#8FA89B]">
                          Details &rarr;
                        </span>
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
        className={`py-12 px-6 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
          }`}
      >
        {canvasMode === 'editor' && (
          <span className="absolute top-4 left-4 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow z-40 border border-blue-400 font-sans">
            ✏️ Edit FAQs
          </span>
        )}
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-1.5">
            {/* <span className="text-[9px] text-[#8FA89B] tracking-[0.28em] uppercase font-medium block">(Answers)</span> */}
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {hotelInfo.faqsTitle || "Resort FAQs"}
            </h3>
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
        className={`py-12 px-6 relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
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
            <h3 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-medium text-[#3D405B] leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif" }}>Resort Location</h3>
            <p className="text-2xs text-zinc-550 leading-relaxed font-semibold">
              {hotelInfo.address}
            </p>

            {/* Distance / Travel Time Calculator */}
            <div className="mt-5 pt-4 border-t border-[#8FA89B]/25 space-y-3 font-sans" onClick={(e) => e.stopPropagation()}>
              <label className="text-[10px] font-extrabold text-[#3D405B] uppercase tracking-wider block">
                Calculate distance from other places
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Type city or starting point..."
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-2xs focus:outline-none focus:ring-1 focus:ring-[#8FA89B] focus:border-[#8FA89B] placeholder-gray-400 font-semibold"
                />
                {mapSearchQuery && (
                  <button
                    onClick={() => {
                      setMapSearchQuery('');
                      setMapDistanceInfo(null);
                      setMapRouteOrigin(null);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-655"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Autocomplete suggestions drop */}
                {mapSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                    {mapSuggestions.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => handleSelectMapSuggestion(place)}
                        className="w-full text-left px-3 py-2 text-2xs font-semibold text-gray-700 hover:bg-gray-50 flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#8FA89B] shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-gray-900">{place.displayName}</div>
                          <div className="text-[10px] text-gray-400">{place.formattedAddress}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Locator and Clear buttons */}
              <div className="flex items-center justify-between gap-2 text-2xs">
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isMapLocating}
                  className="inline-flex items-center gap-1.5 text-2xs text-[#8FA89B] hover:text-[#7d9689] font-bold cursor-pointer transition disabled:opacity-50"
                >
                  <Compass className={`w-3.5 h-3.5 ${isMapLocating ? 'animate-spin' : ''}`} />
                  <span>{isMapLocating ? 'Locating...' : 'Distance from my Current Location'}</span>
                </button>

                {mapDistanceInfo && (
                  <button
                    onClick={() => {
                      setMapSearchQuery('');
                      setMapDistanceInfo(null);
                      setMapRouteOrigin(null);
                    }}
                    className="text-3xs text-rose-500 font-extrabold uppercase tracking-wider hover:underline"
                  >
                    Clear Route
                  </button>
                )}
              </div>

              {mapLocateError && (
                <p className="text-[10px] text-rose-500 font-semibold">{mapLocateError}</p>
              )}

              {/* Calculated stats panel */}
              {mapDistanceInfo && (
                <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-xl p-3.5 space-y-2 animate-in fade-in duration-200 text-left">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Car className="w-4 h-4 text-[#8FA89B]" />
                    <span className="text-2xs font-bold">Estimated Route from <span className="text-[#3D405B]">{mapDistanceInfo.origin}</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-0.5 text-left">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Estimated Distance</span>
                      <span className="text-sm font-black text-[#3D405B]">{mapDistanceInfo.distance} km</span>
                    </div>
                    <div className="space-y-0.5 text-left">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Driving Duration</span>
                      <span className="text-sm font-black text-[#3D405B]">{mapDistanceInfo.time}</span>
                    </div>
                  </div>
                </div>
              )}
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
                src={
                  mapRouteOrigin
                    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(mapRouteOrigin)}&daddr=${hotelInfo.latitude},${hotelInfo.longitude}&output=embed`
                    : `https://maps.google.com/maps?q=${hotelInfo.latitude},${hotelInfo.longitude}&z=15&output=embed`
                }
              />
            ) : (
              <div className="text-center z-10 space-y-1.5 p-4">
                <MapPin className="w-6 h-6 text-[#E07A5F] animate-bounce mx-auto" />
                <span className="text-[10px] text-[#3D405B] font-bold block uppercase tracking-wider font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>{hotelInfo.name} Mapping</span>
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
        className={`py-8 px-4 bg-[#EBF0EC] border-t border-[#D8E2DC] relative group transition cursor-pointer ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
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
            <ImageReveal images={hotelInfo.instagramImages && hotelInfo.instagramImages.length >= 5 ? hotelInfo.instagramImages : instagramMock} />
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
      style={{ fontFamily: "'Noto Sans', 'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="bg-[#FAF6F0] relative z-10 shadow-2xl">
        {/* 1. HEADER (LOGO + MENU BAR) — TRANS-OVERLAY */}
        <nav className={`px-5 lg:px-8 py-3.5 flex items-center justify-between transition-all duration-500 ease-in-out z-30 w-full ${isScrolled
          ? 'sticky top-0 bg-[#FAF6F0]/75 backdrop-blur-lg border-b border-[#D8E2DC]/70 shadow-[0_4px_30px_rgba(61,64,43,0.05)]'
          : 'absolute top-0 left-0 right-0 bg-transparent border-b border-white/10'
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
                style={{ fontFamily: "'Playfair Display', serif", color: isScrolled ? '#3D405B' : '#ffffff' }}
              >
                {hotelInfo.name}
              </h1>
            )}
          </div>

          {/* Desktop Nav — The Bend Club style: uppercase tight tracking with '+' separators */}
          <div className={`hidden lg:flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] font-medium transition-colors duration-500 ${isScrolled ? 'text-[#556B2F]' : 'text-white/90'
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
                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${isScrolled
                      ? 'hover:text-[#E07A5F] opacity-90 hover:bg-[#E8E2D6]/50'
                      : 'hover:text-white opacity-85 hover:bg-white/10'
                      }`}
                  >
                    {item.label}
                  </a>
                  {idx < activeMenuItems.length - 1 && (
                    <span className={`text-[8px] select-none opacity-40 ${isScrolled ? 'text-[#8FA89B]' : 'text-white'
                      }`}>+</span>
                  )}
                </React.Fragment>
              );
            })}
            {customPages.filter(p => p.active).map(page => (
              <button
                key={page.id}
                onClick={() => setPreviewPath(`/pages/${page.slug}`)}
                className={`px-3 py-1.5 rounded-lg bg-transparent border-none cursor-pointer font-medium text-[9px] uppercase tracking-[0.22em] transition-all duration-200 ${isScrolled
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
              className={`group relative overflow-hidden rounded-full font-bold text-[9px] uppercase tracking-[0.2em] px-5 py-2.5 transition-all duration-300 cursor-pointer whitespace-nowrap text-center ${isScrolled
                ? 'bg-transparent border border-[#8FA89B]/40 text-[#8FA89B] hover:text-white shadow-3xs'
                : 'bg-white/10 backdrop-blur-xs border border-white/20 text-white hover:text-[#556B2F]'
                }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 group-hover:scale-[70] ${
                  isScrolled ? 'bg-[#8FA89B]' : 'bg-white'
                }`} />
                <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
                  Book Now
                </span>
              </div>
              <div className={`absolute top-0 left-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${
                isScrolled ? 'text-white' : 'text-[#556B2F]'
              }`}>
                <span>Book Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className={`lg:hidden p-2 rounded-lg transition-all duration-300 cursor-pointer ${isScrolled
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
                  style={{ fontFamily: "'Playfair Display', serif" }}
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
        className={`bg-[#1C2416] text-[#D8E2DC] overflow-hidden group transition cursor-pointer sticky bottom-0 z-0 ${canvasMode === 'editor' ? 'hover:outline-2 hover:outline-dashed hover:outline-blue-500 hover:outline-offset-2' : ''
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
                style={{ fontFamily: "'Playfair Display', serif" }}
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
              <h3 className="font-medium text-[#3D405B] text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>About {hotelInfo.name}</h3>
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
                <h3 className="font-medium text-[#3D405B] text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>All Amenities</h3>
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

      {/* Addon / Event Detail Popup */}
      {selectedAddonDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedAddonDetail(null)}>
          <div className="bg-[#FAF6F0] rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-[#D8E2DC] animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[#D8E2DC] flex items-center justify-between shrink-0">
              <h3 className="font-medium text-[#3D405B] text-base font-serif">
                {selectedAddonDetail.isEvent ? 'Event Details' : 'Add-on Details'}
              </h3>
              <button onClick={() => setSelectedAddonDetail(null)} className="w-8 h-8 rounded-full bg-[#E8E2D6] flex items-center justify-center text-[#3D405B] hover:bg-[#D8E2DC] transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              {selectedAddonDetail.image && (
                <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-zinc-50 border border-[#D8E2DC]">
                  <img
                    src={selectedAddonDetail.image}
                    alt={selectedAddonDetail.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <h4 className="text-[#3D405B] font-bold text-sm uppercase tracking-wide">{selectedAddonDetail.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[#E07A5F] font-extrabold text-sm">
                    ₹{selectedAddonDetail.price}
                  </span>
                  <span className="text-[10px] bg-[#E8F0EC] text-[#55826A] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {selectedAddonDetail.isEvent ? 'Per Guest' : (selectedAddonDetail.pricingType === 'per_head' ? 'Per Guest' : 'Flat Fee')}
                  </span>
                </div>
              </div>

              {selectedAddonDetail.isEvent && (
                <div className="space-y-1 bg-white border border-[#D8E2DC]/60 p-3 rounded-2xl">
                  <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide block">Event Date</span>
                  <div className="text-xs font-bold text-[#3D405B]">
                    📅 {convertToDDMMYYYY(selectedAddonDetail.eventObj.date || selectedAddonDetail.eventObj.fromDate)}
                  </div>
                </div>
              )}

              {selectedAddonDetail.isEvent && selectedAddonDetail.eventObj.slots && selectedAddonDetail.eventObj.slots.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] text-[#3D405B] font-extrabold uppercase tracking-wide block">Select Time Slot</span>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedAddonDetail.eventObj.slots.map((s: any, idx: number) => {
                      const sTime = `${formatTime12h(s.fromTime)} - ${formatTime12h(s.toTime)}`;
                      const isSelected = addonQuantities[`Event: ${selectedAddonDetail.name} (${sTime})`] > 0;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAddonQuantities(prev => {
                              const next = { ...prev };
                              // Clear all slot variations for this event
                              Object.keys(next).forEach(k => {
                                if (k.startsWith(`Event: ${selectedAddonDetail.name}`)) {
                                  delete next[k];
                                }
                              });
                              next[`Event: ${selectedAddonDetail.name} (${sTime})`] = 1;
                              return next;
                            });
                          }}
                          className={`p-2.5 border rounded-xl text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-[#EBF0EC] border-[#8FA89B] text-[#3D405B]' 
                              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <span>{sTime}</span>
                          {isSelected && <span className="text-[9px] text-[#55826A] font-extrabold uppercase">Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-zinc-550 font-sans leading-relaxed whitespace-pre-line">
                {selectedAddonDetail.description}
              </p>
              
              <div className="pt-4 border-t border-[#D8E2DC]/50 flex flex-col gap-2">
                {isBookingOpen ? (
                  selectedAddonDetail.isEvent ? (
                    (() => {
                      const matchedKey = Object.keys(addonQuantities).find(k => k.startsWith(`Event: ${selectedAddonDetail.name}`));
                      const isBooked = !!matchedKey;
                      return isBooked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAddonQuantities(prev => {
                              const next = { ...prev };
                              if (matchedKey) delete next[matchedKey];
                              return next;
                            });
                            setSelectedAddonDetail(null);
                          }}
                          className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold font-sans cursor-pointer text-center"
                        >
                          Remove Event from Stay
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddonQuantities(prev => {
                              const next = { ...prev };
                              if (selectedAddonDetail.eventObj.slots && selectedAddonDetail.eventObj.slots.length > 0) {
                                const s = selectedAddonDetail.eventObj.slots[0];
                                const sTime = `${formatTime12h(s.fromTime)} - ${formatTime12h(s.toTime)}`;
                                next[`Event: ${selectedAddonDetail.name} (${sTime})`] = 1;
                              } else {
                                next[`Event: ${selectedAddonDetail.name}`] = 1;
                              }
                              return next;
                            });
                            setSelectedAddonDetail(null);
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#8FA89B] text-white hover:bg-[#7D9689] transition text-xs font-bold font-sans cursor-pointer text-center shadow-xs"
                        >
                          Add Event to Stay (₹{selectedAddonDetail.price})
                        </button>
                      );
                    })()
                  ) : (
                    (addonQuantities[selectedAddonDetail.name] || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAddonQuantities(prev => ({ ...prev, [selectedAddonDetail.name]: 0 }));
                          setSelectedAddonDetail(null);
                        }}
                        className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition text-xs font-bold font-sans cursor-pointer text-center"
                      >
                        Remove from Stay
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddonQuantities(prev => ({ ...prev, [selectedAddonDetail.name]: 1 }));
                          setSelectedAddonDetail(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#8FA89B] text-white hover:bg-[#7D9689] transition text-xs font-bold font-sans cursor-pointer text-center shadow-xs"
                      >
                        Add to Stay (₹{selectedAddonDetail.price})
                      </button>
                    )
                  )
                ) : (
                  <div className="bg-[#E8F0EC]/40 border border-[#8FA89B]/25 rounded-2xl p-4 text-center">
                    <p className="text-[11px] text-[#55826A] font-semibold leading-relaxed font-sans">
                      ✨ You can add this to your stay during checkout when booking a room.
                    </p>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setSelectedAddonDetail(null)}
                  className="w-full py-2 text-center text-4xs uppercase tracking-wider text-zinc-400 hover:text-zinc-650 transition font-bold font-sans cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combo Details & Room Photos Popover Modal */}
      {popoverCombo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 font-sans text-left">
          <div className="bg-[#FAF6F0] w-full max-w-lg rounded-3xl border border-[#8FA89B]/40 shadow-xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#D8E2DC] flex items-center justify-between bg-[#EBF0EC]">
              <h4 className="font-bold text-[#3D405B] text-xs uppercase tracking-wider">
                Room Details: {popoverCombo.label}
              </h4>
              <button
                type="button"
                onClick={() => setPopoverCombo(null)}
                className="p-1 rounded-lg text-zinc-550 hover:bg-zinc-200/50 hover:text-zinc-900 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {Array.from(new Set(popoverCombo.rooms.map((r: any) => r.id))).map((roomId) => {
                const room = popoverCombo.rooms.find((r: any) => r.id === roomId)!;
                const occurrences = popoverCombo.rooms.filter((r: any) => r.id === roomId).length;
                
                return (
                  <div key={room.id} className="space-y-4 pb-5 border-b border-zinc-200 last:border-0 last:pb-0">
                    <div>
                      <h5 className="font-extrabold text-[#3D405B] text-xs uppercase tracking-wider">
                        {room.name} {occurrences > 1 ? `(x${occurrences})` : ''}
                      </h5>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-sans">{room.description}</p>
                    </div>

                    {/* Room Photos */}
                    {room.photos && room.photos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider block">Room Photos</span>
                        <div className="grid grid-cols-3 gap-2">
                          {room.photos.slice(0, 3).map((photoUrl: string, pIdx: number) => (
                            <div key={pIdx} className="h-28 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                              <img src={photoUrl} alt={`${room.name} ${pIdx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3 text-[9px] bg-white border border-zinc-150 p-3 rounded-xl font-sans font-bold">
                      <div>
                        <span className="text-zinc-400 block text-[7px] uppercase font-bold tracking-wider">Bed Configuration</span>
                        <span className="text-[#3D405B] font-extrabold">{room.bedType || 'Double Bed'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[7px] uppercase font-bold tracking-wider">Room Area</span>
                        <span className="text-[#3D405B] font-extrabold">{room.sizeSqft || 300} Sq. Ft.</span>
                      </div>
                    </div>

                    {/* Amenities list */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-wider block">Standard Amenities</span>
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.map((am: string, aIdx: number) => (
                            <span key={aIdx} className="bg-[#EBF0EC] text-[#55826A] text-[8px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#D8E2DC] bg-[#FAF6F0] shrink-0 text-center">
              <button
                type="button"
                onClick={() => setPopoverCombo(null)}
                className="w-full py-2.5 bg-[#8FA89B] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#7D9689] transition cursor-pointer"
              >
                Got It, Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Gallery Modal */}
      {isGalleryOpen && (
        <FullGalleryModal
          photos={
            managedPhotos.length > 0
              ? managedPhotos
              : (hotelInfo.heroImages || []).map(url => ({ url, tags: ['all'] }))
          }
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      {/* Booking Drawer overlay */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-0 font-sans">
          <div className="bg-[#FAF6F0] w-full max-w-md rounded-t-3xl border-t border-[#8FA89B] overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="p-4 border-b border-[#D8E2DC] flex items-center justify-between bg-[#EBF0EC]">
              <h3 className="font-extrabold text-[#3D405B] text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4.5 h-4.5 text-[#8FA89B]" />
                <span>Reserve Room Checkout</span>
              </h3>
              <button onClick={() => setIsBookingOpen(false)} className="p-1 rounded-lg text-zinc-550 hover:text-[#3D405B] transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left text-zinc-700">
              {bookingStep === 'details' ? (
                <>
                <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
                  {/* Step indicators */}
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-2 shrink-0">
                    <span className="text-[12px] font-black uppercase text-zinc-500 font-sans">
                      Step {checkoutStep} of 3
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(step => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            checkoutStep === step ? 'bg-[#8FA89B] w-7' : 'bg-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ───────────────── STEP 1 ───────────────── */}
                  {checkoutStep === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* Integrated Date Picker in Styled Bar */}
                      <div className="bg-[#8FA89B]/10 border border-[#8FA89B]/25 p-3 rounded-2xl flex justify-between items-center text-xs text-[#333D29] font-extrabold tracking-wider uppercase">
                        <div className="relative text-left flex-1 cursor-pointer">
                          <span className="text-[10px] text-zinc-500 block mb-0.5 font-extrabold">CHECK-IN</span>
                          <div className="text-[13px] font-black text-[#333D29] pointer-events-none">
                            {formatDateToDDMMYYYY(checkIn)}
                          </div>
                          <input
                            type="date"
                            value={checkIn}
                            onChange={(e) => handleCheckInChange(e.target.value)}
                            onClick={(e) => {
                              try {
                                e.currentTarget.showPicker();
                              } catch (err) {}
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                        </div>
                        <ChevronRight className="w-4.5 h-4.5 text-[#8FA89B] shrink-0 mx-2" />
                        <div className="relative text-left flex-1 cursor-pointer">
                          <span className="text-[10px] text-zinc-500 block mb-0.5 font-extrabold">CHECK-OUT</span>
                          <div className="text-[13px] font-black text-[#333D29] pointer-events-none">
                            {formatDateToDDMMYYYY(checkOut)}
                          </div>
                          <input
                            type="date"
                            value={checkOut}
                            onChange={(e) => handleCheckOutChange(e.target.value)}
                            onClick={(e) => {
                              try {
                                e.currentTarget.showPicker();
                              } catch (err) {}
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] text-zinc-500 block font-extrabold">LENGTH</span>
                          <span className="text-[13px] font-black">{totals.nights} Nights</span>
                        </div>
                      </div>
                      {/* Selection Mode Tabs (Smart vs Make Your Own Combo) */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-[#E8E2D6]/40 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSelectionTab('smart');
                            // Reset selected room list to initial room category if empty
                            if (selectedRoomsList.length === 0 && selectedRoomId) {
                              const r = rooms.find(room => room.id === selectedRoomId);
                              if (r) {
                                setSelectedRoomsList([r]);
                              }
                            }
                          }}
                          className={`py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-205 cursor-pointer text-center ${
                            activeSelectionTab === 'smart'
                              ? 'bg-[#3D405B] text-white shadow-xs'
                              : 'text-[#333D29]/75 hover:bg-[#FAF6F0]/40'
                          }`}
                        >
                          Smart Recommendations
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSelectionTab('custom')}
                          className={`py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-205 cursor-pointer text-center ${
                            activeSelectionTab === 'custom'
                              ? 'bg-[#3D405B] text-white shadow-xs'
                              : 'text-[#333D29]/75 hover:bg-[#FAF6F0]/40'
                          }`}
                        >
                          Make Your Own Combo
                        </button>
                      </div>

                      {activeSelectionTab === 'smart' ? (
                        <>
                          {/* Occupancy Counters with +/- */}
                          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                            {/* Adults */}
                            <div className="bg-white border border-zinc-200 p-3.5 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-[10.5px] text-zinc-500 font-extrabold uppercase tracking-wider block">Adults</span>
                                <span className="text-[11px] text-zinc-450 block font-semibold">Age {maxAge + 1}+</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setAdultsCount(prev => Math.max(1, prev - 1))}
                                  className="w-7 h-7 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-[#E8E2D6] cursor-pointer text-sm transition"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-black text-sm text-[#3D405B]">{adultsCount}</span>
                                <button
                                  type="button"
                                  onClick={() => setAdultsCount(prev => Math.min(10, prev + 1))}
                                  className="w-7 h-7 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-[#E8E2D6] cursor-pointer text-sm transition"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Children */}
                            <div className="bg-white border border-zinc-200 p-3.5 rounded-2xl flex items-center justify-between">
                              <div>
                                <span className="text-[10.5px] text-zinc-500 font-extrabold uppercase tracking-wider block">Children</span>
                                <span className="text-[11px] text-zinc-450 block font-semibold">Age 0-{maxAge}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleChildrenCountChange(Math.max(0, childrenCount - 1))}
                                  className="w-7 h-7 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-[#E8E2D6] cursor-pointer text-sm transition"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center font-black text-sm text-[#3D405B]">{childrenCount}</span>
                                <button
                                  type="button"
                                  onClick={() => handleChildrenCountChange(Math.min(5, childrenCount + 1))}
                                  className="w-7 h-7 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-zinc-650 hover:bg-[#E8E2D6] cursor-pointer text-sm transition"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Child Ages specifiers */}
                          {childrenCount > 0 && (
                            <div className="bg-white border border-[#D8E2DC] p-4 rounded-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-205">
                              <span className="text-[10.5px] text-zinc-500 font-extrabold uppercase block font-sans tracking-wide">Specify Child Ages</span>
                              <div className="grid grid-cols-3 gap-3">
                                {childrenAges.map((age, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <label className="text-[9px] text-zinc-450 font-bold block font-sans uppercase">Child {idx + 1} Age</label>
                                    <select
                                      value={age}
                                      onChange={(e) => {
                                        const newAges = [...childrenAges];
                                        newAges[idx] = Number(e.target.value);
                                        setChildrenAges(newAges);
                                      }}
                                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-2xs font-extrabold text-zinc-800 outline-none focus:border-blue-400 transition"
                                    >
                                      {[...Array(maxAge + 1)].map((_, a) => (
                                        <option key={a} value={a}>{a} yrs</option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Smart Recommendations Section */}
                          <div className="space-y-2 animate-in fade-in duration-300">
                            <span className="text-[10.5px] text-zinc-550 font-extrabold uppercase tracking-wider block">Smart Suite Recommendations</span>
                            {recommendations.length === 0 ? (
                              <p className="text-[11px] text-rose-500 font-bold text-center py-4 bg-rose-50/30 border border-rose-200/50 rounded-2xl">No matches fit your group size. Try another date or custom configuration.</p>
                            ) : (
                              <div className="space-y-2">
                                {recommendations.map((rec, idx) => {
                                  const isCurrentlySelected = currentSelectedRooms.length === rec.rooms.length &&
                                    rec.rooms.every(r => currentSelectedRooms.some(curr => curr.id === r.id));

                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setSelectedRoomsList(rec.rooms);
                                        if (rec.rooms[0]) {
                                          setSelectedRoomId(rec.rooms[0].id);
                                        }
                                      }}
                                      className={`p-3 border rounded-2xl text-left transition duration-200 cursor-pointer ${
                                        isCurrentlySelected
                                          ? 'bg-[#EBF0EC] border-[#8FA89B] ring-2 ring-[#8FA89B]/20'
                                          : 'bg-white border-[#D8E2DC] hover:border-[#8FA89B]'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="max-w-[70%]">
                                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.8 rounded-full ${
                                            rec.type === 'combo' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                          }`}>
                                            {rec.type === 'combo' ? 'Combo Option' : 'Single Room Option'}
                                          </span>
                                          <h4 className="font-extrabold text-[#3D405B] text-[13.5px] pt-1.5 leading-snug">{rec.label}</h4>
                                          <p className="text-xs text-zinc-500 leading-normal mt-0.5">{rec.description}</p>

                                          {/* Room Thumbnail Photos Grid */}
                                          <div className="flex gap-2 mt-2 overflow-x-auto py-0.5 scrollbar-none">
                                            {Array.from(new Set(rec.rooms.flatMap(r => r.photos || []))).slice(0, 3).map((photoUrl, pIdx) => (
                                              <img
                                                key={pIdx}
                                                src={photoUrl}
                                                alt="Room thumbnail"
                                                className="w-24 h-16 object-cover rounded-xl border border-zinc-200 shadow-2xs"
                                              />
                                            ))}
                                          </div>

                                          {/* Know More Button */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPopoverCombo(rec);
                                            }}
                                            className="text-[11px] text-[#8FA89B] hover:text-[#7D9689] font-extrabold uppercase tracking-wider underline mt-2.5 block cursor-pointer"
                                          >
                                            Know More & Plan Details
                                          </button>
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end">
                                          {rec.originalPrice > rec.price ? (
                                            <>
                                              <span className="line-through text-zinc-400 text-[10.5px] font-semibold block leading-none mb-0.5">
                                                ₹{rec.originalPrice.toLocaleString('en-IN')}
                                              </span>
                                              <span className="text-sm font-black text-[#E07A5F] block leading-none">
                                                ₹{rec.price.toLocaleString('en-IN')}
                                              </span>
                                              <span className="text-emerald-600 font-extrabold text-[9px] uppercase tracking-wide block mt-1">
                                                {Math.round(((rec.originalPrice - rec.price) / rec.originalPrice) * 100)}% OFF
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-sm font-black text-[#E07A5F] block">
                                              ₹{rec.price.toLocaleString('en-IN')}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-zinc-450 font-semibold mt-1">total stay</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Custom Combo Builder (Make Your Own Combo) */}
                          <div className="bg-white border border-zinc-200 p-4 rounded-2xl space-y-3.5 text-left animate-in fade-in duration-300">
                            <div>
                              <span className="text-[10.5px] text-zinc-550 font-extrabold uppercase tracking-wider block">Make Your Own Combo</span>
                              <p className="text-xs text-zinc-500 mt-0.5">Select custom quantity of each suite type to customize your stay combo.</p>
                            </div>
                            <div className="space-y-3.5">
                              {rooms.map(room => {
                                const count = selectedRoomsList.filter(r => r.id === room.id).length;
                                const isSelectable = roomInventoryStatuses[room.id]?.selectable ?? true;
                                const datesInfo = roomInventoryStatuses[room.id]?.datesInfo || [];

                                const roomAdults = roomAdultsCount[room.id] || count;
                                const roomKids = roomKidsCount[room.id] || 0;
                                const maxOccupancyLimit = count * (room.capacityAdults || 2);

                                return (
                                  <div 
                                    key={room.id} 
                                    className={`p-3.5 rounded-2xl border transition text-left space-y-3.5 ${
                                      !isSelectable 
                                        ? 'bg-zinc-50/50 border-zinc-200 opacity-60' 
                                        : count > 0 
                                        ? 'bg-[#EBF0EC]/30 border-[#8FA89B]' 
                                        : 'bg-white border-zinc-200 hover:bg-zinc-50/20'
                                    }`}
                                  >
                                    <div className="flex gap-3 items-center justify-between">
                                      {/* Room info / details */}
                                      <div className="flex gap-3 items-center min-w-0">
                                        <div className="w-16 h-12 shrink-0 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                                          {room.photos && room.photos[0] ? (
                                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400 font-bold bg-zinc-100">NO IMG</div>
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <span className="font-extrabold text-[#3D405B] text-xs block uppercase truncate leading-tight">{room.name}</span>
                                          <span className="text-[10px] text-zinc-450 block font-extrabold tracking-wide uppercase mt-0.5">
                                            BASE {room.base_occupancy || 0} · MIN {room.min_occupancy || 1} · MAX {room.capacityAdults || 2}
                                          </span>
                                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            <span className="text-[9.5px] text-[#E07A5F] font-bold">₹{room.basePrice.toLocaleString('en-IN')}/night</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setPopoverCombo({
                                              rooms: [room],
                                              label: room.name,
                                              description: room.description,
                                              price: room.basePrice,
                                              originalPrice: room.basePrice,
                                              type: 'single'
                                            })}
                                            className="text-[9.5px] text-[#8FA89B] hover:text-[#7D9689] font-extrabold uppercase tracking-wider underline mt-1 block cursor-pointer"
                                          >
                                            Know More
                                          </button>
                                        </div>
                                      </div>

                                      {/* Quantity controls */}
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          disabled={count <= 0}
                                          onClick={() => handleCustomRoomQuantityChange(room.id, Math.max(0, count - 1))}
                                          className="w-7 h-7 rounded-full border border-zinc-200 bg-white hover:bg-zinc-150 flex items-center justify-center font-bold text-zinc-650 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          -
                                        </button>
                                        <span className="w-3.5 text-center font-black text-xs text-zinc-850">{count}</span>
                                        <button
                                          type="button"
                                          disabled={!isSelectable}
                                          onClick={() => handleCustomRoomQuantityChange(room.id, count + 1)}
                                          className="w-7 h-7 rounded-full border border-zinc-200 bg-white hover:bg-zinc-150 flex items-center justify-center font-bold text-zinc-650 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {/* Datewise inventory badges */}
                                    {datesInfo.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                                        {datesInfo.map((item: any) => {
                                          const isSoldOut = item.avail <= 0;
                                          return (
                                            <div 
                                              key={item.dateStr} 
                                              className={`flex flex-col items-center justify-center border rounded-xl px-2.5 py-1.5 min-w-[64px] text-center bg-white ${
                                                isSoldOut 
                                                  ? 'border-rose-200 bg-rose-50/50' 
                                                  : 'border-zinc-200'
                                              }`}
                                            >
                                              <span className="text-[9px] font-bold text-zinc-455 block">{item.displayStr}</span>
                                              <span className={`text-[9.5px] font-black block mt-0.5 ${
                                                isSoldOut ? 'text-rose-600' : 'text-zinc-850'
                                              }`}>
                                                {isSoldOut ? 'Sold Out' : `${item.avail} avl`}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Inline Guest Limit Controllers (Image 1 Ref) */}
                                    {count > 0 && (
                                      <div className="pt-3 border-t border-dashed border-zinc-200 space-y-2.5 bg-[#FAF9F5]/40 p-2.5 rounded-xl border border-zinc-200/60 text-xs">
                                        <span className="text-[9px] font-black text-zinc-455 uppercase tracking-wider block">
                                          Configure guests in {room.name}:
                                        </span>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-zinc-650">Adults:</span>
                                            <div className="flex items-center border border-zinc-250 bg-white rounded-lg overflow-hidden">
                                              <button
                                                type="button"
                                                disabled={roomAdults <= count}
                                                onClick={() => handleCustomRoomGuestsChange(room.id, 'adults', roomAdults - 1)}
                                                className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                              >
                                                -
                                              </button>
                                              <span className="px-2 text-[10.5px] font-black font-mono">{roomAdults}</span>
                                              <button
                                                type="button"
                                                disabled={roomAdults + roomKids >= maxOccupancyLimit}
                                                onClick={() => handleCustomRoomGuestsChange(room.id, 'adults', roomAdults + 1)}
                                                className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-650 disabled:opacity-30 font-black cursor-pointer"
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-zinc-650">Kids:</span>
                                            <div className="flex items-center border border-zinc-250 bg-white rounded-lg overflow-hidden">
                                              <button
                                                type="button"
                                                disabled={roomKids <= 0}
                                                onClick={() => handleCustomRoomGuestsChange(room.id, 'kids', roomKids - 1)}
                                                className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                              >
                                                -
                                              </button>
                                              <span className="px-2 text-[10.5px] font-black font-mono">{roomKids}</span>
                                              <button
                                                type="button"
                                                disabled={roomAdults + roomKids >= maxOccupancyLimit}
                                                onClick={() => handleCustomRoomGuestsChange(room.id, 'kids', roomKids + 1)}
                                                className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-650 disabled:opacity-30 font-black cursor-pointer"
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Child Ages specifiers (when kids count > 0) */}
                                        {roomKids > 0 && (
                                          <div className="space-y-1.5 pt-2.5 border-t border-dashed border-zinc-200">
                                            <span className="text-[9.5px] font-extrabold uppercase block font-sans tracking-wide">Specify Child Ages:</span>
                                            <div className="grid grid-cols-3 gap-2">
                                              {(roomKidsAges[room.id] || Array(roomKids).fill(8)).map((age, idx) => (
                                                <div key={idx} className="space-y-1">
                                                  <label className="text-[8.5px] text-zinc-400 font-bold block uppercase">Child {idx + 1}</label>
                                                  <select
                                                    value={age}
                                                    onChange={(e) => {
                                                      const currentAges = [...(roomKidsAges[room.id] || Array(roomKids).fill(8))];
                                                      currentAges[idx] = Number(e.target.value);
                                                      setRoomKidsAges(prev => ({
                                                        ...prev,
                                                        [room.id]: currentAges
                                                      }));
                                                    }}
                                                    className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-800 outline-none focus:border-blue-400 transition"
                                                  >
                                                    {[...Array(maxAge + 1)].map((_, a) => (
                                                      <option key={a} value={a}>{a} yrs</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <p className="text-[9px] text-zinc-400 font-semibold text-right">
                                          Total occupancy limit (Adults + Kids): max {maxOccupancyLimit}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}

                      {comboValidationError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[10.5px] p-3 rounded-xl font-bold leading-normal font-sans text-left mt-3">
                          ⚠️ {comboValidationError}
                        </div>
                      )}

                      {/* Next button */}
                      <button
                        type="button"
                        onClick={() => {
                          const policyEnabled = hotelInfo.childPolicyEnabled !== false;
                          const minAge = policyEnabled ? (hotelInfo.childPolicyMinAge ?? 5) : 5;
                          const maxAge = policyEnabled ? (hotelInfo.childPolicyMaxAge ?? 12) : 12;

                          const payingChildren = childrenAges.filter(age => age > minAge && age <= maxAge).length;
                          const adultChildren = childrenAges.filter(age => age > maxAge).length;

                          const effAdults = adultsCount + adultChildren;
                          const effChildren = payingChildren;

                          const tooMany = checkTooManyRooms(currentSelectedRooms, effAdults, effChildren);
                          if (tooMany) {
                            setComboValidationError(tooMany.message);
                          } else {
                            setComboValidationError(null);
                            setCheckoutStep(2);
                          }
                        }}
                        disabled={currentSelectedRooms.length === 0}
                        className="w-full py-2.5 bg-[#3D405B] hover:bg-[#2d304a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next: Meal Plans & Addons
                      </button>
                    </div>
                  )}

                  {/* ───────────────── STEP 2 ───────────────── */}
                  {checkoutStep === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* Select Meal Plan */}
                      <div className="space-y-2">
                        <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider block">Choose Meal Plan</span>
                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const isCpBase = hotelInfo.defaultMealPlan === 'CP';
                            const cpAdult = hotelInfo.mealPlanCpAdultRate ?? 300;
                            const mapAdult = hotelInfo.mealPlanMapAdultRate ?? 1000;
                            const apAdult = hotelInfo.mealPlanApAdultRate ?? 1500;

                            const plans = [
                              { 
                                key: 'ep', 
                                label: 'EP (Room Only)', 
                                rate: 'Free', 
                                desc: 'No meals included', 
                                show: !isCpBase 
                              },
                              { 
                                key: 'cp', 
                                label: 'CP (Breakfast)', 
                                rate: isCpBase ? 'Free' : `+₹${cpAdult}`, 
                                desc: 'Complimentary breakfast', 
                                show: hotelInfo.mealPlanCpEnabled !== false 
                              },
                              { 
                                key: 'map', 
                                label: 'MAP (Half Board)', 
                                rate: `+₹${isCpBase ? Math.max(0, mapAdult - cpAdult) : mapAdult}`, 
                                desc: 'Breakfast + lunch or dinner', 
                                show: hotelInfo.mealPlanMapEnabled !== false 
                              },
                              { 
                                key: 'ap', 
                                label: 'AP (Full Board)', 
                                rate: `+₹${isCpBase ? Math.max(0, apAdult - cpAdult) : apAdult}`, 
                                desc: 'All daily meals included', 
                                show: hotelInfo.mealPlanApEnabled !== false 
                              },
                            ];

                            return plans.filter(plan => plan.show).map(plan => (
                              <div
                                key={plan.key}
                                onClick={() => setSelectedMealPlan(plan.key as any)}
                                className={`p-3 border rounded-2xl text-left cursor-pointer transition duration-200 ${
                                  selectedMealPlan === plan.key
                                    ? 'bg-[#EBF0EC] border-[#8FA89B] ring-2 ring-[#8FA89B]/20'
                                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-[#3D405B] text-2xs uppercase block">{plan.label}</span>
                                  <span className="text-[9px] font-extrabold text-[#E07A5F]">{plan.rate}</span>
                                </div>
                                <p className="text-[9.5px] text-zinc-400 leading-tight">{plan.desc}</p>
                                <span className="text-[8px] text-zinc-400 block mt-1">
                                  {plan.rate === 'Free' ? 'included in base rate' : 'per guest / night'}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Select Add-ons */}
                      {addons.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-[8px] text-zinc-400 font-bold uppercase block tracking-wider">Add Stay Add-ons</span>
                          <div className="space-y-2.5">
                            {(showAllAddons ? addons : addons.slice(0, 2)).map(addon => {
                              const qty = addonQuantities[addon.name] || 0;
                              return (
                                <div
                                  key={addon.id}
                                  className={`flex items-center justify-between p-3 border rounded-2xl bg-white text-left transition ${
                                    qty > 0 ? 'border-[#8FA89B] bg-[#FAF6F0]/20' : 'border-zinc-200'
                                  }`}
                                >
                                  <div className="pr-2 max-w-[65%]">
                                    <span className="block font-bold uppercase text-[#3D405B] truncate text-3xs">{addon.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedAddonDetail(addon)}
                                        className="text-[9px] font-bold text-[#E07A5F] hover:underline cursor-pointer uppercase tracking-wider text-left"
                                      >
                                        Know More
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className="font-extrabold text-[#E07A5F] text-[10px] shrink-0">
                                      +₹{addon.price}
                                      {addon.pricingType === 'per_head' && <span className="text-[8px] font-normal text-zinc-400 lowercase ml-0.5">/guest</span>}
                                    </span>
                                    
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddonQuantities(prev => ({
                                          ...prev,
                                          [addon.name]: qty > 0 ? 0 : 1
                                        }));
                                      }}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition cursor-pointer ${
                                        qty > 0
                                          ? 'bg-[#8FA89B] border-[#8FA89B] text-white'
                                          : 'border-zinc-300 bg-white hover:border-[#8FA89B]'
                                      }`}
                                    >
                                      {qty > 0 ? (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <span className="text-zinc-400 text-xs font-light">+</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {addons.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setShowAllAddons(!showAllAddons)}
                              className="text-[9px] font-extrabold text-[#8FA89B] hover:text-[#7D9689] flex items-center gap-1 mt-1.5 mx-auto uppercase tracking-wider cursor-pointer"
                            >
                              <span>{showAllAddons ? 'Show Less' : `Show More (${addons.length - 2} more)`}</span>
                              {showAllAddons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-400">No addons configured yet.</p>
                      )}

                      {/* Event Packages (Optional) */}
                      {(() => {
                        const start = new Date(checkIn);
                        const end = new Date(checkOut);
                        const stayEvents = guestEvents.filter(evt => {
                          const evtDate = new Date(evt.date || evt.fromDate);
                          return evtDate >= start && evtDate <= end && evt.target !== 'outside_guest';
                        });

                        if (stayEvents.length === 0) return null;

                        return (
                          <div className="space-y-2 mt-4 pt-4 border-t border-zinc-200">
                            <span className="text-[8px] text-zinc-400 font-bold uppercase block tracking-wider">Scheduled Events During Your Stay</span>
                            <div className="space-y-2.5">
                              {(showAllEvents ? stayEvents : stayEvents.slice(0, 2)).map(evt => {
                                // Find any selected key starting with "Event: evt.title"
                                const matchedKey = Object.keys(addonQuantities).find(k => k.startsWith(`Event: ${evt.title}`));
                                const qty = matchedKey ? addonQuantities[matchedKey] : 0;
                                
                                // Determine selected slot from matchedKey if it has parenthesis
                                const selectedSlotTime = matchedKey && matchedKey.includes(' (')
                                  ? matchedKey.split(' (')[1].replace(')', '')
                                  : '';

                                // Find matching slot id to calculate slot-specific available capacity
                                const selectedSlotObj = evt.slots?.find((s: any) => 
                                  `${formatTime12h(s.fromTime)} - ${formatTime12h(s.toTime)}` === selectedSlotTime
                                );
                                const remaining = getAvailableSlots(evt, selectedSlotObj?.id);
                                const isSoldOut = remaining === 0;

                                return (
                                  <div
                                    key={evt.id}
                                    className={`flex flex-col p-3 border rounded-2xl bg-white text-left transition ${
                                      qty > 0 ? 'border-[#8FA89B] bg-[#FAF6F0]/20' : 'border-zinc-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="pr-2 max-w-[65%]">
                                        <span className="block font-bold uppercase text-[#3D405B] truncate text-3xs">{evt.title}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAddonDetail({
                                              name: evt.title,
                                              price: evt.priceAdult ?? evt.price ?? 0,
                                              description: evt.description || 'No description available.',
                                              image: evt.image || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
                                              isEvent: true,
                                              eventObj: evt,
                                            })}
                                            className="text-[9px] font-bold text-[#E07A5F] hover:underline cursor-pointer uppercase tracking-wider text-left"
                                          >
                                            Know More
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="font-extrabold text-[#E07A5F] text-[10px] shrink-0">
                                          {(() => {
                                            const baseAdult = evt.priceAdult ?? evt.price ?? 0;
                                            const disc = evt.discount ?? 0;
                                            if (disc > 0) {
                                              const discounted = Math.round(baseAdult * (1 - disc / 100));
                                              return (
                                                <span className="flex items-center gap-1">
                                                  <span className="line-through text-zinc-400 font-normal">₹{baseAdult}</span>
                                                  <span className="text-[#E07A5F]">₹{discounted}</span>
                                                </span>
                                              );
                                            }
                                            return `₹${baseAdult}`;
                                          })()}
                                          <span className="text-[8px] font-normal text-zinc-400 lowercase ml-0.5">/guest</span>
                                        </span>
                                        
                                        {isSoldOut && !qty ? (
                                          <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wide">Sold Out</span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddonQuantities(prev => {
                                                const next = { ...prev };
                                                if (matchedKey) {
                                                  delete next[matchedKey];
                                                } else {
                                                  // Select default slot if defined
                                                  if (evt.slots && evt.slots.length > 0) {
                                                    const s = evt.slots[0];
                                                    const sTime = `${formatTime12h(s.fromTime)} - ${formatTime12h(s.toTime)}`;
                                                    next[`Event: ${evt.title} (${sTime})`] = 1;
                                                  } else {
                                                    next[`Event: ${evt.title}`] = 1;
                                                  }
                                                }
                                                return next;
                                              });
                                            }}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition cursor-pointer ${
                                              qty > 0
                                                ? 'bg-[#8FA89B] border-[#8FA89B] text-white'
                                                : 'border-zinc-300 bg-white hover:border-[#8FA89B]'
                                            }`}
                                          >
                                            {qty > 0 ? (
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            ) : (
                                              <span className="text-zinc-400 text-xs font-light">+</span>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {qty > 0 && selectedSlotTime && (
                                      <span className="text-[7.5px] font-extrabold text-[#556B2F] block mt-1.5 bg-[#556B2F]/10 px-2 py-0.5 rounded-lg w-fit">
                                        ⏰ SLOT: {selectedSlotTime}
                                      </span>
                                    )}

                                    {/* Timing Slot selector dropdown inside addon item */}
                                    {evt.slots && evt.slots.length > 0 && qty > 0 && (
                                      <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-1">
                                        <label className="text-[8px] text-[#556B2F] font-extrabold uppercase block tracking-wider">Select Timing Slot</label>
                                        <select
                                          value={selectedSlotTime}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setAddonQuantities(prev => {
                                              const next = { ...prev };
                                              if (matchedKey) {
                                                delete next[matchedKey];
                                              }
                                              if (val) {
                                                next[`Event: ${evt.title} (${val})`] = 1;
                                              } else {
                                                next[`Event: ${evt.title}`] = 1;
                                              }
                                              return next;
                                            });
                                          }}
                                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-[9.5px] text-zinc-800"
                                        >
                                          {evt.slots.map((s: any) => {
                                            const avail = getAvailableSlots(evt, s.id);
                                            const sTime = `${formatTime12h(s.fromTime)} - ${formatTime12h(s.toTime)}`;
                                            return (
                                              <option key={s.id} value={sTime} disabled={avail === 0 && sTime !== selectedSlotTime}>
                                                {sTime} ({avail === 0 && sTime !== selectedSlotTime ? 'sold out' : `${avail} slots left`})
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {stayEvents.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setShowAllEvents(!showAllEvents)}
                                className="text-[9px] font-extrabold text-[#8FA89B] hover:text-[#7D9689] flex items-center gap-1 mt-1.5 mx-auto uppercase tracking-wider cursor-pointer"
                              >
                                <span>{showAllEvents ? 'Show Less' : `Show More (${stayEvents.length - 2} more)`}</span>
                                {showAllEvents ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Navigation buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(1)}
                          className="w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(3)}
                          className="w-full py-2.5 bg-[#3D405B] hover:bg-[#2d304a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                        >
                          Next: Checkout Info
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────────────── STEP 3 ───────────────── */}
                  {checkoutStep === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* Stay Summary & Cancellation Policy */}
                      <div className="space-y-2.5">
                        <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl space-y-2 text-left text-xs font-semibold">
                          <span className="text-[8px] text-zinc-400 font-bold uppercase block tracking-wider">Stay & Rooms Summary</span>
                          {currentSelectedRooms.map((room, rIdx) => (
                            <div key={`${room.id}-${rIdx}`} className="flex justify-between items-center text-zinc-700">
                              <span className="font-extrabold capitalize">{room.name}</span>
                              <span className="text-zinc-450">{checkIn} to {checkOut} ({totals.nights} Nights)</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl space-y-1 text-left text-xs font-semibold">
                          <span className="text-[8px] text-zinc-400 font-bold uppercase block tracking-wider">Cancellation Policy</span>
                          <p className="text-[10px] text-zinc-550 font-normal leading-relaxed font-sans mt-0.5 normal-case">
                            {(() => {
                              const targetDate = checkIn;
                              const firstRoom = currentSelectedRooms[0];
                              const policyType = firstRoom?.cancellation_policy_overrides?.[targetDate] || hotelInfo?.cancellationPolicyType || '2d';
                              return getCancellationPolicyDescription(policyType, hotelInfo?.customCancellationPolicies);
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Coupons Codes */}
                      <div className="space-y-1.5 bg-white border border-zinc-200 p-3 rounded-2xl">
                        <span className="text-[8px] text-zinc-400 font-bold uppercase block">Coupon / Promo Code</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="WELCOME10"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-zinc-800 outline-none uppercase font-bold tracking-wider"
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

                      {/* Pricing Breakdown Summary */}
                      <div className="p-4 bg-white rounded-2xl border border-zinc-200 space-y-2.5 text-3xs font-semibold uppercase tracking-wider font-sans">
                        <div className="flex justify-between text-zinc-450 items-center">
                          <span>Room Subtotal ({totals.nights} Nights)</span>
                          <div className="flex items-center gap-1.5">
                            {totals.originalSubtotal > totals.subtotal && (
                              <span className="line-through text-zinc-400 font-normal">
                                ₹{totals.originalSubtotal.toLocaleString('en-IN')}
                              </span>
                            )}
                            <span className={totals.originalSubtotal > totals.subtotal ? 'text-[#E07A5F] font-black' : ''}>
                              ₹{totals.subtotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        {totals.mealPlanTotal > 0 && (
                          <div className="flex justify-between text-zinc-450">
                            <span>Meal Plan ({selectedMealPlan.toUpperCase()})</span>
                            <span>+₹{totals.mealPlanTotal.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {totals.addonTotal > 0 && (
                          <div className="flex justify-between text-zinc-450">
                            <span>Stay Add-ons</span>
                            <span>+₹{totals.addonTotal.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {totals.discount > 0 && (
                          <div className="flex justify-between text-emerald-650 font-bold">
                            <span>Coupon Discount</span>
                            <span>-₹{totals.discount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {/* Goods & Services Tax (GST) breakdown */}
                        <div className="space-y-1 text-zinc-450 border-t border-zinc-100 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowGstBreakdown(prev => !prev)}
                            className="flex justify-between items-center w-full hover:text-zinc-650 transition cursor-pointer select-none text-left"
                          >
                            <span className="flex items-center gap-1">
                              <span>Goods & Services Tax (GST)</span>
                              {showGstBreakdown ? (
                                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </span>
                            <span>+₹{totals.gstTotal.toLocaleString('en-IN')}</span>
                          </button>

                          {showGstBreakdown && (
                            <div className="pl-3 py-1.5 space-y-1 text-zinc-400 border-l border-[#8FA89B] bg-zinc-50/50 rounded-r-lg text-4xs uppercase tracking-widest leading-relaxed">
                              {totals.gstBreakdown.roomsGst > 0 && (
                                <div className="flex justify-between">
                                  <span>Rooms GST (Slab-wise)</span>
                                  <span>₹{totals.gstBreakdown.roomsGst.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {totals.gstBreakdown.mealPlanGst > 0 && (
                                <div className="flex justify-between">
                                  <span>Meal Plan GST (18%)</span>
                                  <span>₹{totals.gstBreakdown.mealPlanGst.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {totals.gstBreakdown.eventsGst > 0 && (
                                <div className="flex justify-between">
                                  <span>Events GST (18%)</span>
                                  <span>₹{totals.gstBreakdown.eventsGst.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {totals.gstBreakdown.addonsGst > 0 && (
                                <div className="flex justify-between">
                                  <span>Ancillary Add-ons GST (18%)</span>
                                  <span>₹{totals.gstBreakdown.addonsGst.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between font-black text-xs text-[#3D405B] border-t border-zinc-200 pt-2.5">
                          <span>Total Stay Invoice</span>
                          <span className="text-[#E07A5F]">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Navigation buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep(2)}
                          className="w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-555 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentSelectedRooms.length === 0) {
                              alert('Please select at least one room.');
                              return;
                            }
                            setIsOtpPopupOpen(true);
                          }}
                          className="w-full py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer"
                        >
                          Proceed
                        </button>
                      </div>
                    </div>
                  )}

                </form>

                {/* OTP and Payment verification popup modal overlay */}
                {isOtpPopupOpen && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm border border-zinc-200 shadow-xl overflow-hidden flex flex-col max-h-[90%] text-left font-sans">
                      <div className="p-4 bg-[#EBF0EC] border-b border-zinc-200 flex items-center justify-between">
                        <h4 className="font-extrabold text-[#3D405B] text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-[#8FA89B]" />
                          <span>Guest Verification</span>
                        </h4>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsOtpPopupOpen(false);
                            setOtpSent(false);
                            setOtpVerified(false);
                            setEnteredOtp('');
                            setOtpError(null);
                          }} 
                          className="p-1 rounded-lg text-zinc-555 hover:bg-zinc-200/50 hover:text-zinc-800 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-5 overflow-y-auto space-y-4 text-xs font-semibold text-[#3D405B]">
                        {!otpVerified ? (
                          <>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide">Your Full Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. John Doe"
                                  value={guestName}
                                  onChange={(e) => setGuestName(e.target.value)}
                                  className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-none font-sans font-bold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide">Email Address</label>
                                <input
                                  type="email"
                                  placeholder="e.g. john@example.com"
                                  value={guestEmail}
                                  onChange={(e) => setGuestEmail(e.target.value)}
                                  className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-none font-sans font-bold"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide">Phone Number</label>
                                <input
                                  type="tel"
                                  placeholder="e.g. +91 9988776655"
                                  value={guestPhone}
                                  onChange={(e) => setGuestPhone(e.target.value)}
                                  className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-none font-sans font-bold"
                                />
                              </div>
                            </div>

                            {!otpSent ? (
                              <div className="space-y-3 pt-2">
                                <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide block">Select OTP Delivery Method</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOtpMethod('sms')}
                                    className={`py-2 px-3 border rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      otpMethod === 'sms'
                                        ? 'bg-[#1C1917] border-[#1C1917] text-white'
                                        : 'bg-white border-[#D8E2DC] text-zinc-650 hover:bg-zinc-50'
                                    }`}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>SMS OTP</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOtpMethod('whatsapp')}
                                    className={`py-2 px-3 border rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                      otpMethod === 'whatsapp'
                                        ? 'bg-emerald-700 border-emerald-700 text-white'
                                        : 'bg-white border-[#D8E2DC] text-zinc-650 hover:bg-zinc-50'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  disabled={!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()}
                                  onClick={() => {
                                    setOtpSent(true);
                                    setOtpError(null);
                                  }}
                                  className="w-full py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
                                >
                                  Send Verification Code
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-xl font-semibold leading-relaxed">
                                  Verification code has been sent to <span className="font-extrabold">{guestPhone}</span> via <span className="font-extrabold uppercase">{otpMethod}</span>. (Enter 1234 to verify)
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide block">Enter OTP Code</label>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="Enter code"
                                    value={enteredOtp}
                                    onChange={(e) => setEnteredOtp(e.target.value)}
                                    className="w-full text-center bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-sm text-zinc-800 font-black tracking-widest outline-none"
                                  />
                                </div>

                                {otpError && <p className="text-[10px] text-rose-500 font-bold">{otpError}</p>}

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOtpSent(false);
                                      setEnteredOtp('');
                                      setOtpError(null);
                                    }}
                                    className="flex-1 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-555 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
                                  >
                                    Change Info
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (enteredOtp === '1234' || enteredOtp.trim().length >= 4) {
                                        setOtpVerified(true);
                                        setOtpError(null);
                                      } else {
                                        setOtpError('Invalid verification code. Please enter 1234.');
                                      }
                                    }}
                                    className="flex-1 py-2 bg-[#3D405B] hover:bg-[#2d304a] text-white rounded-xl text-xs font-bold uppercase transition cursor-pointer"
                                  >
                                    Verify Code
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] rounded-xl font-semibold flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                              <span>Identity Verified Successfully!</span>
                            </div>

                            <div className="space-y-2">
                              <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wide block">Select Payment Terms</span>
                              <div className="space-y-2">
                                {/* Pay Fully Option */}
                                <label
                                  onClick={() => setPaymentSelection('full')}
                                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                                    paymentSelection === 'full'
                                      ? 'bg-[#EBF0EC] border-[#8FA89B] ring-2 ring-[#8FA89B]/10'
                                      : 'bg-white border-zinc-200 hover:border-[#8FA89B]/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={paymentSelection === 'full'}
                                      onChange={() => setPaymentSelection('full')}
                                      className="text-[#8FA89B] focus:ring-[#8FA89B]"
                                    />
                                    <div>
                                      <span className="font-extrabold text-xs block text-zinc-800">Pay Fully</span>
                                      <span className="text-[10px] text-zinc-450 block mt-0.5">Collect complete stay amount now</span>
                                    </div>
                                  </div>
                                  <span className="font-black text-xs text-[#3D405B]">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                                </label>

                                {/* Pay Partially Option */}
                                <label
                                  onClick={() => setPaymentSelection('partial')}
                                  className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                                    paymentSelection === 'partial'
                                      ? 'bg-[#EBF0EC] border-[#8FA89B] ring-2 ring-[#8FA89B]/10'
                                      : 'bg-white border-zinc-200 hover:border-[#8FA89B]/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={paymentSelection === 'partial'}
                                      onChange={() => setPaymentSelection('partial')}
                                      className="text-[#8FA89B] focus:ring-[#8FA89B]"
                                    />
                                    <div>
                                      <span className="font-extrabold text-xs block text-[#3D405B]">Pay Partially</span>
                                      <span className="text-[10px] text-zinc-450 block mt-0.5">Pay booking advance deposit ({hotelInfo.paymentCollectionPercent || 50}%)</span>
                                    </div>
                                  </div>
                                  <span className="font-black text-xs text-[#3D405B]">
                                    ₹{Math.round(totals.grandTotal * (hotelInfo.paymentCollectionPercent || 50) / 100).toLocaleString('en-IN')}
                                  </span>
                                </label>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleCreateBooking();
                                setIsOtpPopupOpen(false);
                                setOtpSent(false);
                                setOtpVerified(false);
                                setEnteredOtp('');
                              }}
                              className="w-full py-2.5 bg-[#8FA89B] hover:bg-[#7D9387] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
                            >
                              Pay Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
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
                    {paymentSelection === 'partial' && (
                      <p className="text-[10px] font-extrabold text-[#E07A5F] max-w-[240px] mx-auto pt-2 leading-relaxed uppercase tracking-wider">
                        ⚠️ The remaining balance must be paid directly at the hotel check-in desk.
                      </p>
                    )}
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
              <h3 className="font-extrabold text-[#3D405B] text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-[#8FA89B]" />
                <span>Reserve Event Pass</span>
              </h3>
              <button onClick={() => setIsEventBookingOpen(false)} className="p-1 rounded-lg text-zinc-555 hover:text-[#3D405B] transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left text-zinc-700">
              {selectedEvent.target === 'room_guest' ? (
                <div className="space-y-5 py-2">
                  {/* Event Detail Summary Card */}
                  <div className="p-4 bg-white border border-[#D8E2DC] rounded-2xl space-y-3 relative shadow-2xs">
                    <span className="bg-amber-100 text-amber-800 border border-amber-250 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                      {selectedEvent.category}
                    </span>
                    <h4 className="font-extrabold text-[#3D405B] text-sm uppercase leading-tight pt-1">{selectedEvent.title}</h4>
                    <p className="text-xs text-zinc-550 font-sans leading-relaxed">{selectedEvent.description}</p>

                    <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-extrabold uppercase text-[#556B2F]">
                      <span className="flex items-center gap-1"><Clock className="w-4.5 h-4.5 text-zinc-400" /> {selectedEvent.time}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-4.5 h-4.5 text-zinc-400" /> {convertToDDMMYYYY(selectedEvent.fromDate || selectedEvent.date || '')}</span>
                    </div>
                  </div>

                  {/* Exclusivity Warning Alert Box */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4.5 space-y-2 text-left">
                    <div className="flex items-center gap-2 text-amber-850 font-black text-xs uppercase tracking-wide">
                      <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                      <span>Exclusively for Stay Guests</span>
                    </div>
                    <p className="text-xs text-zinc-650 leading-relaxed font-sans font-medium">
                      This activity is reserved exclusively for guests staying at our resort. You can easily add passes to this event as an add-on during your room booking checkout.
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setIsEventBookingOpen(false)}
                    className="w-full py-2.5 bg-[#3D405B] hover:bg-[#2d304a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
                  >
                    Close Window
                  </button>
                </div>
              ) : eventBookingStep === 'details' ? (
                <form onSubmit={handleCreateEventBooking} className="space-y-4 text-xs font-sans">

                  {/* Event Detail Summary Card */}
                  <div className="p-4 bg-white border border-[#D8E2DC] rounded-2xl space-y-2 relative">
                    <span className="bg-[#8FA89B]/10 text-[#8FA89B] border border-[#8FA89B]/25 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                      {selectedEvent.category}
                    </span>
                    <h4 className="font-extrabold text-[#3D405B] text-sm uppercase leading-tight pt-1">{selectedEvent.title}</h4>
                    <p className="text-xs text-zinc-500 font-sans leading-relaxed">{selectedEvent.description}</p>

                    <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-extrabold uppercase text-[#556B2F]">
                      <span className="flex items-center gap-1.5"><Clock className="w-4.5 h-4.5 text-zinc-400" /> {selectedEvent.time}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="w-4.5 h-4.5 text-zinc-400" /> {convertToDDMMYYYY(selectedEvent.fromDate || selectedEvent.date || '')}</span>
                    </div>
                  </div>

                  {/* Timing Slot selector */}
                  {selectedEvent.slots && selectedEvent.slots.length > 0 && (
                    <div className="space-y-1.5 bg-white border border-[#D8E2DC] p-3.5 rounded-2xl">
                      <label className="text-[10.5px] text-[#3D405B] font-extrabold uppercase block tracking-wider">Select Timing Slot</label>
                      <select
                        required
                        value={eventSelectedSlotId}
                        onChange={(e) => {
                          setEventSelectedSlotId(e.target.value);
                          // reset counts to prevent slot overflow errors
                          setEventAdultsCount(1);
                          setEventChildrenCount(0);
                          setEventChildrenAges([]);
                        }}
                        className="w-full bg-[#FAF6F0] border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 font-bold"
                      >
                        <option value="">Choose a timing slot...</option>
                        {selectedEvent.slots.map((s: any) => {
                          const avail = getAvailableSlots(selectedEvent, s.id);
                          return (
                            <option key={s.id} value={s.id} disabled={avail === 0}>
                              {formatTime12h(s.fromTime)} - {formatTime12h(s.toTime)} ({avail === 0 ? 'SOLD OUT' : `${avail} slots left`})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Adult count selector */}
                  <div className="flex items-center justify-between p-3.5 bg-white border border-[#D8E2DC] rounded-2xl">
                    <div>
                      <span className="font-extrabold text-[#3D405B] uppercase text-[10.5px] block">Adults</span>
                      <span className="text-[9.5px] font-bold text-zinc-450 block mt-0.5">
                        {renderEventPrice(selectedEvent)} / guest
                      </span>
                    </div>
                    <div className="flex items-center bg-[#FAF6F0] border border-[#D8E2DC] rounded-full p-0.5 font-bold">
                      <button
                        type="button"
                        onClick={() => setEventAdultsCount(prev => Math.max(1, prev - 1))}
                        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-black text-[#3D405B]">{eventAdultsCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const maxSlots = selectedEvent.slots && selectedEvent.slots.length > 0
                            ? getAvailableSlots(selectedEvent, eventSelectedSlotId)
                            : getAvailableSlots(selectedEvent);
                          setEventAdultsCount(prev => Math.min(maxSlots - eventChildrenCount, prev + 1));
                        }}
                        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Child count selector */}
                  <div className="flex items-center justify-between p-3.5 bg-white border border-[#D8E2DC] rounded-2xl">
                    <div>
                      <span className="font-extrabold text-[#3D405B] uppercase text-[10.5px] block">Children</span>
                      <span className="text-[9.5px] font-bold text-zinc-450 block mt-0.5">
                        {renderEventChildPrice(selectedEvent)} / child
                      </span>
                    </div>
                    <div className="flex items-center bg-[#FAF6F0] border border-[#D8E2DC] rounded-full p-0.5 font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          if (eventChildrenCount > 0) {
                            const newCount = eventChildrenCount - 1;
                            setEventChildrenCount(newCount);
                            setEventChildrenAges(ages => ages.slice(0, newCount));
                          }
                        }}
                        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-black text-[#3D405B]">{eventChildrenCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const maxSlots = selectedEvent.slots && selectedEvent.slots.length > 0
                            ? getAvailableSlots(selectedEvent, eventSelectedSlotId)
                            : getAvailableSlots(selectedEvent);
                          if (eventAdultsCount + eventChildrenCount < maxSlots) {
                            const newCount = eventChildrenCount + 1;
                            setEventChildrenCount(newCount);
                            setEventChildrenAges(ages => [...ages, 8]);
                          }
                        }}
                        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-zinc-500 hover:bg-[#E8E2D6] transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children Ages Specify */}
                  {eventChildrenCount > 0 && (
                    <div className="p-3.5 bg-white border border-[#D8E2DC] rounded-2xl space-y-2.5 font-sans">
                      <span className="text-[10.5px] text-zinc-500 font-extrabold uppercase block tracking-wider">Specify Children's Ages</span>
                      <div className="grid grid-cols-3 gap-2.5">
                        {eventChildrenAges.map((age, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-450 block uppercase">Child {idx + 1} Age</label>
                            <select
                              value={age}
                              onChange={(e) => {
                                const newAge = Number(e.target.value);
                                setEventChildrenAges(prev => prev.map((val, i) => i === idx ? newAge : val));
                              }}
                              className="w-full bg-[#FAF6F0] border border-zinc-200 rounded px-1.5 py-1 text-2xs text-zinc-800 outline-hidden font-black"
                            >
                              {Array.from({ length: 18 }).map((_, a) => (
                                <option key={a} value={a + 1}>{a + 1} yr{a > 0 ? 's' : ''}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inputs */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-hidden font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="Email Address"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-hidden font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full bg-white border border-[#D8E2DC] rounded-xl px-3 py-2 text-xs text-zinc-800 outline-hidden font-semibold"
                      />
                    </div>
                  </div>

                  {/* Invoice Summary (INR) */}
                  <div className="p-4 bg-white rounded-2xl border border-[#D8E2DC] flex justify-between font-black text-sm text-[#3D405B]">
                    <span>Total Day Pass Price</span>
                    <span className="text-[#E07A5F]">
                      ₹{calculateEventBookingPrice(selectedEvent, eventAdultsCount, eventChildrenAges).toLocaleString('en-IN')}
                    </span>
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
                    <p className="text-2xs text-[#556B2F] font-bold">Booking Ref: {confirmedBookingRef}</p>
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
