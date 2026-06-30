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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Payment Gateway Settings</h2>
          <p className="text-sm text-zinc-500">Configure online payment integrations for reservations and custom day packages.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-md transition cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Settings Saved!' : 'Save Integration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stripe Configuration */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-indigo-50 p-2 rounded-lg text-indigo-600 block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Stripe Payments</h3>
                <p className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider">Global credit/debit card</p>
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
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {stripeEnabled && (
            <div className="space-y-3 pt-3 border-t border-zinc-100 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-650 uppercase tracking-wider text-[10px]">Stripe Publishable Key</label>
                <input
                  type="text"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 focus:bg-white focus:border-indigo-500 outline-hidden transition"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-zinc-650 uppercase tracking-wider text-[10px]">Stripe Secret Key</label>
                <input
                  type="password"
                  value={stripeSecret}
                  onChange={(e) => setStripeSecret(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 focus:bg-white focus:border-indigo-500 outline-hidden transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Razorpay Configuration */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-emerald-50 p-2 rounded-lg text-emerald-600 block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">Razorpay Checkout</h3>
                <p className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider">UPI, Cards & NetBanking</p>
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
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {razorpayEnabled && (
            <div className="space-y-3 pt-3 border-t border-zinc-100 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-650 uppercase tracking-wider text-[10px]">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_test_..."
                  value={razorpayKey}
                  onChange={(e) => setRazorpayKey(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 focus:bg-white focus:border-emerald-500 outline-hidden transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* PayPal Configuration */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="bg-blue-50 p-2 rounded-lg text-blue-600 block">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">PayPal Checkout</h3>
                <p className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider">Express Checkout</p>
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
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {paypalEnabled && (
            <div className="space-y-3 pt-3 border-t border-zinc-100 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-650 uppercase tracking-wider text-[10px]">PayPal Client ID</label>
                <input
                  type="text"
                  placeholder="Client ID string..."
                  value={paypalClient}
                  onChange={(e) => setPaypalClient(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-800 focus:bg-white focus:border-blue-500 outline-hidden transition"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Config Settings */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 max-w-3xl text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-zinc-455 shrink-0" />
          <div>
            <h4 className="font-bold text-zinc-900">Secure Vault Protocol</h4>
            <p className="text-zinc-500 leading-relaxed">All payment transactions are encrypted and routed directly to active gateway vaults.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-semibold text-zinc-700">
          <div className="space-y-1">
            <span className="block text-[9px] uppercase text-zinc-455 font-bold tracking-wider">Gateway Sandbox</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSandbox} 
                onChange={(e) => setIsSandbox(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-1">
            <span className="block text-[9px] uppercase text-zinc-455 font-bold tracking-wider">Base Currency</span>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)} 
              className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs outline-hidden focus:border-blue-500 transition font-bold"
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
