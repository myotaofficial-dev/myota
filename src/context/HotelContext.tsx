import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// --- TS Interfaces ---

export interface PropertyItem {
  id: string;
  name: string;
  status: 'Draft' | 'Published';
}

export interface HotelInfo {
  name: string;
  subdomain: string;
  customDomain: string;
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  aboutTitle?: string;         // edit title for about/philosophy section
  amenitiesTitle?: string;
  eventsTitle?: string;
  roomsTitle?: string;
  reviewsTitle?: string;
  galleryTitle?: string;
  addonsTitle?: string;
  faqsTitle?: string;
  policiesTitle?: string;
  shortDescription?: string;  // short bio / welcome intro
  detailedDescription?: string; // full detailed narrative for Read More popup
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  fontHeader: string;
  fontBody: string;
  logoUrl: string;
  faviconUrl?: string;        // browser tab icon
  websiteHeadline?: string;   // public-facing headline shown on site
  instagramHandle?: string;   // e.g. @alpinecloud — for Instagram section link
  googleAnalyticsId: string;
  facebookPixelId: string;
  generalAmenities: string[];
  heroStyle: 'single' | 'carousel' | 'collage' | 'video';
  showEvents: boolean;
  tagline: string;
  heroImages: string[];
  heroVideo: string;
  googleBusinessName?: string;
  // Reordering & Toggles configurations
  sectionOrder?: string[];
  disabledSections?: string[];
  menuItemsOrder?: string[];
  disabledMenuItems?: string[];

  // Policy & Meal Plans configurations
  childPolicyEnabled?: boolean;
  childPolicyMinAge?: number;
  childPolicyMaxAge?: number;
  extraAdultRate?: number;
  extraChildRate?: number;
  mealPlanCpEnabled?: boolean;
  mealPlanCpAdultRate?: number;
  mealPlanCpChildRate?: number;
  mealPlanMapEnabled?: boolean;
  mealPlanMapAdultRate?: number;
  mealPlanMapChildRate?: number;
  mealPlanApEnabled?: boolean;
  mealPlanApAdultRate?: number;
  mealPlanApChildRate?: number;
  defaultMealPlan?: 'EP' | 'CP';
  customAmenities?: string[];
  cancellationPolicyType?: string;
  cancellationPolicyCustomText?: string;
  nonRefundableDiscountAmount?: number;
  cancellationPolicyCustomFullDays?: number;
  cancellationPolicyCustomHalfDays?: number;
  customCancellationPolicies?: Array<{ id: string; xx: number; yy: number }>;
  paymentCollectionType?: 'full' | 'partial';
  paymentCollectionPercent?: number;
}

// Co-host with role permissions
export interface CoHost {
  id: string;
  name: string;
  phone: string;
  role: 'super_admin' | 'manager' | 'caretaker';
  canReceiveCalls: boolean;
  canAcceptBookings: boolean;
}

// Managed photo in media library
export interface ManagedPhoto {
  id: string;
  url: string;
  tags: string[];    // e.g. ['room', 'bathroom', 'pool']
  isHero: boolean;   // auto-populates heroImages when true
}

// Managed video in media library
export interface ManagedVideo {
  id: string;
  url: string;
  tags: string[];    // e.g. ['pool', 'highlights']
  isHero: boolean;   // auto-populates heroVideo when true
}


export interface BedConfig {
  single?: number;
  double?: number;
  queen?: number;
  king?: number;
  sofa?: number;
}

export interface ExtraBedConfig {
  foldable?: number;
  floor?: number;
  fixed?: number;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  capacityAdults: number;
  capacityChildren: number;
  basePrice: number; // backward-compat: lowest price_tier value or manual entry
  totalInventory: number;
  sizeSqft: number;
  bedType: string; // legacy text field, now derived from beds if beds set
  amenities: string[];
  photos: string[];
  // Bookmigo-style extended fields
  is_active?: boolean;
  price_tiers?: Record<string, number>; // { "1": 2000, "2": 2500 } per-guest pricing
  beds?: BedConfig;       // bed composition (drives base occupancy)
  extra_beds?: ExtraBedConfig; // foldable/floor/fixed extra beds
  min_occupancy?: number; // minimum guests for pricing
  base_occupancy?: number; // base occupancy (= total bed sleepers)
  inventory_overrides?: Record<string, number>; // { "2025-07-01": 2 } per-date overrides
  rate_overrides?: Record<string, Record<string, number>>; // { "2025-07-01": { "1": 2200 } }
  cancellation_policy_overrides?: Record<string, string>; // { "2025-07-01": "non_refundable" }
}

export interface PricingOverride {
  date: string; // YYYY-MM-DD
  price: number;
  isBlocked: boolean;
}

export interface RoomPricing {
  [roomId: string]: {
    [date: string]: PricingOverride;
  };
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  totalPrice: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  bookingStatus: 'confirmed' | 'cancelled' | 'checked_in';
  addons: string[];
  couponCode?: string;
  createdAt: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  image?: string; // addon photo matching image 2
  pricingType?: 'per_head' | 'single_event';
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  active: boolean;
}

export interface Testimonial {
  id: string;
  author: string;
  content: string;
  rating: number;
  stayDate: string;
  avatarUrl?: string; // reviewer original photo from places API
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Policy {
  id: string;
  title: string;
  description: string;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  active: boolean;
  type?: 'blog' | 'restaurant' | 'pool' | 'banquet' | 'activities' | 'custom';
  bannerImage?: string;
  tagline?: string;
  restaurantMenu?: { name: string; price: number; description: string; photo?: string }[];
  banquetCapacity?: number;
  banquetFeatures?: string[];
  blogPosts?: { title: string; date: string; readTime: string; content: string; image?: string }[];
  activitiesList?: { title: string; time: string; description: string; image?: string }[];
}

export interface GuestEvent {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  date?: string; // legacy fallback
  fromDate: string; // event start date
  toDate: string; // event end date
  time: string;
  price: number;
  capacity: number;
}

export interface EventLog {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'booking' | 'channel' | 'info';
}

export interface GuestMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
}

interface HotelContextType {
  // Mode controls
  appMode: 'dashboard' | 'editor';
  setAppMode: (mode: 'dashboard' | 'editor') => void;
  activePropertyId: string;
  setActivePropertyId: (id: string) => void;
  canvasMode: 'editor' | 'guest';
  setCanvasMode: (mode: 'editor' | 'guest') => void;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  propertiesList: PropertyItem[];
  addProperty: (name: string) => void;
  addPropertyWithDetails: (details: {
    name: string;
    location: string;
    phone: string;
    email: string;
    description: string;
    amenities: string[];
    googleBusinessName: string;
  }) => void;
  publishProperty: (id: string) => void;

  hotelInfo: HotelInfo;
  rooms: RoomType[];
  pricing: RoomPricing;
  bookings: Booking[];
  addons: Addon[];
  coupons: Coupon[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  policies: Policy[];
  customPages: CustomPage[];
  messages: GuestMessage[];
  events: EventLog[];
  guestEvents: GuestEvent[];
  currentTemplate: 'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel';
  selectedView: string;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  editorFocus: 'canvas' | 'form';
  setEditorFocus: (focus: 'canvas' | 'form') => void;
  previewPath: string;
  setPreviewPath: (path: string) => void;
  
  // Update Functions
  updateHotelInfo: (info: Partial<HotelInfo>) => void;
  setRooms: React.Dispatch<React.SetStateAction<RoomType[]>>;
  addRoom: (room: Omit<RoomType, 'id'>) => void;
  updateRoom: (id: string, room: Partial<RoomType>) => void;
  deleteRoom: (id: string) => void;
  updateDateOverride: (roomId: string, date: string, override: Partial<PricingOverride>) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  cancelBooking: (id: string) => void;
  addAddon: (addon: Omit<Addon, 'id'>) => void;
  updateAddon: (id: string, addon: Partial<Addon>) => void;
  deleteAddon: (id: string) => void;
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  addTestimonial: (testimonial: Omit<Testimonial, 'id'>) => void;
  deleteTestimonial: (id: string) => void;
  addFAQ: (faq: Omit<FAQ, 'id'>) => void;
  updateFAQ: (id: string, faq: Partial<FAQ>) => void;
  deleteFAQ: (id: string) => void;
  addPolicy: (policy: Omit<Policy, 'id'>) => void;
  updatePolicy: (id: string, policy: Partial<Policy>) => void;
  deletePolicy: (id: string) => void;
  addCustomPage: (page: Omit<CustomPage, 'id'>) => void;
  updateCustomPage: (id: string, page: Partial<CustomPage>) => void;
  deleteCustomPage: (id: string) => void;
  addGuestEvent: (evt: Omit<GuestEvent, 'id'>) => void;
  updateGuestEvent: (id: string, evt: Partial<GuestEvent>) => void;
  deleteGuestEvent: (id: string) => void;
  markMessageRead: (id: string) => void;
  deleteMessage: (id: string) => void;
  setTemplate: (template: 'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel') => void;
  setSelectedView: (view: string) => void;
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  addEventLog: (title: string, description: string, type: 'booking' | 'channel' | 'info') => void;
  // Co-hosts
  coHosts: CoHost[];
  addCoHost: (host: Omit<CoHost, 'id'>) => void;
  updateCoHost: (id: string, host: Partial<CoHost>) => void;
  deleteCoHost: (id: string) => void;
  // Managed Photos
  managedPhotos: ManagedPhoto[];
  addManagedPhoto: (photo: Omit<ManagedPhoto, 'id'>) => void;
  updateManagedPhoto: (id: string, photo: Partial<ManagedPhoto>) => void;
  deleteManagedPhoto: (id: string) => void;
  // Managed Videos
  managedVideos: ManagedVideo[];
  addManagedVideo: (video: Omit<ManagedVideo, 'id'>) => void;
  updateManagedVideo: (id: string, video: Partial<ManagedVideo>) => void;
  deleteManagedVideo: (id: string) => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

// --- Defaults / Mock Data ---

const defaultProperties: PropertyItem[] = [
  { id: 'prop-1', name: "Sri K Residency", status: 'Draft' },
  { id: 'prop-2', name: "The Grandlake Resorts", status: 'Draft' }
];

const defaultHotelInfo: HotelInfo = {
  name: "The Grandlake Resorts",
  subdomain: "grandlake",
  customDomain: "www.thegrandlakeresorts.com",
  starRating: 4,
  checkInTime: "14:00",
  checkOutTime: "11:00",
  phone: "+91 98765 43210",
  email: "reservations@grandlakeresorts.com",
  address: "Killiyur Falls Road, Yercaud, Salem District, Tamil Nadu, India - 636602",
  latitude: 11.7878,
  longitude: 78.2040,
  description: "Escape to a world where tranquillity meets luxury at The Grandlake Resorts. Nestled on the scenic hills overlooking Yercaud, we offer custom-curated experiences, an Ayurvedic spa, and fine dining.",
  aboutTitle: "Earth, Water, and Calm",
  amenitiesTitle: "Property Amenities",
  eventsTitle: "Resort Packages & Scheduled Activities",
  roomsTitle: "Our Sanctuary Spaces",
  reviewsTitle: "Guest Reviews",
  galleryTitle: "Natural Vignettes",
  addonsTitle: "Eco-Upsells & Local Experiences",
  faqsTitle: "Resort FAQs",
  policiesTitle: "Resort Guidelines",
  shortDescription: "Escape to a world where tranquillity meets luxury. Nestled on the scenic hills overlooking Yercaud, we offer custom-curated wellness experiences and fine dining.",
  detailedDescription: "Escape to a world where tranquillity meets luxury at The Grandlake Resorts. Nestled on the scenic hills overlooking Yercaud, we offer custom-curated experiences, an Ayurvedic spa, and fine dining. Enjoy organic farm-to-table cuisine prepared by our culinary artists, explore scenic hiking trails directly accessible from the property, or relax by the infinity pool overlooking the valley. Our dedicated caretakers and concierge service ensure your stay is fully personalized.",
  primaryColor: "#0284c7", // Sky Blue Accent matching Pic 2
  secondaryColor: "#1a1a1a",
  bgColor: "#FFFFFF", // Clean modern light theme background
  fontHeader: "Noto Serif",
  fontBody: "Mulish",
  logoUrl: "", // Logo placeholder or empty to type text
  googleAnalyticsId: "G-GMFXBBWBR1",
  facebookPixelId: "FB-PIXEL-12345",
  generalAmenities: ["Infinity Pool", "Ayurvedic Spa", "Fitness Center", "Multi-cuisine Restaurant", "Valley View Deck", "Free Wi-Fi", "Free Parking", "Kids Play Area"],
  heroStyle: "single",
  showEvents: true,
  tagline: "Escape to Kutty Kerala in Poolampatti",
  heroImages: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200"
  ],
  heroVideo: "https://assets.mixkit.co/videos/preview/mixkit-swimming-pool-in-a-resort-40244-large.mp4",
  // Default rearrange layout configurations
  sectionOrder: ['hero', 'tagline', 'about', 'amenities', 'events', 'rooms', 'reviews', 'bento-gallery', 'policies', 'addons', 'faqs', 'location', 'instagram'],
  disabledSections: [],
  menuItemsOrder: ['about', 'amenities', 'rooms', 'reviews', 'faqs', 'location'],
  disabledMenuItems: [],
  childPolicyEnabled: true,
  childPolicyMinAge: 5,
  childPolicyMaxAge: 12,
  extraAdultRate: 0,
  extraChildRate: 0,
  mealPlanCpEnabled: true,
  mealPlanCpAdultRate: 300,
  mealPlanCpChildRate: 250,
  mealPlanMapEnabled: true,
  mealPlanMapAdultRate: 1000,
  mealPlanMapChildRate: 750,
  mealPlanApEnabled: true,
  mealPlanApAdultRate: 1500,
  mealPlanApChildRate: 1250
};

const defaultRooms: RoomType[] = [
  {
    id: "room-1",
    name: "Standard Room",
    description: "Cozy rooms designed for couples, featuring basic modern amenities and comfortable bed configurations.",
    capacityAdults: 2,
    capacityChildren: 1,
    basePrice: 90.00,
    totalInventory: 10,
    sizeSqft: 280,
    bedType: "Queen Size",
    amenities: ["Free Wi-Fi", "Flat Screen TV", "Tea/Coffee Maker", "Safe Locker"],
    photos: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "room-2",
    name: "Deluxe Room",
    description: "Elegant rooms equipped with premium linens, private balcony access, and a partial view of the gardens.",
    capacityAdults: 2,
    capacityChildren: 1,
    basePrice: 130.00,
    totalInventory: 15,
    sizeSqft: 360,
    bedType: "King Size",
    amenities: ["Free Wi-Fi", "Mini Bar", "Flat Screen TV", "Balcony", "Tea/Coffee Maker"],
    photos: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "room-3",
    name: "Superior Balcony Room",
    description: "Spacious rooms on high floors offering gorgeous sunset views of the Yercaud hills and luxury fittings.",
    capacityAdults: 3,
    capacityChildren: 1,
    basePrice: 170.00,
    totalInventory: 8,
    sizeSqft: 420,
    bedType: "King Size + Single Sofa Bed",
    amenities: ["Free Wi-Fi", "Mini Bar", "Air Conditioning", "Balcony with Valley View", "Rain Shower"],
    photos: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600"]
  }
];

const defaultAddons: Addon[] = [
  { 
    id: "addon-1", 
    name: "Birthday / Anniversary Decoration", 
    price: 2000, 
    description: "Milestones are meant to be memorable. Celebrate with a romantic setup by the lake.",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=600",
    pricingType: "single_event"
  },
  { 
    id: "addon-2", 
    name: "Candle Light Dinner", 
    price: 3500, 
    description: "An evening of quiet luxury, meant for just the two of you under the canopy stars.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
    pricingType: "single_event"
  },
  { 
    id: "addon-3", 
    name: "Buffet Breakfast", 
    price: 450, 
    description: "Daily organic buffet breakfast prepared from fresh local farm crops.",
    image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=600",
    pricingType: "per_head"
  }
];

const defaultCoupons: Coupon[] = [
  { id: "coupon-1", code: "WELCOME10", discountType: "percent", discountValue: 10, active: true }
];

const defaultTestimonials: Testimonial[] = [
  { id: "test-1", author: "Rajesh Kumar", content: "Absolutely stunning property! Highly recommended.", rating: 5, stayDate: "2026-05-15" }
];

const defaultFAQs: FAQ[] = [
  { id: "faq-1", question: "What are check-in and check-out timings?", answer: "Standard check-in is 2:00 PM and check-out is 11:00 AM." }
];

const defaultPolicies: Policy[] = [
  { id: "pol-1", title: "Cancellation Policy", description: "Free cancellation up to 48 hours prior to check-in." }
];

const defaultCustomPages: CustomPage[] = [
  {
    id: "page-1",
    title: "Dining",
    slug: "dining",
    content: "Enjoy organic, local specialties curated by our master chefs.",
    active: true,
    type: "restaurant",
    tagline: "Farm-to-Table Gastronomy",
    bannerImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200",
    restaurantMenu: [
      { name: "Organic Garden Salad", price: 12.00, description: "Fresh greens, heirloom tomatoes, and cucumber from our garden, drizzled with house balsamic.", photo: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=300" },
      { name: "Clay Oven Roasted Paneer", price: 18.00, description: "Paneer cubes marinated in yogurt and organic spices, grilled in our clay tandoor.", photo: "https://images.unsplash.com/photo-1567188040759-fb8a883db6d8?auto=format&fit=crop&q=80&w=300" },
      { name: "Spiced Yercaud Tea & Scones", price: 8.00, description: "Local spice tea served with warm, freshly baked buttermilk scones and fruit preserves.", photo: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=300" }
    ]
  }
];

const defaultGuestEvents: GuestEvent[] = [
  {
    id: "evt-g1",
    title: "Fireside Melodies",
    category: "Acoustic Sessions",
    description: "Unwind with soft acoustic performances under our ancient canopy trees with hot cocoa.",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
    fromDate: "2026-07-15",
    toDate: "2026-07-16",
    time: "06:00 PM - 09:00 PM",
    price: 25.00,
    capacity: 30
  },
  {
    id: "evt-g2",
    title: "Vinyasa Flow Yoga",
    category: "Wellness & Yoga",
    description: "Wake up with a guided meditation and yoga flow at the sunrise valley deck.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
    fromDate: "2026-07-17",
    toDate: "2026-07-18",
    time: "07:00 AM - 09:00 AM",
    price: 15.00,
    capacity: 20
  },
  {
    id: "evt-g3",
    title: "Farm to Table Lunch",
    category: "Gastronomy",
    description: "Savor a multi-course organic buffet prepared directly from our micro-green nursery.",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=600",
    fromDate: "2026-07-20",
    toDate: "2026-07-20",
    time: "12:00 PM - 03:00 PM",
    price: 35.00,
    capacity: 50
  }
];

const defaultMessages: GuestMessage[] = [
  { id: "msg-1", senderName: "Vivek Roy", senderEmail: "vivek@example.com", senderPhone: "+91 9988776655", subject: "Group Inquiry", message: "Planning a corporate retreat in August. Need 10 rooms. Please email package rates.", date: "2026-06-25", read: false }
];

const defaultBookings: Booking[] = [
  {
    id: "book-1",
    roomId: "room-2",
    roomName: "Deluxe Room",
    guestName: "Yugandhar Raj",
    guestEmail: "yugandhar@example.com",
    guestPhone: "+91 99999 88888",
    checkIn: "2026-07-10",
    checkOut: "2026-07-12",
    totalPrice: 260.00,
    paymentStatus: "paid",
    bookingStatus: "confirmed",
    addons: ["Buffet Breakfast"],
    createdAt: "2026-06-25T08:00:00Z"
  }
];

const defaultEvents: EventLog[] = [
  { id: "evt-1", title: "Welcome log", description: "System initialized successfully.", date: "2026-06-25 11:52", type: "info" }
];

// --- Context Provider Component ---

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode states
  const [appMode, setAppMode] = useState<'dashboard' | 'editor'>('dashboard');
  const [activePropertyId, setActivePropertyId] = useState<string>('prop-2');
  const [canvasMode, setCanvasMode] = useState<'editor' | 'guest'>('editor');
  const [selectedTheme, setSelectedTheme] = useState<string>('THEME: ORGANIC NATURAL');
  const [propertiesList, setPropertiesList] = useState<PropertyItem[]>(() => {
    const saved = localStorage.getItem('propertiesList');
    return saved ? JSON.parse(saved) : defaultProperties;
  });

  const [hotelInfo, setHotelInfoState] = useState<HotelInfo>(() => {
    const saved = localStorage.getItem('hotelInfo');
    return saved ? JSON.parse(saved) : defaultHotelInfo;
  });

  const [rooms, setRooms] = useState<RoomType[]>(() => {
    const saved = localStorage.getItem('rooms');
    if (saved) {
      // Backward-compat migration: ensure all rooms have price_tiers
      const parsed: RoomType[] = JSON.parse(saved);
      return parsed.map(r => ({
        ...r,
        is_active: r.is_active ?? true,
        price_tiers: r.price_tiers ?? { '1': r.basePrice, '2': r.basePrice },
        beds: r.beds ?? {},
        extra_beds: r.extra_beds ?? {},
        inventory_overrides: r.inventory_overrides ?? {},
        rate_overrides: r.rate_overrides ?? {},
        min_occupancy: r.min_occupancy ?? 1,
        base_occupancy: r.base_occupancy ?? r.capacityAdults,
      }));
    }
    return defaultRooms.map(r => ({
      ...r,
      is_active: true,
      price_tiers: { '1': r.basePrice, '2': Math.round(r.basePrice * 1.15) },
      beds: {},
      extra_beds: {},
      inventory_overrides: {},
      rate_overrides: {},
      min_occupancy: 1,
      base_occupancy: r.capacityAdults,
    }));
  });

  const [pricing, setPricing] = useState<RoomPricing>(() => {
    const saved = localStorage.getItem('pricing');
    return saved ? JSON.parse(saved) : {};
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('bookings');
    return saved ? JSON.parse(saved) : defaultBookings;
  });

  const [addons, setAddons] = useState<Addon[]>(() => {
    const saved = localStorage.getItem('addons');
    return saved ? JSON.parse(saved) : defaultAddons;
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('coupons');
    return saved ? JSON.parse(saved) : defaultCoupons;
  });

  const [testimonials, setTestimonials] = useState<Testimonial[]>(() => {
    const saved = localStorage.getItem('testimonials');
    return saved ? JSON.parse(saved) : defaultTestimonials;
  });

  const [faqs, setFaqs] = useState<FAQ[]>(() => {
    const saved = localStorage.getItem('faqs');
    return saved ? JSON.parse(saved) : defaultFAQs;
  });

  const [policies, setPolicies] = useState<Policy[]>(() => {
    const saved = localStorage.getItem('policies');
    return saved ? JSON.parse(saved) : defaultPolicies;
  });

  const [customPages, setCustomPages] = useState<CustomPage[]>(() => {
    const saved = localStorage.getItem('customPages');
    return saved ? JSON.parse(saved) : defaultCustomPages;
  });

  const [messages, setMessages] = useState<GuestMessage[]>(() => {
    const saved = localStorage.getItem('messages');
    return saved ? JSON.parse(saved) : defaultMessages;
  });

  const [events, setEvents] = useState<EventLog[]>(() => {
    const saved = localStorage.getItem('events');
    return saved ? JSON.parse(saved) : defaultEvents;
  });

  const [guestEvents, setGuestEvents] = useState<GuestEvent[]>(() => {
    const saved = localStorage.getItem('guestEvents');
    return saved ? JSON.parse(saved) : defaultGuestEvents;
  });

  const [currentTemplate, setTemplateState] = useState<'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel'>('organic');
  const [selectedView, setSelectedView] = useState<string>('property');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [editorFocus, setEditorFocus] = useState<'canvas' | 'form'>('canvas');
  const [previewPath, setPreviewPath] = useState<string>('/');

  const [coHosts, setCoHosts] = useState<CoHost[]>(() => {
    const saved = localStorage.getItem('coHosts');
    return saved ? JSON.parse(saved) : [
      { id: 'host-1', name: 'Yugandhar raj', phone: '+91 98765 43210', role: 'super_admin', canReceiveCalls: true, canAcceptBookings: true }
    ];
  });

  const [managedPhotos, setManagedPhotos] = useState<ManagedPhoto[]>(() => {
    const saved = localStorage.getItem('managedPhotos');
    return saved ? JSON.parse(saved) : [];
  });

  const [managedVideos, setManagedVideos] = useState<ManagedVideo[]>(() => {
    const saved = localStorage.getItem('managedVideos');
    return saved ? JSON.parse(saved) : [
      { id: 'vid-1', url: 'https://assets.mixkit.co/videos/preview/mixkit-swimming-pool-in-a-resort-40244-large.mp4', tags: ['pool', 'highlights'], isHero: true }
    ];
  });

  // Sync to local storage
  useEffect(() => { localStorage.setItem('propertiesList', JSON.stringify(propertiesList)); }, [propertiesList]);
  useEffect(() => { localStorage.setItem('hotelInfo', JSON.stringify(hotelInfo)); }, [hotelInfo]);
  useEffect(() => { localStorage.setItem('rooms', JSON.stringify(rooms)); }, [rooms]);
  useEffect(() => { localStorage.setItem('pricing', JSON.stringify(pricing)); }, [pricing]);
  useEffect(() => { localStorage.setItem('bookings', JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { localStorage.setItem('addons', JSON.stringify(addons)); }, [addons]);
  useEffect(() => { localStorage.setItem('coupons', JSON.stringify(coupons)); }, [coupons]);
  useEffect(() => { localStorage.setItem('testimonials', JSON.stringify(testimonials)); }, [testimonials]);
  useEffect(() => { localStorage.setItem('faqs', JSON.stringify(faqs)); }, [faqs]);
  useEffect(() => { localStorage.setItem('policies', JSON.stringify(policies)); }, [policies]);
  useEffect(() => { localStorage.setItem('customPages', JSON.stringify(customPages)); }, [customPages]);
  useEffect(() => { localStorage.setItem('messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem('events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('guestEvents', JSON.stringify(guestEvents)); }, [guestEvents]);
  useEffect(() => { localStorage.setItem('coHosts', JSON.stringify(coHosts)); }, [coHosts]);
  useEffect(() => { localStorage.setItem('managedPhotos', JSON.stringify(managedPhotos)); }, [managedPhotos]);
  useEffect(() => { localStorage.setItem('managedVideos', JSON.stringify(managedVideos)); }, [managedVideos]);

  // Auto-sync hero images from managedPhotos when isHero changes
  useEffect(() => {
    const heroUrls = managedPhotos.filter(p => p.isHero).map(p => p.url);
    if (heroUrls.length > 0) {
      setHotelInfoState(prev => ({ ...prev, heroImages: heroUrls }));
    }
  }, [managedPhotos]);

  // Auto-sync hero video from managedVideos when isHero changes
  useEffect(() => {
    const heroVid = managedVideos.find(v => v.isHero)?.url || '';
    if (heroVid) {
      setHotelInfoState(prev => ({ ...prev, heroVideo: heroVid }));
    }
  }, [managedVideos]);

  useEffect(() => {
    if (selectedTheme === 'THEME: ORGANIC NATURAL') {
      setTemplateState('organic');
    } else if (selectedTheme === 'THEME: LUXURY REFINED') {
      setTemplateState('luxury');
    } else if (selectedTheme === 'THEME: EDITORIAL MAGAZINE') {
      setTemplateState('editorial');
    } else if (selectedTheme === 'THEME: ARTDECO GEOMETRIC') {
      setTemplateState('artdeco');
    } else if (selectedTheme === 'THEME: PASTEL SOFT') {
      setTemplateState('pastel');
    }
  }, [selectedTheme]);

  // --- Supabase Synchronization Engine ---
  // Strategy: localStorage = immediate UI reactivity; Supabase = source of truth.
  // On mount, load all data from Supabase. All CRUD functions push changes
  // to both local state and Supabase in parallel.

  // Helpers: map DB rows → TS interfaces
  const mapDbRoom = (r: any): RoomType => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    capacityAdults: r.capacity_adults,
    capacityChildren: r.capacity_children,
    basePrice: Number(r.base_price),
    totalInventory: r.total_inventory,
    sizeSqft: r.size_sqft || 0,
    bedType: r.bed_type || '',
    amenities: r.amenities || [],
    photos: r.photos || [],
    is_active: r.is_active ?? true,
    beds: r.beds || {},
    extra_beds: r.extra_beds || {},
    price_tiers: r.price_tiers || {},
    inventory_overrides: r.inventory_overrides || {},
    rate_overrides: r.rate_overrides || {},
    cancellation_policy_overrides: r.cancellation_policy_overrides || {},
    min_occupancy: r.min_occupancy || 1,
    base_occupancy: r.base_occupancy || r.capacity_adults,
  });

  const mapDbBooking = (b: any): Booking => ({
    id: b.id,
    roomId: b.room_id || '',
    roomName: b.room_name || '',
    guestName: b.guest_name,
    guestEmail: b.guest_email,
    guestPhone: b.guest_phone || '',
    checkIn: b.check_in,
    checkOut: b.check_out,
    totalPrice: Number(b.total_price),
    paymentStatus: b.payment_status as Booking['paymentStatus'],
    bookingStatus: b.booking_status as Booking['bookingStatus'],
    addons: b.addons || [],
    couponCode: b.coupon_code || '',
    createdAt: b.created_at,
  });

  const mapDbAddon = (a: any): Addon => ({
    id: a.id,
    name: a.name,
    description: a.description || '',
    price: Number(a.price),
    image: a.image || undefined,
    pricingType: (a.pricing_type || 'single_event') as Addon['pricingType'],
  });

  const mapDbCoupon = (c: any): Coupon => ({
    id: c.id,
    code: c.code,
    discountType: c.discount_type as Coupon['discountType'],
    discountValue: Number(c.discount_value),
    active: c.active,
  });

  const mapDbTestimonial = (t: any): Testimonial => ({
    id: t.id,
    author: t.author,
    content: t.content,
    rating: t.rating,
    stayDate: t.stay_date || '',
    avatarUrl: t.avatar_url || undefined,
  });

  const mapDbFaq = (f: any): FAQ => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
  });

  const mapDbPolicy = (p: any): Policy => ({
    id: p.id,
    title: p.title,
    description: p.description,
  });

  const mapDbCustomPage = (p: any): CustomPage => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content || '',
    active: p.active,
    type: p.page_type as CustomPage['type'],
    bannerImage: p.banner_image || undefined,
    tagline: p.tagline || undefined,
    restaurantMenu: p.restaurant_menu || [],
    banquetCapacity: p.banquet_capacity || undefined,
    banquetFeatures: p.banquet_features || [],
    blogPosts: p.blog_posts || [],
    activitiesList: p.activities_list || [],
  });

  const mapDbGuestEvent = (e: any): GuestEvent => ({
    id: e.id,
    title: e.title,
    category: e.category || '',
    description: e.description || '',
    image: e.image || '',
    fromDate: e.from_date,
    toDate: e.to_date,
    time: e.time || '',
    price: Number(e.price),
    capacity: e.capacity,
    date: e.from_date,
  });

  const mapDbMessage = (m: any): GuestMessage => ({
    id: m.id,
    senderName: m.sender_name,
    senderEmail: m.sender_email,
    senderPhone: m.sender_phone || '',
    subject: m.subject || '',
    message: m.message,
    date: m.sent_date || m.created_at?.slice(0, 10) || '',
    read: m.is_read,
  });

  const mapDbCoHost = (h: any): CoHost => ({
    id: h.id,
    name: h.name,
    phone: h.phone || '',
    role: h.role as CoHost['role'],
    canReceiveCalls: h.can_receive_calls,
    canAcceptBookings: h.can_accept_bookings,
  });

  const mapDbMedia = (m: any): ManagedPhoto | ManagedVideo => ({
    id: m.id,
    url: m.url,
    tags: m.tags || [],
    isHero: m.is_hero,
  });

  const mapDbHotelSettings = (s: any): Partial<HotelInfo> => ({
    name: s.name,
    subdomain: s.subdomain,
    customDomain: s.custom_domain,
    starRating: s.star_rating,
    checkInTime: s.check_in_time,
    checkOutTime: s.check_out_time,
    phone: s.phone,
    email: s.email,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    tagline: s.tagline,
    description: s.description,
    shortDescription: s.short_description,
    detailedDescription: s.detailed_description,
    websiteHeadline: s.website_headline,
    aboutTitle: s.about_title,
    amenitiesTitle: s.amenities_title,
    eventsTitle: s.events_title,
    roomsTitle: s.rooms_title,
    reviewsTitle: s.reviews_title,
    galleryTitle: s.gallery_title,
    addonsTitle: s.addons_title,
    faqsTitle: s.faqs_title,
    policiesTitle: s.policies_title,
    primaryColor: s.primary_color,
    secondaryColor: s.secondary_color,
    bgColor: s.bg_color,
    fontHeader: s.font_header,
    fontBody: s.font_body,
    logoUrl: s.logo_url,
    faviconUrl: s.favicon_url,
    googleAnalyticsId: s.google_analytics_id,
    facebookPixelId: s.facebook_pixel_id,
    instagramHandle: s.instagram_handle,
    googleBusinessName: s.google_business_name,
    heroStyle: s.hero_style,
    heroImages: s.hero_images || [],
    heroVideo: s.hero_video,
    generalAmenities: s.general_amenities || [],
    customAmenities: s.custom_amenities || [],
    sectionOrder: s.section_order || [],
    disabledSections: s.disabled_sections || [],
    menuItemsOrder: s.menu_items_order || [],
    disabledMenuItems: s.disabled_menu_items || [],
    showEvents: s.show_events,
    childPolicyEnabled: s.child_policy_enabled,
    childPolicyMinAge: s.child_policy_min_age,
    childPolicyMaxAge: s.child_policy_max_age,
    extraAdultRate: Number(s.extra_adult_rate),
    extraChildRate: Number(s.extra_child_rate),
    mealPlanCpEnabled: s.meal_plan_cp_enabled,
    mealPlanCpAdultRate: Number(s.meal_plan_cp_adult_rate),
    mealPlanCpChildRate: Number(s.meal_plan_cp_child_rate),
    mealPlanMapEnabled: s.meal_plan_map_enabled,
    mealPlanMapAdultRate: Number(s.meal_plan_map_adult_rate),
    mealPlanMapChildRate: Number(s.meal_plan_map_child_rate),
    mealPlanApEnabled: s.meal_plan_ap_enabled,
    mealPlanApAdultRate: Number(s.meal_plan_ap_adult_rate),
    mealPlanApChildRate: Number(s.meal_plan_ap_child_rate),
    defaultMealPlan: s.default_meal_plan,
    cancellationPolicyType: s.cancellation_policy_type,
    cancellationPolicyCustomText: s.cancellation_policy_custom_text,
    nonRefundableDiscountAmount: Number(s.non_refundable_discount_amount),
    customCancellationPolicies: s.custom_cancellation_policies || [],
    paymentCollectionType: s.payment_collection_type,
    paymentCollectionPercent: s.payment_collection_percent,
  });

  // Load all data from Supabase on mount (parallel fetch)
  useEffect(() => {
    const loadAll = async () => {
      const pid = activePropertyId;
      try {
        const [
          { data: settingsData },
          { data: roomsData },
          { data: bookingsData },
          { data: addonsData },
          { data: couponsData },
          { data: testimonialsData },
          { data: faqsData },
          { data: policiesData },
          { data: pagesData },
          { data: guestEventsData },
          { data: coHostsData },
          { data: mediaData },
          { data: messagesData },
          { data: eventLogsData },
        ] = await Promise.all([
          supabase.from('hotel_settings').select('*').eq('property_id', pid).single(),
          supabase.from('room_categories').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('bookings').select('*').eq('property_id', pid).order('created_at', { ascending: false }),
          supabase.from('addons').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('coupons').select('*').eq('property_id', pid),
          supabase.from('testimonials').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('faqs').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('policies').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('custom_pages').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('guest_events').select('*').eq('property_id', pid).order('from_date'),
          supabase.from('co_hosts').select('*').eq('property_id', pid),
          supabase.from('media_library').select('*').eq('property_id', pid).order('display_order'),
          supabase.from('guest_messages').select('*').eq('property_id', pid).order('created_at', { ascending: false }),
          supabase.from('event_logs').select('*').eq('property_id', pid).order('created_at', { ascending: false }).limit(50),
        ]);

        if (settingsData) setHotelInfoState(prev => ({ ...prev, ...mapDbHotelSettings(settingsData) }));
        if (roomsData && roomsData.length > 0) setRooms(roomsData.map(mapDbRoom));
        if (bookingsData && bookingsData.length > 0) setBookings(bookingsData.map(mapDbBooking));
        if (addonsData && addonsData.length > 0) setAddons(addonsData.map(mapDbAddon));
        if (couponsData && couponsData.length > 0) setCoupons(couponsData.map(mapDbCoupon));
        if (testimonialsData && testimonialsData.length > 0) setTestimonials(testimonialsData.map(mapDbTestimonial));
        if (faqsData && faqsData.length > 0) setFaqs(faqsData.map(mapDbFaq));
        if (policiesData && policiesData.length > 0) setPolicies(policiesData.map(mapDbPolicy));
        if (pagesData && pagesData.length > 0) setCustomPages(pagesData.map(mapDbCustomPage));
        if (guestEventsData && guestEventsData.length > 0) setGuestEvents(guestEventsData.map(mapDbGuestEvent));
        if (coHostsData && coHostsData.length > 0) setCoHosts(coHostsData.map(mapDbCoHost));
        if (mediaData && mediaData.length > 0) {
          setManagedPhotos(mediaData.filter(m => m.media_type === 'photo').map(m => mapDbMedia(m) as ManagedPhoto));
          setManagedVideos(mediaData.filter(m => m.media_type === 'video').map(m => mapDbMedia(m) as ManagedVideo));
        }
        if (messagesData && messagesData.length > 0) setMessages(messagesData.map(mapDbMessage));
        if (eventLogsData && eventLogsData.length > 0) {
          setEvents(eventLogsData.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            date: e.created_at?.slice(0, 16).replace('T', ' ') || '',
            type: e.log_type as EventLog['type'],
          })));
        }
      } catch (err) {
        console.warn('[Supabase] Initial load failed, using localStorage fallback:', err);
      }
    };
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePropertyId]);

  // Actions
  const addProperty = (name: string) => {
    const newProp: PropertyItem = {
      id: `prop-${Date.now()}`,
      name,
      status: 'Draft'
    };
    setPropertiesList(prev => [...prev, newProp]);
    addEventLog('Property Created', `Created property config: "${name}"`, 'info');
  };

  const addPropertyWithDetails = (details: {
    name: string;
    location: string;
    phone: string;
    email: string;
    description: string;
    amenities: string[];
    googleBusinessName: string;
  }) => {
    const id = `prop-${Date.now()}`;
    const newProp: PropertyItem = { id, name: details.name, status: 'Draft' };
    setPropertiesList(prev => [...prev, newProp]);
    // Pre-fill hotelInfo with onboarding data
    setHotelInfoState(prev => ({
      ...prev,
      name: details.name,
      phone: details.phone,
      email: details.email,
      address: details.location,
      description: details.description,
      generalAmenities: details.amenities.length > 0 ? details.amenities : prev.generalAmenities,
      googleBusinessName: details.googleBusinessName,
    }));
    setActivePropertyId(id);
    addEventLog('Property Created', `Onboarded "${details.name}" via setup wizard.`, 'info');
  };

  const publishProperty = (id: string) => {
    setPropertiesList(prev => prev.map(p => p.id === id ? { ...p, status: 'Published' } : p));
    addEventLog('Property Published', 'Active layout built and mapped successfully.', 'info');
  };

  const updateHotelInfo = (info: Partial<HotelInfo>) => {
    setHotelInfoState(prev => ({ ...prev, ...info }));
    // Automatically update name in propertiesList if matching active
    setPropertiesList(prev => prev.map(p => p.id === activePropertyId && info.name ? { ...p, name: info.name } : p));
  };

  const addRoom = (room: Omit<RoomType, 'id'>) => {
    const newRoom: RoomType = {
      ...room,
      id: `room-${Date.now()}`
    };
    setRooms(prev => [...prev, newRoom]);
    addEventLog('Room Category Added', `New room category "${room.name}" created.`, 'info');
  };

  const updateRoom = (id: string, roomData: Partial<RoomType>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...roomData } : r));
    addEventLog('Room Category Updated', `Settings for "${roomData.name || 'room'}" adjusted.`, 'info');
  };

  const deleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    addEventLog('Room Category Deleted', `Room type removed from active listings.`, 'info');
  };

  const updateDateOverride = (roomId: string, date: string, override: Partial<PricingOverride>) => {
    setPricing(prev => {
      const roomPricing = prev[roomId] || {};
      const dayPricing = roomPricing[date] || { date, price: 0, isBlocked: false };
      
      return {
         ...prev,
        [roomId]: {
          ...roomPricing,
          [date]: { ...dayPricing, ...override }
        }
      };
    });
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setBookings(prev => [newBooking, ...prev]);
    addEventLog('New Booking Confirmed', `Reservation booked for ${bookingData.guestName} (₹${bookingData.totalPrice})`, 'booking');

    try {
      await supabase.from('bookings').insert({
        id: newBooking.id,
        property_id: activePropertyId,
        room_id: newBooking.roomId || null,
        room_name: newBooking.roomName,
        guest_name: newBooking.guestName,
        guest_email: newBooking.guestEmail,
        guest_phone: newBooking.guestPhone,
        check_in: newBooking.checkIn,
        check_out: newBooking.checkOut,
        total_price: newBooking.totalPrice,
        payment_status: newBooking.paymentStatus,
        booking_status: newBooking.bookingStatus,
        addons: newBooking.addons,
        coupon_code: newBooking.couponCode || null,
      });
    } catch (err) {
      console.warn('[Supabase] addBooking error:', err);
    }
  };

  const cancelBooking = async (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, bookingStatus: 'cancelled' } : b));
    try {
      await supabase
        .from('bookings')
        .update({ booking_status: 'cancelled' })
        .eq('id', id)
        .eq('property_id', activePropertyId);
    } catch (err) {
      console.warn('[Supabase] cancelBooking error:', err);
    }
  };

  // --- Per-Entity CRUD with Supabase Sync ---

  const addAddon = async (addon: Omit<Addon, 'id'>) => {
    const id = `addon-${Date.now()}`;
    const newAddon = { ...addon, id };
    setAddons(prev => [...prev, newAddon]);
    try {
      await supabase.from('addons').insert({
        id, property_id: activePropertyId,
        name: addon.name, description: addon.description, price: addon.price,
        image: addon.image || null, pricing_type: addon.pricingType || 'single_event',
      });
    } catch (err) { console.warn('[Supabase] addAddon:', err); }
  };

  const updateAddon = async (id: string, addonData: Partial<Addon>) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, ...addonData } : a));
    try {
      await supabase.from('addons').update({
        name: addonData.name, description: addonData.description,
        price: addonData.price, image: addonData.image || null,
        pricing_type: addonData.pricingType,
      }).eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateAddon:', err); }
  };

  const deleteAddon = async (id: string) => {
    setAddons(prev => prev.filter(a => a.id !== id));
    try {
      await supabase.from('addons').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteAddon:', err); }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id'>) => {
    const id = `coupon-${Date.now()}`;
    setCoupons(prev => [...prev, { ...coupon, id }]);
    try {
      await supabase.from('coupons').insert({
        id, property_id: activePropertyId,
        code: coupon.code, discount_type: coupon.discountType,
        discount_value: coupon.discountValue, active: coupon.active,
      });
    } catch (err) { console.warn('[Supabase] addCoupon:', err); }
  };

  const updateCoupon = async (id: string, couponData: Partial<Coupon>) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...couponData } : c));
    try {
      await supabase.from('coupons').update({
        code: couponData.code, discount_type: couponData.discountType,
        discount_value: couponData.discountValue, active: couponData.active,
      }).eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateCoupon:', err); }
  };

  const deleteCoupon = async (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    try {
      await supabase.from('coupons').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteCoupon:', err); }
  };

  const addTestimonial = async (testimonial: Omit<Testimonial, 'id'>) => {
    const id = `test-${Date.now()}`;
    setTestimonials(prev => [{ ...testimonial, id }, ...prev]);
    try {
      await supabase.from('testimonials').insert({
        id, property_id: activePropertyId,
        author: testimonial.author, content: testimonial.content,
        rating: testimonial.rating, stay_date: testimonial.stayDate || null,
        avatar_url: testimonial.avatarUrl || null,
      });
    } catch (err) { console.warn('[Supabase] addTestimonial:', err); }
  };

  const deleteTestimonial = async (id: string) => {
    setTestimonials(prev => prev.filter(t => t.id !== id));
    try {
      await supabase.from('testimonials').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteTestimonial:', err); }
  };

  const addFAQ = async (faq: Omit<FAQ, 'id'>) => {
    const id = `faq-${Date.now()}`;
    setFaqs(prev => [...prev, { ...faq, id }]);
    try {
      await supabase.from('faqs').insert({ id, property_id: activePropertyId, question: faq.question, answer: faq.answer });
    } catch (err) { console.warn('[Supabase] addFAQ:', err); }
  };

  const updateFAQ = async (id: string, faqData: Partial<FAQ>) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...faqData } : f));
    try {
      await supabase.from('faqs').update({ question: faqData.question, answer: faqData.answer })
        .eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateFAQ:', err); }
  };

  const deleteFAQ = async (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    try {
      await supabase.from('faqs').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteFAQ:', err); }
  };

  const addPolicy = async (policy: Omit<Policy, 'id'>) => {
    const id = `pol-${Date.now()}`;
    setPolicies(prev => [...prev, { ...policy, id }]);
    try {
      await supabase.from('policies').insert({ id, property_id: activePropertyId, title: policy.title, description: policy.description });
    } catch (err) { console.warn('[Supabase] addPolicy:', err); }
  };

  const updatePolicy = async (id: string, policyData: Partial<Policy>) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, ...policyData } : p));
    try {
      await supabase.from('policies').update({ title: policyData.title, description: policyData.description })
        .eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updatePolicy:', err); }
  };

  const deletePolicy = async (id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
    try {
      await supabase.from('policies').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deletePolicy:', err); }
  };

  const addCustomPage = async (page: Omit<CustomPage, 'id'>) => {
    const id = `page-${Date.now()}`;
    setCustomPages(prev => [...prev, { ...page, id }]);
    try {
      await supabase.from('custom_pages').insert({
        id, property_id: activePropertyId,
        title: page.title, slug: page.slug, content: page.content, active: page.active,
        page_type: page.type || 'custom', banner_image: page.bannerImage || null,
        tagline: page.tagline || null,
        restaurant_menu: (page.restaurantMenu as any) || [],
        banquet_capacity: page.banquetCapacity || null,
        banquet_features: page.banquetFeatures || [],
        blog_posts: (page.blogPosts as any) || [],
        activities_list: (page.activitiesList as any) || [],
      });
    } catch (err) { console.warn('[Supabase] addCustomPage:', err); }
  };

  const updateCustomPage = async (id: string, pageData: Partial<CustomPage>) => {
    setCustomPages(prev => prev.map(p => p.id === id ? { ...p, ...pageData } : p));
    try {
      await supabase.from('custom_pages').update({
        title: pageData.title, slug: pageData.slug, content: pageData.content,
        active: pageData.active, page_type: pageData.type,
        banner_image: pageData.bannerImage || null, tagline: pageData.tagline || null,
        restaurant_menu: (pageData.restaurantMenu as any),
        banquet_capacity: pageData.banquetCapacity || null,
        banquet_features: pageData.banquetFeatures,
        blog_posts: (pageData.blogPosts as any),
        activities_list: (pageData.activitiesList as any),
      }).eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateCustomPage:', err); }
  };

  const deleteCustomPage = async (id: string) => {
    setCustomPages(prev => prev.filter(p => p.id !== id));
    try {
      await supabase.from('custom_pages').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteCustomPage:', err); }
  };

  const addGuestEvent = async (evt: Omit<GuestEvent, 'id'>) => {
    const id = `evt-${Date.now()}`;
    setGuestEvents(prev => [...prev, { ...evt, id }]);
    try {
      await supabase.from('guest_events').insert({
        id, property_id: activePropertyId,
        title: evt.title, category: evt.category, description: evt.description,
        image: evt.image, from_date: evt.fromDate, to_date: evt.toDate,
        time: evt.time, price: evt.price, capacity: evt.capacity,
      });
    } catch (err) { console.warn('[Supabase] addGuestEvent:', err); }
  };

  const updateGuestEvent = async (id: string, evtData: Partial<GuestEvent>) => {
    setGuestEvents(prev => prev.map(e => e.id === id ? { ...e, ...evtData } : e));
    try {
      await supabase.from('guest_events').update({
        title: evtData.title, category: evtData.category, description: evtData.description,
        image: evtData.image, from_date: evtData.fromDate, to_date: evtData.toDate,
        time: evtData.time, price: evtData.price, capacity: evtData.capacity,
      }).eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateGuestEvent:', err); }
  };

  const deleteGuestEvent = async (id: string) => {
    setGuestEvents(prev => prev.filter(e => e.id !== id));
    try {
      await supabase.from('guest_events').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteGuestEvent:', err); }
  };

  const markMessageRead = async (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    try {
      await supabase.from('guest_messages').update({ is_read: true })
        .eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] markMessageRead:', err); }
  };

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    try {
      await supabase.from('guest_messages').update({ archived: true })
        .eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteMessage:', err); }
  };

  const setTemplate = (template: 'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel') => {
    setTemplateState(template);
  };

  const addEventLog = async (title: string, description: string, type: 'booking' | 'channel' | 'info') => {
    const id = `evt-${Date.now()}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setEvents(prev => [{ id, title, description, date: timestamp, type }, ...prev].slice(0, 50));
    try {
      await supabase.from('event_logs').insert({
        id, property_id: activePropertyId,
        title, description, log_type: type,
      });
    } catch (err) { console.warn('[Supabase] addEventLog:', err); }
  };

  return (
    <HotelContext.Provider value={{
      appMode,
      setAppMode,
      activePropertyId,
      setActivePropertyId,
      canvasMode,
      setCanvasMode,
      selectedTheme,
      setSelectedTheme,
      propertiesList,
      addProperty,
      addPropertyWithDetails,
      publishProperty,

      hotelInfo,
      rooms,
      pricing,
      bookings,
      addons,
      coupons,
      testimonials,
      faqs,
      policies,
      customPages,
      messages,
      events,
      guestEvents,
      currentTemplate,
      selectedView,
      previewDevice,
      editorFocus,
      setEditorFocus,
      previewPath,
      setPreviewPath,
      
      updateHotelInfo,
      setRooms,
      addRoom,
      updateRoom,
      deleteRoom,
      updateDateOverride,
      addBooking,
      cancelBooking,
      addAddon,
      updateAddon,
      deleteAddon,
      addCoupon,
      updateCoupon,
      deleteCoupon,
      addTestimonial,
      deleteTestimonial,
      addFAQ,
      updateFAQ,
      deleteFAQ,
      addPolicy,
      updatePolicy,
      deletePolicy,
      addCustomPage,
      updateCustomPage,
      deleteCustomPage,
      addGuestEvent,
      updateGuestEvent,
      deleteGuestEvent,
      markMessageRead,
      deleteMessage,
      setTemplate,
      setSelectedView,
      setPreviewDevice,
      addEventLog,
      // Co-hosts
      coHosts,
      addCoHost: async (host: Omit<CoHost, 'id'>) => {
        const id = `host-${Date.now()}`;
        setCoHosts(prev => [...prev, { ...host, id }]);
        try {
          await supabase.from('co_hosts').insert({
            id, property_id: activePropertyId,
            name: host.name, phone: host.phone, role: host.role,
            can_receive_calls: host.canReceiveCalls, can_accept_bookings: host.canAcceptBookings,
          });
        } catch (err) { console.warn('[Supabase] addCoHost:', err); }
      },
      updateCoHost: async (id: string, host: Partial<CoHost>) => {
        setCoHosts(prev => prev.map(h => h.id === id ? { ...h, ...host } : h));
        try {
          await supabase.from('co_hosts').update({
            name: host.name, phone: host.phone, role: host.role,
            can_receive_calls: host.canReceiveCalls, can_accept_bookings: host.canAcceptBookings,
          }).eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] updateCoHost:', err); }
      },
      deleteCoHost: async (id: string) => {
        setCoHosts(prev => prev.filter(h => h.id !== id));
        try {
          await supabase.from('co_hosts').delete().eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] deleteCoHost:', err); }
      },
      // Managed Photos
      managedPhotos,
      addManagedPhoto: async (photo: Omit<ManagedPhoto, 'id'>) => {
        const id = `photo-${Date.now()}`;
        setManagedPhotos(prev => [...prev, { ...photo, id }]);
        try {
          await supabase.from('media_library').insert({
            id, property_id: activePropertyId,
            url: photo.url, media_type: 'photo', tags: photo.tags, is_hero: photo.isHero,
          });
        } catch (err) { console.warn('[Supabase] addManagedPhoto:', err); }
      },
      updateManagedPhoto: async (id: string, photo: Partial<ManagedPhoto>) => {
        setManagedPhotos(prev => prev.map(p => p.id === id ? { ...p, ...photo } : p));
        try {
          await supabase.from('media_library').update({
            tags: photo.tags, is_hero: photo.isHero, url: photo.url,
          }).eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] updateManagedPhoto:', err); }
      },
      deleteManagedPhoto: async (id: string) => {
        setManagedPhotos(prev => prev.filter(p => p.id !== id));
        try {
          await supabase.from('media_library').delete().eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] deleteManagedPhoto:', err); }
      },
      // Managed Videos
      managedVideos,
      addManagedVideo: async (video: Omit<ManagedVideo, 'id'>) => {
        const id = `video-${Date.now()}`;
        setManagedVideos(prev => [...prev, { ...video, id }]);
        try {
          await supabase.from('media_library').insert({
            id, property_id: activePropertyId,
            url: video.url, media_type: 'video', tags: video.tags, is_hero: video.isHero,
          });
        } catch (err) { console.warn('[Supabase] addManagedVideo:', err); }
      },
      updateManagedVideo: async (id: string, video: Partial<ManagedVideo>) => {
        setManagedVideos(prev => prev.map(v => v.id === id ? { ...v, ...video } : v));
        try {
          await supabase.from('media_library').update({
            tags: video.tags, is_hero: video.isHero, url: video.url,
          }).eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] updateManagedVideo:', err); }
      },
      deleteManagedVideo: async (id: string) => {
        setManagedVideos(prev => prev.filter(v => v.id !== id));
        try {
          await supabase.from('media_library').delete().eq('id', id).eq('property_id', activePropertyId);
        } catch (err) { console.warn('[Supabase] deleteManagedVideo:', err); }
      },
    }}>
      {children}
    </HotelContext.Provider>
  );
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};
