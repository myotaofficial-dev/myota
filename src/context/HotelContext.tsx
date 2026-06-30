import React, { createContext, useContext, useState, useEffect } from 'react';

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
  disabledMenuItems: []
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
    price: 25.00, 
    description: "Milestones are meant to be memorable. Celebrate with a romantic setup by the lake.",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=600"
  },
  { 
    id: "addon-2", 
    name: "Candle Light Dinner", 
    price: 35.00, 
    description: "An evening of quiet luxury, meant for just the two of you under the canopy stars.",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "addon-3",
    name: "Buffet Breakfast",
    price: 15.00,
    description: "Daily organic buffet breakfast prepared from fresh local farm crops.",
    image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=600"
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

  // Auto-sync hero images from managedPhotos when isHero changes
  useEffect(() => {
    const heroUrls = managedPhotos.filter(p => p.isHero).map(p => p.url);
    if (heroUrls.length > 0) {
      setHotelInfoState(prev => ({ ...prev, heroImages: heroUrls }));
    }
  }, [managedPhotos]);

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

  const addBooking = (bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setBookings(prev => [newBooking, ...prev]);
    addEventLog('New Booking Confirmed', `Reservation booked for ${bookingData.guestName} ($${bookingData.totalPrice})`, 'booking');
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, bookingStatus: 'cancelled' } : b));
  };

  const addAddon = (addon: Omit<Addon, 'id'>) => {
    setAddons(prev => [...prev, { ...addon, id: `addon-${Date.now()}` }]);
  };

  const updateAddon = (id: string, addonData: Partial<Addon>) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, ...addonData } : a));
  };

  const deleteAddon = (id: string) => {
    setAddons(prev => prev.filter(a => a.id !== id));
  };

  const addCoupon = (coupon: Omit<Coupon, 'id'>) => {
    setCoupons(prev => [...prev, { ...coupon, id: `coupon-${Date.now()}` }]);
  };

  const updateCoupon = (id: string, couponData: Partial<Coupon>) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, ...couponData } : c));
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const addTestimonial = (testimonial: Omit<Testimonial, 'id'>) => {
    setTestimonials(prev => [{ ...testimonial, id: `test-${Date.now()}` }, ...prev]);
  };

  const deleteTestimonial = (id: string) => {
    setTestimonials(prev => prev.filter(t => t.id !== id));
  };

  const addFAQ = (faq: Omit<FAQ, 'id'>) => {
    setFaqs(prev => [...prev, { ...faq, id: `faq-${Date.now()}` }]);
  };

  const updateFAQ = (id: string, faqData: Partial<FAQ>) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...faqData } : f));
  };

  const deleteFAQ = (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const addPolicy = (policy: Omit<Policy, 'id'>) => {
    setPolicies(prev => [...prev, { ...policy, id: `pol-${Date.now()}` }]);
  };

  const updatePolicy = (id: string, policyData: Partial<Policy>) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, ...policyData } : p));
  };

  const deletePolicy = (id: string) => {
    setPolicies(prev => prev.filter(p => p.id !== id));
  };

  const addCustomPage = (page: Omit<CustomPage, 'id'>) => {
    setCustomPages(prev => [...prev, { ...page, id: `page-${Date.now()}` }]);
  };

  const updateCustomPage = (id: string, pageData: Partial<CustomPage>) => {
    setCustomPages(prev => prev.map(p => p.id === id ? { ...p, ...pageData } : p));
  };

  const deleteCustomPage = (id: string) => {
    setCustomPages(prev => prev.filter(p => p.id !== id));
  };

  const addGuestEvent = (evt: Omit<GuestEvent, 'id'>) => {
    setGuestEvents(prev => [...prev, { ...evt, id: `evt-${Date.now()}` }]);
  };

  const updateGuestEvent = (id: string, evtData: Partial<GuestEvent>) => {
    setGuestEvents(prev => prev.map(e => e.id === id ? { ...e, ...evtData } : e));
  };

  const deleteGuestEvent = (id: string) => {
    setGuestEvents(prev => prev.filter(e => e.id !== id));
  };

  const markMessageRead = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const setTemplate = (template: 'luxury' | 'organic' | 'editorial' | 'artdeco' | 'pastel') => {
    setTemplateState(template);
  };

  const addEventLog = (title: string, description: string, type: 'booking' | 'channel' | 'info') => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setEvents(prev => [{ id: `evt-${Date.now()}`, title, description, date: timestamp, type }, ...prev].slice(0, 50));
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
      addCoHost: (host: Omit<CoHost, 'id'>) => {
        setCoHosts(prev => [...prev, { ...host, id: `host-${Date.now()}` }]);
      },
      updateCoHost: (id: string, host: Partial<CoHost>) => {
        setCoHosts(prev => prev.map(h => h.id === id ? { ...h, ...host } : h));
      },
      deleteCoHost: (id: string) => {
        setCoHosts(prev => prev.filter(h => h.id !== id));
      },
      // Managed Photos
      managedPhotos,
      addManagedPhoto: (photo: Omit<ManagedPhoto, 'id'>) => {
        setManagedPhotos(prev => [...prev, { ...photo, id: `photo-${Date.now()}` }]);
      },
      updateManagedPhoto: (id: string, photo: Partial<ManagedPhoto>) => {
        setManagedPhotos(prev => prev.map(p => p.id === id ? { ...p, ...photo } : p));
      },
      deleteManagedPhoto: (id: string) => {
        setManagedPhotos(prev => prev.filter(p => p.id !== id));
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
