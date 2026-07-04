import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { EventSlot } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Sparkles, Calendar, Users, Clock } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

const EVENT_PRESETS = [
  {
    title: "Christmas Celebration",
    category: "Seasonal preset",
    description: "Inclusions: Private Stay Boating & Kayaking DJ Party Christmas Decorations Bonfire & Santa Cap Unlimited Food: BBQ, Dinner & Breakfast",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
    price: 25,
    capacity: 50,
    time: "06:00 PM - 11:30 PM"
  },
  {
    title: "New Year Fest",
    category: "Seasonal preset",
    description: "Inclusions: Private Stay NYE Party Fireworks & Flying Lantern New Year Cake Cutting Music & Bonfire Stargazing Unlimited Food: Snacks, Dinner & Breakfast",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=60",
    price: 35,
    capacity: 100,
    time: "07:00 PM - 01:00 AM"
  },
  {
    title: "Holi Party",
    category: "Seasonal preset",
    description: "Check-in / Check-out: Check-in: 13/03/25, 3:00 PM Check-out: 14/03/25, 4:00 PM Special Activities: Rain Dance with Live DJ / Music Play Holi with Organic Colours Thandai Live Music Host Games Open Air Movie Meals: Welcome Tea & Special Snacks BBQ: Paneer Tikka and Chicken Tikka Dinner: Butter Chicken, Matar Paneer, Dal Makhani, Roti, Rice, Salad, Sweet Dish Breakfast (8:00 AM): Poha, Bread Toast",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=60",
    price: 15,
    capacity: 80,
    time: "10:00 AM - 04:00 PM"
  },
  {
    title: "Valentine's Night",
    category: "Seasonal preset",
    description: "Special Inclusions: Private Candlelight Dinner by the Beach Private Tent Stay Love Theme - Live Music Special Valentine Decor Cake Cutting Couple Dance Couple Games DJ Party - Love Mashup Open Air Movie Screening Other Inclusions: Unlimited Food (Breakfast, Snacks & Dinner) Limited BBQ Western Toilets Indoor / Outdoor Games",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop&q=60",
    price: 30,
    capacity: 40,
    time: "05:00 PM - 11:00 PM"
  },
  {
    title: "Monsoon Magic",
    category: "Seasonal preset",
    description: "Inclusions: Private Tents with Bedding Monsoon Pool Midnight Rain Trek DJ Music & Live Music Unlimited Lunch (Veg) Unlimited Dinner (Veg) Movie Screening (Indoors) Unlimited Breakfast (Veg) Outdoor Activities (Archery, Shooting etc.) Indoor Games (Carrom, Chess, Ludo etc.) Notes: See itinerary for more details Limited slots for Monsoon Magic",
    image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&auto=format&fit=crop&q=60",
    price: 20,
    capacity: 60,
    time: "09:00 AM - 06:00 PM"
  }
];

export const EventsAdminView: React.FC = () => {
  const { guestEvents, addGuestEvent, updateGuestEvent, deleteGuestEvent, hotelInfo, updateHotelInfo } = useHotel();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [slots, setSlots] = useState<EventSlot[]>([]);
  const [priceAdult, setPriceAdult] = useState(2000);
  const [priceChild, setPriceChild] = useState(1000);
  const [target, setTarget] = useState<'all' | 'room_guest' | 'outside_guest'>('all');
  const [discount, setDiscount] = useState(0);

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

  const openAddModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTitle('');
    setCategory('');
    setDescription('');
    setImage('');
    setFromDate(todayStr);
    setToDate(todayStr);
    setSlots([{ id: `slot-${Date.now()}`, fromTime: '10:00', toTime: '16:00', capacity: 30 }]);
    setPriceAdult(2000);
    setPriceChild(1000);
    setTarget('all');
    setDiscount(0);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (evt: any) => {
    setTitle(evt.title);
    setCategory(evt.category);
    setDescription(evt.description);
    setImage(evt.image);
    setFromDate(evt.fromDate || evt.date || '');
    setToDate(evt.toDate || evt.date || '');
    
    // Support legacy timing settings
    const parsedSlots: EventSlot[] = evt.slots && evt.slots.length > 0
      ? evt.slots
      : [{ id: `slot-${Date.now()}`, fromTime: '10:00', toTime: '16:00', capacity: evt.capacity || 30 }];
    
    setSlots(parsedSlots);
    setPriceAdult(evt.priceAdult ?? evt.price ?? 2000);
    setPriceChild(evt.priceChild ?? evt.price ?? 1000);
    setTarget(evt.target || 'all');
    setDiscount(evt.discount ?? 0);
    setEditingId(evt.id);
    setModalOpen(true);
  };

  const applyPreset = (preset: typeof EVENT_PRESETS[0]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);
    setImage(preset.image);
    setFromDate(todayStr);
    setToDate(todayStr);
    
    // Parse preset time (e.g. "06:00 PM - 11:30 PM")
    let fromT = '10:00';
    let toT = '16:00';
    if (preset.time.includes(' - ')) {
      const parts = preset.time.split(' - ');
      const parseTimeStr = (s: string) => {
        const timePart = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timePart) {
          let hr = parseInt(timePart[1]);
          const min = timePart[2];
          const ampm = timePart[3].toUpperCase();
          if (ampm === 'PM' && hr < 12) hr += 12;
          if (ampm === 'AM' && hr === 12) hr = 0;
          return `${String(hr).padStart(2, '0')}:${min}`;
        }
        return s;
      };
      fromT = parseTimeStr(parts[0]);
      toT = parseTimeStr(parts[1]);
    }

    setSlots([{ id: `slot-${Date.now()}`, fromTime: fromT, toTime: toT, capacity: preset.capacity }]);
    setPriceAdult(preset.price * 80); // Convert preset price to INR
    setPriceChild(Math.round(preset.price * 50));
    setTarget('all');
    setDiscount(0);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slots.length === 0) {
      alert('Please add at least one timing slot.');
      return;
    }
    const firstSlot = slots[0];
    const defaultTime = `${formatTime12h(firstSlot.fromTime)} - ${formatTime12h(firstSlot.toTime)}`;
    const totalCapacity = slots.reduce((acc, slot) => acc + slot.capacity, 0);

    const data = {
      title,
      category,
      description,
      image: image || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
      fromDate,
      toDate,
      time: defaultTime,
      price: Number(priceAdult),
      capacity: totalCapacity,
      slots,
      priceAdult: Number(priceAdult),
      priceChild: Number(priceChild),
      target,
      discount: Number(discount)
    };

    if (editingId) {
      updateGuestEvent(editingId, data);
    } else {
      addGuestEvent(data);
    }
    setModalOpen(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
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

  const formatEventDate = (evt: any) => {
    const f = evt.fromDate || evt.date;
    const t = evt.toDate || evt.date;
    if (!f) return 'No date configured';
    const fFmt = convertToDDMMYYYY(f);
    const tFmt = convertToDDMMYYYY(t);
    if (f === t || !t) return fFmt;
    return `${fFmt} to ${tFmt}`;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Resort Events & Day Packages</h2>
          <p className="text-sm text-zinc-500">Configure special events, activities, or day-out packages that guests can book individually.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-amber-550 hover:bg-amber-600 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Section Title Configuration */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-3xs space-y-2">
        <label className="text-xs font-bold text-zinc-700">Events Section Title</label>
        <p className="text-[10px] text-zinc-400">Configure the main heading of the activities and events section on the homepage.</p>
        <input 
          type="text" 
          value={hotelInfo.eventsTitle || 'Resort Packages & Scheduled Activities'} 
          onChange={(e) => updateHotelInfo({ eventsTitle: e.target.value })}
          placeholder="e.g. Resort Packages & Scheduled Activities"
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-1.5 text-xs text-zinc-900 outline-hidden transition font-sans" 
        />
      </div>

      {/* Ready-made event templates */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-650 block">QUICK START</span>
          <h3 className="text-lg font-black text-zinc-900 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Ready-made event templates
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Start with a seasonal preset, then add the event dates manually before saving it to this property.
          </p>
        </div>

        {/* Templates horizontal grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {EVENT_PRESETS.map((preset) => (
            <div key={preset.title} className="bg-white rounded-2xl border border-zinc-200 shadow-3xs overflow-hidden flex flex-col hover:shadow-xs transition">
              {/* Top Banner Image with text overlay */}
              <div className="h-44 bg-zinc-100 relative">
                <img src={preset.image} alt={preset.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-left">
                  <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                    TEMPLATE
                  </span>
                  <h4 className="font-extrabold text-white text-sm leading-tight mt-0.5 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {preset.title}
                  </h4>
                </div>
              </div>

              {/* Bottom Inclusions text */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4 text-left">
                <p className="text-xs text-zinc-500 line-clamp-4 leading-relaxed font-sans">
                  {preset.description}
                </p>

                {/* Preset Footer */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">
                    SEASONAL PRESET
                  </span>
                  <button
                    onClick={() => applyPreset(preset)}
                    className="px-3.5 py-1.5 rounded-full text-[10px] font-extrabold bg-[#EBF5FF] text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {guestEvents.map(evt => (
          <div key={evt.id} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
            {/* Event Photo */}
            <div className="h-44 bg-zinc-100 relative">
              <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
              <span className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm">
                {evt.category}
              </span>
              <span className="absolute bottom-3 right-3 bg-zinc-950/80 text-amber-400 text-xs font-black px-2.5 py-1 rounded-lg">
                {formatCurrency(evt.price)} / guest
              </span>
            </div>

            {/* Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-bold text-zinc-900 text-sm">{evt.title}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{evt.description}</p>
                
                {/* Event Schedule Info */}
                <div className="pt-2.5 border-t border-zinc-100 grid grid-cols-1 gap-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-405 shrink-0" />
                    <span className="truncate">{formatEventDate(evt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-405 shrink-0" />
                    <span>Max {evt.capacity} Guests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-405 shrink-0" />
                    <span className="truncate">{evt.time}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => openEditModal(evt)}
                  className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this guest event?')) {
                      deleteGuestEvent(evt.id);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-zinc-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {guestEvents.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-400 text-xs">
            No events scheduled yet. Click "Create Event" to get started.
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{editingId ? 'Edit Event Details' : 'Schedule New Event'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset Boat Ride & Music"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adventure, Wellness"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1.5 col-span-full">
                  <MediaUpload
                    label="Cover Image"
                    value={image}
                    onChange={setImage}
                  />
                </div>
              </div>

              {/* Date Pickers (From Date & To Date) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">From Date</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">To Date</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
              </div>

              {/* Timing Slots */}
              <div className="space-y-2 border-t border-zinc-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Timing Slots</label>
                  <button
                    type="button"
                    onClick={() => {
                      setSlots(prev => [
                        ...prev,
                        { id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, fromTime: '', toTime: '', capacity: 10 }
                      ]);
                    }}
                    className="px-2 py-1 rounded bg-[#EBF5FF] text-blue-600 hover:bg-blue-100 text-[10px] font-bold tracking-wide transition cursor-pointer"
                  >
                    + Add Slot
                  </button>
                </div>
                {slots.length === 0 && (
                  <p className="text-[10px] text-zinc-450">At least one timing slot is required.</p>
                )}
                <div className="space-y-2">
                  {slots.map((slot, idx) => (
                    <div key={slot.id} className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">From</label>
                          <input
                            type="time"
                            required
                            value={slot.fromTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlots(prev => prev.map((s, i) => i === idx ? { ...s, fromTime: val } : s));
                            }}
                            className="w-full bg-white border border-zinc-200 focus:border-amber-500 rounded px-2 py-1 text-xs text-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">To</label>
                          <input
                            type="time"
                            required
                            value={slot.toTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlots(prev => prev.map((s, i) => i === idx ? { ...s, toTime: val } : s));
                            }}
                            className="w-full bg-white border border-zinc-200 focus:border-amber-500 rounded px-2 py-1 text-xs text-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Max Guests</label>
                          <input
                            type="number"
                            required
                            min={1}
                            value={slot.capacity === 0 ? '' : slot.capacity}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setSlots(prev => prev.map((s, i) => i === idx ? { ...s, capacity: val } : s));
                            }}
                            className="w-full bg-white border border-zinc-200 focus:border-amber-500 rounded px-2 py-1 text-xs text-zinc-800"
                          />
                        </div>
                      </div>
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSlots(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded mt-4 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing (INR) */}
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Adult Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={priceAdult === 0 ? '' : priceAdult}
                    onChange={(e) => setPriceAdult(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Child Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={priceChild === 0 ? '' : priceChild}
                    onChange={(e) => setPriceChild(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
              </div>

              {/* Target Visibility */}
              <div className="space-y-1.5 border-t border-zinc-100 pt-3">
                <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Target Guests</label>
                <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                  {(['all', 'room_guest', 'outside_guest'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTarget(t)}
                      className={`flex-1 py-1.8 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        target === t ? 'bg-[#1C1917] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'room_guest' ? 'Room Only' : 'Outside Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Slider */}
              <div className="space-y-1.5 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-650 uppercase tracking-wide">
                  <span>Event Discount</span>
                  <span className="text-red-650 font-extrabold text-sm">{discount}% OFF</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={99}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Event Description</label>
                <textarea
                  required
                  placeholder="Explain event details, schedules, items included, or dress codes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition resize-none"
                />
              </div>

              </div>
              <div className="p-5 border-t border-zinc-200 flex items-center justify-end gap-3 bg-zinc-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-650 text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-550 hover:bg-amber-600 text-zinc-950 text-xs font-bold rounded-lg shadow-xs transition"
                >
                  {editingId ? 'Save Changes' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
