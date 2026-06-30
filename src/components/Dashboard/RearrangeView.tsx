import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, Save, Check } from 'lucide-react';

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
  const { hotelInfo, updateHotelInfo } = useHotel();
  const [activeTab, setActiveTab] = useState<'sections' | 'menu'>('sections');
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

  const handleSave = () => {
    updateHotelInfo({
      sectionOrder,
      disabledSections,
      menuItemsOrder,
      disabledMenuItems
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Website Layout Configurator</h2>
          <p className="text-sm text-zinc-500">Toggle section visibility and drag or rearrange elements to customize the layout order of your website.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-md transition cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Changes Saved!' : 'Save Layout'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('sections')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition cursor-pointer ${
            activeTab === 'sections' 
              ? 'border-blue-500 text-blue-700' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Content Sections ({sectionOrder.length})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition cursor-pointer ${
            activeTab === 'menu' 
              ? 'border-blue-500 text-blue-700' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Header Navigation Links ({menuItemsOrder.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 max-w-2xl">
        {activeTab === 'sections' ? (
          <div className="space-y-3">
            <span className="text-4xs font-bold text-zinc-450 uppercase tracking-wider block mb-2">Drag-free Order Re-arranger</span>
            {sectionOrder.map((sectionId, idx) => {
              const isDisabled = disabledSections.includes(sectionId);
              const label = sectionLabels[sectionId] || sectionId;
              
              return (
                <div 
                  key={sectionId} 
                  className={`flex items-center justify-between p-3.5 rounded-lg border transition ${
                    isDisabled 
                      ? 'bg-zinc-50 border-zinc-150 opacity-60' 
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-zinc-400" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDisabled ? 'text-zinc-450 line-through' : 'text-zinc-800'}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Move Controls */}
                    <div className="flex bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-450 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === sectionOrder.length - 1}
                        className="p-1 text-zinc-450 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionId)}
                      className={`p-1.5 rounded-md border transition cursor-pointer ${
                        isDisabled 
                          ? 'border-rose-100 text-rose-500 hover:bg-rose-50' 
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
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
        ) : (
          <div className="space-y-3">
            <span className="text-4xs font-bold text-zinc-450 uppercase tracking-wider block mb-2">Header Menu Items Configuration</span>
            {menuItemsOrder.map((menuId, idx) => {
              const isDisabled = disabledMenuItems.includes(menuId);
              const label = menuLabels[menuId] || menuId;
              
              return (
                <div 
                  key={menuId} 
                  className={`flex items-center justify-between p-3.5 rounded-lg border transition ${
                    isDisabled 
                      ? 'bg-zinc-50 border-zinc-150 opacity-60' 
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-4 h-4 text-zinc-400" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDisabled ? 'text-zinc-450 line-through' : 'text-zinc-800'}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Move Controls */}
                    <div className="flex bg-zinc-50 border border-zinc-200 rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => moveMenuItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-zinc-450 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMenuItem(idx, 'down')}
                        disabled={idx === menuItemsOrder.length - 1}
                        className="p-1 text-zinc-450 hover:text-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => toggleMenuItem(menuId)}
                      className={`p-1.5 rounded-md border transition cursor-pointer ${
                        isDisabled 
                          ? 'border-rose-100 text-rose-500 hover:bg-rose-50' 
                          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'
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
        )}
      </div>
    </div>
  );
};
