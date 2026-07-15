import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { CoHost, GstSlab } from '../../context/HotelContext';
import {
  UserCheck, ShieldCheck, Trash2, Plus, Search, X, Pencil, Check,
  Bold, Italic, Underline, Link, Code, List, ListOrdered, Quote, Undo, Redo
} from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';
import { uploadMediaFile } from '../../services/StorageService';

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

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
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
    coHosts, addCoHost, updateCoHost, deleteCoHost,
    addManagedPhoto, gstSettings, updateGstSettings
  } = useHotel();

  // GST Settings States
  const [roomSlabs, setRoomSlabs] = useState<GstSlab[]>(() => gstSettings?.room_slabs || []);
  const [addonsGstRate, setAddonsGstRate] = useState<number>(() => gstSettings?.addons_rate ?? 18);
  const [eventsGstRate, setEventsGstRate] = useState<number>(() => gstSettings?.events_rate ?? 18);
  const [mealPlansGstRate, setMealPlansGstRate] = useState<number>(() => gstSettings?.meal_plans_rate ?? 18);

  // Sync with context loaded state
  useEffect(() => {
    if (gstSettings) {
      setRoomSlabs(gstSettings.room_slabs);
      setAddonsGstRate(gstSettings.addons_rate);
      setEventsGstRate(gstSettings.events_rate);
      setMealPlansGstRate(gstSettings.meal_plans_rate);
    }
  }, [gstSettings]);

  // GST Slab helpers
  const handleAddSlab = () => {
    setRoomSlabs(prev => [...prev, { min: 0, max: 0, rate: 0 }]);
  };

  const handleRemoveSlab = (index: number) => {
    setRoomSlabs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSlabChange = (index: number, field: keyof GstSlab, value: number) => {
    setRoomSlabs(prev => prev.map((slab, i) => i === index ? { ...slab, [field]: value } : slab));
  };

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
  const [aboutTitle, setAboutTitle] = useState(hotelInfo.aboutTitle || '');
  const [shortDescription, setShortDescription] = useState(hotelInfo.shortDescription || '');
  const [detailedDescription, setDetailedDescription] = useState(hotelInfo.detailedDescription || '');

  // Amenities
  const [amenitiesTitle, setAmenitiesTitle] = useState(hotelInfo.amenitiesTitle || '');
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
  const [isSyncingInstagram, setIsSyncingInstagram] = useState(false);
  const [instagramSyncError, setInstagramSyncError] = useState<string | null>(null);

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
    setAboutTitle(hotelInfo.aboutTitle || '');
    setAmenitiesTitle(hotelInfo.amenitiesTitle || '');
    setShortDescription(hotelInfo.shortDescription || '');
    setDetailedDescription(hotelInfo.detailedDescription || '');
  }, [hotelInfo]);

  const save = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstagramSyncError(null);

    let finalInstagramImages = hotelInfo.instagramImages || [];
    const handleChanged = instagramHandle.trim() !== (hotelInfo.instagramHandle || '').trim();

    if (selectedView === 'contact' && handleChanged) {
      const handle = instagramHandle.trim();
      if (!handle) {
        finalInstagramImages = [];
      } else {
        setIsSyncingInstagram(true);
        try {
          const apifyToken = import.meta.env.VITE_APIFY_TOKEN || '';
          const apifyResponse = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: [handle],
                resultsLimit: 5,
              }),
            }
          );

          if (!apifyResponse.ok) {
            throw new Error(`Apify scraping run failed (HTTP ${apifyResponse.status})`);
          }

          const datasetItems = await apifyResponse.json();
          if (!Array.isArray(datasetItems) || datasetItems.length === 0) {
            throw new Error('No posts found for this Instagram handle. Please make sure the account is public.');
          }

          const uploadedUrls: string[] = [];

          // Process the top 5 items (using static displayUrl/cover image for videos/reels)
          for (let i = 0; i < Math.min(datasetItems.length, 5); i++) {
            const item = datasetItems[i];
            const mediaUrl = item.displayUrl || item.mediaUrl || (item.resources && item.resources[0] && item.resources[0].src);
            if (!mediaUrl) continue;

            // Fetch image via images.weserv.nl proxy (bypasses CORP/CORS and resizes/compresses to WebP on the edge)
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(mediaUrl)}&output=webp&w=800&q=75`;
            const imageRes = await fetch(proxyUrl);
            if (!imageRes.ok) continue;

            const webpBlob = await imageRes.blob();

            // Upload to Supabase Storage
            const publicUrl = await uploadMediaFile(webpBlob, `instagram_${i}.webp`);
            uploadedUrls.push(publicUrl);

            // Add to properties/media gallery database under Media->Photos
            addManagedPhoto({
              url: publicUrl,
              tags: ['instagram', 'imported'],
              isHero: false
            });
          }

          if (uploadedUrls.length === 0) {
            throw new Error('Failed to retrieve or upload any images from the Instagram feed.');
          }

          finalInstagramImages = uploadedUrls;
        } catch (err: any) {
          console.error('[Instagram Sync Failed]', err);
          setInstagramSyncError(err.message || 'Failed to sync Instagram images.');
          setIsSyncingInstagram(false);
          return; // Stop saving to prevent partial saving of half-synced data
        } finally {
          setIsSyncingInstagram(false);
        }
      }
    }

    updateHotelInfo({
      name, websiteHeadline, subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      customDomain, starRating, checkInTime, checkOutTime,
      phone, email, address, latitude, longitude,
      description, aboutTitle, amenitiesTitle, shortDescription, detailedDescription, logoUrl, faviconUrl, generalAmenities, tagline,
      heroStyle, heroImages, heroVideo, instagramHandle, primaryColor, showEvents,
      instagramImages: finalInstagramImages
    });
    if (selectedView === 'property') {
      updateGstSettings({
        room_slabs: roomSlabs,
        addons_rate: addonsGstRate,
        events_rate: eventsGstRate,
        meal_plans_rate: mealPlansGstRate
      });
    }
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



  // ─── Sub-form renderers ───────────────────────────────────────────────────

  const renderBasicInfo = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Basic Info
          </h2>
          <p className="text-sm text-[#78716C]">
            Property branding, titles, logo marks, check-in schedules, and default configuration.
          </p>
        </div>
      </div>

      {/* Property Name + Website Headline */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Property Name</label>
            <p className="text-[10px] text-zinc-400">Internal property name. Keep it clear and searchable.</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="ds-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Website Headline</label>
            <p className="text-[10px] text-zinc-400">Customer-facing property title used across the Bolt site.</p>
            <input type="text" value={websiteHeadline} onChange={e => setWebsiteHeadline(e.target.value)}
              placeholder="e.g. The Grandlake Resorts : Kutty Kerala in Poolampatti"
              className="ds-input w-full" />
          </div>
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm">Accent Brand Color</h4>
          <p className="text-xs text-zinc-450 leading-relaxed mt-0.5">Used for buttons, highlights, and custom theme layouts.</p>
        </div>
        <div className="flex gap-3 items-center pt-2">
          <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
            className="w-11 h-11 border border-[#E7E5E4] rounded-xl cursor-pointer shrink-0" />
          <div className="flex-1 flex items-center gap-2 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3.5 py-2.5">
            <div className="w-5 h-5 rounded-md border border-[#E7E5E4]" style={{ background: primaryColor }} />
            <span className="text-xs font-mono text-[#78716C] font-semibold">{primaryColor.toUpperCase()}</span>
          </div>
          <button type="button" onClick={() => setPrimaryColor('#0284c7')}
            className="px-3.5 py-2.5 rounded-xl border border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9] text-xs font-bold transition cursor-pointer">
            Reset
          </button>
        </div>
      </div>

      {/* Logo + Favicon */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-700">Logo</label>
            <p className="text-[10px] text-zinc-400">Upload the main logo mark used in navigation and headers.</p>
            <div className="border border-dashed border-[#E7E5E4] rounded-xl p-4 bg-[#FAFAF9] flex flex-col items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
              ) : (
                <div className="w-full h-12 flex items-center justify-center text-zinc-355 text-xs font-semibold">No logo uploaded</div>
              )}
              <MediaUpload label="" value={logoUrl} onChange={setLogoUrl} />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-700">Favicon</label>
            <p className="text-[10px] text-zinc-400">Upload a browser tab icon (square PNG, 32×32 recommended).</p>
            <div className="border border-dashed border-[#E7E5E4] rounded-xl p-4 bg-[#FAFAF9] flex flex-col items-center gap-3">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-zinc-200 rounded-md flex items-center justify-center text-zinc-450 text-4xs font-bold">FAV</div>
              )}
              <MediaUpload label="" value={faviconUrl} onChange={setFaviconUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Check-in / Check-out + Star Rating */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Star Rating</label>
            <p className="text-[10px] text-zinc-400">Official property standard rating.</p>
            <select value={starRating} onChange={e => setStarRating(Number(e.target.value))}
              className="ds-input w-full">
              {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s} Star</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Check-In Time</label>
            <p className="text-[10px] text-zinc-400">Standard check-in hours.</p>
            <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)}
              className="ds-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Check-Out Time</label>
            <p className="text-[10px] text-zinc-400">Standard checkout deadline.</p>
            <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)}
              className="ds-input w-full" />
          </div>
        </div>
      </div>

      {/* GST Settings Slabs and Rates Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-650" />
            <span>GST Configuration Rates & Slabs</span>
          </h4>
          <p className="text-xs text-zinc-450 leading-relaxed mt-0.5">
            Configure room tariff GST slabs and standard tax rates for addons, events, and meal plans.
          </p>
        </div>

        {/* Note about missing table instructions */}
        <div className="bg-[#E6F5F7] border border-[#1B93A4]/20 rounded-xl p-3.5 text-xs text-zinc-700 space-y-1 leading-relaxed">
          <p className="font-bold text-[#1B93A4]">💡 Database Sync Details</p>
          <p>
            Tax configuration values are stored directly in your Supabase database in the <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">gst_settings</code> table.
            If you have not done so yet, please execute the SQL queries inside <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">create_gst_settings.sql</code> using the Supabase Dashboard SQL Editor to ensure full persistence.
          </p>
        </div>

        {/* Room tariff slabs */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">Room Tariff GST Slabs</span>
            <button
              type="button"
              onClick={handleAddSlab}
              className="text-[10px] bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-700 font-bold px-2.5 py-1 rounded-md transition cursor-pointer animate-in fade-in"
            >
              + Add Slab
            </button>
          </div>
          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50/50">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-650 font-bold text-[10px] uppercase tracking-wider">
                  <th className="p-3">Min Price (₹)</th>
                  <th className="p-3">Max Price (₹)</th>
                  <th className="p-3">GST Rate (%)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {roomSlabs.map((slab, index) => (
                  <tr key={index} className="bg-white hover:bg-zinc-50/30 transition">
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={slab.min}
                        onChange={e => handleSlabChange(index, 'min', Number(e.target.value))}
                        className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-hidden font-medium"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={slab.max}
                        onChange={e => handleSlabChange(index, 'max', Number(e.target.value))}
                        className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 outline-hidden font-medium"
                      />
                    </td>
                    <td className="p-2.5">
                      <div className="relative rounded-lg shadow-xs">
                        <input
                          type="number"
                          value={slab.rate}
                          onChange={e => handleSlabChange(index, 'rate', Number(e.target.value))}
                          className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-zinc-800 outline-hidden font-medium"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 font-bold text-xs">%</div>
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlab(index)}
                        disabled={roomSlabs.length <= 1}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-lg border border-transparent disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Item Rates */}
        <div className="pt-4 border-t border-zinc-150 space-y-4">
          <span className="text-xs font-bold text-zinc-700 block">Flat GST Rates for Other Services</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Add-ons GST (%)</label>
              <div className="relative rounded-xl">
                <input
                  type="number"
                  value={addonsGstRate}
                  onChange={e => setAddonsGstRate(Number(e.target.value))}
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-zinc-800 outline-hidden font-sans font-medium"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 font-bold text-xs">%</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Events GST (%)</label>
              <div className="relative rounded-xl">
                <input
                  type="number"
                  value={eventsGstRate}
                  onChange={e => setEventsGstRate(Number(e.target.value))}
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-zinc-800 outline-hidden font-sans font-medium"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 font-bold text-xs">%</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Meal Plans GST (%)</label>
              <div className="relative rounded-xl">
                <input
                  type="number"
                  value={mealPlansGstRate}
                  onChange={e => setMealPlansGstRate(Number(e.target.value))}
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-zinc-800 outline-hidden font-sans font-medium"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400 font-bold text-xs">%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events toggle */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <label className="flex items-center gap-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-3 text-xs text-[#78716C] font-bold cursor-pointer select-none">
          <input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)}
            className="rounded-sm accent-[#1B93A4] w-4.5 h-4.5 cursor-pointer" />
          <span>Show Events & Highlights section on site</span>
        </label>
      </div>
    </div>
  );

  const renderDescription = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Property Introduction
          </h2>
          <p className="text-sm text-[#78716C]">
            Short descriptions display on your homepage; detailed narrative shows in "Read More" popups.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700">About Section Title</label>
          <p className="text-[10px] text-zinc-400">The main heading of your introductory/philosophy section on the homepage.</p>
          <input type="text" value={aboutTitle} onChange={e => setAboutTitle(e.target.value)}
            placeholder="e.g. Earth, Water, and Calm"
            className="ds-input w-full" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700">Short Description</label>
          <p className="text-[10px] text-zinc-400">Shown as the first section of the property page, before the "Read more" button.</p>
          <textarea value={shortDescription} onChange={e => setShortDescription(e.target.value)} rows={3}
            placeholder="e.g. Escape to a world where tranquillity meets luxury..."
            className="ds-input w-full resize-none leading-relaxed" />
        </div>
      </div>

      {/* Rich Detailed Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm">Long Description (About the Property)</h4>
          <p className="text-xs text-zinc-400 mt-0.5">Provide a detailed overview of your property, history, surroundings, and what makes it unique.</p>
        </div>
        <RichTextEditor value={detailedDescription} onChange={setDetailedDescription} />
      </div>

      {/* Fallback Text Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-2 text-left">
        <label className="text-xs font-bold text-zinc-700">General Fallback Text</label>
        <p className="text-[10px] text-zinc-400">Used if the short description isn't available or for general search metadata.</p>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="General description fallback..."
          className="ds-input w-full resize-none leading-relaxed" />
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            General Amenities
          </h2>
          <p className="text-sm text-[#78716C]">
            Configure the main list of highlights and facilities that guests can expect at the property.
          </p>
        </div>
      </div>

      {/* Section Title card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700">Amenities Section Title</label>
          <p className="text-[10px] text-zinc-400">The main heading of your property amenities section on the homepage.</p>
          <input type="text" value={amenitiesTitle} onChange={e => setAmenitiesTitle(e.target.value)}
            placeholder="e.g. Property Amenities"
            className="ds-input w-full" />
        </div>
      </div>

      {/* Main Selector Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm flex items-center justify-between">
            <span>Select Amenities</span>
            <span className="text-[10px] bg-[#E6F5F7] text-[#1B93A4] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              {generalAmenities.length} Selected
            </span>
          </h4>
          <p className="text-xs text-zinc-400">Choose from suggested property highlights or search/add your own below.</p>
        </div>

        {/* Selected chips */}
        {generalAmenities.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
            {generalAmenities.map(a => (
              <span key={a} className="inline-flex items-center gap-1.5 bg-[#E6F5F7] border border-[#1B93A4]/30 text-[#1B93A4] text-xs font-bold px-3 py-1 rounded-full">
                {a}
                <button type="button" onClick={() => toggleAmenity(a)} className="text-[#1B93A4] hover:text-rose-500 transition cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
          <input type="text" value={amenitySearch} onChange={e => setAmenitySearch(e.target.value)}
            placeholder="Search amenities list..."
            className="ds-input w-full pl-11" />
        </div>

        {/* Amenity grid */}
        <div className="max-h-72 overflow-y-auto pr-1 border border-zinc-200 rounded-xl p-3.5 bg-zinc-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredAmenities.map(amenity => {
              const isSelected = generalAmenities.includes(amenity);
              return (
                <button type="button" key={amenity} onClick={() => toggleAmenity(amenity)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#E6F5F7] border-[#1B93A4] text-[#1B93A4] shadow-xs'
                      : 'bg-white border-[#E7E5E4] text-zinc-700 hover:border-zinc-350 hover:bg-zinc-50'
                  }`}>
                  <span className="truncate">{amenity}</span>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-[#1B93A4] shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-zinc-450 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {filteredAmenities.length === 0 && (
            <div className="text-center py-6 text-zinc-400 text-xs font-semibold">No amenities match your search.</div>
          )}
        </div>

        {/* Add custom */}
        <div className="border-t border-[#E7E5E4] pt-5">
          <label className="text-xs font-bold text-zinc-700 block mb-1">Add Your Own Amenity</label>
          <p className="text-[10px] text-zinc-400 mb-3">If a specific amenity is not listed in the suggestions, type it here to add it to the list.</p>
          <div className="flex gap-2">
            <input type="text" value={customAmenityInput} onChange={e => setCustomAmenityInput(e.target.value)}
              placeholder="e.g. Organic Mud Bath, Cricket Ground..."
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); }}}
              className="flex-1 ds-input" />
            <button type="button" onClick={addCustomAmenity}
              className="ds-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocationMap = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Map Location & Address
          </h2>
          <p className="text-sm text-[#78716C]">
            Address details and geographical coordinates used to render the location map on the website.
          </p>
        </div>
      </div>

      {/* Address Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700">Property Address</label>
          <p className="text-[10px] text-zinc-400">Ensure the address is complete and formatted correctly so customers can navigate easily.</p>
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
            placeholder="e.g. 123 Pine Valley Road, Ooty, Tamil Nadu, India"
            className="ds-input w-full resize-none leading-relaxed" />
        </div>
      </div>

      {/* Coordinates Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm">Geographic Coordinates</h4>
          <p className="text-xs text-zinc-400">Used to center the Google Map interactive widget on your homepage.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Latitude</label>
            <input type="number" step="any" value={latitude === 0 ? '' : latitude} onChange={e => setLatitude(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="e.g. 11.4102"
              className="ds-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Longitude</label>
            <input type="number" step="any" value={longitude === 0 ? '' : longitude} onChange={e => setLongitude(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder="e.g. 76.6950"
              className="ds-input w-full" />
          </div>
        </div>
      </div>

      {/* Live map preview */}
      {latitude !== 0 && longitude !== 0 && (
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
          <div>
            <h4 className="font-bold text-zinc-800 text-sm">Live Location Preview</h4>
            <p className="text-xs text-zinc-400">This map shows the exact location that visitors will see on your published website.</p>
          </div>
          <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm aspect-video sm:aspect-[21/9]">
            <iframe
              title="property-map-preview"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Contact Channels
          </h2>
          <p className="text-sm text-[#78716C]">
            Primary business phone number, email address, and social links displayed across your website.
          </p>
        </div>
      </div>

      {/* Contact Channels Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Phone Number</label>
            <p className="text-[10px] text-zinc-400">Primary customer support contact number.</p>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="ds-input w-full" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Email Address</label>
            <p className="text-[10px] text-zinc-400">Primary customer support email inbox.</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. contact@yourhotel.com"
              className="ds-input w-full" />
          </div>
        </div>
      </div>

      {/* Instagram Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0 border border-rose-100">
            <InstagramIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-800 text-sm">Instagram Integration</h4>
            <p className="text-xs text-zinc-400">Display your latest Instagram feed on your homepage.</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-zinc-700">Instagram Handle</label>
          <p className="text-[10px] text-zinc-400">Enter username without the @ symbol.</p>
          <div className="flex items-center">
            <span className="bg-[#FAFAF9] border border-r-0 border-[#E7E5E4] rounded-l-xl px-3.5 py-2.5 text-xs text-[#78716C] font-bold">@</span>
            <input type="text" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value.replace('@', ''))}
              placeholder="yourhotel"
              className="flex-1 ds-input rounded-l-none" />
          </div>
          {instagramHandle && (
            <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1B93A4] hover:underline font-bold mt-1.5 transition">
              <span>View Profile</span>
              <span>→ instagram.com/{instagramHandle}</span>
            </a>
          )}
        </div>

        {isSyncingInstagram && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2.5 font-sans animate-pulse">
            <span className="w-4 h-4 border-2 border-blue-800 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Scraping Instagram feed, downloading images, converting to WebP and uploading to Supabase. Please wait...</span>
          </div>
        )}
        {instagramSyncError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-sans">
            ⚠️ {instagramSyncError}
          </div>
        )}
      </div>
    </div>
  );

  const renderOwners = () => {
    const localRoleLabel: Record<CoHost['role'], string> = {
      super_admin: 'Super Admin',
      manager: 'Manager',
      caretaker: 'Caretaker',
    };

    const localRoleColor: Record<CoHost['role'], string> = {
      super_admin: 'bg-blue-50 border border-blue-200 text-blue-800 text-3xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
      manager: 'bg-amber-50 border border-amber-200 text-amber-800 text-3xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
      caretaker: 'bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4 text-left">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Co-Hosts & Permissions
            </h2>
            <p className="text-sm text-[#78716C]">
              Add other team members, managers, or caretakers to help run and coordinate this property.
            </p>
          </div>
          <button type="button" onClick={() => { setShowAddHost(true); setEditingHostId(null); setHostForm({ name: '', phone: '', role: 'manager', canReceiveCalls: false, canAcceptBookings: false }); }}
            className="ds-btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4 cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Co-Host
          </button>
        </div>

        {/* Add/Edit form */}
        {showAddHost && (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 animate-in slide-in-from-top-3 duration-200 text-left">
            <div className="border-b border-zinc-150 pb-2">
              <h4 className="text-sm font-bold text-zinc-800">{editingHostId ? 'Edit Team Member Details' : 'Add New Team Member'}</h4>
              <p className="text-[10px] text-zinc-400">Configure credentials, role hierarchy, and automated notify options.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700">Full Name</label>
                <input type="text" value={hostForm.name} onChange={e => setHostForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priya Sharma"
                  className="ds-input w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700">Phone</label>
                <input type="text" value={hostForm.phone} onChange={e => setHostForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9xxxxxxxxx"
                  className="ds-input w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">Role</label>
              <select value={hostForm.role} onChange={e => setHostForm(f => ({ ...f, role: e.target.value as CoHost['role'] }))}
                className="ds-input w-full">
                <option value="super_admin">Super Admin (Full access to editing and billing)</option>
                <option value="manager">Manager (Can modify rooms, policies, and calendar)</option>
                <option value="caretaker">Caretaker (View only bookings, receive notifications)</option>
              </select>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col gap-3 font-sans">
              <label className="flex items-center gap-3 text-xs text-zinc-700 font-bold cursor-pointer">
                <input type="checkbox" checked={hostForm.canReceiveCalls} onChange={e => setHostForm(f => ({ ...f, canReceiveCalls: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded-sm accent-[#1B93A4] cursor-pointer" />
                <span>Receive automatic customer calls & SMS notifications</span>
              </label>
              <label className="flex items-center gap-3 text-xs text-zinc-700 font-bold cursor-pointer">
                <input type="checkbox" checked={hostForm.canAcceptBookings} onChange={e => setHostForm(f => ({ ...f, canAcceptBookings: e.target.checked }))}
                  className="w-4.5 h-4.5 rounded-sm accent-[#1B93A4] cursor-pointer" />
                <span>Permission to accept, modify, or reject manual reservation drafts</span>
              </label>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button type="button" onClick={handleHostSave}
                className="ds-btn-primary text-xs py-2.5 px-5">
                {editingHostId ? 'Update Co-Host' : 'Create Access Token'}
              </button>
              <button type="button" onClick={resetHostForm}
                className="px-5 py-2.5 border border-[#E7E5E4] bg-[#FAFAF9] hover:bg-[#F5F5F4] text-[#78716C] text-xs font-bold rounded-xl transition cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Co-host list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coHosts.map(host => (
            <div key={host.id} className="flex flex-col justify-between p-5 bg-white border border-[#E7E5E4] rounded-2xl hover:border-zinc-300 transition text-left shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E6F5F7] text-[#1B93A4] flex items-center justify-center font-bold text-sm shrink-0 border border-[#1B93A4]/15">
                    {host.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">{host.name}</span>
                      <span className={localRoleColor[host.role]}>{localRoleLabel[host.role]}</span>
                    </div>
                    <p className="text-xs text-[#78716C] font-semibold leading-none">{host.phone}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-150 font-sans">
                  {host.role === 'super_admin' && (
                    <span className="flex items-center gap-2 text-3xs text-[#1B93A4] font-bold">
                      <Check className="w-3.5 h-3.5 text-[#1B93A4]" /> Super Admin access controls enabled
                    </span>
                  )}
                  {host.canReceiveCalls && (
                    <span className="flex items-center gap-2 text-3xs text-[#2D6A4F] font-bold">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> Receives automated calls & SMS
                    </span>
                  )}
                  {host.canAcceptBookings && (
                    <span className="flex items-center gap-2 text-3xs text-[#2D6A4F] font-bold">
                      <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> Can accept/reject manual reservations
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-100">
                <button type="button" onClick={() => startEditHost(host)}
                  className="p-2 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition cursor-pointer">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => deleteCoHost(host.id)}
                  className="p-2 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {coHosts.length === 0 && (
            <div className="col-span-full py-16 text-center bg-[#FAFAF9] border border-dashed border-[#E7E5E4] rounded-2xl">
              <UserCheck className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-500 text-xs font-semibold">No co-hosts added to this property yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHero = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Hero Banner Settings
          </h2>
          <p className="text-sm text-[#78716C]">
            Layout style, tagline, photos, and video loop parameters for your main landing page banner.
          </p>
        </div>
      </div>

      {/* Style & Tagline Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Hero Style Layout</label>
            <p className="text-[10px] text-zinc-400">Select how your landing page banner displays visual media.</p>
            <select value={heroStyle} onChange={e => setHeroStyle(e.target.value as any)}
              className="ds-input w-full">
              <option value="single">Single Photo Banner (1 image)</option>
              <option value="carousel">Edge-to-Edge Carousel (up to 5 images)</option>
              <option value="collage">Collage of Photos (4 images)</option>
              <option value="video">Background Video Playback</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">Property Tagline</label>
            <p className="text-[10px] text-zinc-400">A short, welcoming tagline displayed on top of the hero banner.</p>
            <input type="text" placeholder="e.g. Escape to Kutty Kerala in Poolampatti" value={tagline} onChange={e => setTagline(e.target.value)}
              className="ds-input w-full" />
          </div>
        </div>
      </div>

      {/* Slot-aware image upload */}
      {heroStyle !== 'video' && (
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
          <div>
            <h4 className="font-bold text-zinc-800 text-sm">
              Hero Images
            </h4>
            <p className="text-xs text-zinc-400">
              Upload up to {slotCount} {slotCount === 1 ? 'image' : 'images'} for the selected {heroStyle} layout style.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: slotCount }).map((_, idx) => (
              <div key={idx} className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-4 space-y-2.5 text-left">
                <span className="text-xs font-bold text-zinc-700">
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
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
          <div>
            <h4 className="font-bold text-zinc-800 text-sm">Looping Background Video</h4>
            <p className="text-xs text-zinc-400">This video autoplays as the hero background. Recommended format: MP4/WebM, max 30s loop.</p>
          </div>
          <MediaUpload accept="video/*" value={heroVideo} onChange={setHeroVideo} />
        </div>
      )}
    </div>
  );

  const renderDomain = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Website Address
          </h2>
          <p className="text-sm text-[#78716C]">
            Configure your hotel subdomain and link custom domain names for hosting your website.
          </p>
        </div>
      </div>

      {/* Subdomain Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm">Platform Subdomain</h4>
          <p className="text-xs text-zinc-400">This is the default URL where your site will be published on the Bolt platform.</p>
        </div>
        <div className="flex items-center">
          <input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)}
            className="flex-1 ds-input rounded-r-none" />
          <span className="bg-[#FAFAF9] border border-l-0 border-[#E7E5E4] rounded-r-xl px-4 py-2.5 text-xs text-[#78716C] font-bold flex items-center">.boltlabs.com</span>
        </div>
        {subdomain && (
          <a href={`http://${subdomain}.boltlabs.com`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#1B93A4] hover:underline font-bold mt-1 transition">
            <span>Visit published site:</span>
            <span>{subdomain}.boltlabs.com</span>
          </a>
        )}
      </div>

      {/* Custom Domain Card */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-4 text-left">
        <div>
          <h4 className="font-bold text-zinc-800 text-sm">Custom Domain URL</h4>
          <p className="text-xs text-zinc-400">If you own a custom domain (e.g. www.yourhotel.com), enter it here to link your brand domain.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700">Domain Name</label>
          <input type="text" placeholder="www.yourhotel.com" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
            className="ds-input w-full" />
        </div>
      </div>
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
      case 'domain': return renderDomain();
      default: return renderBasicInfo();
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSelectedForm()}

        {selectedView !== 'owners' && (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <span className="ds-badge ds-badge-green flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
              <span>Autosave Draft Enabled</span>
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {saveSuccess && (
                <span className="text-xs text-[#2D6A4F] font-bold animate-in fade-in duration-200">
                  ✓ Saved successfully
                </span>
              )}
              <button type="submit" disabled={isSyncingInstagram} className="ds-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
                {isSyncingInstagram ? 'Syncing Feed...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
