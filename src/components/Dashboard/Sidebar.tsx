import React from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  Info, FileText, Sparkles, MapPin, Phone, UserCheck, 
  Image, BedDouble, Calendar, Globe, Plus, BadgePercent, HelpCircle,
  Move, Mail, MessageSquare, ShieldCheck, Eye, CreditCard, Layout
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export const Sidebar: React.FC = () => {
  const { selectedView, setSelectedView, setEditorFocus, setCanvasMode } = useHotel();

  const navigationGroups: SidebarGroup[] = [
    {
      title: "Property",
      items: [
        { id: "property", label: "Basic Info", icon: Info },
        { id: "rearrange", label: "Rearrange", icon: Move },
        { id: "hero", label: "Hero Banner", icon: Image },
        { id: "description", label: "Description", icon: FileText },
        { id: "amenities", label: "Amenities", icon: Sparkles },
        { id: "location-map", label: "Location Map", icon: MapPin },
        { id: "contact", label: "Contact", icon: Phone },
        { id: "owners", label: "Owners", icon: UserCheck }
      ]
    },
    {
      title: "Booking",
      items: [
        { id: "rooms", label: "Rooms", icon: BedDouble },
        { id: "pricing-calendar", label: "Pricing & Calendar", icon: Calendar },
        { id: "channel-manager", label: "Channel Manager", icon: Globe },
        { id: "addons", label: "Add-ons", icon: Plus },
        { id: "coupons", label: "Coupons", icon: BadgePercent }
      ]
    },
    {
      title: "Guest Experience",
      items: [
        { id: "events-admin", label: "Events", icon: Sparkles },
        { id: "media", label: "Highlights", icon: Image },
        { id: "messages", label: "Guest Messages", icon: Mail }
      ]
    },
    {
      title: "Policies & FAQs",
      items: [
        { id: "testimonials-admin", label: "Testimonials", icon: MessageSquare },
        { id: "faqs-admin", label: "FAQs", icon: HelpCircle },
        { id: "policies-admin", label: "Policies", icon: ShieldCheck }
      ]
    },
    {
      title: "Website",
      items: [
        { id: "preview-admin", label: "Preview", icon: Eye },
        { id: "payment-gateway", label: "Payment Gateway", icon: CreditCard },
        { id: "domain", label: "Website Address", icon: Globe },
        { id: "custom-pages", label: "Custom Pages", icon: Layout },
        { id: "website-settings", label: "Marketing Integrations", icon: Info }
      ]
    }
  ];

  return (
    <aside className="w-56 flex flex-col h-full shrink-0 select-none border-r" style={{ background: 'var(--ds-bg)', borderColor: 'var(--ds-border)' }}>
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-5 scrollbar-none">
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1 text-left">
            <h3 className="ds-overline px-3 mb-2">{group.title}</h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = selectedView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (item.id === 'preview-admin') {
                          setEditorFocus('canvas');
                          setCanvasMode('editor');
                        } else {
                          setSelectedView(item.id);
                          setEditorFocus('form');
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'font-bold'
                          : 'hover:bg-white'
                      }`}
                      style={isActive ? {
                        background: 'var(--ds-primary-subtle)',
                        color: 'var(--ds-primary)',
                      } : {
                        color: 'var(--ds-text-secondary)',
                      }}
                    >
                      <Icon 
                        className="w-3.5 h-3.5 shrink-0" 
                        style={{ color: isActive ? 'var(--ds-primary)' : 'var(--ds-text-muted)' }} 
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
};
