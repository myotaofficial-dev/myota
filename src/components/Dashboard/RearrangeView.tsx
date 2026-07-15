import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, Save, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const sectionLabels: Record<string, string> = {
  hero: "Hero Banner Section",
  tagline: "Property Tagline Bar",
  about: "About Us Description",
  amenities: "Amenities Grid list",
  events: "Resort Activities & Events",
  rooms: "Rooms & Suites Listing",
  reviews: "Google Testimonials Carousel",
  'bento-gallery': "Resort Bento Gallery (GSAP)",
  policies: "Stay Rules & Guidelines",
  addons: "Add-ons & Upsells cards",
  faqs: "Accordion FAQs Panel",
  location: "Google Maps & Directions",
  instagram: "Instagram Social Feed"
};

const menuLabels: Record<string, string> = {
  about: "About Us",
  amenities: "Amenities",
  rooms: "Rooms",
  reviews: "Reviews",
  faqs: "FAQs",
  location: "Location"
};

export const RearrangeView: React.FC = () => {
  const { hotelInfo, updateHotelInfo, rooms, setRooms } = useHotel();
  const [activeTab, setActiveTab] = useState<'sections' | 'menu' | 'rooms'>('sections');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Layout order lists initialized from context or defaults
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    hotelInfo.sectionOrder || ['hero', 'tagline', 'about', 'amenities', 'events', 'rooms', 'reviews', 'bento-gallery', 'policies', 'addons', 'faqs', 'location', 'instagram']
  );
  const [disabledSections, setDisabledSections] = useState<string[]>(
    hotelInfo.disabledSections || []
  );

  const [menuItemsOrder, setMenuItemsOrder] = useState<string[]>(
    hotelInfo.menuItemsOrder || ['about', 'amenities', 'rooms', 'reviews', 'faqs', 'location']
  );
  const [disabledMenuItems, setDisabledMenuItems] = useState<string[]>(
    hotelInfo.disabledMenuItems || []
  );

  const [roomsListOrder, setRoomsListOrder] = useState<any[]>(rooms);

  // Keep roomsListOrder in sync if rooms are loaded/changed in parent context
  React.useEffect(() => {
    setRoomsListOrder(rooms);
  }, [rooms]);

  const handleSave = async () => {
    updateHotelInfo({
      sectionOrder,
      disabledSections,
      menuItemsOrder,
      disabledMenuItems
    });

    // Also update rooms order in context and database
    setRooms(roomsListOrder);
    try {
      const promises = roomsListOrder.map((room, idx) => 
        (supabase.from('room_categories') as any)
          .update({ display_order: idx })
          .eq('id', room.id)
      );
      await Promise.all(promises);
    } catch (err) {
      console.warn('[Supabase] Save rooms order error:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const toggleSection = (id: string) => {
    setDisabledSections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleMenuItem = (id: string) => {
    setDisabledMenuItems(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setSectionOrder(newOrder);
    }
  };

  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...menuItemsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setMenuItemsOrder(newOrder);
    }
  };

  const moveRoom = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...roomsListOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setRoomsListOrder(newOrder);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Website Layout Configurator</h2>
          <p className="text-sm text-[#78716C]">Toggle section visibility and drag or rearrange elements to customize the layout order of your website.</p>
        </div>
        <button
          onClick={handleSave}
          className="ds-btn-primary flex items-center gap-2 cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Changes Saved!' : 'Save Layout'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7E5E4]">
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition cursor-pointer ${
            activeTab === 'sections' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Content Sections ({sectionOrder.length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition cursor-pointer ${
            activeTab === 'menu' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Header Navigation Links ({menuItemsOrder.length})
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition cursor-pointer ${
            activeTab === 'rooms' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Room Categories ({roomsListOrder.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="ds-card p-6 max-w-2xl bg-white">
        {activeTab === 'sections' ? (
          <div className="space-y-3">
            <span className="ds-overline block mb-2">Drag-free Order Re-arranger</span>
            {sectionOrder.map((sectionId, idx) => {
              const isDisabled = disabledSections.includes(sectionId);
              const label = sectionLabels[sectionId] || sectionId;
              
              return (
                <div 
                  key={sectionId} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                    isDisabled 
                      ? 'bg-[#FAFAF9] border-[#E7E5E4] opacity-60' 
                      : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-[#78716C]" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDisabled ? 'text-zinc-400 line-through' : 'text-[#1C1917]'}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Move Controls */}
                    <div className="flex bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === sectionOrder.length - 1}
                        className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionId)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        isDisabled 
                          ? 'border-[#FEF0ED] text-[#E76F51] hover:bg-[#FEF0ED]' 
                          : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9]'
                      }`}
                      title={isDisabled ? 'Enable Section' : 'Disable Section'}
                    >
                      {isDisabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeTab === 'menu' ? (
          <div className="space-y-3">
            <span className="ds-overline block mb-2">Header Menu Items Configuration</span>
            {menuItemsOrder.map((menuId, idx) => {
              const isDisabled = disabledMenuItems.includes(menuId);
              const label = menuLabels[menuId] || menuId;
              
              return (
                <div 
                  key={menuId} 
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                    isDisabled 
                      ? 'bg-[#FAFAF9] border-[#E7E5E4] opacity-60' 
                      : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-[#78716C]" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDisabled ? 'text-zinc-400 line-through' : 'text-[#1C1917]'}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Move Controls */}
                    <div className="flex bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => moveMenuItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMenuItem(idx, 'down')}
                        disabled={idx === menuItemsOrder.length - 1}
                        className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleMenuItem(menuId)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        isDisabled 
                          ? 'border-[#FEF0ED] text-[#E76F51] hover:bg-[#FEF0ED]' 
                          : 'border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9]'
                      }`}
                      title={isDisabled ? 'Enable Menu Link' : 'Disable Menu Link'}
                    >
                      {isDisabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <span className="ds-overline block mb-2">Room Category Listing Order</span>
            {roomsListOrder.map((room, idx) => (
              <div 
                key={room.id} 
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#E7E5E4] hover:border-[#1B93A4] bg-white transition"
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-4 h-4 text-[#78716C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                    {room.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Move Controls */}
                  <div className="flex bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => moveRoom(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRoom(idx, 'down')}
                      disabled={idx === roomsListOrder.length - 1}
                      className="p-1 text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
