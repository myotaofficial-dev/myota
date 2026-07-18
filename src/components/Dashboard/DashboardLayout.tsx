import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Sidebar } from './Sidebar';
import { PreviewFrame } from './PreviewFrame';
import {
  ChevronLeft, Eye, Send, Monitor, Tablet, Smartphone, Check, Menu, X
} from 'lucide-react';

// Form dispatcher
import { RoomsView } from './RoomsView';
import { PricingCalendarView } from './PricingCalendarView';
import { DomainView } from './DomainView';
import { MediaView } from './MediaView';
import { ChannelManagerView } from './ChannelManagerView';
import { AddonsView } from './AddonsView';
import { CouponsView } from './CouponsView';
import { GuestMessagesView } from './GuestMessagesView';
import { FaqPolicyReviewView } from './FaqPolicyReviewView';
import { WebsiteSettingsView } from './WebsiteSettingsView';
import { RearrangeView } from './RearrangeView';
import { EventsAdminView } from './EventsAdminView';
import { PaymentGatewayView } from './PaymentGatewayView';
import { CustomPagesView } from './CustomPagesView';
import { CancellationPoliciesView } from './CancellationPoliciesView';
import { OffersPromotionsView } from './OffersPromotionsView';

export const DashboardLayout: React.FC = () => {
  const {
    selectedView, setAppMode, activePropertyId, setActivePropertyId,
    propertiesList, selectedTheme, setSelectedTheme, canvasMode, setCanvasMode,
    previewDevice, setPreviewDevice, publishProperty, editorFocus, setEditorFocus,
    hotelInfo
  } = useHotel();

  const [publishSuccess, setPublishSuccess] = useState(false);
  const [isEditorSidebarOpen, setIsEditorSidebarOpen] = useState(false);

  const handlePublish = () => {
    publishProperty(activePropertyId);
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 3000);
  };

  const handlePropertyChange = (id: string) => {
    const prop = propertiesList.find(p => p.id === id);
    if (prop) {
      setActivePropertyId(id);
    }
  };

  // Render form panel dispatcher
  const renderActiveForm = () => {
    switch (selectedView) {
      case 'property':
      case 'hero':
      case 'description':
      case 'amenities':
      case 'location-map':
      case 'contact':
      case 'owners':
        return <DomainView />;
      case 'media':
      case 'media-videos':
         return <MediaView />;
      case 'rooms':
        return <RoomsView />;
      case 'pricing-calendar':
        return <PricingCalendarView />;
      case 'channel-manager':
        return <ChannelManagerView />;
      case 'addons':
        return <AddonsView />;
      case 'cancellation-policies':
        return <CancellationPoliciesView />;
      case 'coupons':
        return <CouponsView />;
      case 'offers-promotions':
        return <OffersPromotionsView />;
      case 'messages':
        return <GuestMessagesView />;
      case 'testimonials-admin':
        return <FaqPolicyReviewView defaultTab="reviews" />;
      case 'faqs-admin':
        return <FaqPolicyReviewView defaultTab="faqs" />;
      case 'policies-admin':
        return <FaqPolicyReviewView defaultTab="policies" />;
      case 'rearrange':
        return <RearrangeView />;
      case 'events-admin':
        return <EventsAdminView />;
      case 'payment-gateway':
        return <PaymentGatewayView />;
      case 'custom-pages':
        return <CustomPagesView />;
      case 'faq-policy-review':
        return <FaqPolicyReviewView />;
      case 'website-settings':
        return <WebsiteSettingsView />;
      default:
        return <DomainView />;
    }
  };

  // Check if we are in full screen guest preview mode
  const isGuestMode = canvasMode === 'guest';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] overflow-hidden text-zinc-800 animate-in fade-in duration-150">

      {/* Top Editor Navigation Bar (Image 2) */}
      <header className="bg-white border-b border-zinc-200 h-14 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none">

        {/* Left Side: Back button, Mobile Menu button & Brand */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setAppMode('dashboard')}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-950 transition cursor-pointer"
            title="Back to Platform Dashboard"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setIsEditorSidebarOpen(true)}
            className="lg:hidden p-1.5 hover:bg-[#FAFAF9] rounded-lg text-zinc-650 border border-zinc-250 transition"
            title="Open Editor Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-[#E7E5E4] pl-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold" style={{ background: 'var(--ds-primary)' }}>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 11h-6V3l-7 10h6v8l7-10z" />
              </svg>
            </div>
            <h1 className="font-extrabold text-xs text-[#1C1917] tracking-widest uppercase" style={{ fontFamily: 'Outfit, sans-serif' }}>MyOTA Editor</h1>
          </div>
        </div>

        {/* Center: Theme Selector & Property Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme selector */}
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="hidden md:block bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-2.5 py-1 text-4xs font-bold uppercase tracking-wider text-[#78716C] outline-hidden focus:border-[#1B93A4] cursor-pointer"
          >
            <option value="THEME: ORGANIC NATURAL">Theme: Organic/Natural</option>
          </select>

          {/* Property Dropdown */}
          <select
            value={activePropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-2 sm:px-3 py-1 text-xs text-[#1C1917] font-bold outline-hidden focus:border-[#1B93A4] cursor-pointer max-w-[120px] sm:max-w-none"
          >
            {propertiesList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Right Side: Preview & Publish Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Publish Alerts */}
          {publishSuccess && (
            <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 bg-[#E8F5EF] border border-[#2D6A4F] text-[#2D6A4F] text-3xs font-semibold rounded-lg animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5 text-[#2D6A4F] font-bold" />
              <span>Site published live!</span>
            </div>
          )}

          {editorFocus === 'form' ? (
            /* Back to Preview Button (Image 2 style) */
            <button
              onClick={() => setEditorFocus('canvas')}
              className="flex items-center gap-1.5 bg-white border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] font-bold text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg transition shadow-3xs cursor-pointer"
            >
              <span className="hidden sm:inline">← Back to Preview</span>
              <span className="sm:hidden">← Preview</span>
            </button>
          ) : (
            /* Guest Mode Preview Toggle */
            <button
              onClick={() => {
                const sub = hotelInfo?.subdomain || 'grandlake';
                window.open(`/?preview=${sub}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer bg-white border-[#E7E5E4] text-[#78716C] hover:bg-[#FAFAF9]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          {/* Publish */}
          <button
            onClick={handlePublish}
            className="flex items-center gap-1.5 text-white font-bold text-xs px-3 sm:px-4 py-1.5 rounded-lg transition shadow-xs cursor-pointer ds-btn-primary"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Publish Site</span>
            <span className="sm:hidden">Publish</span>
          </button>
        </div>

      </header>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">

        {isGuestMode ? (
          /* Full screen Guest Preview Mode */
          <div className="flex-1 flex flex-col h-full bg-zinc-200 overflow-hidden relative animate-in fade-in duration-150">
            <div className="flex-1 flex flex-col overflow-hidden">
              <PreviewFrame />
            </div>
          </div>
        ) : (
          /* Editor Workspace */
          <>
            {/* Desktop Sidebar (inline) */}
            <div className="hidden lg:block h-full shrink-0">
              <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay Backdrop */}
            {isEditorSidebarOpen && (
              <div 
                className="lg:hidden fixed inset-0 z-45 bg-black/45 backdrop-blur-xs"
                onClick={() => setIsEditorSidebarOpen(false)}
              />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside 
              className={`lg:hidden fixed inset-y-0 left-0 z-50 w-56 bg-white border-r h-full flex flex-col transition-transform duration-300 ease-in-out transform ${
                isEditorSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="p-4 border-b flex items-center justify-between bg-zinc-50 shrink-0">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Editor Menu</span>
                <button 
                  onClick={() => setIsEditorSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-500 cursor-pointer border border-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" onClick={() => setIsEditorSidebarOpen(false)}>
                <Sidebar />
              </div>
            </aside>

            {editorFocus === 'form' ? (
              /* Form Focus Mode (Image 2 Layout) - Centers settings in spacious layout */
              <main className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4 sm:p-8 scrollbar-thin scrollbar-thumb-zinc-200 flex justify-center animate-in fade-in slide-in-from-right duration-200">
                <div className="w-full max-w-4xl">
                  {renderActiveForm()}
                </div>
              </main>
            ) : (
              /* Canvas Focus Mode (Clean site preview canvas) */
              <div className="flex-1 flex flex-col h-full bg-zinc-200 overflow-hidden relative animate-in fade-in slide-in-from-left duration-200">

                {/* Preview frame wrapper */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <PreviewFrame />
                </div>

                {/* Bottom Viewport Floating Bar widget (Image 2) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E7E5E4] px-4 py-2 flex items-center justify-between gap-5 z-20 select-none">

                  {/* Viewport toggles */}
                  <div className="flex items-center bg-[#FAFAF9] p-0.5 rounded-xl border border-[#E7E5E4]">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${previewDevice === 'desktop' ? 'bg-white text-[#1B93A4] shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'}`}
                      title="Desktop View"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('tablet')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${previewDevice === 'tablet' ? 'bg-white text-[#1B93A4] shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'}`}
                      title="Tablet View"
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${previewDevice === 'mobile' ? 'bg-white text-[#1B93A4] shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'}`}
                      title="Mobile View"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Zoom tag */}
                  <span className="text-3xs font-bold text-[#A8A29E] uppercase tracking-wider">
                    100%
                  </span>

                  {/* Editor Canvas Mode Toggle */}
                  <button
                    onClick={() => setCanvasMode(canvasMode === 'editor' ? 'guest' : 'editor')}
                    className="px-3.5 py-1.5 text-3xs font-extrabold uppercase tracking-wider border border-[#E7E5E4] bg-[#FAFAF9] text-[#78716C] hover:bg-[#F5F5F4] rounded-xl transition cursor-pointer"
                  >
                    Guest View
                  </button>

                </div>
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
};
