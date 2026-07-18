import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  Globe, Smartphone, ArrowRight,
  CheckCircle2, ChevronDown, Check, Star, Zap,
  MessageCircle, ShieldAlert, BadgeCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setAppMode } = useHotel();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [problemIndex, setProblemIndex] = useState(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const problemSolutions = [
    {
      problem: "I lose 20% of every booking to high OTA commissions.",
      solution: "Keep 100% of your revenue. Guests book directly on your website and payments route straight to your bank account with zero-commission."
    },
    {
      problem: "My website cost me ₹50,000 and I still can't update it myself.",
      solution: "Myota costs less than ₹30/day, and you can edit rooms, photos, policies and rates instantly from your phone."
    },
    {
      problem: "My website conversion rate is below industry average.",
      solution: "We provide clean, high-performance templates optimized specifically to turn traffic into bookings."
    },
    {
      problem: "Our team spends hours guiding guests to the property on check-in day.",
      solution: "Our WhatsApp tools automatically deliver location pins, maps, and directions to guests before they arrive."
    },
    {
      problem: "Check-in takes forever, guests queue up, and my staff gets overwhelmed.",
      solution: "Let guests perform digital self check-ins. They receive room details, guidelines, and Wi-Fi codes automatically."
    }
  ];

  const coreCards = [
    {
      title: "Your Own Website",
      description: "A premium, lightning-fast website where guests can book rooms directly. No middleman, no OTA fees, and zero commissions.",
      points: ["Own Payment Gateway", "Custom Domains", "Zero Commissions"],
      badge: "Digital Storefront",
      icon: Globe
    },
    {
      title: "Smart WhatsApp Tools",
      description: "People open WhatsApp 98% of the time. Automatically follow up with guests who drop off mid-checkout and confirm stays instantly.",
      points: ["Cart Recovery", "Automated Confirmations", "Digital Check-ins"],
      badge: "Automated Growth",
      icon: MessageCircle
    },
    {
      title: "The Operator Dashboard",
      description: "Check reservations, update room availability, adjust rates dynamically, and stay synced with major channels - all from one pocket dashboard.",
      points: ["Calendar Management", "Dynamic Pricing Rules", "Real-time Analytics"],
      badge: "Pocket PMS",
      icon: Smartphone
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] font-sans antialiased selection:bg-[#1B93A4]/15 selection:text-[#1B93A4]">
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/80 backdrop-blur-lg border-b border-zinc-200/60 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: '#1B93A4' }}>
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 11h-6V3l-7 10h6v8l7-10z" />
              </svg>
            </div>
            <span className="font-black text-xl tracking-tight text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Myota
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-[#78716C]">
            <a href="#ecosystem" className="hover:text-[#1B93A4] transition-colors">Product</a>
            <a href="#WhatsApp" className="hover:text-[#1B93A4] transition-colors">WhatsApp Tools</a>
            <a href="#pricing" className="hover:text-[#1B93A4] transition-colors">Pricing</a>
            <a href="#faqs" className="hover:text-[#1B93A4] transition-colors">FAQs</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                localStorage.setItem('myota_onboarding_mode', 'signin');
                setAppMode('onboarding');
              }}
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => setAppMode('onboarding')}
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-white transition-all hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
              style={{ background: '#1C1917' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Hero Content */}
          <div className="lg:col-span-7 space-y-7 text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1B93A4]/10 text-[#1B93A4] text-[10px] font-bold tracking-widest uppercase">
              <Zap className="w-3.5 h-3.5 fill-current" /> AI Powered Hotel Builder
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-900 leading-[1.1]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Launch Your Hotel Website <br />
              <span className="text-[#1B93A4]">In Minutes.</span>
            </h1>
            <p className="text-sm md:text-base text-[#78716C] leading-relaxed max-w-xl font-medium">
              Break free from high OTA commissions. Build a gorgeous digital storefront with a built-in booking engine and pocket dashboard, fully automated via Myota.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                onClick={() => setAppMode('onboarding')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1C1917] hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-lg hover:shadow-xl cursor-pointer"
              >
                Launch Your Property <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAppMode('onboarding')}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
              >
                Book 15-Min Demo
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-zinc-200/80 max-w-lg">
              <div>
                <span className="text-3xl font-black text-zinc-900 block" style={{ fontFamily: 'Outfit, sans-serif' }}>75%</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8A29E] block mt-1">Direct Bookings Uplift</span>
              </div>
              <div>
                <span className="text-3xl font-black text-zinc-900 block" style={{ fontFamily: 'Outfit, sans-serif' }}>₹3 Lakh</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8A29E] block mt-1">Commissions Saved</span>
              </div>
              <div>
                <span className="text-3xl font-black text-zinc-900 block" style={{ fontFamily: 'Outfit, sans-serif' }}>Zero</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8A29E] block mt-1">Setup Cost</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-[4/5] bg-zinc-950/5 rounded-[36px] p-4 border border-zinc-200 shadow-2xl overflow-hidden flex flex-col justify-between">
              
              {/* Header inside mockup */}
              <div className="flex items-center justify-between px-3 py-2 bg-white/70 backdrop-blur-md rounded-2xl border border-zinc-200/50 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">✓</div>
                  <span className="text-[10px] font-bold text-zinc-800">Direct Payment Configured</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#1B93A4] bg-[#1B93A4]/10 px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>

              {/* Central mock property visual */}
              <div className="my-auto space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-md text-left space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900">Sri K Residency</h4>
                      <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">Salem District, Tamil Nadu</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                  </div>
                  <img
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600"
                    alt="Sri K Residency"
                    className="w-full h-36 object-cover rounded-2xl"
                  />
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Starts From</span>
                      <p className="text-lg font-black text-zinc-900 mt-0.5">₹1,800 <span className="text-xs text-zinc-400 font-medium">/ night</span></p>
                    </div>
                    <button onClick={() => setAppMode('onboarding')} className="px-4 py-2 bg-[#1B93A4] hover:bg-[#157887] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer info card */}
              <div className="bg-[#1C1917] text-white p-4 rounded-3xl flex items-center justify-between shadow-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">Commission saved</span>
                    <span className="text-xs font-bold block mt-0.5">₹0 Paid to OTAs</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] uppercase tracking-wider text-[#8FA89B] font-extrabold block">Status</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5">100% Retained</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── The Integrated Ecosystem ────────────────────────────── */}
      <section id="ecosystem" className="py-20 bg-white border-t border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">The Integrated Ecosystem</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Everything You Need. Built In.
            </h2>
            <p className="text-sm text-[#78716C] font-medium leading-relaxed">
              Website builder, marketing automation, and operation tools. A sovereign, high-performance platform for modern hosts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {coreCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-[#FAF9F6]/40 border border-zinc-200/80 p-8 rounded-[32px] hover:shadow-xl hover:bg-white transition-all duration-300 flex flex-col justify-between text-left space-y-6">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#1B93A4]/10 text-[#1B93A4] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="inline-block text-[9px] uppercase tracking-wider font-extrabold bg-[#1B93A4]/15 text-[#1B93A4] px-2.5 py-0.5 rounded-full">
                      {card.badge}
                    </span>
                    <h3 className="text-xl font-extrabold text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{card.title}</h3>
                    <p className="text-xs md:text-sm text-[#78716C] leading-relaxed font-medium">
                      {card.description}
                    </p>
                  </div>
                  
                  <ul className="space-y-2 pt-2">
                    {card.points.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={3} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-zinc-400 font-bold">
              ⚡ Flat rate: ₹30/day only. No commissions. Setup in under 15 Minutes.
            </p>
          </div>

        </div>
      </section>

      {/* ── Optimization Engine Section ───────────────────────────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Optimization Engine</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Stop losing sales to a bad booking website.
            </h2>
            <p className="text-sm text-[#78716C] leading-relaxed font-medium">
              A sovereign booking platform that is effortless to update and affordable to scale. Turn traffic from Instagram, Google maps, and influencers into confirmed direct stays.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-4">
                <div className="p-3 bg-[#1C1917]/5 rounded-2xl text-[#1C1917] shrink-0 h-max">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-zinc-900">High Traffic, Zero Conversions?</h4>
                  <p className="text-xs text-[#78716C] font-semibold leading-relaxed">
                    Avoid leaky channels and slow interfaces. Myota provides a fast mobile-first booking calendar and checkout flow.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-[#1C1917]/5 rounded-2xl text-[#1C1917] shrink-0 h-max">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-zinc-900">Costly Coding Maintenance?</h4>
                  <p className="text-xs text-[#78716C] font-semibold leading-relaxed">
                    Update room details, photo slides, add-on bundles, or seasonal pricing overrides yourself directly from your phone.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button onClick={() => setAppMode('onboarding')} className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C1917] hover:bg-zinc-800 text-white font-bold text-xs tracking-wider uppercase rounded-xl shadow-md transition cursor-pointer">
                Start Booking Direct Today
              </button>
            </div>
          </div>

          {/* Right Panel: Optimization Engine Visual Mockup */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-zinc-200 rounded-[32px] p-6 shadow-xl text-left space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B93A4]/10 text-[#1B93A4] text-[9px] font-extrabold uppercase">
                ⚡ High Demand / 800+ bookings last 10 days
              </div>
              
              <div>
                <h4 className="text-lg font-black text-zinc-900">Konkan Bay Resort & Spa</h4>
                <p className="text-xs text-zinc-400 font-semibold mt-0.5">Devbag, Maharashtra, India</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 bg-zinc-50 p-4 rounded-2xl border">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400">Check-in</span>
                  <p className="text-xs font-bold text-zinc-800 mt-0.5">Thu, Oct 22</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400">Checkout</span>
                  <p className="text-xs font-bold text-zinc-800 mt-0.5">Sun, Oct 25</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400">Grand Luxury Villa</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-zinc-400 line-through text-xs font-semibold">₹24,500</span>
                    <span className="text-base font-black text-zinc-900">₹18,999<span className="text-xs text-zinc-400 font-medium"> / night</span></span>
                  </div>
                </div>
                <button onClick={() => setAppMode('onboarding')} className="px-5 py-2.5 bg-[#1C1917] hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs cursor-pointer">
                  Reserve Now
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Smart WhatsApp Tools Section ─────────────────────────── */}
      <section id="WhatsApp" className="py-20 bg-white border-t border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Chat Mockup */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="w-full max-w-sm aspect-[4/5] bg-emerald-50/50 rounded-[32px] border border-zinc-200 p-4 shadow-xl flex flex-col justify-between">
              
              {/* WhatsApp Chat Header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-2xl border shadow-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  M
                </div>
                <div className="text-left flex-1">
                  <h5 className="font-extrabold text-xs text-zinc-900">Myota Bot</h5>
                  <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Online Automation</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 text-left text-xs font-semibold px-2">
                {/* Bot greeting */}
                <div className="bg-white p-3 rounded-2xl rounded-tl-xs max-w-[85%] border shadow-xs">
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    Welcome to <b>The Royal Boutique</b>! We have received your inquiry for the Grand Suite. 🛎️
                  </p>
                  <span className="text-[8px] text-zinc-400 block text-right mt-1">10:42 AM</span>
                </div>
                
                {/* Guest reply */}
                <div className="bg-emerald-100 p-3 rounded-2xl rounded-tr-xs max-w-[85%] ml-auto shadow-xs">
                  <p className="text-zinc-800 leading-relaxed text-[11px]">
                    That is great! How can I confirm the booking?
                  </p>
                  <span className="text-[8px] text-zinc-500 block text-right mt-1">10:43 AM</span>
                </div>

                {/* Bot automated payment link */}
                <div className="bg-white p-3 rounded-2xl rounded-tl-xs max-w-[85%] border shadow-xs space-y-2">
                  <p className="text-zinc-600 leading-relaxed text-[11px]">
                    Booking Confirmed! Click below to finalize your payment securely via our guest portal.<br/><br/>
                    • <b>Grand Suite - 2 Nights</b><br/>
                    • Total: ₹18,999.00
                  </p>
                  <button className="w-full py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-[10px] tracking-wider uppercase block text-center shadow-xs">
                    Pay Securely
                  </button>
                  <span className="text-[8px] text-zinc-400 block text-right">10:44 AM</span>
                </div>
              </div>

              <div className="w-full h-1 bg-zinc-300/40 rounded-full"></div>

            </div>
          </div>

          {/* WhatsApp Text Description */}
          <div className="lg:col-span-7 space-y-6 text-left order-1 lg:order-2">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Guest Recovery</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Smart WhatsApp Tools to Stay on Track.
            </h2>
            <p className="text-sm text-[#78716C] leading-relaxed font-medium">
              Guests who drop off aren't lost. Myota monitors cart checkouts and recovers abandoned inquiries automatically on WhatsApp. Zero manual chasing.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-200">
              <div>
                <span className="text-4xl font-black text-emerald-600 block" style={{ fontFamily: 'Outfit, sans-serif' }}>2.8X</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8A29E] block mt-1">Customer Retention</span>
              </div>
              <div>
                <span className="text-4xl font-black text-[#1B93A4] block" style={{ fontFamily: 'Outfit, sans-serif' }}>75%</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#A8A29E] block mt-1">Booking Recoveries</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Problem vs Solution Carousel ──────────────────────────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-b border-zinc-200/40">
        <div className="space-y-12">
          
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Why Hotels Choose Us</span>
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              The New Standard of Direct Revenue
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#FAF9F6] border border-zinc-200 p-8 md:p-12 rounded-[36px] shadow-sm">
            <div className="space-y-4 text-left">
              <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-widest block">THE PROBLEM</span>
              <p className="text-lg md:text-xl font-bold text-zinc-800 leading-relaxed italic">
                "{problemSolutions[problemIndex].problem}"
              </p>
            </div>
            
            <div className="space-y-6 text-left border-t md:border-t-0 md:border-l border-zinc-200 pt-6 md:pt-0 md:pl-10">
              <span className="text-[10px] text-[#1B93A4] font-extrabold uppercase tracking-widest block">THE MYOTA SOLUTION</span>
              <p className="text-sm text-[#78716C] leading-relaxed font-medium">
                {problemSolutions[problemIndex].solution}
              </p>
              
              <div className="flex gap-2">
                {problemSolutions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setProblemIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${problemIndex === idx ? 'bg-[#1C1917] w-6' : 'bg-zinc-300 hover:bg-zinc-400'}`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3 Simple Steps Section ────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-6 space-y-16 text-center">
          
          <div className="space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Setup Blueprint</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Accept Direct Bookings in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Website", desc: "Upload room types, photos, set your baseline pricing, and automatically pull business reviews." },
              { step: "02", title: "Own Your Domain", desc: "Instantly launch on a custom subdomain, or map your existing domain address in seconds." },
              { step: "03", title: "Accept Stays", desc: "Guests pay on your website. Funds route straight to your bank account with zero-commission." }
            ].map((s, i) => (
              <div key={i} className="text-left space-y-4 p-6 rounded-2xl hover:bg-zinc-50 transition-colors">
                <span className="text-3xl font-black text-[#1B93A4]/30 block">{s.step}</span>
                <h4 className="font-extrabold text-sm text-zinc-900">{s.title}</h4>
                <p className="text-xs text-[#78716C] font-semibold leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Flat Pricing Section ─────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Transparent Billing</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Everything included at just ₹33 / day.
            </h2>
            <p className="text-sm text-[#78716C] leading-relaxed font-medium">
              No hidden fees, no OTA percentages. Cancel anytime you wish. Full sovereign independence over your hotel's website.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 pt-2">
              {[
                "Digital Storefront & Builder",
                "Built-in Booking Engine",
                "Sovereign Payment Gateway",
                "WhatsApp Confirmation Alerts",
                "Dynamic Pricing Rules",
                "Channel Manager Integration",
                "Full Pocket Dashboard",
                "Unlimited Staff Accounts"
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-zinc-200 rounded-[32px] p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-[#1B93A4]" />
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block">HOSPITALITY SUITE</span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>₹30</span>
                  <span className="text-sm text-zinc-400 font-bold">/ day</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium block mt-1">Billed monthly (₹900) · Cancel anytime</span>
              </div>

              <div className="border-t border-zinc-100 my-4" />

              <button
                onClick={() => setAppMode('onboarding')}
                className="w-full py-4 bg-[#1C1917] hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs tracking-wider uppercase transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-b border-zinc-200/50">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">Trusted by Hoteliers</span>
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Loved by Independent Hosts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                author: "Pooja Mehta",
                property: "The Aranya Retreat",
                content: "We never had a proper website before Myota. Now we have a beautiful site with a seamless booking engine. Our direct bookings went up by 60% in the first month."
              },
              {
                author: "Devansh Jain",
                property: "Casa Verdanza Boutique Stay",
                content: "Earlier, most of our bookings came from OTAs where commissions were eating into our margins. Myota let us build our own storefront, handle payments directly, and keep 100% of the money."
              },
              {
                author: "Rohan Khanna",
                property: "Royal Orchid Stay",
                content: "We explored multiple website builders, but they were either too complicated or expensive. Myota gives us dynamic rates, faqs, and WhatsApp alerts in one clean pocket package."
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-[#FAF9F6]/40 border border-zinc-200/80 p-8 rounded-3xl flex flex-col justify-between text-left space-y-6">
                <p className="text-xs md:text-sm text-[#78716C] leading-relaxed font-medium italic">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {t.author[0]}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-zinc-900">{t.author}</h5>
                    <span className="text-[10px] text-zinc-400 font-semibold">{t.property}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FAQs Dropdowns ────────────────────────────────────────── */}
      <section id="faqs" className="py-20 px-6 max-w-3xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[10px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">FAQs</span>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Got Questions?
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Do I need technical skills or coding to start?",
              a: "None at all. Myota is built specifically for hotel managers, independent hosts, and resorts. We guide you through a simple setup wizard where you describe your stay, upload rooms, and go live."
            },
            {
              q: "How does the zero-commission direct payment work?",
              a: "Guests book their stay directly on your custom website. We integrate your payment gateway, so guest payments flow straight into your own bank account. We take exactly 0% commission."
            },
            {
              q: "Can I connect my own custom domain?",
              a: "Yes! You can host your site on a free myota subdomain (e.g. srikresidency.myota.com) or link your own custom domain (e.g. srikresidency.com) instantly. We provide free SSL certificates."
            },
            {
              q: "How much does it cost after the free trial?",
              a: "We believe in transparent, flat pricing. Myota costs a flat ₹30/day (billed monthly at ₹900). There are absolutely no commissions, transaction percentages, or setup fees."
            }
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden transition duration-300">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left font-bold text-zinc-800 hover:text-zinc-900 transition-colors text-sm md:text-base cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 border-t border-zinc-100 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                >
                  <p className="px-6 py-4.5 text-xs md:text-sm text-zinc-500 font-medium leading-relaxed bg-[#FAF9F6]/20">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-[#1C1917] text-white/40 py-16 px-6 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: '#1B93A4' }}>
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 11h-6V3l-7 10h6v8l7-10z" />
              </svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Myota
            </span>
          </div>

          <div className="text-xs font-semibold">
            © 2026 Myota Inc. All rights reserved. Built for commission-free direct hotel bookings.
          </div>
        </div>
      </footer>
    </div>
  );
};
