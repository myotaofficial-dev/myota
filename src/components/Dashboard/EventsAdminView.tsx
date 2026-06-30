import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Sparkles, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

export const EventsAdminView: React.FC = () => {
  const { guestEvents, addGuestEvent, updateGuestEvent, deleteGuestEvent } = useHotel();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState(25);
  const [capacity, setCapacity] = useState(30);

  const openAddModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTitle('');
    setCategory('');
    setDescription('');
    setImage('');
    setFromDate(todayStr);
    setToDate(todayStr);
    setTime('10:00 AM - 04:00 PM');
    setPrice(25);
    setCapacity(30);
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
    setTime(evt.time);
    setPrice(evt.price);
    setCapacity(evt.capacity);
    setEditingId(evt.id);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title,
      category,
      description,
      image: image || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600",
      fromDate,
      toDate,
      time,
      price: Number(price),
      capacity: Number(capacity)
    };

    if (editingId) {
      updateGuestEvent(editingId, data);
    } else {
      addGuestEvent(data);
    }
    setModalOpen(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val * 80); // Format in Rupees for boltlabs consistency
  };

  const formatEventDate = (evt: any) => {
    const f = evt.fromDate || evt.date;
    const t = evt.toDate || evt.date;
    if (!f) return 'No date configured';
    if (f === t || !t) return f;
    return `${f} to ${t}`;
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{editingId ? 'Edit Event Details' : 'Schedule New Event'}</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">Timings</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11:00 AM - 02:00 PM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">Price per Guest ($)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg pl-9 pr-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">Max Capacity (Guests)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      required
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg pl-9 pr-3.5 py-2 text-sm text-zinc-900 outline-hidden transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-655 uppercase tracking-wide">Event Description</label>
                <textarea
                  required
                  placeholder="Explain event details, schedules, items included, or dress codes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition resize-none"
                />
              </div>

              <div className="p-5 border-t border-zinc-200 flex items-center justify-end gap-3 pt-4 bg-zinc-55">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-sm font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-550 hover:bg-amber-600 text-zinc-950 text-sm font-bold rounded-lg shadow-md transition"
                >
                  {editingId ? 'Save changes' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
