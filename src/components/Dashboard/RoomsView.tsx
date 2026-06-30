import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { RoomType, BedConfig, ExtraBedConfig } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Sparkles, BedDouble, Users, Maximize, CheckCircle, Info } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

const KNOWN_AMENITIES = [
  "Free Wi-Fi", "Air Conditioning", "Balcony", "Mini Bar", "Flat Screen TV", 
  "Bathtub", "Espresso Machine", "Rain Shower", "Safe Locker", "Tea/Coffee Maker",
  "Valley View Deck", "Kitchenette", "Jacuzzi", "Room Service"
];

export const RoomsView: React.FC = () => {
  const { rooms, addRoom, updateRoom, deleteRoom } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const [beds, setBeds] = useState<BedConfig>({ single: 0, double: 1, queen: 0, king: 0, sofa: 0 });
  const [extraBeds, setExtraBeds] = useState<ExtraBedConfig>({ foldable: 0, floor: 0, fixed: 0 });
  const [priceTiers, setPriceTiers] = useState<Record<string, number>>({ '1': 3000, '2': 3500 });
  const [minOccupancy, setMinOccupancy] = useState(1);
  const [baseOccupancy, setBaseOccupancy] = useState(2);

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
    setPhotoUrl('https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600');
    setIsActive(true);
    setBeds({ single: 0, double: 1, queen: 0, king: 0, sofa: 0 });
    setExtraBeds({ foldable: 0, floor: 0, fixed: 0 });
    setPriceTiers({ '1': 3000, '2': 3500 });
    setMinOccupancy(1);
    setBaseOccupancy(2);
    setEditingId(null);
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
    setPhotoUrl(room.photos[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600');
    setIsActive(room.is_active ?? true);
    setBeds(room.beds ?? { single: 0, double: 0, queen: 0, king: 0, sofa: 0 });
    setExtraBeds(room.extra_beds ?? { foldable: 0, floor: 0, fixed: 0 });
    setPriceTiers(room.price_tiers ?? { '1': room.basePrice, '2': room.basePrice });
    setMinOccupancy(room.min_occupancy ?? 1);
    setBaseOccupancy(room.base_occupancy ?? room.capacityAdults);
    setEditingId(room.id);
    setIsEditing(true);
  };

  const handleBedChange = (type: keyof BedConfig, val: number) => {
    const updated = { ...beds, [type]: Math.max(0, val) };
    setBeds(updated);
    
    // Auto-calculate base occupancy: double/queen/king = 2, single/sofa = 1
    const computed = 
      (updated.single || 0) * 1 +
      (updated.double || 0) * 2 +
      (updated.queen || 0) * 2 +
      (updated.king || 0) * 2 +
      (updated.sofa || 0) * 1;
    setBaseOccupancy(Math.max(1, computed));
    setCapacityAdults(Math.max(1, computed));

    // Align price tiers keys
    const newTiers: Record<string, number> = {};
    for (let i = 1; i <= Math.max(1, computed); i++) {
      newTiers[String(i)] = priceTiers[String(i)] || 3000;
    }
    setPriceTiers(newTiers);
  };

  const handlePriceTierChange = (occupancyKey: string, val: number) => {
    setPriceTiers(prev => ({
      ...prev,
      [occupancyKey]: Math.max(0, val)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      photos: [photoUrl],
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

      {/* Grid of rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
        {rooms.map(room => {
          const cheapestPrice = Math.min(...Object.values(room.price_tiers || { '1': room.basePrice }));
          return (
            <div key={room.id} className="ds-card overflow-hidden flex flex-col hover:shadow-lg transition duration-200"
              style={{ opacity: room.is_active !== false ? 1 : 0.65 }}>
              {/* Room Image */}
              <div className="h-48 relative overflow-hidden bg-[#FAFAF9]">
                <img 
                  src={room.photos[0]} 
                  alt={room.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-[#1C1917]/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                  From {formatRupees(cheapestPrice)}/night
                </div>
                {room.is_active === false && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                    <span className="bg-[#E76F51] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Inactive</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>{room.name}</h3>
                  <p className="text-xs text-[#78716C] line-clamp-2">{room.description}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#E7E5E4] text-[#78716C] text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>Max {room.capacityAdults + room.capacityChildren}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span className="truncate">{room.bedType}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Maximize className="w-3.5 h-3.5 text-[#A8A29E]" />
                    <span>{room.sizeSqft} sqft</span>
                  </div>
                </div>

                {/* Pricing Tiers summary */}
                <div className="p-3 bg-[#FAFAF9] rounded-xl border border-[#E7E5E4] space-y-1">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">Price Tiers (Guest count)</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(room.price_tiers || {}).map(([guests, pr]) => (
                      <span key={guests} className="font-medium text-[#1C1917]">
                        {guests} {Number(guests) === 1 ? 'Guest' : 'Guests'}: <strong>{formatRupees(pr)}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Amenities tags */}
                <div className="flex flex-wrap gap-1">
                  {room.amenities.slice(0, 4).map((amenity, idx) => (
                    <span key={idx} className="ds-badge ds-badge-teal">
                      {amenity}
                    </span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="text-3xs text-[#78716C] font-semibold self-center ml-1">
                      +{room.amenities.length - 4} more
                    </span>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 flex items-center justify-between border-t border-[#E7E5E4] mt-auto">
                  <span className="text-xs text-[#78716C] font-medium">
                    Inventory: <strong className="text-[#1C1917]">{room.totalInventory} physical rooms</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this room category? All calendar rates and settings will be removed.')) {
                          deleteRoom(room.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 border border-[#E7E5E4]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Sparkles className="w-5 h-5 text-[#1B93A4]" />
                <span>{editingId ? 'Edit Room Type' : 'Add New Room Type'}</span>
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Row 1: Name & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="ds-overline block">Room Category Name</label>
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
                  <label className="ds-overline block">Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsActive(true)}
                      className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition ${
                        isActive ? 'bg-[#E6F5F7] border-[#1B93A4] text-[#1B93A4]' : 'bg-white border-[#E7E5E4] text-[#78716C]'
                      }`}
                    >
                      Active Listing
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsActive(false)}
                      className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition ${
                        !isActive ? 'bg-[#FEF0ED] border-[#E76F51] text-[#E76F51]' : 'bg-white border-[#E7E5E4] text-[#78716C]'
                      }`}
                    >
                      Inactive / Blocked
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Bed Composition Setup */}
              <div className="space-y-2 p-4 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
                <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wide flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-[#1B93A4]" />
                  <span>Bed Composition</span>
                </h4>
                <p className="text-[11px] text-[#78716C] -mt-1">Sets the base capacity of sleepers automatically.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  {[
                    { label: 'Single', key: 'single' as const },
                    { label: 'Double', key: 'double' as const },
                    { label: 'Queen', key: 'queen' as const },
                    { label: 'King', key: 'king' as const },
                    { label: 'Sofa Bed', key: 'sofa' as const }
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-white p-2.5 rounded-xl border border-[#E7E5E4] text-center space-y-1">
                      <span className="text-[10px] font-bold text-[#78716C]">{label}</span>
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={() => handleBedChange(key, (beds[key] || 0) - 1)}
                          className="w-5 h-5 rounded-md bg-[#FAFAF9] hover:bg-[#F5F5F4] text-xs font-bold border border-[#E7E5E4]">-</button>
                        <span className="text-xs font-extrabold text-[#1C1917]">{beds[key] || 0}</span>
                        <button type="button" onClick={() => handleBedChange(key, (beds[key] || 0) + 1)}
                          className="w-5 h-5 rounded-md bg-[#FAFAF9] hover:bg-[#F5F5F4] text-xs font-bold border border-[#E7E5E4]">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Occupancy Cap (drives guest pricing limits) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="ds-overline block">Calculated Sleepers</label>
                  <input
                    type="number"
                    disabled
                    value={baseOccupancy}
                    className="ds-input w-full bg-[#F5F5F4] text-[#A8A29E] cursor-not-allowed font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-overline block">Max Adults Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={capacityAdults}
                    onChange={(e) => setCapacityAdults(Number(e.target.value))}
                    className="ds-input w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ds-overline block">Max Kids Limit</label>
                  <input
                    type="number"
                    min={0}
                    value={capacityChildren}
                    onChange={(e) => setCapacityChildren(Number(e.target.value))}
                    className="ds-input w-full"
                  />
                </div>
              </div>

              {/* Row 4: Bookmigo Per-Guest Pricing Tiers */}
              <div className="space-y-2 p-4 bg-[#FAFAF9] rounded-2xl border border-[#E7E5E4]">
                <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1B93A4]" />
                  <span>Price Tiers by Occupant Count</span>
                </h4>
                <p className="text-[11px] text-[#78716C] -mt-1">Define base prices for different numbers of guests.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {Array.from({ length: capacityAdults }).map((_, idx) => {
                    const guestsKey = String(idx + 1);
                    const val = priceTiers[guestsKey] || 3000;
                    return (
                      <div key={guestsKey} className="bg-white p-3 rounded-xl border border-[#E7E5E4] space-y-1.5">
                        <label className="text-[10px] font-bold text-[#78716C] uppercase block">{idx + 1} {idx === 0 ? 'Guest' : 'Guests'}</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#78716C]">₹</span>
                          <input
                            type="number"
                            required
                            min={100}
                            value={val}
                            onChange={(e) => handlePriceTierChange(guestsKey, Number(e.target.value))}
                            className="ds-input w-full pl-6 pr-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 5: Size, Inventory & Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="ds-overline block">Room Size (Sq Ft)</label>
                  <input
                    type="number"
                    min={10}
                    value={sizeSqft}
                    onChange={(e) => setSizeSqft(Number(e.target.value))}
                    className="ds-input w-full"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="ds-overline block">Physical Rooms Inventory</label>
                  <input
                    type="number"
                    min={1}
                    value={totalInventory}
                    onChange={(e) => setTotalInventory(Number(e.target.value))}
                    className="ds-input w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ds-overline block">Room Description</label>
                <textarea
                  placeholder="Explain room features, vistas, sleep configuration details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="ds-input w-full resize-none"
                />
              </div>

              {/* Row 6: Image Cover */}
              <div className="col-span-full">
                <MediaUpload
                  label="Room Cover Photo"
                  value={photoUrl}
                  onChange={setPhotoUrl}
                />
              </div>

              {/* Row 7: Amenities */}
              <div className="space-y-2">
                <label className="ds-overline block">Room Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {KNOWN_AMENITIES.map((amenity) => {
                    const isChecked = selectedAmenities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition text-left ${
                          isChecked 
                            ? 'bg-[#E6F5F7] border-[#1B93A4] text-[#1B93A4]' 
                            : 'bg-white border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9]'
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#E7E5E4] flex items-center justify-end gap-3 bg-[#FAFAF9]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="ds-btn-primary"
              >
                {editingId ? 'Save Changes' : 'Create Room Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
