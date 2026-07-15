import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  Settings, CreditCard, Layers, CheckCircle, Trash2, Code 
} from 'lucide-react';

export const WebsiteSettingsView: React.FC = () => {
  const { 
    hotelInfo, updateHotelInfo, 
    currentTemplate, setTemplate, 
    customPages, addCustomPage, deleteCustomPage 
  } = useHotel();

  // Color forms
  const [primaryColor, setPrimaryColor] = useState(hotelInfo.primaryColor);
  const [bgColor, setBgColor] = useState(hotelInfo.bgColor);
  const [analyticsId, setAnalyticsId] = useState(hotelInfo.googleAnalyticsId);
  const [facebookId, setFacebookId] = useState(hotelInfo.facebookPixelId);

  // Stripe Mock
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_51Mz...MOCK');
  const [stripePublishableKey, setStripePublishableKey] = useState('pk_test_51Mz...MOCK');
  const [gatewayEnabled, setGatewayEnabled] = useState(true);

  // Custom Page Creator
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [isAddingPage, setIsAddingPage] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleBrandingSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateHotelInfo({
      primaryColor,
      bgColor,
      googleAnalyticsId: analyticsId,
      facebookPixelId: facebookId
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle) return;

    addCustomPage({
      title: pageTitle,
      slug: pageSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') || pageTitle.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      content: pageContent || `<h1>${pageTitle}</h1><p>Welcome to ${pageTitle} page.</p>`,
      active: true
    });

    setPageTitle('');
    setPageSlug('');
    setPageContent('');
    setIsAddingPage(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Publish Settings & Customizations</h2>
          <p className="text-sm text-[#78716C]">Configure theme layout styles, setup checkout processors, and inject marketing tags.</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5EF] border border-[#2D6A4F] text-[#2D6A4F] text-xs font-semibold rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span>Theme settings updated!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns: Customization & Branding */}
        <div className="xl:col-span-2 space-y-6">
          {/* Template Selection */}
          <div className="ds-card p-6 space-y-4">
            <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Layers className="w-4.5 h-4.5 text-[#1B93A4]" />
              <span>Select Active Guest Theme</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Luxury Option */}
              <button
                type="button"
                onClick={() => setTemplate('luxury')}
                className={`p-5 rounded-xl border-2 text-left transition relative select-none flex flex-col space-y-3 ${
                  currentTemplate === 'luxury' 
                    ? 'border-[#1B93A4] bg-[#E6F5F7] ring-1 ring-[#1B93A4]' 
                    : 'border-[#E7E5E4] bg-[#FAFAF9]/50 hover:bg-[#FAFAF9]'
                }`}
              >
                {currentTemplate === 'luxury' && (
                  <span className="absolute top-4 right-4 w-4.5 h-4.5 bg-[#1B93A4] text-zinc-955 font-bold text-3xs rounded-full flex items-center justify-center text-white">
                    ✓
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-[#1C1917] text-sm">👑 Luxury Theme</h4>
                  <span className="text-4xs text-[#C9822F] font-bold uppercase tracking-wider">Grand Palace Style</span>
                </div>
                <p className="text-4xs text-[#78716C] leading-relaxed font-semibold">
                  Serif typography, gold accents, dark gold taglines, and elegant black details. Best for Boutique Hotels and Luxury Resorts.
                </p>
              </button>

              {/* Organic Option */}
              <button
                type="button"
                onClick={() => setTemplate('organic')}
                className={`p-5 rounded-xl border-2 text-left transition relative select-none flex flex-col space-y-3 ${
                  currentTemplate === 'organic' 
                    ? 'border-[#1B93A4] bg-[#E6F5F7] ring-1 ring-[#1B93A4]' 
                    : 'border-[#E7E5E4] bg-[#FAFAF9]/50 hover:bg-[#FAFAF9]'
                }`}
              >
                {currentTemplate === 'organic' && (
                  <span className="absolute top-4 right-4 w-4.5 h-4.5 bg-[#1B93A4] text-zinc-955 font-bold text-3xs rounded-full flex items-center justify-center text-white">
                    ✓
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-[#1C1917] text-sm">🌿 Organic Theme</h4>
                  <span className="text-4xs text-[#2D6A4F] font-bold uppercase tracking-wider">Natural Warm Style</span>
                </div>
                <p className="text-4xs text-[#78716C] leading-relaxed font-semibold">
                  Fraunces serif headings, sage green accents, clay terracotta tagline borders, warm sand cards. Best for Eco-Lodges and Wellness retreats.
                </p>
              </button>

              {/* Editorial Option */}
              <button
                type="button"
                onClick={() => setTemplate('editorial')}
                className={`p-5 rounded-xl border-2 text-left transition relative select-none flex flex-col space-y-3 ${
                  currentTemplate === 'editorial' 
                    ? 'border-[#1B93A4] bg-[#E6F5F7] ring-1 ring-[#1B93A4]' 
                    : 'border-[#E7E5E4] bg-[#FAFAF9]/50 hover:bg-[#FAFAF9]'
                }`}
              >
                {currentTemplate === 'editorial' && (
                  <span className="absolute top-4 right-4 w-4.5 h-4.5 bg-[#1B93A4] text-zinc-955 font-bold text-3xs rounded-full flex items-center justify-center text-white">
                    ✓
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-[#1C1917] text-sm">📰 Editorial Theme</h4>
                  <span className="text-4xs text-[#78716C] font-bold uppercase tracking-wider">Magazine Style</span>
                </div>
                <p className="text-4xs text-[#78716C] leading-relaxed font-semibold">
                  Bodoni Moda serif italic headings, geometric body text, high contrast monochrome layouts with bold black borders. Best for urban boutique hostels.
                </p>
              </button>
            </div>
          </div>
          {/* Theme custom colors & scripts */}
          <form onSubmit={handleBrandingSave} className="ds-card p-6 space-y-5">
            <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <Settings className="w-4.5 h-4.5 text-[#1B93A4]" />
              <span>Theme Colors & Analytics</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="ds-overline block">Primary Button Color</label>
                <div className="flex gap-2.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 border border-[#E7E5E4] rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="ds-input flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ds-overline block">Background Canvas Accent</label>
                <div className="flex gap-2.5">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 border border-[#E7E5E4] rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="ds-input flex-1 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Analytics Injection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="ds-overline flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Google Analytics Measurement ID</span>
                </label>
                <input
                  type="text"
                  placeholder="G-XXXXXXXXXX"
                  value={analyticsId}
                  onChange={(e) => setAnalyticsId(e.target.value)}
                  className="ds-input w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-overline flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Facebook Pixel ID</span>
                </label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={facebookId}
                  onChange={(e) => setFacebookId(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-[#E7E5E4] pt-4">
              <button
                type="submit"
                className="ds-btn-primary"
              >
                Save Theme Details
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Payments & Custom Pages */}
        <div className="space-y-6">
          
          {/* Payment Gateway Config */}
          <div className="ds-card p-6 space-y-4 bg-white">
            <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-[#1B93A4]" />
              <span>Payment Gateway Setup</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl text-left">
                <span className="text-xs font-bold text-zinc-700">Enable Stripe Gateway</span>
                <input
                  type="checkbox"
                  checked={gatewayEnabled}
                  onChange={(e) => setGatewayEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 accent-[#1B93A4] rounded-sm cursor-pointer"
                />
              </div>

              {gatewayEnabled && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-150 text-left">
                  <div className="space-y-1">
                    <label className="ds-overline block">Publishable Key</label>
                    <input
                      type="text"
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      className="ds-input w-full font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ds-overline block">Secret Key</label>
                    <input
                      type="password"
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      className="ds-input w-full font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Pages list */}
          <div className="ds-card p-6 space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-2">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-[#1B93A4]" />
                <span>Custom Static Pages</span>
              </h3>
              <button
                onClick={() => setIsAddingPage(!isAddingPage)}
                className="text-xs font-semibold text-[#1B93A4] hover:text-[#157A8A] flex items-center gap-0.5"
              >
                <span>{isAddingPage ? 'Close' : 'Add New'}</span>
              </button>
            </div>

            {/* Custom page add subform */}
            {isAddingPage ? (
              <form onSubmit={handleAddPage} className="p-3.5 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-150 text-left">
                <div className="space-y-1">
                  <label className="ds-overline block">Page Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hiking Tours"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="ds-input w-full text-xs py-1.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="ds-overline block">Slug Path</label>
                  <input
                    type="text"
                    placeholder="e.g. hiking-tours"
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    className="ds-input w-full text-xs py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="ds-btn-primary w-full py-2 text-xs"
                >
                  Create Custom Page
                </button>
              </form>
            ) : (
              <div className="space-y-2 text-left">
                {customPages.map(page => (
                  <div key={page.id} className="p-3 bg-[#FAFAF9] rounded-xl flex items-center justify-between border border-[#E7E5E4]">
                    <div>
                      <h4 className="font-bold text-xs text-[#1C1917] leading-none">{page.title}</h4>
                      <span className="text-[10px] text-zinc-450 font-mono">/{page.slug}</span>
                    </div>

                    <button
                      onClick={() => deleteCustomPage(page.id)}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {customPages.length === 0 && (
                  <div className="text-center py-4 text-[#A8A29E] text-xs">No custom pages added.</div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
