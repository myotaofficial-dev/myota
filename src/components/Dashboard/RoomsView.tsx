import React, { useState, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { RoomType, BedConfig, ExtraBedConfig } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Sparkles, BedDouble, Users, Maximize, CheckCircle, Info, Save, Baby, Utensils, ChevronRight, ChevronLeft, ImageIcon, UploadCloud } from 'lucide-react';


const KNOWN_AMENITIES = [
  "Free Wi-Fi", "Air Conditioning", "Balcony", "Mini Bar", "Flat Screen TV", 
  "Bathtub", "Espresso Machine", "Rain Shower", "Safe Locker", "Tea/Coffee Maker",
  "Valley View Deck", "Kitchenette", "Jacuzzi", "Room Service"
];

const DualRangeSlider: React.FC<{
  minVal: number;
  maxVal: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}> = ({ minVal, maxVal, onChangeMin, onChangeMax }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const val = Math.round((pct / 100) * 17);
    
    // Determine which handle is closer
    const distMin = Math.abs(val - minVal);
    const distMax = Math.abs(val - maxVal);
    
    let handle: 'min' | 'max';
    if (distMin < distMax) {
      handle = 'min';
      onChangeMin(Math.min(maxVal - 1, val));
    } else if (distMax < distMin) {
      handle = 'max';
      onChangeMax(Math.max(minVal + 1, val));
    } else {
      handle = val < minVal ? 'min' : 'max';
      if (handle === 'min') onChangeMin(Math.min(maxVal - 1, val));
      else onChangeMax(Math.max(minVal + 1, val));
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const curX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      if (!trackRef.current) return;
      const curRect = trackRef.current.getBoundingClientRect();
      const curPct = Math.max(0, Math.min(100, ((curX - curRect.left) / curRect.width) * 100));
      const curVal = Math.round((curPct / 100) * 17);
      
      if (handle === 'min') {
        onChangeMin(Math.max(0, Math.min(maxVal - 1, curVal)));
      } else {
        onChangeMax(Math.max(minVal + 1, Math.min(17, curVal)));
      }
    };

    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  };

  const pctMin = (minVal / 17) * 100;
  const pctMax = (maxVal / 17) * 100;

  return (
    <div className="relative pt-8 pb-3 px-2 select-none">
      {/* Top segments indicators */}
      <div className="absolute top-0 left-0 right-0 h-10">
        <div 
          className="absolute -translate-x-1/2 text-center" 
          style={{ left: `${pctMin / 2}%` }}
        >
          <span className="text-[#1B93A4] font-bold block text-sm">0 – {minVal}</span>
          <span className="text-[10px] text-zinc-400 font-medium">Free for children</span>
        </div>
        <div 
          className="absolute -translate-x-1/2 text-center" 
          style={{ left: `${(pctMin + pctMax) / 2}%` }}
        >
          <span className="text-[#D97706] font-bold block text-sm">{minVal + 1} – {maxVal}</span>
          <span className="text-[10px] text-zinc-400 font-medium">Child rate applies</span>
        </div>
        <div 
          className="absolute -translate-x-1/2 text-center" 
          style={{ left: `${(pctMax + 100) / 2}%` }}
        >
          <span className="text-[#1C1917] font-bold block text-sm">{maxVal + 1}+</span>
          <span className="text-[10px] text-zinc-400 font-medium">Adult rate applies</span>
        </div>
      </div>

      {/* Track bar */}
      <div 
        ref={trackRef}
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        className="relative h-2.5 bg-[#E6F5F7] border border-zinc-200 rounded-full cursor-pointer mt-10"
      >
        {/* Selected range highlight in dark teal */}
        <div 
          className="absolute h-full bg-[#1B93A4] rounded-full"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />

        {/* Min Handle */}
        <div 
          className="absolute w-5 h-5 bg-white border-2 border-[#1B93A4] rounded-full -top-1.5 -ml-2.5 flex items-center justify-center shadow-md transition hover:scale-110 active:scale-95"
          style={{ left: `${pctMin}%` }}
        />

        {/* Max Handle */}
        <div 
          className="absolute w-5 h-5 bg-white border-2 border-[#1B93A4] rounded-full -top-1.5 -ml-2.5 flex items-center justify-center shadow-md transition hover:scale-110 active:scale-95"
          style={{ left: `${pctMax}%` }}
        />
      </div>

      {/* Scale values */}
      <div className="flex justify-between text-[10px] font-bold text-zinc-400 mt-2 font-mono px-0.5">
        <span>0</span>
        <span>8</span>
        <span>17</span>
      </div>
    </div>
  );
};

export const RoomsView: React.FC = () => {
  const { rooms, addRoom, updateRoom, deleteRoom, hotelInfo, updateHotelInfo, managedPhotos } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const movePhotoLeft = (idx: number) => {
    if (idx === 0) return;
    setSelectedPhotos(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      return updated;
    });
  };

  const movePhotoRight = (idx: number) => {
    if (idx === selectedPhotos.length - 1) return;
    setSelectedPhotos(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      return updated;
    });
  };

  const triggerUploadNew = () => {
    fileInputRef.current?.click();
  };

  const handleUploadNewFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && !selectedPhotos.includes(base64)) {
        setSelectedPhotos(prev => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be uploaded again if needed
    e.target.value = '';
  };

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacityAdults, setCapacityAdults] = useState(2);
  const [capacityChildren, setCapacityChildren] = useState(1);
  const [totalInventory, setTotalInventory] = useState(5);
  const [sizeSqft, setSizeSqft] = useState(300);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Bookmigo-style states
  const [beds, setBeds] = useState<BedConfig>({ single: 0, double: 0, queen: 0, king: 0, sofa: 0 });
  const [extraBeds, setExtraBeds] = useState<ExtraBedConfig>({ foldable: 0, floor: 0, fixed: 0 });
  const [priceTiers, setPriceTiers] = useState<Record<string, number>>({ '1': 3000, '2': 3500 });
  const [minOccupancy, setMinOccupancy] = useState(1);
  const [baseOccupancy, setBaseOccupancy] = useState(0);

  // Child policy & extra bed rate states
  const [newAmenityText, setNewAmenityText] = useState('');
  const [childPolicyEnabled, setChildPolicyEnabled] = useState(hotelInfo.childPolicyEnabled ?? true);
  const [childMinAge, setChildMinAge] = useState(hotelInfo.childPolicyMinAge ?? 5);
  const [childMaxAge, setChildMaxAge] = useState(hotelInfo.childPolicyMaxAge ?? 12);
  const [extraAdultRate, setExtraAdultRate] = useState(hotelInfo.extraAdultRate ?? 0);
  const [extraChildRate, setExtraChildRate] = useState(hotelInfo.extraChildRate ?? 0);

  // Meal plans states
  const [mealPlanCpEnabled, setMealPlanCpEnabled] = useState(hotelInfo.mealPlanCpEnabled ?? true);
  const [mealPlanCpAdultRate, setMealPlanCpAdultRate] = useState(hotelInfo.mealPlanCpAdultRate ?? 300);
  const [mealPlanCpChildRate, setMealPlanCpChildRate] = useState(hotelInfo.mealPlanCpChildRate ?? 250);

  const [mealPlanMapEnabled, setMealPlanMapEnabled] = useState(hotelInfo.mealPlanMapEnabled ?? true);
  const [mealPlanMapAdultRate, setMealPlanMapAdultRate] = useState(hotelInfo.mealPlanMapAdultRate ?? 1000);
  const [mealPlanMapChildRate, setMealPlanMapChildRate] = useState(hotelInfo.mealPlanMapChildRate ?? 750);

  const [mealPlanApEnabled, setMealPlanApEnabled] = useState(hotelInfo.mealPlanApEnabled ?? true);
  const [mealPlanApAdultRate, setMealPlanApAdultRate] = useState(hotelInfo.mealPlanApAdultRate ?? 1500);
  const [mealPlanApChildRate, setMealPlanApChildRate] = useState(hotelInfo.mealPlanApChildRate ?? 1250);
  const [defaultMealPlan, setDefaultMealPlan] = useState<'EP' | 'CP'>(hotelInfo.defaultMealPlan ?? 'EP');

  const handleSavePolicy = () => {
    updateHotelInfo({
      childPolicyEnabled,
      childPolicyMinAge: childMinAge,
      childPolicyMaxAge: childMaxAge,
      extraAdultRate: Number(extraAdultRate),
      extraChildRate: Number(extraChildRate)
    });
    alert('Child policy and extra bed rates updated successfully!');
  };

  const handleSaveMealPlans = () => {
    updateHotelInfo({
      mealPlanCpEnabled,
      mealPlanCpAdultRate: Number(mealPlanCpAdultRate),
      mealPlanCpChildRate: Number(mealPlanCpChildRate),
      mealPlanMapEnabled,
      mealPlanMapAdultRate: Number(mealPlanMapAdultRate),
      mealPlanMapChildRate: Number(mealPlanMapChildRate),
      mealPlanApEnabled,
      mealPlanApAdultRate: Number(mealPlanApAdultRate),
      mealPlanApChildRate: Number(mealPlanApChildRate),
      defaultMealPlan
    });
    alert('Meal plans configuration updated successfully!');
  };

  // Payment Collection states
  const [paymentCollectionType, setPaymentCollectionType] = useState<'full' | 'partial'>(
    hotelInfo.paymentCollectionType || 'partial'
  );
  const [paymentCollectionPercent, setPaymentCollectionPercent] = useState<number>(
    hotelInfo.paymentCollectionPercent ?? 50
  );

  const handleSavePaymentCollection = () => {
    updateHotelInfo({
      paymentCollectionType,
      paymentCollectionPercent: Number(paymentCollectionPercent)
    });
    alert('Online payment collection settings updated successfully!');
  };

  // Helper to format Rupees
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const openAddModal = () => {
    setName('');
    setDescription('');
    setCapacityAdults(2);
    setCapacityChildren(1);
    setTotalInventory(5);
    setSizeSqft(300);
    setSelectedAmenities([]);
    setPhotoUrl('');
    setSelectedPhotos([]);
    setIsActive(true);
    setBeds({ single: 0, double: 0, queen: 0, king: 0, sofa: 0 });
    setExtraBeds({ foldable: 0, floor: 0, fixed: 0 });
    setPriceTiers({ '1': 3000, '2': 3500 });
    setMinOccupancy(1);
    setBaseOccupancy(0);
    setEditingId(null);
    setModalStep(1);
    setIsEditing(true);
  };

  const openEditModal = (room: RoomType) => {
    setName(room.name);
    setDescription(room.description);
    setCapacityAdults(room.capacityAdults);
    setCapacityChildren(room.capacityChildren);
    setTotalInventory(room.totalInventory);
    setSizeSqft(room.sizeSqft);
    setSelectedAmenities(room.amenities);
    setPhotoUrl(room.photos[0] || '');
    setSelectedPhotos(room.photos || []);
    setIsActive(room.is_active ?? true);
    setBeds(room.beds ?? { single: 0, double: 0, queen: 0, king: 0, sofa: 0 });
    setExtraBeds(room.extra_beds ?? { foldable: 0, floor: 0, fixed: 0 });
    setPriceTiers(room.price_tiers ?? { '1': room.basePrice, '2': room.basePrice });
    setMinOccupancy(room.min_occupancy ?? 1);
    setBaseOccupancy(room.base_occupancy ?? room.capacityAdults);
    setEditingId(room.id);
    setModalStep(1);
    setIsEditing(true);
  };

  const openEditPhotosModal = (room: RoomType) => {
    openEditModal(room);
    setModalStep(3);
  };

  const handleBedChange = (type: keyof BedConfig, val: number) => {
    const updated = { ...beds, [type]: Math.max(0, val) };
    setBeds(updated);
    
    // Auto-calculate base occupancy: queen/king = 2, single = 1 (other types default to legacy values)
    const computed = 
      (updated.single || 0) * 1 +
      (updated.double || 0) * 2 +
      (updated.queen || 0) * 2 +
      (updated.king || 0) * 2 +
      (updated.sofa || 0) * 1;
    
    const baseOcc = Math.max(1, computed);
    setBaseOccupancy(baseOcc);
    const maxOcc = baseOcc + (extraBeds.foldable || 0) + (extraBeds.floor || 0);
    setCapacityAdults(maxOcc);

    // Align price tiers keys
    const newTiers: Record<string, number> = {};
    for (let i = 1; i <= maxOcc; i++) {
      newTiers[String(i)] = priceTiers[String(i)] || 3000;
    }
    setPriceTiers(newTiers);
  };

  const handleExtraBedChange = (type: 'foldable' | 'floor', val: number) => {
    const numVal = Math.max(0, val);
    const updatedExtra = { ...extraBeds, [type]: numVal };
    setExtraBeds(updatedExtra);
    
    const maxOcc = baseOccupancy + (updatedExtra.foldable || 0) + (updatedExtra.floor || 0);
    setCapacityAdults(maxOcc);
    
    // Align price tiers keys
    const newTiers: Record<string, number> = {};
    for (let i = 1; i <= maxOcc; i++) {
      newTiers[String(i)] = priceTiers[String(i)] || 3000;
    }
    setPriceTiers(newTiers);
  };

  const handlePriceTierChange = (occupancyKey: string, val: number) => {
    setPriceTiers(prev => ({
      ...prev,
      [occupancyKey]: isNaN(val) ? 0 : Math.max(0, val)
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Deriving bedType display string
    const bedStrings: string[] = [];
    if (beds.king) bedStrings.push(`${beds.king} King`);
    if (beds.queen) bedStrings.push(`${beds.queen} Queen`);
    if (beds.double) bedStrings.push(`${beds.double} Double`);
    if (beds.single) bedStrings.push(`${beds.single} Single`);
    if (beds.sofa) bedStrings.push(`${beds.sofa} Sofa Bed`);
    const derivedBedType = bedStrings.join(', ') || 'Custom Layout';

    // basePrice fallback is lowest tier price
    const lowestPrice = Math.min(...Object.values(priceTiers));

    // Combine managed + uploaded photos
    const allPhotos = [...selectedPhotos];
    if (allPhotos.length === 0 && photoUrl) allPhotos.push(photoUrl);

    const data: Omit<RoomType, 'id'> = {
      name,
      description,
      capacityAdults,
      capacityChildren,
      basePrice: lowestPrice || 100,
      totalInventory: Number(totalInventory),
      sizeSqft: Number(sizeSqft),
      bedType: derivedBedType,
      amenities: selectedAmenities,
      photos: allPhotos.length > 0 ? allPhotos : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600'],
      is_active: isActive,
      beds,
      extra_beds: extraBeds,
      price_tiers: priceTiers,
      min_occupancy: minOccupancy,
      base_occupancy: baseOccupancy
    };

    if (editingId) {
      updateRoom(editingId, data);
    } else {
      addRoom(data);
    }
    setIsEditing(false);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = () => {
    const clean = newAmenityText.trim();
    if (!clean) return;
    
    // Add to current selected list for this room
    if (!selectedAmenities.includes(clean)) {
      setSelectedAmenities(prev => [...prev, clean]);
    }
    
    // Persist globally so other rooms can reuse it (unselected by default)
    const currentCustom = hotelInfo.customAmenities || [];
    if (!currentCustom.includes(clean)) {
      updateHotelInfo({
        customAmenities: [...currentCustom, clean]
      });
    }
    
    setNewAmenityText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Room Categories</h2>
          <p className="text-sm text-[#78716C]">Configure bed layouts, base occupancies, pricing tiers, and inventory.</p>
        </div>
        <button
          onClick={openAddModal}
          className="ds-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room Type</span>
        </button>
      </div>

      {/* Section Title Configuration */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-xs space-y-2 text-left">
        <label className="text-xs font-bold text-zinc-700">Rooms Section Title</label>
        <p className="text-[10px] text-zinc-400">Configure the main heading of the rooms/suites section on the homepage.</p>
        <input 
          type="text" 
          value={hotelInfo.roomsTitle || 'Our Sanctuary Spaces'} 
          onChange={(e) => updateHotelInfo({ roomsTitle: e.target.value })}
          placeholder="e.g. Our Sanctuary Spaces"
          className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#1B93A4] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 outline-hidden transition font-sans" 
        />
      </div>

      {/* Child Policy & Extra Bed Rates Card (Image 1 style) */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        {/* Header with toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-150">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1C1917] flex items-center gap-2">
              <Baby className="w-5 h-5 text-teal-600" />
              <span>Child policy</span>
            </h3>
            <p className="text-xs text-[#78716C]">Children are welcome at this property.</p>
          </div>
          <button
            type="button"
            onClick={() => setChildPolicyEnabled(!childPolicyEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden ${
              childPolicyEnabled ? 'bg-teal-600' : 'bg-zinc-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                childPolicyEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Dynamic Interactive Dual-Slider */}
        {childPolicyEnabled && (
          <DualRangeSlider
            minVal={childMinAge}
            maxVal={childMaxAge}
            onChangeMin={(val) => setChildMinAge(val)}
            onChangeMax={(val) => setChildMaxAge(val)}
          />
        )}

        {/* Extra Bed Rates */}
        <div className="space-y-4 pt-4 border-t border-zinc-150">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1C1917] flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-teal-600" />
              <span>Extra-bed rates</span>
            </h3>
            <p className="text-xs text-[#78716C]">Per person / night for guests beyond base occupancy. Applies to all room categories.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Extra Adult / Night</label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-medium">₹</div>
                <input
                  type="number"
                  value={extraAdultRate}
                  onChange={(e) => setExtraAdultRate(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-teal-650 focus:bg-white rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-zinc-800 outline-hidden transition font-sans"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Extra Child / Night</label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-medium">₹</div>
                <input
                  type="number"
                  value={extraChildRate}
                  onChange={(e) => setExtraChildRate(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-teal-650 focus:bg-white rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-zinc-800 outline-hidden transition font-sans"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Policy Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSavePolicy}
            className="ds-btn-primary flex items-center gap-2 bg-teal-650 hover:bg-teal-700 active:scale-97 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save policy</span>
          </button>
        </div>
      </div>

      {/* Meal Plans Offered Card (Image 2 style) */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-[#1C1917] flex items-center gap-2">
            <Utensils className="w-5 h-5 text-teal-600" />
            <span>Meal Plans Offered</span>
          </h3>
          <p className="text-xs text-[#78716C]">Master toggles for plans this property offers. Set per-person rates that apply to all room categories.</p>
        </div>

        {/* 3 Meal Plan sub-cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CP Breakfast */}
          <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-[#FAFAF9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-md">CP</span>
                <span className="font-bold text-sm text-[#1C1917]">Breakfast</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !mealPlanCpEnabled;
                  setMealPlanCpEnabled(nextVal);
                  if (!nextVal) {
                    setDefaultMealPlan('EP');
                  }
                }}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden ${
                  mealPlanCpEnabled ? 'bg-teal-600' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    mealPlanCpEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Adult / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanCpEnabled}
                    value={mealPlanCpAdultRate}
                    onChange={(e) => setMealPlanCpAdultRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Child / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanCpEnabled}
                    value={mealPlanCpChildRate}
                    onChange={(e) => setMealPlanCpChildRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MAP */}
          <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-[#FAFAF9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-md">MAP</span>
                <span className="font-bold text-sm text-[#1C1917]">Breakfast + 1 meal</span>
              </div>
              <button
                type="button"
                onClick={() => setMealPlanMapEnabled(!mealPlanMapEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden ${
                  mealPlanMapEnabled ? 'bg-teal-600' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    mealPlanMapEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Adult / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanMapEnabled}
                    value={mealPlanMapAdultRate}
                    onChange={(e) => setMealPlanMapAdultRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Child / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanMapEnabled}
                    value={mealPlanMapChildRate}
                    onChange={(e) => setMealPlanMapChildRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AP */}
          <div className="border border-zinc-200 rounded-2xl p-4 space-y-4 bg-[#FAFAF9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-md">AP</span>
                <span className="font-bold text-sm text-[#1C1917]">All meals</span>
              </div>
              <button
                type="button"
                onClick={() => setMealPlanApEnabled(!mealPlanApEnabled)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden ${
                  mealPlanApEnabled ? 'bg-teal-600' : 'bg-zinc-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    mealPlanApEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Adult / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanApEnabled}
                    value={mealPlanApAdultRate}
                    onChange={(e) => setMealPlanApAdultRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block">Child / Night</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400 text-[10px] font-semibold">₹</div>
                  <input
                    type="number"
                    disabled={!mealPlanApEnabled}
                    value={mealPlanApChildRate}
                    onChange={(e) => setMealPlanApChildRate(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 focus:border-teal-650 disabled:opacity-50 disabled:bg-zinc-100 rounded-lg pl-6 pr-2 py-1.5 text-xs text-zinc-800 outline-hidden font-medium font-sans"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Default Meal Plan Selector */}
        <div className="bg-[#FAFAF9] border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 text-left">
            <span className="font-bold text-zinc-700 block text-sm">Default Booking Meal Plan</span>
            <span className="text-zinc-450 block">Select which plan is selected by default for new checkouts.</span>
          </div>
          <div className="flex bg-zinc-100 p-1 rounded-xl shrink-0 self-start sm:self-center border border-zinc-200">
            <button
              type="button"
              onClick={() => setDefaultMealPlan('EP')}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                defaultMealPlan === 'EP' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Room Only (EP)
            </button>
            <button
              type="button"
              disabled={!mealPlanCpEnabled}
              onClick={() => setDefaultMealPlan('CP')}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                defaultMealPlan === 'CP' ? 'bg-white text-zinc-800 shadow-xs' : 'text-zinc-500 hover:text-zinc-750'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Breakfast (CP)
            </button>
          </div>
        </div>

        {/* Save Meal Plans Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveMealPlans}
            className="ds-btn-primary flex items-center gap-2 bg-teal-650 hover:bg-teal-700 active:scale-97 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save meal plans</span>
          </button>
        </div>
      </div>

      {/* Online Payment Collection Card (Image style) */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-xs space-y-6 text-left">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-[#1C1917]">
            Online payment collection
          </h3>
          <p className="text-xs text-[#78716C]">
            Let guests either pay fully or reserve by paying a partial amount.
          </p>
        </div>

        {/* Toggle container */}
        <div className="bg-zinc-100 p-1 rounded-2xl flex max-w-sm border border-zinc-200">
          <button
            type="button"
            onClick={() => setPaymentCollectionType('full')}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
              paymentCollectionType === 'full'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Full payment
          </button>
          <button
            type="button"
            onClick={() => setPaymentCollectionType('partial')}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
              paymentCollectionType === 'partial'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Partial payment
          </button>
        </div>

        {/* Input box showing percent to collect if Partial Payment is active */}
        {paymentCollectionType === 'partial' && (
          <div className="border border-[#E7E5E4] rounded-2xl p-4 bg-white flex items-center justify-start gap-4 max-w-sm animate-in slide-in-from-top-2 duration-150">
            <input
              type="number"
              min="1"
              max="100"
              value={paymentCollectionPercent === 0 ? '' : paymentCollectionPercent}
              onChange={(e) => setPaymentCollectionPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-16 text-center font-bold text-sm text-[#1C1917] bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#1B93A4] focus:bg-white rounded-xl py-1.5 outline-none font-sans"
            />
            <span className="text-xs font-bold text-zinc-500 font-sans">
              % to collect online
            </span>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSavePaymentCollection}
            className="ds-btn-primary flex items-center gap-2 bg-teal-650 hover:bg-teal-700 active:scale-97 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save payment collection settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
        {rooms.map(room => {
          const startG = Math.max(1, room.min_occupancy ?? 1);
          const endG = Math.max(startG, room.base_occupancy ?? room.capacityAdults);
          const activePrices: number[] = [];
          
          const isCpBase = hotelInfo.defaultMealPlan === 'CP';
          const cpRate = isCpBase ? (hotelInfo.mealPlanCpAdultRate ?? 300) : 0;

          for (let i = startG; i <= endG; i++) {
            const basePriceVal = room.price_tiers?.[String(i)] ?? room.basePrice;
            const adjustedPrice = basePriceVal + (cpRate * i);
            activePrices.push(adjustedPrice);
          }
          if (activePrices.length === 0) {
            activePrices.push(room.basePrice + cpRate);
          }
          const minPrice = Math.min(...activePrices);
          const maxPrice = Math.max(...activePrices);
          const priceRangeString = minPrice === maxPrice 
            ? formatRupees(minPrice) 
            : `${formatRupees(minPrice)} – ${formatRupees(maxPrice)}`;

          const firstPhoto = room.photos?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600';

          return (
            <div 
              key={room.id} 
              className="bg-white border border-[#E7E5E4] rounded-[20px] p-5 flex flex-col justify-between hover:shadow-md transition duration-200"
              style={{ opacity: room.is_active !== false ? 1 : 0.65 }}
            >
              <div>
                {/* Top Row: Thumbnail and Details */}
                <div className="flex items-start gap-4">
                  <img 
                    src={firstPhoto} 
                    alt={room.name} 
                    className="w-16 h-16 rounded-[12px] object-cover bg-zinc-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0 text-left space-y-1">
                    {/* Line 1: Room Name */}
                    <h3 className="font-bold text-[#1C1917] text-sm sm:text-base leading-snug break-words" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {room.name}
                    </h3>
                    
                    {/* Line 2: Price Range & Inventory Label */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                      <span className="inline-block bg-[#FFF4E5] text-[#D97706] text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {room.totalInventory} {room.totalInventory === 1 ? 'unit' : 'units'}
                      </span>
                      <div className="text-right">
                        <span className="text-teal-700 font-bold text-sm sm:text-base leading-none">
                          {priceRangeString}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-zinc-400 block font-normal mt-0.5">per night</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtitle/Description */}
                <p className="text-xs text-[#78716C] line-clamp-2 mt-3 text-left">
                  {room.description}
                </p>

                {/* Occupancy and Actions */}
                <div className="flex items-center justify-between mt-3.5 pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Base {room.base_occupancy || 0} · Min {room.min_occupancy || 1} · Max {room.capacityAdults}</span>
                    <span className="bg-[#E6F5F7] text-[#1B93A4] text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      {isCpBase ? 'CP base' : 'EP base'}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1 rounded-md border border-zinc-200 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition cursor-pointer"
                      title="Edit Room Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this room category? All calendar rates and settings will be removed.')) {
                          deleteRoom(room.id);
                        }
                      }}
                      className="p-1 rounded-md border border-zinc-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Room Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo Count and Edit Photos Row */}
                <div className="flex items-center justify-between mt-2.5 pb-2 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                    <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{room.photos?.length || 0} {room.photos?.length === 1 ? 'Photo' : 'Photos'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditPhotosModal(room)}
                    className="text-blue-600 hover:text-blue-750 font-bold text-[11px] cursor-pointer hover:underline"
                  >
                    Edit Photos
                  </button>
                </div>

                {/* Bed Configuration Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 text-left">
                  {Object.entries(room.beds || {}).filter(([_, qty]) => qty > 0).map(([type, qty]) => {
                    const label = type === 'single' ? 'Single cot' : type === 'double' ? 'Double cot' : type === 'queen' ? 'Queen cot' : type === 'king' ? 'King cot' : 'Sofa Bed';
                    return (
                      <span key={type} className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-650 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md">
                        <BedDouble className="w-3 h-3 text-[#1B93A4]" />
                        {qty} × {label}
                      </span>
                    );
                  })}
                  {Object.entries(room.extra_beds || {}).filter(([_, qty]) => qty > 0).map(([type, qty]) => {
                    const label = type === 'foldable' ? 'Foldable cot' : type === 'floor' ? 'Floor bed' : 'Fixed cot';
                    return (
                      <span key={type} className="inline-flex items-center gap-1 bg-[#FFF4E5] border border-amber-250 text-[#D97706] text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md">
                        +{qty} {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Row: Dynamic Pricing Tiers Grid */}
              <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3.5 border-t border-zinc-100">
                {(() => {
                  const tiers = [];
                  for (let i = startG; i <= endG; i++) {
                    const priceVal = room.price_tiers?.[String(i)] ?? room.basePrice;
                    const adjustedPrice = priceVal + (cpRate * i);
                    tiers.push({ guests: i, price: adjustedPrice });
                  }
                  return tiers.map(({ guests, price }) => (
                    <div key={guests} className="border border-zinc-200 rounded-lg py-1 px-2.5 bg-zinc-50 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-zinc-500">{guests}p</span>
                      <span className="text-xs font-bold text-[#1C1917]">{formatRupees(price)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3-Step Room Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#E7E5E4]">

            {/* Step Progress Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#E7E5E4] bg-[#FAFAF9]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Sparkles className="w-5 h-5 text-[#1B93A4]" />
                  <span>{editingId ? 'Edit Room Type' : 'Add New Room Type'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step pills */}
              <div className="flex items-center gap-2">
                {([1, 2, 3] as const).map((step) => (
                  <React.Fragment key={step}>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      modalStep === step
                        ? 'bg-[#1B93A4] text-white shadow-sm'
                        : modalStep > step
                        ? 'bg-[#E6F5F7] text-[#1B93A4]'
                        : 'bg-[#F5F5F4] text-[#A8A29E]'
                    }`}>
                      {modalStep > step
                        ? <CheckCircle className="w-3.5 h-3.5" />
                        : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] leading-none">{step}</span>
                      }
                      <span className="hidden sm:inline">
                        {step === 1 ? 'Basics & Pricing' : step === 2 ? 'Details & Amenities' : 'Photos'}
                      </span>
                    </div>
                    {step < 3 && (
                      <div className={`h-px flex-1 rounded transition-all ${modalStep > step ? 'bg-[#1B93A4]' : 'bg-[#E7E5E4]'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── STEP 1: Basics & Pricing ── */}
            {modalStep === 1 && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Category Name + Inventory */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="ds-overline block">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Deluxe Suite"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="ds-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="ds-overline block">Inventory (Physical Rooms)</label>
                    <input
                      type="number"
                      min={1}
                      value={totalInventory}
                      onChange={(e) => setTotalInventory(Number(e.target.value))}
                      className="ds-input w-full"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between p-3.5 bg-[#FAFAF9] rounded-xl border border-[#E7E5E4]">
                  <div>
                    <p className="text-xs font-bold text-[#1C1917]">Active Listing</p>
                    <p className="text-[10px] text-[#78716C]">Visible to guests on your property website</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-hidden ${
                      isActive ? 'bg-teal-600' : 'bg-zinc-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Main Beds Card (Image 1 Style) */}
                <div className="bg-white border border-[#E7E5E4] rounded-[20px] p-6 space-y-4 text-left">
                  <div className="flex items-center gap-1.5 pb-2">
                    <BedDouble className="w-5 h-5 text-teal-600" />
                    <span className="font-bold text-[#1C1917] text-sm sm:text-base">Main beds</span>
                    <span className="text-red-500 font-bold text-sm">*</span>
                    <span className="text-[11px] sm:text-xs text-[#78716C] ml-1">(define base occupancy)</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Single cot', subLabel: '1 person', key: 'single' as const },
                      { label: 'Queen cot', subLabel: '2 persons', key: 'queen' as const },
                      { label: 'King cot', subLabel: '2 persons', key: 'king' as const }
                    ].map(({ label, subLabel, key }) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-zinc-800">{label}</span>
                          <span className="text-[10px] sm:text-xs text-[#78716C]">{subLabel}</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={beds[key] || 0}
                          onChange={(e) => handleBedChange(key, Number(e.target.value))}
                          className="w-14 h-10 text-center font-medium text-sm border border-zinc-200 rounded-[12px] bg-[#FAFAF9] focus:bg-white focus:border-[#1B93A4] focus:outline-none transition appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-2">
                    <span className="text-xs sm:text-sm text-[#78716C] font-medium">Base occupancy</span>
                    <span className="text-teal-700 font-bold text-sm sm:text-base">{baseOccupancy}</span>
                  </div>
                </div>

                {/* Max Occupancy & Extra Beds Card (Image 2 Style) */}
                <div className="bg-white border border-[#E7E5E4] rounded-[20px] p-6 space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-[#1C1917] text-sm sm:text-base">Max occupancy</span>
                      <span className="text-[11px] sm:text-xs text-[#78716C] ml-1">(default = base; extras add more)</span>
                    </div>
                    <span className="font-bold text-[#1C1917] text-sm sm:text-base">{capacityAdults}</span>
                  </div>

                  <div className="flex gap-4 pt-2">
                    {/* Foldable Cot */}
                    <div className="flex-1 border border-zinc-200 rounded-[16px] p-3 flex items-center justify-between bg-white">
                      <div className="text-left leading-tight text-[11px] sm:text-xs font-semibold text-zinc-700">
                        <div>Foldable</div>
                        <div>cot</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={extraBeds.foldable || 0}
                        onChange={(e) => handleExtraBedChange('foldable', Number(e.target.value))}
                        className="w-14 h-10 text-center font-medium text-sm border border-zinc-200 rounded-[12px] bg-[#FAFAF9] focus:bg-white focus:border-[#1B93A4] focus:outline-none transition appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Floor Bed */}
                    <div className="flex-1 border border-zinc-200 rounded-[16px] p-3 flex items-center justify-between bg-white">
                      <div className="text-left leading-tight text-[11px] sm:text-xs font-semibold text-zinc-700">
                        <div>Floor</div>
                        <div>bed</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={extraBeds.floor || 0}
                        onChange={(e) => handleExtraBedChange('floor', Number(e.target.value))}
                        className="w-14 h-10 text-center font-medium text-sm border border-zinc-200 rounded-[12px] bg-[#FAFAF9] focus:bg-white focus:border-[#1B93A4] focus:outline-none transition appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-[#78716C] mt-2 font-medium text-left">
                    Add foldable / floor / fixed beds to allow extra guests beyond base.
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-2">
                    <label className="text-xs font-semibold text-[#78716C] uppercase tracking-widest shrink-0">Minimum Guests</label>
                    <input type="number" min={1} value={minOccupancy}
                      onChange={(e) => setMinOccupancy(Number(e.target.value))}
                      className="ds-input w-24 text-center" />
                  </div>
                </div>

                {/* Base Price per-guest pricing tiers */}
                <div className="space-y-3 p-4 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
                  <div>
                    <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#1B93A4]" />
                      <span>Base Price / Night (EP – Room Only)</span>
                    </h4>
                    <p className="text-[10px] text-[#78716C] mt-0.5">Price per guest count tier.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(() => {
                      const startGuests = Math.max(1, minOccupancy);
                      const endGuests = Math.max(startGuests, baseOccupancy);
                      const guestTiers = [];
                      for (let i = startGuests; i <= endGuests; i++) {
                        guestTiers.push(i);
                      }
                      return guestTiers.map((guestNum) => {
                        const guestsKey = String(guestNum);
                        return (
                          <div key={guestsKey} className="bg-white rounded-xl border border-[#E7E5E4] p-3 space-y-1">
                            <label className="text-[9px] font-bold text-[#78716C] uppercase block">
                              {guestNum} {guestNum === 1 ? 'Guest' : 'Guests'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#78716C]">₹</span>
                              <input
                                type="number"
                                min={100}
                                value={priceTiers[guestsKey] === 0 ? '' : (priceTiers[guestsKey] ?? '')}
                                onChange={(e) => handlePriceTierChange(guestsKey, Number(e.target.value))}
                                className="ds-input w-full pl-6 text-xs"
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Details & Amenities ── */}
            {modalStep === 2 && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Size */}
                <div className="space-y-1.5">
                  <label className="ds-overline block">Room Size (sq ft)</label>
                  <div className="relative">
                    <Maximize className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                    <input type="number" min={10} value={sizeSqft}
                      onChange={(e) => setSizeSqft(Number(e.target.value))}
                      className="ds-input w-full pl-8" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="ds-overline block">Room Description</label>
                  <textarea
                    placeholder="Describe room features, views, and unique details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="ds-input w-full resize-none"
                  />
                </div>

                {/* Amenities */}
                <div className="space-y-3">
                  <label className="ds-overline block">Room Amenities</label>
                  
                  {/* Amenities Checklist Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(() => {
                      const displayAmenities = Array.from(new Set([...KNOWN_AMENITIES, ...(hotelInfo.customAmenities || []), ...selectedAmenities]));
                      return displayAmenities.map((amenity) => {
                        const isChecked = selectedAmenities.includes(amenity);
                        return (
                          <button
                            type="button"
                            key={amenity}
                            onClick={() => toggleAmenity(amenity)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                              isChecked
                                ? 'bg-[#E6F5F7] border-[#1B93A4] text-[#1B93A4]'
                                : 'bg-white border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9]'
                            }`}
                          >
                            {isChecked && <CheckCircle className="w-3 h-3 shrink-0" />}
                            {amenity}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Add Custom Amenity Inline Input */}
                  <div className="flex gap-2 items-center mt-3 pt-3 border-t border-zinc-100 text-left">
                    <input 
                      type="text" 
                      placeholder="Add custom amenity (e.g. Hammock, Private Pool)..." 
                      value={newAmenityText}
                      onChange={(e) => setNewAmenityText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomAmenity();
                        }
                      }}
                      className="ds-input flex-1 text-xs py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAmenity}
                      className="px-4 py-1.5 bg-[#1B93A4] hover:bg-[#1B93A4]/90 active:scale-97 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Photos ── */}
            {modalStep === 3 && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Header with Title and Upload button */}
                <div className="flex items-start justify-between gap-4 pb-2">
                  <div className="text-left space-y-1">
                    <h4 className="font-bold text-[#1C1917] text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>Room Photos</h4>
                    <p className="text-xs text-[#78716C]">
                      Select from your property gallery, upload new photos, and arrange the order for this room.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerUploadNew}
                    className="border border-zinc-200 rounded-[12px] p-3 flex flex-col items-center justify-center bg-white hover:bg-zinc-50 transition w-20 h-16 shrink-0 shadow-xs cursor-pointer"
                  >
                    <UploadCloud className="w-4.5 h-4.5 text-zinc-500 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-700 leading-none">Upload</span>
                    <span className="text-[10px] font-bold text-zinc-700 leading-none mt-0.5">New</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadNewFile}
                    className="hidden"
                  />
                </div>

                {/* Selected Photos Card Wrapper */}
                <div className="bg-white border border-[#E7E5E4] rounded-[20px] p-5 space-y-4 text-left shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-sm sm:text-base text-zinc-800">Selected Photos</h5>
                      <p className="text-xs text-zinc-400">Drag cards to reorder or use the arrow controls.</p>
                    </div>
                    <span className="bg-[#E6F5F7] text-[#1B93A4] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedPhotos.length} {selectedPhotos.length === 1 ? 'Selected' : 'Selected'}
                    </span>
                  </div>

                  {selectedPhotos.length === 0 ? (
                    <div className="py-8 text-center bg-[#FAFAF9] rounded-xl border border-dashed border-[#E7E5E4]">
                      <p className="text-xs text-zinc-500">No photos selected yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedPhotos.map((url, i) => {
                        // Extract clean filename
                        let filename = "uploaded_img";
                        if (url.startsWith("http")) {
                          const parts = url.split("/");
                          const last = parts[parts.length - 1] || "";
                          filename = last.split("?")[0].substring(0, 12);
                        } else if (url.startsWith("data:")) {
                          filename = "uploaded_data";
                        }
                        const photoHash = (url.length % 90000) + 10000;
                        return (
                          <div key={i} className="border border-zinc-200 rounded-[16px] overflow-hidden bg-white flex flex-col shadow-3xs">
                            <img src={url} alt="" className="w-full aspect-[4/3] object-cover" />
                            <div className="p-3 text-left border-t border-zinc-150 flex flex-col justify-between flex-1">
                              <div>
                                <p className="text-xs font-bold text-zinc-850 truncate">{filename}...</p>
                                <p className="text-[10px] text-[#78716C] mt-0.5">Library image</p>
                                <p className="text-[10px] text-[#78716C]">#{photoHash} · Position {i + 1}</p>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-100">
                                <button
                                  type="button"
                                  disabled={i === 0}
                                  onClick={() => movePhotoLeft(i)}
                                  className="p-1 rounded-md border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-650 transition cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={i === selectedPhotos.length - 1}
                                  onClick={() => movePhotoRight(i)}
                                  className="p-1 rounded-md border border-zinc-200 hover:bg-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-650 transition cursor-pointer"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                  className="p-1 rounded-md border border-zinc-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition cursor-pointer ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Select From Existing Property Photos Card Wrapper */}
                <div className="bg-white border border-[#E7E5E4] rounded-[20px] p-5 space-y-4 text-left shadow-xs">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-sm sm:text-base text-zinc-800">Select From Existing Property Photos</h5>
                    <p className="text-xs text-zinc-450">
                      These come from the property image library and can be reused across different room types.
                    </p>
                  </div>

                  {managedPhotos.length === 0 ? (
                    <div className="py-8 text-center bg-[#FAFAF9] rounded-xl border border-dashed border-[#E7E5E4]">
                      <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No photos in library yet.</p>
                      <p className="text-[10px] text-zinc-400">Upload photos in Media → Photos first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {managedPhotos.map((photo) => {
                        const isSelected = selectedPhotos.includes(photo.url);
                        const displayId = photo.id.substring(0, 12);
                        return (
                          <div
                            key={photo.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPhotos(prev => prev.filter(u => u !== photo.url));
                              } else {
                                setSelectedPhotos(prev => [...prev, photo.url]);
                              }
                            }}
                            className={`border rounded-[16px] overflow-hidden bg-[#FAFAF9] flex flex-col cursor-pointer transition select-none ${
                              isSelected ? 'border-[#1B93A4] ring-2 ring-[#1B93A4]/25' : 'border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <img src={photo.url} alt="" className="w-full aspect-[4/3] object-cover" />
                            <div className="p-2.5 flex items-center justify-between border-t border-zinc-150 bg-white">
                              <span className="text-[11px] font-bold text-zinc-700 truncate max-w-[90px]">{displayId}...</span>
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-[#1B93A4] fill-[#1B93A4]/10 shrink-0" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wizard Footer */}
            <div className="p-5 border-t border-[#E7E5E4] flex items-center justify-between gap-3 bg-[#FAFAF9]">
              <button
                type="button"
                onClick={() => {
                  if (modalStep === 1) setIsEditing(false);
                  else setModalStep((s) => (s - 1) as 1 | 2 | 3);
                }}
                className="px-5 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition"
              >
                {modalStep === 3 ? 'Back' : modalStep === 1 ? 'Cancel' : '← Back'}
              </button>

              <div className="flex items-center gap-1.5">
                {([1, 2, 3] as const).map((s) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${
                    s === modalStep ? 'w-6 bg-[#1B93A4]' : s < modalStep ? 'w-3 bg-[#1B93A4]/40' : 'w-3 bg-[#E7E5E4]'
                  }`} />
                ))}
              </div>

              {modalStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (modalStep === 1 && !name.trim()) {
                      alert('Please enter a room category name.');
                      return;
                    }
                    setModalStep((s) => (s + 1) as 1 | 2 | 3);
                  }}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-bold rounded-xl text-sm shadow-xs transition cursor-pointer"
                >
                  Save Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
