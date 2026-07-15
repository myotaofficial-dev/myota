import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Check, Save } from 'lucide-react';

export const PaymentGatewayView: React.FC = () => {
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripeKey, setStripeKey] = useState('pk_test_51NpxX...mock');
  const [stripeSecret, setStripeSecret] = useState('sk_test_51NpxX...mock');

  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');
  
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalClient, setPaypalClient] = useState('');

  const [isSandbox, setIsSandbox] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Payment Gateway Settings</h2>
          <p className="text-sm text-[#78716C]">Configure online payment integrations for reservations and custom day packages.</p>
        </div>
        <button
          onClick={handleSave}
          className="ds-btn-primary flex items-center gap-2 cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Settings Saved!' : 'Save Integration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stripe Configuration */}
        <div className="ds-card p-6 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#E6F5F7] p-2 rounded-lg text-[#1B93A4] block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-[#1C1917] text-sm">Stripe Payments</h3>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Global credit/debit card</p>
              </div>
            </div>
            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={stripeEnabled} 
                onChange={(e) => setStripeEnabled(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B93A4]"></div>
            </label>
          </div>

          {stripeEnabled && (
            <div className="space-y-3 pt-3 border-t border-[#E7E5E4] text-xs">
              <div className="space-y-1.5">
                <label className="ds-overline block">Stripe Publishable Key</label>
                <input
                  type="text"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="ds-overline block">Stripe Secret Key</label>
                <input
                  type="password"
                  value={stripeSecret}
                  onChange={(e) => setStripeSecret(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Razorpay Configuration */}
        <div className="ds-card p-6 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#E6F5F7] p-2 rounded-lg text-[#1B93A4] block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-[#1C1917] text-sm">Razorpay Checkout</h3>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">UPI, Cards & NetBanking</p>
              </div>
            </div>
            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={razorpayEnabled} 
                onChange={(e) => setRazorpayEnabled(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B93A4]"></div>
            </label>
          </div>

          {razorpayEnabled && (
            <div className="space-y-3 pt-3 border-t border-[#E7E5E4] text-xs">
              <div className="space-y-1.5">
                <label className="ds-overline block">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={razorpayKey}
                  onChange={(e) => setRazorpayKey(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* PayPal Configuration */}
        <div className="ds-card p-6 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#E6F5F7] p-2 rounded-lg text-[#1B93A4] block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-[#1C1917] text-sm">PayPal Checkout</h3>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Express Checkout</p>
              </div>
            </div>
            {/* Toggle switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={paypalEnabled} 
                onChange={(e) => setPaypalEnabled(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B93A4]"></div>
            </label>
          </div>

          {paypalEnabled && (
            <div className="space-y-3 pt-3 border-t border-[#E7E5E4] text-xs">
              <div className="space-y-1.5">
                <label className="ds-overline block">PayPal Client ID</label>
                <input
                  type="text"
                  placeholder="Client ID string..."
                  value={paypalClient}
                  onChange={(e) => setPaypalClient(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Config Settings */}
      <div className="ds-card bg-[#FAFAF9] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 max-w-3xl text-xs text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#1B93A4] shrink-0" />
          <div>
            <h4 className="font-bold text-[#1C1917]">Secure Vault Protocol</h4>
            <p className="text-[#78716C] leading-relaxed">All payment transactions are encrypted and routed directly to active gateway vaults.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-semibold text-zinc-700">
          <div className="space-y-1 text-left">
            <span className="ds-overline block">Gateway Sandbox</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSandbox} 
                onChange={(e) => setIsSandbox(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1B93A4]"></div>
            </label>
          </div>

          <div className="space-y-1 text-left">
            <span className="ds-overline block font-sans">Base Currency</span>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              className="ds-input py-1 font-bold"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
