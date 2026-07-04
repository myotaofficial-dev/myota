import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { ArrowLeft, Loader2, KeyRound, Phone, User, Mail, Zap } from 'lucide-react';
import { supabase as supabaseOriginal } from '../../lib/supabaseClient';
const supabase = supabaseOriginal as any;

export const OnboardingPage: React.FC = () => {
  const { setAppMode, setPropertiesList, setActivePropertyId } = useHotel();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Status & Toast states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && (!name.trim() || !email.trim() || !phone.trim())) {
      setError('Please fill in all details.');
      return;
    }
    if (mode === 'signin' && !phone.trim() && !email.trim()) {
      setError('Please enter your mobile number or email.');
      return;
    }
    setError(null);
    setLoading(true);
    
    // Simulate sending OTP
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      // Toast OTP alert for developer testing
      setToastMsg("Verification OTP sent! (Use code '1234' to verify)");
      setTimeout(() => setToastMsg(null), 5000);
    }, 1000);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Resolve email for Supabase Auth
      let authEmail = email.trim();
      if (!authEmail && phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        authEmail = `${cleanPhone}@myota.com`;
      }

      if (!authEmail) {
        throw new Error('Please provide an email or phone number.');
      }

      const isTester = authEmail.toLowerCase() === 'dhanvanthkrishnan@gmail.com' || authEmail.toLowerCase() === 'yugandhar@example.com' || phone === '9876543210';
      
      let ownerId = '';
      let finalName = isTester ? 'Dhanvanth Krishnan' : (name || authEmail.split('@')[0] || 'User');
      let finalEmail = authEmail;
      let finalPhone = isTester ? '+91 98765 43210' : (phone.startsWith('+91') ? phone : `+91 ${phone}`);

      // 2. Perform Real Supabase Auth (signUp or signInWithPassword)
      let authUser;
      const testPassword = 'TemporaryPassword123!';

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail.toLowerCase(),
        password: testPassword,
      });

      if (signUpError && signUpError.message.includes('already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authEmail.toLowerCase(),
          password: testPassword,
        });
        if (signInError) throw signInError;
        authUser = signInData.user;
      } else {
        if (signUpError) throw signUpError;
        authUser = signUpData.user;
      }

      if (!authUser) {
        throw new Error('Authentication failed. No session created.');
      }

      ownerId = authUser.id;

      // 3. Migrate pre-seeded properties (prop-1 & prop-2) to the real authenticated UUID if tester
      if (isTester) {
        await supabase
          .from('properties')
          .update({ owner_id: ownerId })
          .or(`owner_id.eq.11111111-1111-1111-1111-111111111111,owner_id.is.null`);
      }

      // Save session details to localStorage
      localStorage.setItem('myota_onboarded', 'true');
      localStorage.setItem('myota_owner_id', ownerId);
      localStorage.setItem('myota_user_name', finalName);
      localStorage.setItem('myota_user_email', finalEmail);
      localStorage.setItem('myota_user_phone', finalPhone);

      // 4. Fetch properties associated with this owner_id
      const { data: dbProperties } = await supabase
        .from('properties')
        .select('id, name, status')
        .eq('owner_id', ownerId);

      if (dbProperties && dbProperties.length > 0) {
        const mapped = dbProperties.map((p: any) => ({
          id: p.id,
          name: p.name,
          status: p.status === 'published' ? 'Published' : ('Draft' as const)
        }));
        setPropertiesList(mapped);
        setActivePropertyId(mapped[0].id);
        localStorage.setItem('activePropertyId', mapped[0].id);
      } else {
        // New signup: starts with zero properties
        setPropertiesList([]);
        setActivePropertyId('');
        localStorage.removeItem('activePropertyId');
      }

      setLoading(false);
      setAppMode('dashboard');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-white font-sans text-[#1C1917]">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-800 animate-bounce">
          <Zap className="w-4 h-4 text-amber-500 fill-current" />
          <span className="text-xs font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}
      {/* Left panel: Form */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: '#1B93A4' }}>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 11h-6V3l-7 10h6v8l7-10z" />
              </svg>
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Myota
            </span>
          </div>
          <button
            onClick={() => setAppMode('landing')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E7E5E4] hover:bg-[#FAFAF9] transition text-[#78716C] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            BACK TO HOME
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <div className="w-full max-w-sm space-y-6 bg-[#FAF9F6]/50 p-8 rounded-3xl border border-zinc-200/50 shadow-xs text-left">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {step === 'otp' ? 'Enter Verification Code' : mode === 'signup' ? 'Get Started For Free' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-[#78716C] mt-2 font-medium leading-relaxed">
                {step === 'otp'
                  ? `We sent a one-time passcode to ${phone || email}. Enter it below to verify.`
                  : mode === 'signup'
                  ? "Launch your hotel, resort, or homestay's website instantly with Myota's simple onboarding."
                  : "Enter your registered mobile number or email to log back into your properties dashboard."}
              </p>
            </div>

            {/* Mode Switcher */}
            {step === 'details' && (
              <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${mode === 'signup' ? 'bg-[#1C1917] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${mode === 'signin' ? 'bg-[#1C1917] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Sign In
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
                {error}
              </div>
            )}

            {step === 'details' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {mode === 'signup' && (
                  /* Name */
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Full Name</label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-300 focus-within:border-[#1B93A4] bg-white transition">
                      <User className="w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        required={mode === 'signup'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Yugandhar Raj"
                        className="flex-1 text-sm outline-none bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Email (only required for signup, optional for signin if phone is entered) */}
                {(mode === 'signup' || (mode === 'signin' && !phone)) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Email Address</label>
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-300 focus-within:border-[#1B93A4] bg-white transition">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <input
                        type="email"
                        required={mode === 'signup'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. yugandhar@example.com"
                        className="flex-1 text-sm outline-none bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Number */}
                {(mode === 'signup' || (mode === 'signin' && !email)) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">Mobile Number</label>
                    <div className="flex items-center rounded-xl border border-zinc-300 focus-within:border-[#1B93A4] bg-white overflow-hidden transition">
                      <div className="flex items-center gap-1 px-3 py-2.5 bg-zinc-50 border-r text-sm font-semibold text-zinc-500 select-none shrink-0">
                        <span>IN</span>
                        <span>+91</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2.5 w-full">
                        <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                          type="tel"
                          required={mode === 'signup'}
                          pattern="[0-9]{10}"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="00000 00000"
                          className="w-full text-sm outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'signin' && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (phone) {
                          setPhone('');
                        } else {
                          setEmail('');
                        }
                        setError(null);
                      }}
                      className="text-xs font-semibold text-[#1B93A4] hover:underline"
                    >
                      Use {phone ? 'email address' : 'mobile number'} instead
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1C1917] hover:bg-zinc-800 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">4-Digit OTP Code</label>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-300 focus-within:border-[#1B93A4] bg-white transition">
                    <KeyRound className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter verification code"
                      className="flex-1 text-sm outline-none bg-transparent tracking-widest font-mono text-center font-bold"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-zinc-400 font-semibold text-center">
                  Tip: Use <code className="bg-zinc-100 px-1 py-0.5 rounded font-mono font-bold text-[#1C1917]">1234</code> to verify
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1C1917] hover:bg-zinc-800 text-white rounded-xl font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-full text-center text-xs font-bold text-[#1B93A4] hover:underline"
                >
                  Change details
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 shrink-0 text-[10px] text-[#A8A29E] font-medium text-center">
          © 2026 Myota Inc · <span className="hover:underline cursor-pointer">Privacy Policy</span> · <span className="hover:underline cursor-pointer">Terms of Service</span>
        </div>
      </div>

      {/* Right panel: Graphic / Mockup (Matches image 2) */}
      <div className="hidden lg:flex w-[45%] shrink-0 relative overflow-hidden bg-[#FAF9F6]">
        {/* Mockup visual houses matching second image */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-12 space-y-6">
          <div className="relative w-full max-w-sm flex justify-center items-end h-64 bg-zinc-950/5 rounded-3xl p-6 border border-zinc-200/50">
            {/* Geometric custom SVG or mockup representing image 2 */}
            <svg className="w-48 h-48 fill-none text-[#1C1917]" viewBox="0 0 100 100">
              {/* House shape silhouette with warm light squares exactly like image 2 */}
              <rect x="10" y="55" width="25" height="40" rx="3" fill="#1C1917" />
              <rect x="15" y="70" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="25" y="60" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="25" y="80" width="3" height="5" rx="0.5" fill="#F59E0B" />

              <polygon points="35,45 65,45 65,95 35,95" fill="#1C1917" />
              <polygon points="30,45 50,20 70,45" fill="#1C1917" />
              <rect x="42" y="55" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="55" y="75" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="47" y="35" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="58" y="50" width="3" height="5" rx="0.5" fill="#F59E0B" />

              <rect x="65" y="60" width="25" height="35" rx="3" fill="#1C1917" />
              <rect x="75" y="70" width="3" height="5" rx="0.5" fill="#F59E0B" />
              <rect x="82" y="80" width="3" height="5" rx="0.5" fill="#F59E0B" />
            </svg>
            <div className="absolute top-4 left-6 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">BUILT FOR MODERN STAYS</div>
            <div className="absolute bottom-4 right-6 text-[10px] font-mono tracking-widest text-[#1B93A4] uppercase">HOSPITALITY OPERATING SYSTEM</div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-[#1C1917] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              "Turn Instagram Views Into Direct Bookings"
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
              Setup is simple, commission is zero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
