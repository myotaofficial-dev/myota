import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase as supabaseOriginal } from '../lib/supabaseClient';
const supabase = supabaseOriginal as any;

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
  instagramImages?: string[];

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
  currentTemplate?: string;
  offers?: any[];
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

export interface RefundRecord {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  refundType: 'source' | 'credits';
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
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partially_paid';
  bookingStatus: 'confirmed' | 'cancelled' | 'checked_in';
  addons: string[];
  couponCode?: string;
  createdAt: string;
  adults?: number;
  children?: number;
  selectedSlot?: string;
  paidAmount?: number;
  refunds?: RefundRecord[];
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

export interface EventSlot {
  id: string;
  fromTime: string; // e.g. "09:00"
  toTime: string;   // e.g. "11:00"
  capacity: number;
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
  slots: EventSlot[];
  priceAdult: number;
  priceChild: number;
  target: 'all' | 'room_guest' | 'outside_guest';
  discount: number;
  aboutText?: string;
  longDescription?: string;
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

export interface GstSlab {
  min: number;
  max: number;
  rate: number;
}

export interface GstSettings {
  room_slabs: GstSlab[];
  addons_rate: number;
  events_rate: number;
  meal_plans_rate: number;
}

export interface HotelContextType {
  appMode: 'landing' | 'onboarding' | 'dashboard' | 'editor';
  setAppMode: (mode: 'landing' | 'onboarding' | 'dashboard' | 'editor') => void;
  activePropertyId: string;
  setActivePropertyId: (id: string) => void;
  setPropertiesList: React.Dispatch<React.SetStateAction<PropertyItem[]>>;
  setHotelInfoState: React.Dispatch<React.SetStateAction<HotelInfo>>;
  gstSettings: GstSettings;
  updateGstSettings: (updates: Partial<GstSettings>) => Promise<void>;
  canvasMode: 'editor' | 'guest';
  setCanvasMode: (mode: 'editor' | 'guest') => void;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  propertiesList: PropertyItem[];
  addProperty: (name: string) => void;
  deleteProperty: (id: string) => Promise<void>;
  addPropertyWithDetails: (details: {
    name: string;
    location: string;
    phone: string;
    email: string;
    description: string;
    amenities: string[];
    googleBusinessName: string;
    photos?: string[];
    reviews?: Array<{ author: string; text: string; rating: number }>;
    latitude?: number;
    longitude?: number;
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
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<string>;
  cancelBooking: (id: string) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  getAvailableInventory: (roomId: string, dateStr: string) => number;
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

export const DEFAULT_GST_SETTINGS: GstSettings = {
  room_slabs: [
    { min: 0, max: 1000, rate: 0 },
    { min: 1001, max: 7500, rate: 5 },
    { min: 7501, max: 99999999, rate: 18 }
  ],
  addons_rate: 18,
  events_rate: 18,
  meal_plans_rate: 18
};

// --- Defaults / Mock Data ---

export const defaultProperties: PropertyItem[] = [];

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
  mealPlanApChildRate: 1250,
  offers: [],
};

export const defaultRooms: RoomType[] = [
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

export const defaultAddons: Addon[] = [
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

export const defaultCoupons: Coupon[] = [
  { id: "coupon-1", code: "WELCOME10", discountType: "percent", discountValue: 10, active: true }
];

export const defaultTestimonials: Testimonial[] = [
  { id: "test-1", author: "Rajesh Kumar", content: "Absolutely stunning property! Highly recommended.", rating: 5, stayDate: "2026-05-15" }
];

export const defaultFAQs: FAQ[] = [
  { id: "faq-1", question: "What are check-in and check-out timings?", answer: "Standard check-in is 2:00 PM and check-out is 11:00 AM." }
];

export const defaultPolicies: Policy[] = [
  { id: "pol-1", title: "Cancellation Policy", description: "Free cancellation up to 48 hours prior to check-in." }
];

export const defaultCustomPages: CustomPage[] = [
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

export const defaultGuestEvents: GuestEvent[] = [
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
    capacity: 30,
    slots: [],
    priceAdult: 25.00,
    priceChild: 15.00,
    target: 'all',
    discount: 0
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
    capacity: 20,
    slots: [],
    priceAdult: 15.00,
    priceChild: 10.00,
    target: 'all',
    discount: 0
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
    capacity: 50,
    slots: [],
    priceAdult: 35.00,
    priceChild: 20.00,
    target: 'all',
    discount: 0
  }
];

export const defaultMessages: GuestMessage[] = [
  { id: "msg-1", senderName: "Vivek Roy", senderEmail: "vivek@example.com", senderPhone: "+91 9988776655", subject: "Group Inquiry", message: "Planning a corporate retreat in August. Need 10 rooms. Please email package rates.", date: "2026-06-25", read: false }
];

export const defaultBookings: Booking[] = [
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

export const defaultEvents: EventLog[] = [
  { id: "evt-1", title: "Welcome log", description: "System initialized successfully.", date: "2026-06-25 11:52", type: "info" }
];

// --- Context Provider Component ---

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode states
  const [appMode, setAppMode] = useState<'landing' | 'onboarding' | 'dashboard' | 'editor'>(() => {
    const onboarded = localStorage.getItem('myota_onboarded');
    return onboarded ? 'dashboard' : 'landing';
  });
  const [activePropertyId, setActivePropertyId] = useState<string>(() => {
    return localStorage.getItem('activePropertyId') || '';
  });
  const [canvasMode, setCanvasMode] = useState<'editor' | 'guest'>('editor');
  const [selectedTheme, setSelectedTheme] = useState<string>('THEME: ORGANIC NATURAL');
  const [propertiesList, setPropertiesList] = useState<PropertyItem[]>([]);
  const loadedPropertyIdRef = React.useRef<string | null>(null);

  const [hotelInfo, setHotelInfoState] = useState<HotelInfo>(defaultHotelInfo);
  const [gstSettings, setGstSettings] = useState<GstSettings>(DEFAULT_GST_SETTINGS);

  const [rooms, setRooms] = useState<RoomType[]>([]);

  const [pricing, setPricing] = useState<RoomPricing>({});

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [addons, setAddons] = useState<Addon[]>([]);

  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const [faqs, setFaqs] = useState<FAQ[]>([]);

  const [policies, setPolicies] = useState<Policy[]>([]);

  const [customPages, setCustomPages] = useState<CustomPage[]>([]);

  const [messages, setMessages] = useState<GuestMessage[]>([]);

  const [events, setEvents] = useState<EventLog[]>([]);

  const [guestEvents, setGuestEvents] = useState<GuestEvent[]>([]);

  const [currentTemplate, setTemplateState] = useState<'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel'>('organic');
  const [selectedView, setSelectedView] = useState<string>('property');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [editorFocus, setEditorFocus] = useState<'canvas' | 'form'>('canvas');
  const [previewPath, setPreviewPath] = useState<string>('/');

  const [coHosts, setCoHosts] = useState<CoHost[]>([]);

  const [managedPhotos, setManagedPhotos] = useState<ManagedPhoto[]>([]);

  const [managedVideos, setManagedVideos] = useState<ManagedVideo[]>([]);

  useEffect(() => { localStorage.setItem('activePropertyId', activePropertyId); }, [activePropertyId]);

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
    guestName: b.guest_name || '',
    guestEmail: b.guest_email || '',
    guestPhone: b.guest_phone || '',
    checkIn: b.check_in || '',
    checkOut: b.check_out || '',
    totalPrice: Number(b.total_price),
    paymentStatus: b.payment_status || 'pending',
    bookingStatus: b.booking_status || 'confirmed',
    addons: b.addons || [],
    couponCode: b.coupon_code || undefined,
    createdAt: b.created_at || b.createdAt || '',
    adults: b.adults ?? 1,
    children: b.children ?? 0,
    selectedSlot: b.selected_slot || undefined,
    paidAmount: Number(b.paid_amount || 0),
    refunds: b.refunds ? (typeof b.refunds === 'string' ? JSON.parse(b.refunds) : b.refunds) : [],
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
    slots: e.slots || [],
    priceAdult: Number(e.price_adult ?? e.price),
    priceChild: Number(e.price_child ?? e.price),
    target: (e.target || 'all') as GuestEvent['target'],
    discount: Number(e.discount ?? 0),
    aboutText: e.about_text || '',
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
    offers: s.offers || [],
    instagramImages: s.instagram_images || [],
  });

  // Helper: build hotel_settings upsert payload from HotelInfo state
  const buildHotelSettingsPayload = (info: HotelInfo, pid: string) => ({
    property_id: pid,
    name: info.name,
    subdomain: info.subdomain,
    custom_domain: info.customDomain,
    star_rating: info.starRating,
    check_in_time: info.checkInTime,
    check_out_time: info.checkOutTime,
    phone: info.phone,
    email: info.email,
    address: info.address,
    latitude: info.latitude || null,
    longitude: info.longitude || null,
    tagline: info.tagline,
    description: info.description,
    short_description: info.shortDescription || null,
    detailed_description: info.detailedDescription || null,
    website_headline: info.websiteHeadline || null,
    about_title: info.aboutTitle || null,
    amenities_title: info.amenitiesTitle || null,
    events_title: info.eventsTitle || null,
    rooms_title: info.roomsTitle || null,
    reviews_title: info.reviewsTitle || null,
    gallery_title: info.galleryTitle || null,
    addons_title: info.addonsTitle || null,
    faqs_title: info.faqsTitle || null,
    policies_title: info.policiesTitle || null,
    primary_color: info.primaryColor,
    secondary_color: info.secondaryColor,
    bg_color: info.bgColor,
    font_header: info.fontHeader,
    font_body: info.fontBody,
    logo_url: info.logoUrl,
    favicon_url: info.faviconUrl || null,
    google_analytics_id: info.googleAnalyticsId,
    facebook_pixel_id: info.facebookPixelId,
    instagram_handle: info.instagramHandle || null,
    google_business_name: info.googleBusinessName || null,
    hero_style: info.heroStyle,
    hero_images: info.heroImages,
    hero_video: info.heroVideo,
    general_amenities: info.generalAmenities,
    custom_amenities: info.customAmenities || [],
    section_order: info.sectionOrder || [],
    disabled_sections: info.disabledSections || [],
    menu_items_order: info.menuItemsOrder || [],
    disabled_menu_items: info.disabledMenuItems || [],
    show_events: info.showEvents,
    child_policy_enabled: info.childPolicyEnabled ?? false,
    child_policy_min_age: info.childPolicyMinAge ?? 5,
    child_policy_max_age: info.childPolicyMaxAge ?? 12,
    extra_adult_rate: info.extraAdultRate ?? 0,
    extra_child_rate: info.extraChildRate ?? 0,
    meal_plan_cp_enabled: info.mealPlanCpEnabled ?? false,
    meal_plan_cp_adult_rate: info.mealPlanCpAdultRate ?? 0,
    meal_plan_cp_child_rate: info.mealPlanCpChildRate ?? 0,
    meal_plan_map_enabled: info.mealPlanMapEnabled ?? false,
    meal_plan_map_adult_rate: info.mealPlanMapAdultRate ?? 0,
    meal_plan_map_child_rate: info.mealPlanMapChildRate ?? 0,
    meal_plan_ap_enabled: info.mealPlanApEnabled ?? false,
    meal_plan_ap_adult_rate: info.mealPlanApAdultRate ?? 0,
    meal_plan_ap_child_rate: info.mealPlanApChildRate ?? 0,
    default_meal_plan: info.defaultMealPlan || 'EP',
    cancellation_policy_type: info.cancellationPolicyType || '2d',
    cancellation_policy_custom_text: info.cancellationPolicyCustomText || null,
    non_refundable_discount_amount: info.nonRefundableDiscountAmount ?? 0,
    custom_cancellation_policies: (info.customCancellationPolicies as any) || [],
    payment_collection_type: info.paymentCollectionType || 'partial',
    payment_collection_percent: info.paymentCollectionPercent ?? 50,
    current_template: info.currentTemplate || 'organic',
    offers: info.offers || [],
    instagram_images: info.instagramImages || [],
  });

  // Helper: build room_categories upsert payload from RoomType
  const buildRoomPayload = (room: RoomType, pid: string) => ({
    id: room.id,
    property_id: pid,
    name: room.name,
    description: room.description,
    size_sqft: room.sizeSqft || 0,
    bed_type: room.bedType || '',
    capacity_adults: room.capacityAdults,
    capacity_children: room.capacityChildren,
    min_occupancy: room.min_occupancy || 1,
    base_occupancy: room.base_occupancy || room.capacityAdults,
    base_price: room.basePrice,
    price_tiers: room.price_tiers || {},
    total_inventory: room.totalInventory,
    beds: room.beds || {},
    extra_beds: room.extra_beds || {},
    amenities: room.amenities,
    photos: room.photos,
    inventory_overrides: room.inventory_overrides || {},
    rate_overrides: room.rate_overrides || {},
    cancellation_policy_overrides: room.cancellation_policy_overrides || {},
    is_active: room.is_active ?? true,
  });

  // Load all data from Supabase on mount (parallel fetch)
  // Also seeds properties + hotel_settings + rooms if first time
  useEffect(() => {
    const loadAll = async () => {
      const pid = activePropertyId;
      if (!pid) return; // Skip if no property is active
      loadedPropertyIdRef.current = null; // Mark as not loaded yet to prevent autosave overwrites
      try {

        // Step 2: Load all remaining tables in parallel
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
          { data: pricingData },
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
          supabase.from('pricing_overrides').select('*').eq('property_id', pid),
        ]);

        // Load GST Settings
        try {
          const { data: gstData } = await supabase
            .from('gst_settings')
            .select('*')
            .eq('property_id', pid)
            .maybeSingle();
          if (gstData) {
            setGstSettings({
              room_slabs: gstData.room_slabs || DEFAULT_GST_SETTINGS.room_slabs,
              addons_rate: Number(gstData.addons_rate) ?? DEFAULT_GST_SETTINGS.addons_rate,
              events_rate: Number(gstData.events_rate) ?? DEFAULT_GST_SETTINGS.events_rate,
              meal_plans_rate: Number(gstData.meal_plans_rate) ?? DEFAULT_GST_SETTINGS.meal_plans_rate,
            });
          } else {
            setGstSettings(DEFAULT_GST_SETTINGS);
          }
        } catch (err) {
          console.warn("Could not load gst_settings table, falling back to default slabs:", err);
          setGstSettings(DEFAULT_GST_SETTINGS);
        }

        // Step 3: Apply loaded data to state
        if (settingsData) {
          setHotelInfoState(prev => ({ ...prev, ...mapDbHotelSettings(settingsData) }));
        } else {
          // If no settings exist in DB yet, create a clean default settings template
          const prop = propertiesList.find(p => p.id === pid);
          const initialInfo: HotelInfo = {
            ...defaultHotelInfo,
            name: prop?.name || hotelInfo.name || defaultHotelInfo.name,
          };
          setHotelInfoState(initialInfo);
          await supabase.from('hotel_settings').upsert(buildHotelSettingsPayload(initialInfo, pid));
        }

        if (roomsData && roomsData.length > 0) {
          setRooms(roomsData.map(mapDbRoom));
        } else {
          setRooms([]);
        }

        if (bookingsData && bookingsData.length > 0) {
          setBookings(bookingsData.map(mapDbBooking));
        } else {
          setBookings([]);
        }

        if (addonsData && addonsData.length > 0) {
          setAddons(addonsData.map(mapDbAddon));
        } else {
          setAddons([]);
        }

        if (couponsData && couponsData.length > 0) {
          setCoupons(couponsData.map(mapDbCoupon));
        } else {
          setCoupons([]);
        }

        if (testimonialsData && testimonialsData.length > 0) {
          setTestimonials(testimonialsData.map(mapDbTestimonial));
        } else {
          setTestimonials([]);
        }

        if (faqsData && faqsData.length > 0) {
          setFaqs(faqsData.map(mapDbFaq));
        } else {
          setFaqs([]);
        }

        if (policiesData && policiesData.length > 0) {
          setPolicies(policiesData.map(mapDbPolicy));
        } else {
          setPolicies([]);
        }

        if (pagesData && pagesData.length > 0) {
          setCustomPages(pagesData.map(mapDbCustomPage));
        } else {
          setCustomPages([]);
        }

        if (guestEventsData && guestEventsData.length > 0) {
          setGuestEvents(guestEventsData.map(mapDbGuestEvent));
        } else {
          setGuestEvents([]);
        }

        if (coHostsData && coHostsData.length > 0) {
          setCoHosts(coHostsData.map(mapDbCoHost));
        } else {
          setCoHosts([]);
        }

        if (mediaData && mediaData.length > 0) {
          setManagedPhotos(mediaData.filter((m: any) => m.media_type === 'photo').map((m: any) => mapDbMedia(m) as ManagedPhoto));
          setManagedVideos(mediaData.filter((m: any) => m.media_type === 'video').map((m: any) => mapDbMedia(m) as ManagedVideo));
        } else {
          setManagedPhotos([]);
          setManagedVideos([]);
        }

        if (messagesData && messagesData.length > 0) {
          setMessages(messagesData.map(mapDbMessage));
        } else {
          setMessages([]);
        }

        if (eventLogsData && eventLogsData.length > 0) {
          setEvents(eventLogsData.map((e: any) => ({
            id: e.id,
            title: e.title,
            description: e.description || '',
            date: e.created_at?.slice(0, 16).replace('T', ' ') || '',
            type: e.log_type as EventLog['type'],
          })));
        } else {
          setEvents([]);
        }

        if (pricingData && pricingData.length > 0) {
          const mappedPricing: RoomPricing = {};
          pricingData.forEach((row: any) => {
            const roomId = row.room_id;
            const dateStr = row.date;
            if (!mappedPricing[roomId]) {
              mappedPricing[roomId] = {};
            }
            mappedPricing[roomId][dateStr] = {
              date: dateStr,
              price: Number(row.price),
              isBlocked: row.is_blocked || false
            };
          });
          setPricing(mappedPricing);
        } else {
          setPricing({});
        }

        loadedPropertyIdRef.current = pid; // Mark this property as successfully loaded
      } catch (err) {
        console.warn('[Supabase] Initial load failed, using clean fallback:', err);
      }
    };
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePropertyId]);

  // Sync properties list from Supabase
  const fetchPropertiesForUser = async (ownerId: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, status')
        .eq('owner_id', ownerId);

      if (error) throw error;
      if (data) {
        const mapped: PropertyItem[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status === 'published' ? 'Published' : 'Draft'
        }));
        setPropertiesList(mapped);
        
        // Set active property if not set
        const savedActive = localStorage.getItem('activePropertyId');
        if (mapped.length > 0) {
          if (!savedActive || !mapped.some(p => p.id === savedActive)) {
            setActivePropertyId(mapped[0].id);
          }
        } else {
          setActivePropertyId('');
        }
      }
    } catch (err) {
      console.warn('[Supabase] fetchPropertiesForUser error:', err);
    }
  };

  // Sync active Supabase Auth session on mount and auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session && session.user) {
        localStorage.setItem('myota_onboarded', 'true');
        localStorage.setItem('myota_owner_id', session.user.id);
        localStorage.setItem('myota_user_email', session.user.email || '');

        const emailPrefix = (session.user.email || '').split('@')[0] || 'User';
        const userName = session.user.email?.toLowerCase() === 'dhanvanthkrishnan@gmail.com' ? 'Dhanvanth Krishnan' : emailPrefix;
        localStorage.setItem('myota_user_name', userName);
        
        // Trigger fetch!
        fetchPropertiesForUser(session.user.id);
      } else {
        localStorage.removeItem('myota_onboarded');
        localStorage.removeItem('myota_owner_id');
        localStorage.removeItem('myota_user_name');
        localStorage.removeItem('myota_user_email');
        localStorage.removeItem('myota_user_phone');
        setAppMode('landing');
        setPropertiesList([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Debounced sync: whenever hotelInfo changes, upsert hotel_settings after 1.5s idle
  const hotelSyncTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Only autosave if the currently active property has finished loading its settings
    if (!activePropertyId || loadedPropertyIdRef.current !== activePropertyId) {
      return;
    }

    if (hotelSyncTimer.current) clearTimeout(hotelSyncTimer.current);
    hotelSyncTimer.current = setTimeout(async () => {
      try {
        await Promise.all([
          supabase.from('hotel_settings').upsert(buildHotelSettingsPayload(hotelInfo, activePropertyId)),
          supabase.from('properties').update({ name: hotelInfo.name }).eq('id', activePropertyId)
        ]);
        // Instantly update the local list state so sidebar updates name in real-time
        setPropertiesList(prev => prev.map(p => p.id === activePropertyId ? { ...p, name: hotelInfo.name } : p));
      } catch (err) {
        console.warn('[Supabase] hotel sync error:', err);
      }
    }, 1500);
    return () => { if (hotelSyncTimer.current) clearTimeout(hotelSyncTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelInfo, activePropertyId]);

  // Actions
  const addProperty = async (name: string) => {
    const id = `prop-${Date.now()}`;
    const newProp: PropertyItem = { id, name, status: 'Draft' };
    setPropertiesList(prev => [...prev, newProp]);
    addEventLog('Property Created', `Created property config: "${name}"`, 'info');
    try {
      const ownerId = localStorage.getItem('myota_owner_id');
      await supabase.from('properties').insert({ 
        id, 
        name, 
        status: 'draft', 
        owner_id: ownerId || null 
      });
    } catch (err) { console.warn('[Supabase] addProperty:', err); }
  };

  const addPropertyWithDetails = async (details: {
    name: string;
    location: string;
    phone: string;
    email: string;
    description: string;
    amenities: string[];
    googleBusinessName: string;
    photos?: string[];
    reviews?: Array<{ author: string; text: string; rating: number }>;
    latitude?: number;
    longitude?: number;
  }) => {
    const id = `prop-${Date.now()}`;
    const newProp: PropertyItem = { id, name: details.name, status: 'Draft' };
    
    // Define Default Seeds
    const defaultFAQs = [
      { question: 'What are the standard check-in and check-out times?', answer: 'Our standard check-in time is 2:00 PM and check-out is 11:00 AM. Early check-in or late check-out is subject to availability and may incur additional charges.' },
      { question: 'Is breakfast included in the room rate?', answer: 'Yes, we offer complimentary buffet breakfast for all registered guests daily from 7:30 AM to 10:00 AM at our dining area.' },
      { question: 'Do you have on-site parking available?', answer: 'Yes, we provide free private parking and valet services for our guests on-site.' },
      { question: 'Is high-speed Wi-Fi available at the property?', answer: 'Yes, complimentary high-speed Wi-Fi is accessible in all rooms, suites, and public areas.' }
    ];

    const defaultPolicies = [
      { title: 'Guest Registration & ID Proof', description: 'All guests (including children) must present a valid government-approved photo ID (Aadhaar, Passport, Driving License) upon check-in. Foreign nationals must present a valid passport and visa.' },
      { title: 'Cancellation & Refund Policy', description: 'Cancellations made 7 days prior to check-in will receive a full refund. Cancellations between 3 to 7 days will incur a 50% charge. Within 72 hours of check-in, bookings are non-refundable.' },
      { title: 'Smoking & Alcohol Policy', description: 'Smoking is strictly prohibited inside the guest rooms and indoor public spaces. Designated outdoor smoking zones are available. Moderate consumption of alcohol is permitted inside rooms.' },
      { title: 'Pet Policy', description: 'Pets are not allowed in standard rooms to ensure a hypoallergenic environment. Please check with our front desk for pet-friendly cottage options.' }
    ];

    const defaultRoomsSeed = [
      {
        id: `room-${Date.now()}-1`,
        property_id: id,
        name: 'Standard Room',
        description: 'A cozy and elegant room equipped with all modern amenities for a comfortable stay.',
        base_price: 3500,
        size_sqft: 250,
        bed_type: 'Queen Bed',
        capacity_adults: 2,
        capacity_children: 1,
        total_inventory: 5,
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Flat-screen TV', 'Electric Kettle', 'Attached Bathroom', 'Toiletries'],
        photos: ['https://images.unsplash.com/photo-1611891487122-2075b9627dde?w=800&auto=format&fit=crop&q=60'],
        display_order: 1,
        is_active: true
      },
      {
        id: `room-${Date.now()}-2`,
        property_id: id,
        name: 'Deluxe Room',
        description: 'Spacious deluxe suite offering panoramic views, premium furnishings, and a luxurious seating area.',
        base_price: 5500,
        size_sqft: 400,
        bed_type: 'King Bed',
        capacity_adults: 3,
        capacity_children: 2,
        total_inventory: 3,
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Mini Bar', 'Private Balcony', 'Safety Deposit Box', 'King Bed', 'Rain Shower'],
        photos: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=60'],
        display_order: 2,
        is_active: true
      }
    ];

    // Await insert FIRST to resolve Yellow Lake Resort refresh race condition
    try {
      const ownerId = localStorage.getItem('myota_owner_id');
      await supabase.from('properties').insert({ 
        id, 
        name: details.name, 
        status: 'draft', 
        owner_id: ownerId || null 
      });

      // Upsert default settings with Google details and hero images
      const initialSettings = {
        ...defaultHotelInfo,
        name: details.name,
        phone: details.phone,
        email: details.email,
        address: details.location,
        description: details.description,
        latitude: details.latitude ?? defaultHotelInfo.latitude,
        longitude: details.longitude ?? defaultHotelInfo.longitude,
        generalAmenities: details.amenities.length > 0 ? details.amenities : defaultHotelInfo.generalAmenities,
        googleBusinessName: details.googleBusinessName,
        heroImages: details.photos && details.photos.length > 0 ? details.photos : [],
      };
      await supabase.from('hotel_settings').upsert(buildHotelSettingsPayload(initialSettings, id));

      // Seed photos into media_library
      if (details.photos && details.photos.length > 0) {
        const mediaPayload = details.photos.map((url, idx) => ({
          id: `photo-${Date.now()}-${idx}`,
          property_id: id,
          url,
          media_type: 'photo',
          tags: ['google-business', 'imported'],
          is_hero: idx === 0,
        }));
        await supabase.from('media_library').insert(mediaPayload);
      }

      // Seed Google Reviews as Testimonials
      if (details.reviews && details.reviews.length > 0) {
        const testimonialsPayload = details.reviews.filter(r => r.text.trim()).map((r, idx) => ({
          id: `test-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          property_id: id,
          author: r.author,
          content: r.text,
          rating: r.rating,
          stay_date: new Date(Date.now() - idx * 86400000 * 30).toISOString().split('T')[0]
        }));
        await supabase.from('testimonials').insert(testimonialsPayload);
      }

      // Seed standard FAQs
      const faqsPayload = defaultFAQs.map((faq, idx) => ({
        id: `faq-${Date.now()}-${idx}`,
        property_id: id,
        question: faq.question,
        answer: faq.answer,
        display_order: idx
      }));
      await supabase.from('faqs').insert(faqsPayload);

      // Seed standard Policies
      const policiesPayload = defaultPolicies.map((pol, idx) => ({
        id: `policy-${Date.now()}-${idx}`,
        property_id: id,
        title: pol.title,
        description: pol.description,
        display_order: idx
      }));
      await supabase.from('policies').insert(policiesPayload);

      // Seed default Rooms
      await supabase.from('room_categories').insert(defaultRoomsSeed);
    } catch (err) { 
      console.warn('[Supabase] addPropertyWithDetails:', err); 
    }

    setPropertiesList(prev => [...prev, newProp]);
    setHotelInfoState(prev => ({
      ...prev,
      name: details.name,
      phone: details.phone,
      email: details.email,
      address: details.location,
      description: details.description,
      latitude: details.latitude ?? prev.latitude,
      longitude: details.longitude ?? prev.longitude,
      generalAmenities: details.amenities.length > 0 ? details.amenities : prev.generalAmenities,
      googleBusinessName: details.googleBusinessName,
      heroImages: details.photos && details.photos.length > 0 ? details.photos : prev.heroImages,
    }));
    
    // Initialize state locally for seamless preview load!
    if (details.photos && details.photos.length > 0) {
      setManagedPhotos(details.photos.map((url, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url,
        tags: ['google-business', 'imported'],
        isHero: idx === 0,
      })));
    } else {
      setManagedPhotos([]);
    }

    // Populate FAQs local state
    setFaqs(defaultFAQs.map((faq, idx) => ({
      id: `faq-${Date.now()}-${idx}`,
      question: faq.question,
      answer: faq.answer,
      displayOrder: idx
    })));

    // Populate Policies local state
    setPolicies(defaultPolicies.map((pol, idx) => ({
      id: `policy-${Date.now()}-${idx}`,
      title: pol.title,
      description: pol.description,
      displayOrder: idx
    })));

    // Populate Rooms local state
    setRooms(defaultRoomsSeed.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      basePrice: r.base_price,
      sizeSqft: r.size_sqft,
      bedType: r.bed_type,
      capacityAdults: r.capacity_adults,
      capacityChildren: r.capacity_children,
      totalInventory: r.total_inventory,
      amenities: r.amenities,
      photos: r.photos,
      is_active: r.is_active,
      beds: {},
      extra_beds: {},
      price_tiers: { '1': r.base_price, '2': Math.round(r.base_price * 1.15) },
      inventory_overrides: {},
      rate_overrides: {},
      cancellation_policy_overrides: {}
    })));

    // Populate Testimonials local state
    if (details.reviews && details.reviews.length > 0) {
      setTestimonials(details.reviews.filter(r => r.text.trim()).map((r, idx) => ({
        id: `test-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        author: r.author,
        content: r.text,
        rating: r.rating,
        stayDate: new Date(Date.now() - idx * 86400000 * 30).toISOString().split('T')[0]
      })));
    } else {
      setTestimonials([]);
    }

    loadedPropertyIdRef.current = id; // Initialize the loaded ref for the newly onboarded property
    setActivePropertyId(id);
    addEventLog('Property Created', `Onboarded "${details.name}" via setup wizard.`, 'info');
  };

  const deleteProperty = async (id: string) => {
    // 1. Remove from local properties state
    setPropertiesList(prev => prev.filter(p => p.id !== id));
    addEventLog('Property Deleted', `Permanently deleted property configuration.`, 'info');
    
    // 2. If it was active, select the first remaining property or clear active property
    if (activePropertyId === id) {
      const remaining = propertiesList.filter(p => p.id !== id);
      if (remaining.length > 0) {
        setActivePropertyId(remaining[0].id);
      } else {
        setActivePropertyId('');
        setRooms([]);
        setAddons([]);
        setCoupons([]);
        setTestimonials([]);
        setFaqs([]);
        setPolicies([]);
        setCustomPages([]);
        setManagedPhotos([]);
        setManagedVideos([]);
        setHotelInfoState(defaultHotelInfo);
      }
    }
    
    // 3. Delete from Supabase
    try {
      await supabase.from('properties').delete().eq('id', id);
    } catch (err) {
      console.warn('[Supabase] deleteProperty failed:', err);
    }
  };

  const publishProperty = async (id: string) => {
    setPropertiesList(prev => prev.map(p => p.id === id ? { ...p, status: 'Published' } : p));
    addEventLog('Property Published', 'Active layout built and mapped successfully.', 'info');
    try {
      await supabase.from('properties').update({ status: 'published' }).eq('id', id);
    } catch (err) { console.warn('[Supabase] publishProperty:', err); }
  };

  const updateHotelInfo = (info: Partial<HotelInfo>) => {
    // Update local state immediately (debounced Supabase upsert fires via useEffect)
    setHotelInfoState(prev => ({ ...prev, ...info }));
    
    // Only update propertiesList locally if the active property is fully loaded to prevent race conditions during transitions
    if (info.name && activePropertyId && loadedPropertyIdRef.current === activePropertyId) {
      setPropertiesList(prev => prev.map(p => p.id === activePropertyId ? { ...p, name: info.name! } : p));
    }
  };

  const addRoom = async (room: Omit<RoomType, 'id'>) => {
    const id = `room-${Date.now()}`;
    const newRoom: RoomType = { ...room, id };
    setRooms(prev => [...prev, newRoom]);
    addEventLog('Room Category Added', `New room category "${room.name}" created.`, 'info');
    try {
      await supabase.from('room_categories').insert(buildRoomPayload(newRoom, activePropertyId));
    } catch (err) { console.warn('[Supabase] addRoom:', err); }
  };

  const updateRoom = async (id: string, roomData: Partial<RoomType>) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, ...roomData } : r));
    addEventLog('Room Category Updated', `Settings for "${roomData.name || 'room'}" adjusted.`, 'info');
    try {
      // Build partial update payload — only include defined fields
      const payload: Record<string, unknown> = {};
      if (roomData.name !== undefined) payload.name = roomData.name;
      if (roomData.description !== undefined) payload.description = roomData.description;
      if (roomData.basePrice !== undefined) payload.base_price = roomData.basePrice;
      if (roomData.totalInventory !== undefined) payload.total_inventory = roomData.totalInventory;
      if (roomData.sizeSqft !== undefined) payload.size_sqft = roomData.sizeSqft;
      if (roomData.bedType !== undefined) payload.bed_type = roomData.bedType;
      if (roomData.capacityAdults !== undefined) payload.capacity_adults = roomData.capacityAdults;
      if (roomData.capacityChildren !== undefined) payload.capacity_children = roomData.capacityChildren;
      if (roomData.min_occupancy !== undefined) payload.min_occupancy = roomData.min_occupancy;
      if (roomData.base_occupancy !== undefined) payload.base_occupancy = roomData.base_occupancy;
      if (roomData.price_tiers !== undefined) payload.price_tiers = roomData.price_tiers;
      if (roomData.beds !== undefined) payload.beds = roomData.beds;
      if (roomData.extra_beds !== undefined) payload.extra_beds = roomData.extra_beds;
      if (roomData.amenities !== undefined) payload.amenities = roomData.amenities;
      if (roomData.photos !== undefined) payload.photos = roomData.photos;
      if (roomData.inventory_overrides !== undefined) payload.inventory_overrides = roomData.inventory_overrides;
      if (roomData.rate_overrides !== undefined) payload.rate_overrides = roomData.rate_overrides;
      if (roomData.cancellation_policy_overrides !== undefined) payload.cancellation_policy_overrides = roomData.cancellation_policy_overrides;
      if (roomData.is_active !== undefined) payload.is_active = roomData.is_active;
      await supabase.from('room_categories').update(payload).eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] updateRoom:', err); }
  };

  const deleteRoom = async (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    addEventLog('Room Category Deleted', `Room type removed from active listings.`, 'info');
    try {
      await supabase.from('room_categories').delete().eq('id', id).eq('property_id', activePropertyId);
    } catch (err) { console.warn('[Supabase] deleteRoom:', err); }
  };

  const updateDateOverride = async (roomId: string, date: string, override: Partial<PricingOverride>) => {
    // Update local pricing state immediately
    setPricing(prev => {
      const roomPricing = prev[roomId] || {};
      const dayPricing = roomPricing[date] || { date, price: 0, isBlocked: false };
      return {
        ...prev,
        [roomId]: { ...roomPricing, [date]: { ...dayPricing, ...override } }
      };
    });
    // Upsert to pricing_overrides table
    try {
      await supabase.from('pricing_overrides').upsert({
        room_id: roomId,
        property_id: activePropertyId,
        date,
        price: override.price ?? 0,
        is_blocked: override.isBlocked ?? false,
      });
    } catch (err) { console.warn('[Supabase] updateDateOverride:', err); }
  };

  const generateBookingCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `BK-${code}`;
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> => {
    const newBooking: Booking = {
      ...bookingData,
      id: generateBookingCode(),
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
        adults: newBooking.adults ?? 1,
        children: newBooking.children ?? 0,
        selected_slot: newBooking.selectedSlot || null,
        paid_amount: newBooking.paidAmount || 0
      });
    } catch (err) {
      console.warn('[Supabase] addBooking error:', err);
    }
    return newBooking.id;
  };

  const getAvailableInventory = (roomId: string, dateStr: string): number => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 0;
    
    // Base inventory configuration (default or daily override)
    const baseInventory = room.inventory_overrides?.[dateStr] ?? room.totalInventory;
    
    // Count active overlapping bookings
    const bookingsOnDate = bookings.filter(b => {
      return b.bookingStatus !== 'cancelled' &&
             b.checkIn <= dateStr &&
             b.checkOut > dateStr;
    }).reduce((sum, b) => {
      const roomIds = b.roomId ? b.roomId.split(',') : [];
      const count = roomIds.filter(id => id === roomId).length;
      return sum + count;
    }, 0);

    return Math.max(0, baseInventory - bookingsOnDate);
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

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    try {
      const payload: any = {};
      if (updates.checkIn !== undefined) payload.check_in = updates.checkIn;
      if (updates.checkOut !== undefined) payload.check_out = updates.checkOut;
      if (updates.totalPrice !== undefined) payload.total_price = updates.totalPrice;
      if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
      if (updates.bookingStatus !== undefined) payload.booking_status = updates.bookingStatus;
      if (updates.paidAmount !== undefined) payload.paid_amount = updates.paidAmount;
      if (updates.refunds !== undefined) payload.refunds = updates.refunds;

      await supabase
        .from('bookings')
        .update(payload)
        .eq('id', id)
        .eq('property_id', activePropertyId);
    } catch (err) {
      console.warn('[Supabase] updateBooking error:', err);
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
        slots: evt.slots || [],
        price_adult: evt.priceAdult || 0,
        price_child: evt.priceChild || 0,
        target: evt.target || 'all',
        discount: evt.discount || 0,
        about_text: evt.aboutText || ''
      });
    } catch (err) { console.warn('[Supabase] addGuestEvent:', err); }
  };

  const updateGuestEvent = async (id: string, evtData: Partial<GuestEvent>) => {
    setGuestEvents(prev => prev.map(e => e.id === id ? { ...e, ...evtData } : e));
    try {
      const payload: any = {
        title: evtData.title, category: evtData.category, description: evtData.description,
        image: evtData.image, from_date: evtData.fromDate, to_date: evtData.toDate,
        time: evtData.time, price: evtData.price, capacity: evtData.capacity,
        slots: evtData.slots,
        price_adult: evtData.priceAdult,
        price_child: evtData.priceChild,
        target: evtData.target,
        discount: evtData.discount
      };
      if (evtData.aboutText !== undefined) {
        payload.about_text = evtData.aboutText;
      }
      await supabase.from('guest_events').update(payload).eq('id', id).eq('property_id', activePropertyId);
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

  const updateGstSettings = async (updates: Partial<GstSettings>) => {
    if (!activePropertyId) return;
    const next = { ...gstSettings, ...updates };
    setGstSettings(next);
    try {
      const { data } = await supabase
        .from('gst_settings')
        .select('id')
        .eq('property_id', activePropertyId)
        .maybeSingle();

      if (data?.id) {
        await supabase
          .from('gst_settings')
          .update({
            room_slabs: next.room_slabs,
            addons_rate: next.addons_rate,
            events_rate: next.events_rate,
            meal_plans_rate: next.meal_plans_rate,
            updated_at: new Date().toISOString()
          })
          .eq('property_id', activePropertyId);
      } else {
        await supabase
          .from('gst_settings')
          .insert({
            property_id: activePropertyId,
            room_slabs: next.room_slabs,
            addons_rate: next.addons_rate,
            events_rate: next.events_rate,
            meal_plans_rate: next.meal_plans_rate
          });
      }
    } catch (err) {
      console.warn("Failed to save GST settings:", err);
    }
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
      gstSettings,
      updateGstSettings,
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
      setPropertiesList,
      setHotelInfoState,
      setRooms,
      addRoom,
      updateRoom,
      deleteRoom,
      updateDateOverride,
      addBooking,
      cancelBooking,
      updateBooking,
      getAvailableInventory,
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
      deleteProperty,
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
