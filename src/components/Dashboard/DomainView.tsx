import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { CoHost } from '../../context/HotelContext';
import {
  Info, FileText, Sparkles, MapPin, Phone, UserCheck,
  ShieldCheck, Image, Trash2, Plus, Search, X, Pencil, Check,
  Bold, Italic, Underline, Link, Code, List, ListOrdered, Quote, Undo, Redo
} from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

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


// ─── Full amenities master list ──────────────────────────────────────────────
const MASTER_AMENITIES: string[] = [
  "AC","Air Conditioning","Complimentary Breakfast Buffet","Complimentary Drinking Water",
  "Daily Housekeeping","Free WiFi","Parking","Room Service","Scenic Lake Views","Shower",
  "Swimming Pool","24-Hour Check-in","24-Hour Front Desk","24-Hour Premium Fuel Pumps",
  "24-Hour Reception","24-Hour Room Service","24/7 Caretaker","24/7 Front Desk",
  "24/7 Front Desk Assistance","24/7 Front Office Support","24/7 Guest Assistance",
  "24/7 Hot Water","24/7 Power Backup","24/7 Reception","24/7 Room Service",
  "24/7 Security","24/7 Staff Assistance","24/7 Staff Support","Accessible Location",
  "Afternoon Tea Service","Air Cooler","Airgun","Airport Proximity","Airport Shuttle Service",
  "Airport/Local Transportation","Ample Parking","Archery","Attached Washroom",
  "ATV/Snowmobile Parking","Authentic Kumaoni Cuisine","Authentic Local Cuisine",
  "Authentic Local Dining","Authentic Rajasthani Cuisine","Authentic Village Ambiance",
  "Badminton","Balcony","Banana Ride","Bar & Lounge","Barbeque","Basic Bathroom Facilities",
  "Basic Room Amenities","Bathtub","Beach Access","Beach View","Bike Storage",
  "Biker-Friendly Parking","Bird Watching","Boating","Bonfire","Bonfire Facilities",
  "Bonfire Pit","Bonfire Setup","Bonfire with Music","Books & reading material","Booom Jet Ski",
  "Breakfast","Breathtaking Mountain Views","Budget-friendly Accommodation",
  "Budget-Friendly Dining","Buffet Breakfast","Bumper Ride","Business Amenities",
  "Business Center","Business Traveler Services","Business-Class Amenities",
  "Business-friendly Workspace","Cake Cutting","Campfire","Camping","Camping Facilities",
  "Caretaker available","Caretaker available 24x7","Casual Dining","Catering Support",
  "Cave-Inspired Accommodations","Cave-themed Restaurant","Ceiling Fans",
  "Central Heating/Cooling","Central Location","Centralized Air Conditioning",
  "Charging Points","Chess","Children's Play Area","Clean Rooms",
  "Clean Tented Accommodation","Cleaning available","Climate Controlled Rooms",
  "Climate Controlled Workspace","Close to Transit","Closet","Clothes Rack",
  "Coffee & Tea Service","Coffee Machine","Common Living Area","Common Washroom",
  "Community Lounge","Community Lounges","Complimentary Breakfast","Complimentary High-Speed WiFi",
  "Complimentary Parking","Complimentary Toiletries","Complimentary WiFi",
  "Concierge & Personalized Service","Concierge Assistance","Concierge Desk",
  "Concierge Service","Concierge Services","Consultation Lounge","Cooperative Concierge",
  "Corporate Event Facilities","Corporate-Friendly Environment","Cottage Accommodation",
  "Covered Parking","Cozy Common Areas","Cozy Heating","Cozy Lounge Area",
  "Cultural Experience Packages","Cultural Interaction","Cultural Proximity",
  "Cultural Workshops","Customer Support Desk","Customized Meal Requests","Cycling",
  "Daily Meditation Programs","Daily Room Service","Dance Floor","Darts",
  "Decoration on demand","Dedicated Concierge Service","Dedicated Event Staff",
  "Dedicated Event Support","Dedicated Front Desk","Dedicated Host Support",
  "Dedicated On-Site Parking","Dedicated Workspace","Dedicated Workstations",
  "Dining Area","Dining Room","Dining Table","Dinner","Direct Trail Access",
  "Dishes & silverware","DJ Music with dance","DJ Night","Doctor on Call",
  "Domestic Tour Packages","Eco-Friendly Ambience","Electric Kettle","Electric Kettles",
  "Elevator Access","Equipped Kitchen","Essentials","Event & Banquet Facilities",
  "Event & Celebration Hosting","Event and Banquet Space","Event Banquet Hall",
  "Event Hosting","Event Hosting Space","Event Planning Services","Express Booking Services",
  "Family Friendly","Family Play Area","Family Rooms","Family-Friendly Ambience",
  "Family-Friendly Amenities","Family-Friendly Environment","Family-Friendly Layout",
  "Family-Friendly Rooms","Family-Style Dining","Fan","Farm-to-Table Dining",
  "Fine Dining Restaurant","Fire Extinguishers","Fireworks Show","First Aid Kit",
  "Fish Spa","Fishing","Flat-screen TV","Flexible Seating","Flight Booking Assistance",
  "Floating Bed","Floating Chair","Food & Beverage Services","Forest Access","Forest View",
  "Free Basement Parking","Free High-Speed WiFi","Free Parking","Free Wi-Fi",
  "Fresh Locally-Sourced Meals","Freshly Baked Artisanal Bread","Fridge",
  "Front Desk Assistance","Fruit Orchards","Full-Service Spa","Fully Equipped Kitchen",
  "Game Room (Pool & Foosball)","Garden / Lawn","Garden & Landscaped Grounds",
  "Garden Access","Garden and Greenery","Garden Area","Garden Lounge","Garden Space",
  "Garden View","Garden/Outdoor Space","Gated Community","Geyser","Green Walking Paths",
  "Group Coordination Support","Group Event Spaces","Guide","Guided City Tours",
  "Guided Nature Strolls","Guided Trekking Tours","Guided Village Tours","Hair Dryer",
  "Hammock","Hangers","HDTV","Healthy Menu Options","Heated Accommodation","Heated Rooms",
  "Heated Swimming Pool","Heater","Heating","Heritage Architecture","High-Altitude Comforts",
  "High-speed Internet","High-Speed Internet Access","High-Speed Wi-Fi","High-Speed WiFi",
  "Highway Access","Hiking","Hill View Balconies","Himalayan View Rooms",
  "Home-cooked Local Cuisine","Home-cooked Meals","Home-style Dining","Homely Restaurant",
  "Homestay Experience","Host welcomes you","Hot and Cold Water","Hot water","Hot Water Geysers",
  "Hot Water Supply","Hotel Reservation Services","Housekeeping","Housekeeping Services",
  "In-house Cafe & Restaurant","In-House Dining","In-house Restaurant","In-Room Amenities",
  "In-room Coffee/Tea","In-room Dining","In-room Dining Service","In-Room Seating Area",
  "In-room Service","In-room Telephone","Indoor Activities","Indoor Games",
  "International Travel Coordination","Jacuzzi","Joker Show","Karaoke","Kayaking",
  "Kid-Friendly Environment","Kid's Playroom","Kitchen","Kitchenette","Lake Access",
  "Lake View","Lakeside View","Lakeside Views","Landscaped Gardens","Landscaped Grounds",
  "Landscaped Parks","Laundry Service","Laundry Services","Library","Live Cultural Performances",
  "Live Music","Lobby & Reception Area","Local Area Access","Local Area Shuttle",
  "Local Guide Assistance","Local Sightseeing Assistance","Local Sightseeing Guidance",
  "Local Transit Access","Local Travel Assistance","Lounge Area","Luggage Assistance",
  "Luggage Storage","Lunch","Lush Garden Area","Lush Garden Lawns","Lush Gardens",
  "Luxury Guest Rooms","Magic Show","Meditation Halls","Microwave","Midnight Trek",
  "Mini Bar","Mini Golf","Modern In-room Amenities","Morning Trek","Mountain View",
  "Mountain View Location","Mountain View Rooms","Mountain View Terraces","Mountain Views",
  "Movie Night","Multi Cuisine Restaurants","Multi-cuisine Restaurant","Music System",
  "Natural Ventilation","Nature Trails","Nature View Rooms","Nature Walk",
  "Nature Walking Trails","Nature-Inspired Architecture","Nearby Parking","No Pets",
  "On-site Assistance","On-Site Caretaker Service","On-site Dining","On-site Gym",
  "On-site Host Assistance","On-site Parking","On-site Restaurant","Open Rooftop Terrace",
  "Open Shower","Open-air Dining","Open-Air Jacuzzi","Organic In-house Restaurant",
  "Outdoor Activities","Outdoor BBQ Area","Outdoor Bonfire Area","Outdoor Bonfire Pit",
  "Outdoor Dining Area","Outdoor Lounge Area","Outdoor Music System",
  "Outdoor Picnic Grounds","Outdoor Recreation Area","Outdoor Recreation Space",
  "Outdoor Seating","Outdoor Seating Area","Outdoor Seating Areas","Outdoor Seating Space",
  "Outdoor Spaces","Outdoor Swimming Pool","Outdoor Swings","Oven",
  "Panoramic Mountain Views","Parking Facilities","Parking Facility","Party Lights",
  "Party Speaker","Patio","Peaceful Work Environment","Personalized Concierge",
  "Personalized Concierge Service","Personalized Itinerary Planning","Pet-Friendly",
  "Pet-friendly Environment","Pet-Friendly Stays","Pet-friendly Vibe","Pets Allowed",
  "Photography-Friendly Grounds","Picnic Area","Pilgrimage Concierge","Pillows & Linen",
  "Pocket WiFi","Pool Table","Poolside Dining","Pottery","Power Backup",
  "Prime Central Location","Prime City Center Location","Prime Location",
  "Prime Location Access","Prime Main Road Location","Private Balconies",
  "Private Balconies with Scenic Views","Private Balcony","Private Bathrooms",
  "Private Cottage Accommodations","Private Jacuzzi Suites","Private Lawn","Private Parking",
  "Private Patio","Private Plunge Pools","Private Pool","Private Villa","Private Washroom",
  "Professional Concierge Services","Professional Networking Hub","Professional Staff",
  "Professional Staff Assistance","Prompt Room Service","Proximity to Local Shops",
  "Proximity to Transit","PS4/XBOX","Public Transport Proximity","Quiet Ambience",
  "Quiet Atmosphere","Quiet Environment","Quiet Neighborhood","Quiet Neighborhood Setting",
  "Rain Dance","Recreational Vehicle Supplies","Restaurant","Rifle Shooting",
  "Riverfront Access","Riverside Access","Riverside Location","Riverside View",
  "Riverside Views","Roadside Parking","Rooftop Cafe","Rooftop Terrace","Rope Climbing",
  "Rustic Modern Decor","Safari Assistance","Safari Booking Assistance","Safety Life Jacket",
  "Satwik Dining","Scenic Hiking Access","Scenic Mountain Backdrop","Scenic Mountain Views",
  "Scenic Nature Trails","Scenic Views","Scenic Walking Paths","Secure Parking",
  "Secure Premises","Secure Underground Parking","Security Cameras","Security Personnel",
  "Security Services","Security Surveillance","Self check-in","Serene Environment",
  "Sightseeing Assistance","Signature Spa & Wellness Center","Snacks","Snooker",
  "Spa and Wellness Area","Spa Services","Spacious & Modern Rooms","Spacious Accommodations",
  "Spacious Family Cottages","Spacious Garden & Lawns","Spacious Guest Rooms",
  "Spacious Heritage Suites","Spacious Lobby Lounge","Spacious Private Villas",
  "Spacious Rooms","Spiritual Library","Spiritual Retreat Atmosphere","Star Gazing",
  "Stargazing Deck","Stargazing Experience","Stone Hot Tub","Street Food Proximity",
  "Sunset Trek","Table Tennis","Taxi Booking Service","Tea/Coffee Maker","Television",
  "Television with Streaming","Tent House Setup","Tent Stays","Terrace Gardens","Toaster",
  "Tourist Assistance","Traditional Decor","Traditional Mud Architecture","Traditional Stilt Houses",
  "Transit Lounge","Transit-Friendly Location","Transit-Friendly Stays","Travel Assistance",
  "Travel Documentation Support","Trekking","Trekking Assistance","Trekking Guidance",
  "Trekking to Sunset or Sunrise view point","Tubbing","Tug of War","Valet Parking",
  "Viewing Gallery","VIP Pass","Visa Consultation","Visitor Management System",
  "Wake-up Service","Wedding & Banquet Services","Welcome Drink","Well-Maintained Washrooms",
  "Wi-Fi","Wide Internal Roads","Wooden Cottages","Work Desks","Yoga Spaces"
];

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Update editor innerHTML only when value changes externally,
  // avoiding cursor jump issues by checking if they match first.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, [value]);

  const handleCommand = (command: string, arg: string = '') => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const url = prompt('Enter link URL:', 'https://');
      if (url) {
        handleCommand('createLink', url);
      }
    } else {
      alert('Please select some text first to link it.');
    }
  };

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden flex flex-col bg-white shadow-xs font-sans">
      {/* Toolbar */}
      <div className="bg-[#FAF8FF] border-b border-zinc-200 px-3 py-2.5 flex flex-wrap items-center gap-1.5 select-none">
        {/* Paragraph select */}
        <select
          onChange={(e) => handleCommand('formatBlock', e.target.value)}
          className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-hidden transition cursor-pointer text-zinc-650 h-7 pr-6 relative"
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 1</option>
          <option value="h3">Heading 2</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code Block</option>
        </select>

        <div className="h-4 w-px bg-zinc-200 mx-1" />

        {/* Action Buttons */}
        <button
          type="button"
          onClick={() => handleCommand('bold')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('italic')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('underline')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-200 mx-1" />

        <button
          type="button"
          onClick={handleLink}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Insert Link"
        >
          <Link className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => handleCommand('formatBlock', 'pre')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-200 mx-1" />

        <button
          type="button"
          onClick={() => handleCommand('insertUnorderedList')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('insertOrderedList')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('formatBlock', 'blockquote')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Blockquote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-zinc-200 mx-1" />

        <button
          type="button"
          onClick={() => handleCommand('undo')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleCommand('redo')}
          className="w-7 h-7 rounded-lg hover:bg-zinc-150 flex items-center justify-center text-zinc-600 hover:text-zinc-950 transition cursor-pointer active:scale-95"
          title="Redo"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Content Frame */}
      <div
        ref={editorRef}
        contentEditable
        onBlur={() => {
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        onInput={() => {
          if (editorRef.current) onChange(editorRef.current.innerHTML);
        }}
        className="w-full min-h-[220px] max-h-[380px] p-4 text-xs text-zinc-800 outline-hidden overflow-y-auto text-left leading-relaxed [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_pre]:bg-zinc-100 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:font-mono [&_a]:text-blue-600 [&_a]:underline"
      />
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
export const DomainView: React.FC = () => {
  const {
    hotelInfo, updateHotelInfo, selectedView,
    coHosts, addCoHost, updateCoHost, deleteCoHost
  } = useHotel();

  // Basic Info
  const [name, setName] = useState(hotelInfo.name);
  const [websiteHeadline, setWebsiteHeadline] = useState(hotelInfo.websiteHeadline || '');
  const [subdomain, setSubdomain] = useState(hotelInfo.subdomain);
  const [customDomain, setCustomDomain] = useState(hotelInfo.customDomain);
  const [starRating, setStarRating] = useState(hotelInfo.starRating);
  const [checkInTime, setCheckInTime] = useState(hotelInfo.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(hotelInfo.checkOutTime);
  const [logoUrl, setLogoUrl] = useState(hotelInfo.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(hotelInfo.faviconUrl || '');
  const [primaryColor, setPrimaryColor] = useState(hotelInfo.primaryColor);
  const [showEvents, setShowEvents] = useState(hotelInfo.showEvents ?? true);

  // Description
  const [description, setDescription] = useState(hotelInfo.description);
  const [shortDescription, setShortDescription] = useState(hotelInfo.shortDescription || '');
  const [detailedDescription, setDetailedDescription] = useState(hotelInfo.detailedDescription || '');

  // Amenities
  const [generalAmenities, setGeneralAmenities] = useState<string[]>(hotelInfo.generalAmenities);
  const [amenitySearch, setAmenitySearch] = useState('');
  const [customAmenityInput, setCustomAmenityInput] = useState('');

  // Location
  const [address, setAddress] = useState(hotelInfo.address);
  const [latitude, setLatitude] = useState(hotelInfo.latitude);
  const [longitude, setLongitude] = useState(hotelInfo.longitude);

  // Contact
  const [phone, setPhone] = useState(hotelInfo.phone);
  const [email, setEmail] = useState(hotelInfo.email);
  const [instagramHandle, setInstagramHandle] = useState(hotelInfo.instagramHandle || '');

  // Hero
  const [tagline, setTagline] = useState(hotelInfo.tagline || '');
  const [heroStyle, setHeroStyle] = useState<'single' | 'carousel' | 'collage' | 'video'>(hotelInfo.heroStyle || 'single');
  const [heroImages, setHeroImages] = useState<string[]>(hotelInfo.heroImages || []);
  const [heroVideo, setHeroVideo] = useState(hotelInfo.heroVideo || '');

  // Co-hosts
  const [showAddHost, setShowAddHost] = useState(false);
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [hostForm, setHostForm] = useState({ name: '', phone: '', role: 'manager' as CoHost['role'], canReceiveCalls: false, canAcceptBookings: false });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync from context
  useEffect(() => {
    setName(hotelInfo.name);
    setWebsiteHeadline(hotelInfo.websiteHeadline || '');
    setDescription(hotelInfo.description);
    setLogoUrl(hotelInfo.logoUrl);
    setFaviconUrl(hotelInfo.faviconUrl || '');
    setPhone(hotelInfo.phone);
    setEmail(hotelInfo.email);
    setAddress(hotelInfo.address);
    setLatitude(hotelInfo.latitude);
    setLongitude(hotelInfo.longitude);
    setGeneralAmenities(hotelInfo.generalAmenities);
    setTagline(hotelInfo.tagline || '');
    setHeroStyle(hotelInfo.heroStyle || 'single');
    setHeroImages(hotelInfo.heroImages || []);
    setHeroVideo(hotelInfo.heroVideo || '');
    setInstagramHandle(hotelInfo.instagramHandle || '');
    setPrimaryColor(hotelInfo.primaryColor);
    setShortDescription(hotelInfo.shortDescription || '');
    setDetailedDescription(hotelInfo.detailedDescription || '');
  }, [hotelInfo]);

  const save = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHotelInfo({
      name, websiteHeadline, subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      customDomain, starRating, checkInTime, checkOutTime,
      phone, email, address, latitude, longitude,
      description, shortDescription, detailedDescription, logoUrl, faviconUrl, generalAmenities, tagline,
      heroStyle, heroImages, heroVideo, instagramHandle, primaryColor, showEvents
    });
    save();
  };

  // ─── Amenities helpers ───────────────────────────────────────────────────
  const toggleAmenity = (amenity: string) => {
    setGeneralAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const addCustomAmenity = () => {
    const val = customAmenityInput.trim();
    if (!val || generalAmenities.includes(val)) return;
    setGeneralAmenities(prev => [...prev, val]);
    setCustomAmenityInput('');
  };

  const filteredAmenities = MASTER_AMENITIES.filter(a =>
    a.toLowerCase().includes(amenitySearch.toLowerCase())
  );

  // ─── Hero image slot count per style ────────────────────────────────────
  const heroSlotCount = { single: 1, carousel: 5, collage: 4, video: 1 };
  const slotCount = heroSlotCount[heroStyle];

  // ─── Co-host helpers ─────────────────────────────────────────────────────
  const resetHostForm = () => {
    setHostForm({ name: '', phone: '', role: 'manager', canReceiveCalls: false, canAcceptBookings: false });
    setEditingHostId(null);
    setShowAddHost(false);
  };

  const handleHostSave = () => {
    if (!hostForm.name) return;
    if (editingHostId) {
      updateCoHost(editingHostId, hostForm);
    } else {
      addCoHost(hostForm);
    }
    resetHostForm();
  };

  const startEditHost = (host: CoHost) => {
    setHostForm({ name: host.name, phone: host.phone, role: host.role, canReceiveCalls: host.canReceiveCalls, canAcceptBookings: host.canAcceptBookings });
    setEditingHostId(host.id);
    setShowAddHost(true);
  };

  const roleLabel: Record<CoHost['role'], string> = {
    super_admin: 'Super Admin',
    manager: 'Manager',
    caretaker: 'Caretaker',
  };

  const roleColor: Record<CoHost['role'], string> = {
    super_admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-amber-100 text-amber-700',
    caretaker: 'bg-green-100 text-green-700',
  };

  // ─── Sub-form renderers ───────────────────────────────────────────────────

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Basic Info</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Property name, headline, branding, check-in times and domain.</p>
      </div>

      {/* Package Name + Website Headline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Package Name</label>
          <p className="text-5xs text-zinc-400">Internal property name. Keep it clear and searchable.</p>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Website Headline</label>
          <p className="text-5xs text-zinc-400">Customer-facing property title used across the Bolt site.</p>
          <input type="text" value={websiteHeadline} onChange={e => setWebsiteHeadline(e.target.value)}
            placeholder="e.g. The Grandlake Resorts : Kutty Kerala in Poolampatti"
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-2 text-left">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Accent Color</label>
        <p className="text-5xs text-zinc-400">Used for buttons, highlights, and brand identity in the hotel theme.</p>
        <div className="flex gap-3 items-center">
          <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
            className="w-10 h-10 border border-zinc-200 rounded-lg cursor-pointer shrink-0" />
          <div className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            <div className="w-5 h-5 rounded-md border border-zinc-200" style={{ background: primaryColor }} />
            <span className="text-xs font-mono text-zinc-700">{primaryColor.toUpperCase()}</span>
          </div>
          <button type="button" onClick={() => setPrimaryColor('#0284c7')}
            className="text-3xs font-bold text-zinc-400 hover:text-zinc-600 px-2 py-1 border border-zinc-200 rounded-md">Reset</button>
        </div>
      </div>

      {/* Logo + Favicon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Logo</label>
          <p className="text-5xs text-zinc-400">Upload the main logo mark used in the top navigation and hero areas.</p>
          <div className="border border-dashed border-zinc-300 rounded-xl p-4 bg-zinc-50 flex flex-col items-center gap-3">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
              : <div className="w-full h-12 flex items-center justify-center text-zinc-300 text-xs font-bold">No logo uploaded</div>
            }
            <MediaUpload label="" value={logoUrl} onChange={setLogoUrl} />
          </div>
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Favicon</label>
          <p className="text-5xs text-zinc-400">Upload a compact icon for browser tabs. A square PNG of 32×32 works best.</p>
          <div className="border border-dashed border-zinc-300 rounded-xl p-4 bg-zinc-50 flex flex-col items-center gap-3">
            {faviconUrl
              ? <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
              : <div className="w-8 h-8 bg-zinc-200 rounded-md flex items-center justify-center text-zinc-400 text-4xs">FAV</div>
            }
            <MediaUpload label="" value={faviconUrl} onChange={setFaviconUrl} />
          </div>
        </div>
      </div>

      {/* Star + domain */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Star Rating</label>
          <select value={starRating} onChange={e => setStarRating(Number(e.target.value))}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-zinc-900 outline-hidden transition">
            {[1,2,3,4,5].map(s => <option key={s} value={s}>{s} Star</option>)}
          </select>
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Custom Domain</label>
          <input type="text" placeholder="www.yourhotel.com" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
      </div>

      {/* Subdomain */}
      <div className="space-y-1.5 text-left">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Platform Subdomain</label>
        <div className="flex">
          <input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-l-lg px-3 py-2 text-xs text-zinc-900 outline-hidden transition" />
          <span className="bg-zinc-100 border border-l-0 border-zinc-200 rounded-r-lg px-3 py-2 text-4xs text-zinc-500 font-bold flex items-center">.boltlabs.com</span>
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Check-In Time</label>
          <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Check-Out Time</label>
          <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
      </div>

      {/* Events toggle */}
      <div className="space-y-1.5 text-left">
        <label className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs text-zinc-800 cursor-pointer select-none">
          <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)}
            className="rounded-sm border-zinc-300 text-blue-600 w-4 h-4" />
          <span>Show Events & Highlights section on site</span>
        </label>
      </div>
    </div>
  );

  const renderDescription = () => (
    <div className="space-y-5">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Property Introduction Descriptions</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Short description displays on homepage; detailed narrative shows in "Read More" popup.</p>
      </div>
      <div className="space-y-1.5 text-left">
        <label className="text-[11px] font-bold text-zinc-700">Short Description</label>
        <p className="text-4xs text-zinc-400 font-medium">Shown as the first section of the property page, before the "Read more" button.</p>
        <textarea value={shortDescription} onChange={e => setShortDescription(e.target.value)} rows={3}
          placeholder="e.g. Escape to a world where tranquillity meets luxury..."
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-550 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 outline-hidden transition font-sans leading-relaxed" />
      </div>
      <div className="space-y-1.5 text-left">
        <label className="text-[11px] font-bold text-zinc-700">Long Description (About the Property)</label>
        <p className="text-4xs text-zinc-400 font-medium">Provide a detailed overview of your property, history, surroundings, and what makes it unique.</p>
        <RichTextEditor value={detailedDescription} onChange={setDetailedDescription} />
      </div>
      <div className="space-y-1.5 text-left">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">General Fallback Text</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="General description fallback..."
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition resize-none font-sans leading-relaxed" />
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="space-y-5">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>General Amenities</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
          {generalAmenities.length} selected · Search or scroll to add more
        </p>
      </div>

      {/* Selected chips */}
      {generalAmenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          {generalAmenities.map(a => (
            <span key={a} className="flex items-center gap-1 bg-blue-100 border border-blue-300 text-blue-800 text-3xs font-bold px-2.5 py-1 rounded-full">
              {a}
              <button type="button" onClick={() => toggleAmenity(a)} className="hover:text-red-600 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
        <input type="text" value={amenitySearch} onChange={e => setAmenitySearch(e.target.value)}
          placeholder="Search amenities..."
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-900 outline-hidden transition" />
      </div>

      {/* Amenity grid */}
      <div className="max-h-72 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-200">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {filteredAmenities.map(amenity => {
            const isSelected = generalAmenities.includes(amenity);
            return (
              <button type="button" key={amenity} onClick={() => toggleAmenity(amenity)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-left flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 text-blue-800'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
                <span className="truncate">{amenity}</span>
              </button>
            );
          })}
        </div>
        {filteredAmenities.length === 0 && (
          <div className="text-center py-6 text-zinc-400 text-xs">No amenities match your search.</div>
        )}
      </div>

      {/* Add custom */}
      <div className="border-t border-zinc-150 pt-4">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">Add Your Own Amenity</label>
        <div className="flex gap-2">
          <input type="text" value={customAmenityInput} onChange={e => setCustomAmenityInput(e.target.value)}
            placeholder="e.g. Organic Mud Bath, Cricket Ground..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); }}}
            className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
          <button type="button" onClick={addCustomAmenity}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">
            Add
          </button>
        </div>
      </div>
    </div>
  );

  const renderLocationMap = () => (
    <div className="space-y-5">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Map Location & Address</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Address and geo-coordinates used in the map section of your website.</p>
      </div>

      <div className="space-y-1.5 text-left">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Property Address</label>
        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition resize-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Latitude</label>
          <input type="number" step="any" value={latitude} onChange={e => setLatitude(Number(e.target.value))}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Longitude</label>
          <input type="number" step="any" value={longitude} onChange={e => setLongitude(Number(e.target.value))}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
      </div>

      {/* Live map preview */}
      {latitude !== 0 && longitude !== 0 && (
        <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
          <iframe
            title="property-map-preview"
            width="100%"
            height="260"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&q=${latitude},${longitude}&zoom=15`}
          />
        </div>
      )}
    </div>
  );

  const renderContact = () => (
    <div className="space-y-5">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Phone className="w-4 h-4 text-blue-600" />
          <span>Contact Channels</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Primary contact details and social handles displayed on your site.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-950 outline-hidden transition" />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-950 outline-hidden transition" />
        </div>
      </div>

      {/* Instagram */}
      <div className="space-y-1.5 text-left">
        <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <InstagramIcon className="w-3.5 h-3.5" />
          <span>Instagram Handle</span>
        </label>
        <p className="text-5xs text-zinc-400">Enter your Instagram username (without @). We'll display a follow link and fetch your latest posts for the Instagram section.</p>
        <div className="flex items-center gap-0">
          <span className="bg-zinc-100 border border-r-0 border-zinc-200 rounded-l-lg px-3 py-2 text-xs text-zinc-500 font-bold">@</span>
          <input type="text" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value.replace('@', ''))}
            placeholder="yourhotel"
            className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-r-lg px-3.5 py-2 text-xs text-zinc-950 outline-hidden transition" />
        </div>
        {instagramHandle && (
          <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer"
            className="text-3xs text-blue-600 hover:underline font-semibold">
            → instagram.com/{instagramHandle}
          </a>
        )}
      </div>
    </div>
  );

  const renderOwners = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
        <div>
          <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Co-Hosts & Permissions</span>
          </h3>
          <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Manage who has access to this property.</p>
        </div>
        <button type="button" onClick={() => { setShowAddHost(true); setEditingHostId(null); setHostForm({ name: '', phone: '', role: 'manager', canReceiveCalls: false, canAcceptBookings: false }); }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">
          <Plus className="w-3.5 h-3.5" />
          Add Co-Host
        </button>
      </div>

      {/* Add/Edit form */}
      {showAddHost && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <h4 className="text-xs font-bold text-zinc-800">{editingHostId ? 'Edit Co-Host' : 'Add New Co-Host'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
              <input type="text" value={hostForm.name} onChange={e => setHostForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Priya Sharma"
                className="w-full bg-white border border-zinc-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-hidden" />
            </div>
            <div className="space-y-1">
              <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Phone</label>
              <input type="text" value={hostForm.phone} onChange={e => setHostForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 9xxxxxxxxx"
                className="w-full bg-white border border-zinc-200 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-hidden" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Role</label>
            <select value={hostForm.role} onChange={e => setHostForm(f => ({ ...f, role: e.target.value as CoHost['role'] }))}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-hidden">
              <option value="super_admin">Super Admin</option>
              <option value="manager">Manager</option>
              <option value="caretaker">Caretaker</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={hostForm.canReceiveCalls} onChange={e => setHostForm(f => ({ ...f, canReceiveCalls: e.target.checked }))}
                className="w-4 h-4 rounded-sm accent-blue-600" />
              Receive calls from customers
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={hostForm.canAcceptBookings} onChange={e => setHostForm(f => ({ ...f, canAcceptBookings: e.target.checked }))}
                className="w-4 h-4 rounded-sm accent-blue-600" />
              Accept/Reject a booking
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleHostSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition">
              {editingHostId ? 'Update' : 'Add Co-Host'}
            </button>
            <button type="button" onClick={resetHostForm}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Co-host list */}
      <div className="space-y-3">
        {coHosts.map(host => (
          <div key={host.id} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {host.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900">{host.name}</span>
                  <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${roleColor[host.role]}`}>{roleLabel[host.role]}</span>
                </div>
                <p className="text-xs text-zinc-500">{host.phone}</p>
                <div className="flex gap-3 mt-1">
                  {host.role === 'super_admin' && (
                    <span className="flex items-center gap-1 text-3xs text-blue-700 font-semibold">
                      <Check className="w-3 h-3" /> Super Admin
                    </span>
                  )}
                  {host.canReceiveCalls && (
                    <span className="flex items-center gap-1 text-3xs text-green-700 font-semibold">
                      <Check className="w-3 h-3" /> Receive calls from customer
                    </span>
                  )}
                  {host.canAcceptBookings && (
                    <span className="flex items-center gap-1 text-3xs text-green-700 font-semibold">
                      <Check className="w-3 h-3" /> Accept/Reject a booking
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => startEditHost(host)}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => deleteCoHost(host.id)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {coHosts.length === 0 && (
          <div className="text-center py-10 text-zinc-400 text-xs">No co-hosts added yet.</div>
        )}
      </div>
    </div>
  );

  const renderHero = () => (
    <div className="space-y-5">
      <div className="border-b border-zinc-150 pb-2">
        <h3 className="font-bold text-zinc-950 flex items-center gap-2 text-sm uppercase tracking-wide">
          <Image className="w-4 h-4 text-blue-600" />
          <span>Hero Banner Settings</span>
        </h3>
        <p className="text-4xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Layout style, tagline, photos, and video. Image slots adjust per layout.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Hero Style Layout</label>
          <select value={heroStyle} onChange={e => setHeroStyle(e.target.value as any)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-zinc-900 outline-hidden transition">
            <option value="single">Single Photo Banner (1 image)</option>
            <option value="carousel">Edge-to-Edge Carousel (up to 5 images)</option>
            <option value="collage">Collage of Photos (4 images)</option>
            <option value="video">Background Video Playback</option>
          </select>
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-4xs font-bold text-zinc-500 uppercase tracking-widest">Property Tagline</label>
          <input type="text" placeholder="e.g. Escape to Kutty Kerala in Poolampatti" value={tagline} onChange={e => setTagline(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-zinc-900 outline-hidden transition" />
        </div>
      </div>

      {/* Slot-aware image upload */}
      {heroStyle !== 'video' && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider text-left">
            Hero Images ({slotCount} {slotCount === 1 ? 'slot' : 'slots'} for {heroStyle})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: slotCount }).map((_, idx) => (
              <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <span className="text-4xs font-bold text-zinc-500 uppercase tracking-widest block">
                  {heroStyle === 'single' ? 'Hero Image' : `Image ${idx + 1}`}
                </span>
                <MediaUpload value={heroImages[idx] || ''} onChange={val => {
                  const newImages = [...heroImages];
                  newImages[idx] = val;
                  setHeroImages(newImages);
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video */}
      {heroStyle === 'video' && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 text-left">
          <span className="text-4xs font-bold text-zinc-500 uppercase tracking-widest block">Looping Background Video</span>
          <MediaUpload accept="video/*" value={heroVideo} onChange={setHeroVideo} />
          <p className="text-5xs text-zinc-400">This video autoplays as the hero background. Recommended: MP4, max 30s loop.</p>
        </div>
      )}
    </div>
  );

  // Dispatch selector
  const renderSelectedForm = () => {
    switch (selectedView) {
      case 'property': return renderBasicInfo();
      case 'hero': return renderHero();
      case 'description': return renderDescription();
      case 'amenities': return renderAmenities();
      case 'location-map': return renderLocationMap();
      case 'contact': return renderContact();
      case 'owners': return renderOwners();
      default: return renderBasicInfo();
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSelectedForm()}

        {saveSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-3xs font-bold uppercase tracking-wider rounded-lg text-center animate-in fade-in duration-200">
            Changes saved successfully!
          </div>
        )}

        {/* Owners view doesn't need a form submit */}
        {selectedView !== 'owners' && (
          <div className="pt-5 border-t border-zinc-150 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Autosave Draft Enabled</span>
            </span>
            <button type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition">
              Save Changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
