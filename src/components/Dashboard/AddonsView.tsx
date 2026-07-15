import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, PlusCircle } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

export const AddonsView: React.FC = () => {
  const { addons, addAddon, updateAddon, deleteAddon, hotelInfo, updateHotelInfo } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState(500);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [pricingType, setPricingType] = useState<'per_head' | 'single_event'>('single_event');

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
    setPrice(500);
    setDescription('');
    setImage('');
    setPricingType('single_event');
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditModal = (addon: any) => {
    setName(addon.name);
    setPrice(addon.price);
    setDescription(addon.description);
    setImage(addon.image || '');
    setPricingType(addon.pricingType || 'single_event');
    setEditingId(addon.id);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, price: Number(price), description, image, pricingType };

    if (editingId) {
      updateAddon(editingId, data);
    } else {
      addAddon(data);
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Stay Add-ons & Upsells</h2>
          <p className="text-sm text-[#78716C]">Provide extra services (e.g. breakfasts, spa sessions) that guests can purchase during booking.</p>
        </div>
        <button
          onClick={openAddModal}
          className="ds-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Add-on</span>
        </button>
      </div>

      {/* Section Title Configuration */}
      <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-xs space-y-2 text-left">
        <label className="text-xs font-bold text-zinc-700">Add-ons Section Title</label>
        <p className="text-[10px] text-zinc-400">Configure the main heading of the stay add-ons and experiences section on the homepage.</p>
        <input 
          type="text" 
          value={hotelInfo.addonsTitle || 'Eco-Upsells & Local Experiences'} 
          onChange={(e) => updateHotelInfo({ addonsTitle: e.target.value })}
          placeholder="e.g. Eco-Upsells & Local Experiences"
          className="ds-input w-full text-xs py-2.5" 
        />
      </div>

      {/* Grid of Addons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {addons.map(addon => {
          const displayPrice = addon.price < 100 ? addon.price * 83 : addon.price; // fallback scaling if loaded legacy USD mock data
          return (
            <div key={addon.id} className="ds-card p-5 flex flex-col space-y-4 hover:shadow-md transition duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-[#1C1917]">{addon.name}</h3>
                  <p className="text-xs text-[#78716C] line-clamp-2">{addon.description}</p>
                </div>
                <span className="ds-badge ds-badge-teal text-[11px] shrink-0 font-extrabold flex flex-col items-end">
                  <span>{formatRupees(displayPrice)}</span>
                  <span className="text-[8px] font-medium text-zinc-550 uppercase tracking-wider mt-0.5">
                    {addon.pricingType === 'per_head' ? 'Per Head' : 'Per Event'}
                  </span>
                </span>
              </div>

              {addon.image && (
                <div className="h-32 rounded-xl overflow-hidden bg-[#FAFAF9]">
                  <img src={addon.image} alt={addon.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end gap-2 mt-auto">
                <button
                  onClick={() => openEditModal(addon)}
                  className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this addon upsell?')) {
                      deleteAddon(addon.id);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {addons.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#A8A29E]">
            No addons defined yet. Click "Create Add-on" to get started.
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-[#E7E5E4]">
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <PlusCircle className="w-5 h-5 text-[#1B93A4]" />
                <span>{editingId ? 'Edit Add-on' : 'Create New Add-on'}</span>
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="ds-overline block">Add-on Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guided Trekking"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ds-input w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-overline block">Price per Stay (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#78716C]">
                    <span>₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={10}
                    value={price === 0 ? '' : price}
                    onChange={(e) => setPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="ds-input w-full pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="ds-overline block">Pricing Mode</label>
                <div className="flex items-center gap-6 mt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      value="per_head"
                      checked={pricingType === 'per_head'}
                      onChange={() => setPricingType('per_head')}
                      className="w-4 h-4 accent-[#1B93A4] cursor-pointer"
                    />
                    <span>Per Head Rate</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pricingType"
                      value="single_event"
                      checked={pricingType === 'single_event'}
                      onChange={() => setPricingType('single_event')}
                      className="w-4 h-4 accent-[#1B93A4] cursor-pointer"
                    />
                    <span>Single Event Fee</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ds-overline block">Add-on Description</label>
                <textarea
                  required
                  placeholder="Describe details, pricing terms, or items included..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="ds-input w-full resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <MediaUpload
                  label="Add-on Cover Photo"
                  value={image}
                  onChange={setImage}
                />
              </div>

              <div className="p-5 border-t border-[#E7E5E4] flex items-center justify-end gap-3 pt-4 bg-[#FAFAF9] -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary"
                >
                  {editingId ? 'Save changes' : 'Create Add-on'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
