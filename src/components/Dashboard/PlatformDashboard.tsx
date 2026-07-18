import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  Plus, Calendar, DollarSign, CheckCircle2, Clock, Wallet, Users,
  BarChart3, LayoutDashboard, CalendarRange, Link, CalendarOff, LogOut,
  ChevronRight, ArrowLeft, Layers, Home, MapPin, Star, AlertCircle,
  Check, Loader2, Globe, Trash2, Menu, X
} from 'lucide-react';
import { searchPlaces, getPlaceDetails, type PlaceCandidate, type PlaceDetails } from '../../services/PlacesService';
import { supabase } from '../../lib/supabaseClient';
import { uploadMediaFile } from '../../services/StorageService';
import { BookingsView } from './BookingsView';
import { PaymentLinksView } from './PaymentLinksView';
import { PricingCalendarView } from './PricingCalendarView';

// ─── Onboarding modes ────────────────────────────────────────────────────────
type OnboardingStep = 'type' | 'search' | 'confirm';
type PropertyType = 'room_basis' | 'full_property' | null;

// ─── Right panel hero image (same across all steps) ──────────────────────────
const HERO_IMG = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80';

// ─── Property type cards ──────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  {
    id: 'room_basis' as const,
    icon: Layers,
    title: 'Room Basis',
    sub: 'Ideal for Hotels, Resorts, Homestays, and Guest Houses with multiple room types',
  },
  {
    id: 'full_property' as const,
    icon: Home,
    title: 'Villa / Full Property',
    sub: 'Ideal for Villas and Apartments rented as a single unit',
  },
];

// ─── Split-page wrapper ───────────────────────────────────────────────────────
const OnboardingSplit: React.FC<{
  step: number;
  total: number;
  onBack: () => void;
  children: React.ReactNode;
  selectedDetails?: PlaceDetails | null;
}> = ({ step, total, onBack, children, selectedDetails }) => (
  <div className="fixed inset-0 z-50 flex bg-white">
    {/* Left panel */}
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: '#1B93A4' }}>
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 11h-6V3l-7 10h6v8l7-10z" /></svg>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>MyOTA</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E7E5E4] hover:bg-[#FAFAF9] transition text-[#78716C]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          BACK TO DASHBOARD
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-8 pb-2 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-[#A8A29E] mb-1.5">
          <span>STEP {step} OF {total}</span>
          <span>{Math.round((step / total) * 100)}%</span>
        </div>
        <div className="h-0.5 bg-[#E7E5E4] rounded-full">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(step / total) * 100}%`, background: '#1B93A4' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">{children}</div>

      {/* Footer */}
      <div className="px-8 pb-6 shrink-0 text-[10px] text-[#A8A29E] font-medium">
        © 2024 MyOTA Hospitality · <span className="hover:underline cursor-pointer">Privacy</span> · <span className="hover:underline cursor-pointer">Terms</span>
      </div>
    </div>

    {/* Right panel */}
    <div className="hidden lg:flex w-[42%] shrink-0 relative overflow-hidden">
      <img
        src={selectedDetails?.photos?.[0] ?? HERO_IMG}
        alt="Property"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-8 left-8 right-8 text-white">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2 opacity-80">
          <MapPin className="w-3 h-3" />
          {selectedDetails ? selectedDetails.formattedAddress.split(',').slice(-2).join(',').trim() : 'Bali, Indonesia'}
        </div>
        <h3 className="text-2xl font-extrabold leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {selectedDetails?.name ?? 'Villa Serenity'}
        </h3>
        {selectedDetails ? (
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(selectedDetails.rating) ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />
            ))}
            <span className="text-xs ml-1 opacity-70">({selectedDetails.userRatingCount} reviews)</span>
          </div>
        ) : (
          <blockquote className="mt-3 border-l-2 border-white/40 pl-3 text-sm italic opacity-80">
            "Managing our villa bookings has never been easier."
            <cite className="block text-[10px] uppercase tracking-widest mt-1 not-italic opacity-60">— Villa Serenity Management, Bali</cite>
          </blockquote>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export const PlatformDashboard: React.FC = () => {
  const {
    propertiesList, addPropertyWithDetails, setAppMode, setActivePropertyId,
    bookings, setSelectedView, updateHotelInfo, deleteProperty
  } = useHotel();

  // Dynamic user profile from onboarding localStorage
  const userName = localStorage.getItem('myota_user_name') || 'Yugandhar raj';
  const firstName = userName.split(' ')[0];
  const initials = userName.split(' ').map((n: string) => n[0] || '').join('').toUpperCase().slice(0, 2) || 'YR';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase Auth] Sign out failed:', err);
    }
    localStorage.removeItem('myota_onboarded');
    localStorage.removeItem('myota_owner_id');
    localStorage.removeItem('myota_user_name');
    localStorage.removeItem('myota_user_email');
    localStorage.removeItem('myota_user_phone');
    setAppMode('landing');
  };

  // Onboarding state
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [obStep, setObStep] = useState<OnboardingStep>('type');
  const [propType, setPropType] = useState<PropertyType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string, name: string } | null>(null);
  const [creatingStatus, setCreatingStatus] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<PlaceCandidate | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [detailsError, setDetailsError] = useState('');

  // Dashboard chart
  const [chartPeriod, setChartPeriod] = useState<'lifetime' | '30days' | 'month' | 'lastmonth'>('lifetime');

  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'bookings' | 'payment-links' | 'pricing-calendar'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // INR formatter
  const formatRupees = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const activeBookings = bookings.filter(b => b.bookingStatus !== 'cancelled');
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingGuestsCount = activeBookings.filter(b => b.checkIn >= todayStr).reduce((sum, b) => sum + (b.adults || 1) + (b.children || 0), 0);
  const totalRevenueINR = activeBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const bookedRoomsCount = activeBookings.length;
  const avgRevenueINR = bookedRoomsCount > 0 ? totalRevenueINR / bookedRoomsCount : 0;

  const handleSelectProperty = (id: string, name: string) => {
    setActivePropertyId(id);
    updateHotelInfo({ name });
    setSelectedView('property');
    setAppMode('editor');
  };

  // ── Onboarding actions ──────────────────────────────────────────────────────
  const openOnboarding = () => {
    setObStep('type');
    setPropType(null);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCandidate(null);
    setPlaceDetails(null);
    setSearchError('');
    setDetailsError('');
    setOnboardingOpen(true);
  };

  const closeOnboarding = () => setOnboardingOpen(false);

  const handleTypeSelect = (type: PropertyType) => {
    setPropType(type);
    setObStep('search');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchPlaces(searchQuery.trim());
      if (results.length === 0) setSearchError('No businesses found. Try a different name or add location details (e.g. "Alpine Cloud Yercaud").');
      else setSearchResults(results);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed. Please check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCandidate = async (candidate: PlaceCandidate) => {
    setSelectedCandidate(candidate);
    setFetchingDetails(true);
    setDetailsError('');
    setPlaceDetails(null);
    try {
      const details = await getPlaceDetails(candidate.id);
      setPlaceDetails(details);
      setObStep('confirm');
    } catch (e: unknown) {
      setDetailsError(e instanceof Error ? e.message : 'Could not fetch details. Please try again.');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleConfirmAndCreate = async () => {
    if (!placeDetails) return;

    setCreatingStatus("Initializing Dhanvanth's premium hotel storefront...");

    // 1. Download, convert to WebP, and upload Google Place photos (maximum of 5 to keep setup fast)
    const uploadedUrls: string[] = [];
    if (placeDetails.photos && placeDetails.photos.length > 0) {
      const photosToIngest = placeDetails.photos.slice(0, 5);
      const totalPhotos = photosToIngest.length;

      for (let i = 0; i < totalPhotos; i++) {
        const rawUrl = photosToIngest[i];
        setCreatingStatus(`Downloading and converting photo ${i + 1} of ${totalPhotos} to WebP...`);

        try {
          // Fetch raw image blob
          const response = await fetch(rawUrl);
          const blob = await response.blob();

          // Draw on Canvas and compress to WebP blob
          const webpUrl = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxDim = 1200; // Optimum resolution

              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(async (webpBlob) => {
                  if (webpBlob) {
                    try {
                      const publicUrl = await uploadMediaFile(webpBlob, `google_photo_${Date.now()}_${i + 1}.webp`);
                      resolve(publicUrl);
                    } catch (uploadErr) {
                      reject(uploadErr);
                    }
                  } else {
                    reject(new Error('Canvas blob conversion failed'));
                  }
                }, 'image/webp', 0.8);
              } else {
                reject(new Error('Canvas context failed'));
              }
            };
            img.onerror = () => reject(new Error('Image failed to load'));
            img.src = URL.createObjectURL(blob);
          });
          uploadedUrls.push(webpUrl);
        } catch (fetchErr) {
          console.warn(`[Ingestion] Photo ${i + 1} fallback to original URL due to CORS/Fetch error:`, fetchErr);
          uploadedUrls.push(rawUrl); // Fallback to raw Google Place URL directly
        }
      }
    }

    setCreatingStatus("Saving room category structures & client reviews...");

    // 2. Create property record with basic details and seeded photos
    await addPropertyWithDetails({
      name: placeDetails.name,
      location: placeDetails.formattedAddress,
      phone: placeDetails.phone,
      email: '',
      description: placeDetails.description,
      amenities: [],
      googleBusinessName: selectedCandidate?.displayName ?? '',
      photos: uploadedUrls,
      reviews: placeDetails.reviews.map(r => ({
        author: r.author,
        text: r.text,
        rating: r.rating
      })),
      latitude: placeDetails.location?.latitude,
      longitude: placeDetails.location?.longitude,
    });

    // 3. Pre-fill hotelInfo with all Google data (photos → heroImages, rating, location, etc.)
    updateHotelInfo({
      name: placeDetails.name,
      address: placeDetails.formattedAddress,
      phone: placeDetails.phone,
      description: placeDetails.description,
      tagline: placeDetails.description ? placeDetails.description.slice(0, 90) : '',
      latitude: placeDetails.location?.latitude ?? 0,
      longitude: placeDetails.location?.longitude ?? 0,
      heroImages: uploadedUrls.length > 0 ? uploadedUrls : [],
      starRating: Math.round(placeDetails.rating) || 4,
      googleBusinessName: selectedCandidate?.displayName ?? '',
    });



    setCreatingStatus(null);
    closeOnboarding();
    setSelectedView('property');
    setAppMode('editor');
  };

  const statCards = [
    { label: 'Upcoming Check-ins', value: `${upcomingGuestsCount} Guests`, badge: 'Future Check-ins', icon: Calendar, iconBg: '#FFF4E5', iconColor: '#D97706' },
    { label: 'Revenue', value: formatRupees(totalRevenueINR), badge: 'Lifetime Total', icon: DollarSign, iconBg: '#E6F4EA', iconColor: '#137333' },
    { label: 'Booked Rooms', value: String(bookedRoomsCount), badge: 'Lifetime Total', icon: CheckCircle2, iconBg: '#EBF5FF', iconColor: '#1A73E8' },
    { label: 'Guests', value: String(activeBookings.length), badge: 'Lifetime Total', icon: Clock, iconBg: '#F3E8FF', iconColor: '#9333EA' },
    { label: 'Avg / Room', value: formatRupees(avgRevenueINR), badge: 'Revenue / Room', icon: Wallet, iconBg: '#E6F4EA', iconColor: '#137333' },
  ];

  const stepNum = obStep === 'type' ? 1 : obStep === 'search' ? 2 : 3;
  const stepTotal = 3;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-[#1C1917]" style={{ background: 'var(--ds-bg)' }}>

      {/* ── Left Sidebar (Desktop Inline) ──────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-white border-r flex flex-col h-full shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
        {/* Brand */}
        <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'var(--ds-primary)' }}>
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 11h-6V3l-7 10h6v8l7-10z" /></svg>
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-none" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>MyOTA</h1>
            <span className="ds-overline block mt-1">Hospitality Suite</span>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <ul className="space-y-0.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: BarChart3, disabled: true },
              { id: 'pricing-calendar', label: 'Pricing & Calendar', icon: CalendarRange, disabled: false },
              { id: 'payment-links', label: 'Payment Links', icon: Link, disabled: false },
              { id: 'missed-bookings', label: 'Missed Bookings', icon: CalendarOff, disabled: true },
            ].map(({ id, label, icon: Icon, disabled }) => {
              const active = activeMainTab === id;
              return (
                <li key={id}>
                  <button 
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) setActiveMainTab(id as any);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      disabled ? 'opacity-50 cursor-not-allowed' : active ? 'font-bold' : 'hover:bg-[#FAFAF9] cursor-pointer'
                    }`}
                    style={active ? { background: 'var(--ds-primary-subtle)', color: 'var(--ds-primary)' } : { color: 'var(--ds-text-secondary)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: active ? 'var(--ds-primary)' : 'var(--ds-text-muted)' }} />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Properties */}
          <div className="space-y-2">
            <h3 className="ds-overline px-3">Properties</h3>
            <ul className="space-y-1">
              {propertiesList.map(prop => (
                <li key={prop.id} className="relative group">
                  <div className="flex items-center justify-between w-full rounded-xl hover:bg-[#FAFAF9] transition">
                    <button
                      onClick={() => handleSelectProperty(prop.id, prop.name)}
                      className="flex-1 flex items-center justify-between px-3.5 py-2 text-left truncate cursor-pointer"
                    >
                      <span className="text-xs font-semibold truncate max-w-[110px]" style={{ color: 'var(--ds-text-primary)' }}>{prop.name}</span>
                      <span className="ds-badge ds-badge-teal uppercase shrink-0 text-[9px] px-1.5 py-0.5">{prop.status}</span>
                    </button>

                    {/* Delete button (only visible on hover or mobile) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyToDelete({ id: prop.id, name: prop.name });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-650 rounded-lg transition mr-1 cursor-pointer shrink-0"
                      title={`Delete ${prop.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={openOnboarding}
              className="w-full border border-dashed rounded-xl px-3.5 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold transition hover:bg-white"
              style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--ds-border)', background: '#FAFAF9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--ds-primary)' }}>
              {initials}
            </div>
            <div>
              <h4 className="font-bold text-xs leading-none" style={{ color: 'var(--ds-text-primary)' }}>{userName}</h4>
              <span className="text-[10px] font-semibold block mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Manager Account</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="transition hover:text-red-500 cursor-pointer"
            style={{ color: 'var(--ds-text-muted)' }}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay Backdrop ──────────────────────────────── */}
      {isMobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ────────────────────────────────────────── */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col h-full transition-transform duration-300 ease-in-out transform ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--ds-border)' }}
      >
        {/* Brand with close button */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'var(--ds-primary)' }}>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 11h-6V3l-7 10h6v8l7-10z" /></svg>
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-none" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>MyOTA</h1>
              <span className="ds-overline block mt-1">Hospitality Suite</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <ul className="space-y-0.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'bookings', label: 'Bookings', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: BarChart3, disabled: true },
              { id: 'pricing-calendar', label: 'Pricing & Calendar', icon: CalendarRange, disabled: false },
              { id: 'payment-links', label: 'Payment Links', icon: Link, disabled: false },
              { id: 'missed-bookings', label: 'Missed Bookings', icon: CalendarOff, disabled: true },
            ].map(({ id, label, icon: Icon, disabled }) => {
              const active = activeMainTab === id;
              return (
                <li key={id}>
                  <button 
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) {
                        setActiveMainTab(id as any);
                        setIsMobileSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      disabled ? 'opacity-50 cursor-not-allowed' : active ? 'font-bold' : 'hover:bg-[#FAFAF9] cursor-pointer'
                    }`}
                    style={active ? { background: 'var(--ds-primary-subtle)', color: 'var(--ds-primary)' } : { color: 'var(--ds-text-secondary)' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: active ? 'var(--ds-primary)' : 'var(--ds-text-muted)' }} />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Properties */}
          <div className="space-y-2">
            <h3 className="ds-overline px-3">Properties</h3>
            <ul className="space-y-1">
              {propertiesList.map(prop => (
                <li key={prop.id} className="relative group">
                  <div className="flex items-center justify-between w-full rounded-xl hover:bg-[#FAFAF9] transition">
                    <button
                      onClick={() => {
                        handleSelectProperty(prop.id, prop.name);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="flex-1 flex items-center justify-between px-3.5 py-2 text-left truncate cursor-pointer"
                    >
                      <span className="text-xs font-semibold truncate max-w-[110px]" style={{ color: 'var(--ds-text-primary)' }}>{prop.name}</span>
                      <span className="ds-badge ds-badge-teal uppercase shrink-0 text-[9px] px-1.5 py-0.5">{prop.status}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPropertyToDelete({ id: prop.id, name: prop.name });
                        setIsMobileSidebarOpen(false);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-red-650 rounded-lg transition mr-1 cursor-pointer shrink-0"
                      title={`Delete ${prop.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                openOnboarding();
                setIsMobileSidebarOpen(false);
              }}
              className="w-full border border-dashed rounded-xl px-3.5 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold transition hover:bg-white"
              style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--ds-border)', background: '#FAFAF9' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--ds-primary)' }}>
              {initials}
            </div>
            <div>
              <h4 className="font-bold text-xs leading-none" style={{ color: 'var(--ds-text-primary)' }}>{userName}</h4>
              <span className="text-[10px] font-semibold block mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Manager Account</span>
            </div>
          </div>
          <button
            onClick={() => {
              handleLogout();
              setIsMobileSidebarOpen(false);
            }}
            className="transition hover:text-red-500 cursor-pointer"
            style={{ color: 'var(--ds-text-muted)' }}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Main Content Area Wrapper ───────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-white border-b border-zinc-200 h-14 px-4 flex items-center justify-between shrink-0 select-none w-full z-30">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-600 border border-zinc-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--ds-primary)' }}>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 11h-6V3l-7 10h6v8l7-10z" /></svg>
            </div>
            <span className="font-black text-xs tracking-tight text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>MyOTA</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'var(--ds-primary)' }}>
            {initials}
          </div>
        </header>

        {/* Views Router */}
        {activeMainTab === 'bookings' ? (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#FAFAF9]/40">
            <BookingsView />
          </main>
        ) : activeMainTab === 'payment-links' ? (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#FAFAF9]/40">
            <PaymentLinksView />
          </main>
        ) : activeMainTab === 'pricing-calendar' ? (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#FAFAF9]/40">
            <PricingCalendarView />
          </main>
        ) : propertiesList.length === 0 ? (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-center items-center text-center space-y-6">
            <div className="max-w-md space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#1B93A4]/10 text-[#1B93A4] flex items-center justify-center mx-auto shadow-xs">
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M19 11h-6V3l-7 10h6v8l7-10z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>
                  Welcome, {firstName}!
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed max-w-sm mx-auto">
                  Let's launch your hotel, resort, or homestay's digital storefront. Create your first property to get started.
                </p>
              </div>
              <button
                onClick={openOnboarding}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C1917] hover:bg-zinc-800 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Your First Property
              </button>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>Morning, {firstName}</h2>
              <p className="text-sm mt-1 font-medium" style={{ color: 'var(--ds-text-secondary)' }}>See your bookings, visitors, and revenue at a glance</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {statCards.map(({ label, value, badge, icon: Icon, iconBg, iconColor }) => (
                <div key={label} className="bg-white p-4 sm:p-5 rounded-2xl border relative flex flex-col justify-between h-32" style={{ borderColor: 'var(--ds-border)' }}>
                  <div>
                    <span className="ds-overline block">{label}</span>
                    <p className="text-xl sm:text-2xl font-black mt-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>{value}</p>
                  </div>
                  <span className="ds-badge ds-badge-teal w-max">{badge}</span>
                  <div className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-full" style={{ background: iconBg, color: iconColor }}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Chart Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 bg-white p-6 rounded-2xl border space-y-6" style={{ borderColor: 'var(--ds-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>Bookings and revenue over time</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>Track room demand, revenue movement, and conversions.</p>
                  </div>
                  <div className="flex p-0.5 rounded-lg border overflow-x-auto" style={{ background: '#F5F5F4', borderColor: 'var(--ds-border)' }}>
                    {(['lifetime', '30days', 'month', 'lastmonth'] as const).map(p => (
                      <button key={p} onClick={() => setChartPeriod(p)}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition ${chartPeriod === p ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'} whitespace-nowrap`}>
                        {p === 'lifetime' ? 'Lifetime' : p === '30days' ? '30 Days' : p === 'month' ? 'This Month' : 'Last Month'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-56 relative rounded-xl overflow-hidden flex flex-col justify-between p-4" style={{ background: 'var(--ds-bg)', border: '1px solid var(--ds-border)' }}>
                  <div className="absolute left-4 top-4 text-[10px] font-semibold" style={{ color: 'var(--ds-text-muted)' }}>₹40,000</div>
                  <div className="absolute left-4 top-24 text-[10px] font-semibold" style={{ color: 'var(--ds-text-muted)' }}>₹20,000</div>
                  <div className="absolute left-4 bottom-14 text-[10px] font-semibold" style={{ color: 'var(--ds-text-muted)' }}>₹0</div>
                  <div className="w-full h-full flex flex-col justify-between pointer-events-none absolute inset-0 py-8 px-12 opacity-40">
                    <div className="border-t border-dashed w-full" style={{ borderColor: 'var(--ds-border)' }} />
                    <div className="border-t border-dashed w-full" style={{ borderColor: 'var(--ds-border)' }} />
                    <div className="border-t border-dashed w-full" style={{ borderColor: 'var(--ds-border)' }} />
                  </div>
                  <svg className="w-full h-full absolute inset-0 px-12 py-8 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B93A4" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#1B93A4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,80 Q 20,40 40,65 T 80,30 T 100,50 L 100,100 L 0,100 Z" fill="url(#chartGradient)" />
                    <path d="M 0,80 Q 20,40 40,65 T 80,30 T 100,50" fill="none" stroke="#1B93A4" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <div className="mt-auto w-full flex justify-between text-[10px] font-bold px-8 z-10 pt-4 border-t bg-white" style={{ color: 'var(--ds-text-muted)', borderColor: 'var(--ds-border)' }}>
                    {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map(m => <span key={m}>{m}</span>)}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border flex flex-col justify-between min-h-[200px]" style={{ borderColor: 'var(--ds-border)' }}>
                <div>
                  <span className="ds-overline block">Total Visitors</span>
                  <h4 className="text-5xl font-black mt-4" style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--ds-text-primary)' }}>29</h4>
                  <p className="text-xs mt-2 font-medium" style={{ color: 'var(--ds-text-muted)' }}>Unique views across platform sites.</p>
                </div>
                <span className="ds-badge ds-badge-teal w-max flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Lifetime Total</span>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FULL-PAGE ONBOARDING OVERLAY
      ══════════════════════════════════════════════════════════════ */}
      {onboardingOpen && (
        <OnboardingSplit
          step={stepNum}
          total={stepTotal}
          onBack={obStep === 'type' ? closeOnboarding : () => {
            if (obStep === 'search') setObStep('type');
            else if (obStep === 'confirm') { setObStep('search'); setPlaceDetails(null); setSelectedCandidate(null); }
          }}
          selectedDetails={placeDetails}
        >

          {/* ── STEP 1: Property Type ─────────────────────────────────── */}
          {obStep === 'type' && (
            <div className="max-w-md">
              <h2 className="text-3xl font-extrabold text-[#1C1917] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                What kind of property are you listing?
              </h2>
              <p className="text-sm text-[#78716C] mt-2 font-medium">
                Choose the format that best matches how guests book their stay.
              </p>

              <div className="mt-8 space-y-3">
                {PROPERTY_TYPES.map(({ id, icon: Icon, title, sub }) => {
                  const selected = propType === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setPropType(id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200"
                      style={{
                        borderColor: selected ? '#1B93A4' : '#E7E5E4',
                        background: selected ? '#EFF9FA' : '#fff',
                      }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition"
                        style={{ background: selected ? '#1B93A4' : '#F5F5F4' }}>
                        <Icon className="w-5 h-5" style={{ color: selected ? '#fff' : '#78716C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#1C1917]">{title}</div>
                        <div className="text-xs text-[#78716C] mt-0.5 leading-snug">{sub}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition`}
                        style={{ borderColor: selected ? '#1B93A4' : '#D6D3D1', background: selected ? '#1B93A4' : 'transparent' }}>
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => propType && handleTypeSelect(propType)}
                disabled={!propType}
                className="mt-8 w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#1C1917' }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Google Business Search ───────────────────────── */}
          {obStep === 'search' && (
            <div className="max-w-md">
              {/* Back to type link */}
              <button onClick={() => setObStep('type')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition mb-5">
                <ArrowLeft className="w-3 h-3" /> Change Type
                <span className="mx-2 text-[#D6D3D1]">|</span>
                <span className="text-[#1B93A4]">{propType === 'room_basis' ? 'Room Basis' : 'Full Property'}</span>
              </button>

              <h2 className="text-3xl font-extrabold text-[#1C1917] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Find your property on Google
              </h2>
              <p className="text-sm text-[#78716C] mt-2 font-medium leading-relaxed">
                Enter your Google Business name and we'll pull in your property details, photos, location, and the right default setup for a {propType === 'room_basis' ? 'hotel' : 'full property'}.
              </p>

              <div className="mt-6 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Google Business Name</label>
                <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-[#E7E5E4] bg-white focus-within:border-[#1B93A4] transition">
                  {/* Google G logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g. The Landmark Suite, San Francisco"
                    className="flex-1 text-sm outline-none bg-transparent text-[#1C1917] placeholder-[#A8A29E]"
                  />
                </div>
                <p className="text-[10px] text-[#A8A29E] font-medium flex items-center gap-1">
                  <Globe className="w-3 h-3" /> We only read your public business info from Google
                </p>
              </div>

              {/* Results list */}
              {searchResults.length > 0 && (
                <div className="mt-3 rounded-xl border border-[#E7E5E4] overflow-hidden">
                  {searchResults.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectCandidate(r)}
                      disabled={fetchingDetails}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#FAFAF9] transition ${i > 0 ? 'border-t border-[#F5F5F4]' : ''}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#1B93A4' }} />
                      <div>
                        <div className="font-semibold text-sm text-[#1C1917]">{r.displayName}</div>
                        <div className="text-xs text-[#78716C] mt-0.5">{r.formattedAddress}</div>
                      </div>
                      {fetchingDetails && selectedCandidate?.id === r.id && (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto shrink-0 mt-0.5" style={{ color: '#1B93A4' }} />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setSearchResults([])}
                    className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] border-t border-[#F5F5F4] transition"
                  >
                    Close Suggestions
                  </button>
                </div>
              )}

              {searchError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {searchError}
                </div>
              )}

              {detailsError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {detailsError}
                </div>
              )}

              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || searching}
                className="mt-5 w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#1C1917' }}
              >
                {searching ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Search on Google
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── STEP 3: Confirm auto-filled data ─────────────────────── */}
          {obStep === 'confirm' && placeDetails && (
            <div className="max-w-lg">
              <button onClick={() => { setObStep('search'); setPlaceDetails(null); setSelectedCandidate(null); }}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#78716C] hover:text-[#1C1917] transition mb-5">
                <ArrowLeft className="w-3 h-3" /> Back to Search
              </button>

              <h2 className="text-3xl font-extrabold text-[#1C1917] leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Confirm your property
              </h2>
              <p className="text-sm text-[#78716C] mt-2 font-medium">
                We found your business on Google. Review the details below and confirm to create your property.
              </p>

              {/* Fetched data summary */}
              <div className="mt-6 bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl overflow-hidden">
                {/* Photo strip */}
                {placeDetails.photos.length > 0 && (
                  <div className="flex gap-1 p-2 overflow-x-auto">
                    {placeDetails.photos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-20 w-28 object-cover rounded-lg shrink-0 flex-none" />
                    ))}
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Business Name</span>
                    <p className="font-bold text-[#1C1917] mt-0.5">{placeDetails.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Location</span>
                    <p className="text-sm text-[#44403C] mt-0.5">{placeDetails.formattedAddress}</p>
                  </div>
                  {placeDetails.phone && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Phone</span>
                      <p className="text-sm text-[#44403C] mt-0.5">{placeDetails.phone}</p>
                    </div>
                  )}
                  {placeDetails.rating > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Google Rating</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < Math.round(placeDetails.rating) ? 'fill-amber-400 text-amber-400' : 'text-[#D6D3D1]'}`} />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-[#1C1917]">{placeDetails.rating.toFixed(1)}</span>
                        <span className="text-xs text-[#78716C]">({placeDetails.userRatingCount.toLocaleString('en-IN')} reviews)</span>
                      </div>
                    </div>
                  )}
                  {placeDetails.description && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Description</span>
                      <p className="text-sm text-[#44403C] mt-0.5 line-clamp-3">{placeDetails.description}</p>
                    </div>
                  )}

                  {/* Data fetched chips */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {[
                      placeDetails.photos.length > 0 && `${placeDetails.photos.length} Photos`,
                      placeDetails.reviews.length > 0 && `${placeDetails.reviews.length} Reviews`,
                      placeDetails.phone && 'Phone',
                      placeDetails.description && 'Description',
                      placeDetails.location && 'Location',
                    ].filter(Boolean).map(chip => (
                      <span key={chip as string} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: '#D1FAE5', color: '#065F46' }}>
                        <Check className="w-2.5 h-2.5" /> {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmAndCreate}
                className="mt-6 w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition"
                style={{ background: '#1C1917' }}
              >
                <Check className="w-4 h-4" /> Create Property & Open Editor
              </button>
              <p className="text-center text-xs text-[#A8A29E] mt-3">
                You can edit all these details in the editor after creating.
              </p>
            </div>
          )}

          {/* Loading state while fetching details */}
          {fetchingDetails && (
            <div className="flex flex-col items-center justify-center py-16 text-[#78716C]">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#1B93A4' }} />
              <p className="font-semibold text-sm">Fetching business details from Google…</p>
              <p className="text-xs mt-1">Photos, reviews, description, location</p>
            </div>
          )}

        </OnboardingSplit>
      )}

      {/* Property Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative text-left border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-950 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Delete Property?
            </h3>
            <p className="text-xs text-zinc-500 mt-2 font-sans leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-zinc-800">"{propertyToDelete.name}"</strong>? This will permanently delete all room types, pricing settings, bookings, testimonials, and media files. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteProperty(propertyToDelete.id);
                  setPropertyToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Property Ingestion Loader */}
      {creatingStatus && (
        <div className="fixed inset-0 bg-[#1C1917]/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Loader animation */}
            <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
              <Globe className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>

            <h3 className="text-xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Setting up your storefront
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-6">
              Please wait while we sync details and prepare your live preview canvas.
            </p>

            {/* Dynamic Status message */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 w-full flex items-center gap-3 shadow-inner">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
              <p className="text-[11px] font-bold tracking-wide text-zinc-300 text-left font-mono line-clamp-2">
                {creatingStatus}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
