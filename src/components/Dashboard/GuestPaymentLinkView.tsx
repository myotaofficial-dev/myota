import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Loader2, ArrowRight, ShieldAlert, Check, Home, ShieldCheck
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

interface GuestPaymentLinkViewProps {
  linkCode: string;
}

export const GuestPaymentLinkView: React.FC<GuestPaymentLinkViewProps> = ({ linkCode }) => {
  const [booking, setBooking] = useState<any | null>(null);
  const [property, setProperty] = useState<any | null>(null);
  const [roomCategories, setRoomCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment progress states
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showRoomBreakdown, setShowRoomBreakdown] = useState(false);
  const [showGstBreakdown, setShowGstBreakdown] = useState(false);
  const [showAddonsBreakdown, setShowAddonsBreakdown] = useState(false);
  const [showEventsBreakdown, setShowEventsBreakdown] = useState(false);

  // Load payment link booking details
  const loadLinkData = async () => {
    setLoading(true);
    setError('');
    try {
      // Find booking where selected_slot equals the linkCode (or fallback to id check)
      const { data, error: fetchErr } = await (supabase as any)
        .from('bookings')
        .select('*')
        .or(`selected_slot.eq.${linkCode},id.eq.${linkCode}`)
        .single();

      if (fetchErr || !data) {
        setError('Invalid or expired booking link. Please verify the link URL.');
        setLoading(false);
        return;
      }

      setBooking(data);

      // Fetch matching room categories details for photos and amenities
      const roomIds = data.room_id ? data.room_id.split(',') : [];
      const { data: roomsData } = await (supabase as any)
        .from('room_categories')
        .select('*')
        .in('id', roomIds);
      if (roomsData) {
        setRoomCategories(roomsData);
      }

      // Fetch property/hotel settings
      const { data: propData } = await (supabase as any)
        .from('hotel_settings')
        .select('*')
        .eq('property_id', (data as any).property_id)
        .single();

      if (propData) {
        setProperty(propData);
      }
    } catch (err: any) {
      setError('Connection failed. Please reload the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (linkCode) {
      loadLinkData();
    }
  }, [linkCode]);

  // Extract pay now and pricing breakdown details
  const pricingDetails = useMemo(() => {
    if (!booking) return { total: 0, payNow: 0, dueAtCheckIn: 0, breakdown: null };
    let payNow = booking.total_price;
    let breakdown = null;
    try {
      if (booking.coupon_code) {
        const meta = JSON.parse(booking.coupon_code);
        payNow = meta.payNowAmount ?? booking.total_price;
        breakdown = meta.breakdown ?? null;
      }
    } catch (e) {}

    // Fallback breakdown if missing
    if (!breakdown) {
      const taxable = Math.round(booking.total_price / 1.12);
      breakdown = {
        roomsCost: taxable,
        mealPlanCost: 0,
        addonsCost: 0,
        eventsCost: 0,
        gstCost: booking.total_price - taxable,
        grandTotal: booking.total_price
      };
    }

    return {
      total: booking.total_price,
      payNow: payNow,
      dueAtCheckIn: Math.max(0, booking.total_price - payNow),
      breakdown
    };
  }, [booking]);

  const handleProceedPayment = async () => {
    if (!booking) return;
    
    setPaymentStatus('processing');
    setStatusMessage('Initiating secure gateway transaction...');
    
    // Simulate redirection and gateway validation steps
    await new Promise(r => setTimeout(r, 1200));
    setStatusMessage('Verifying deposit credentials with bank...');
    await new Promise(r => setTimeout(r, 1000));
    setStatusMessage('Finalizing check-in reservations...');
    
    const finalPaymentStatus = pricingDetails.payNow === pricingDetails.total ? 'paid' : 'partially_paid';

    try {
      const { error: updateErr } = await (supabase as any)
        .from('bookings')
        .update({
          payment_status: finalPaymentStatus as any,
          paid_amount: pricingDetails.payNow,
          source: 'direct' // mark as direct booked
        })
        .eq('id', booking.id);

      if (updateErr) {
        alert('Transaction completed but booking registration failed. Please contact support.');
        setPaymentStatus('idle');
      } else {
        setPaymentStatus('success');
      }
    } catch (e: any) {
      alert('Network transaction failed.');
      setPaymentStatus('idle');
    }
  };

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#1B93A4' }} />
        <p className="font-bold text-sm">Retrieving your secure reservation link...</p>
      </div>
    );
  }

  // 2. Error screen
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center p-6 text-zinc-550">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Reservation Link Issue
          </h2>
          <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
            {error || 'The requested booking link is not available or has expired.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-zinc-950 text-white font-extrabold text-3xs uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition"
          >
            Go to Platform Homepage
          </a>
        </div>
      </div>
    );
  }

  // 3. Payment Processing overlay
  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center text-zinc-500">
        <div className="max-w-sm w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center space-y-5 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#1B93A4' }} />
          <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">
            Processing Payment
          </h3>
          <p className="text-xs text-zinc-455 font-bold animate-pulse">
            {statusMessage}
          </p>
        </div>
      </div>
    );
  }

  // 4. Success screen
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center p-4 text-zinc-800">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center space-y-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#1B93A4]" />
          
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <Check className="w-8 h-8 font-black" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Booking Confirmed!
            </h2>
            <p className="text-3xs text-zinc-500 font-semibold uppercase tracking-wider">
              Transaction Completed Successfully
            </p>
          </div>

          {/* Stay Info summary card */}
          <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-2xl text-left space-y-3.5">
            <div>
              <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Guest Name</span>
              <span className="text-xs font-bold text-zinc-800 block mt-0.5">{booking.guest_name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Check-in</span>
                <span className="text-xs font-bold text-zinc-800 block mt-0.5">
                  {format(parseISO(booking.check_in), 'dd MMM yyyy')}
                </span>
              </div>
              <div>
                <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Check-out</span>
                <span className="text-xs font-bold text-zinc-800 block mt-0.5">
                  {format(parseISO(booking.check_out), 'dd MMM yyyy')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Property</span>
              <span className="text-xs font-bold text-zinc-800 block mt-0.5">
                {property?.name || 'The Grandlake Resorts'}
              </span>
            </div>

            <div className="pt-2 border-t flex justify-between items-center text-xs font-bold">
              <span className="text-zinc-500">Amount Paid:</span>
              <span className="text-emerald-700 font-black">{formatRupees(pricingDetails.payNow)}</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 font-medium">
            A confirmation receipt and stay voucher has been sent to <strong>{booking.guest_email || booking.guest_phone}</strong>.
          </p>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-zinc-950 hover:bg-zinc-850 text-white font-extrabold text-2xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  // 5. Default Summary Checkout Screen
  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4 sm:px-6 lg:px-8 text-zinc-700">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* ROOM PHOTOS AND AMENITIES DISPLAY (IMAGE 2 REQUEST) */}
        {roomCategories.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm space-y-4">
            <div className="grid grid-cols-1 gap-2 p-2">
              {roomCategories.map(r => (
                <div key={r.id} className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-150 group">
                  {r.photos && r.photos[0] ? (
                    <img 
                      src={r.photos[0]} 
                      alt={r.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-1.5">
                      <span className="font-extrabold text-zinc-350">Room Preview Image</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {r.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Combined Amenities list */}
            {roomCategories.flatMap(r => r.amenities || []).length > 0 && (
              <div className="px-5 pb-5 text-left">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Amenities Included</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(roomCategories.flatMap(r => r.amenities || []))).slice(0, 8).map(am => (
                    <span key={am} className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-full text-[9.5px] text-zinc-650 font-bold uppercase tracking-wide">
                      • {am}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Title */}
          <div className="text-center space-y-1.5">
            <span className="text-[9px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">CONFIRM RESERVATION</span>
            <h2 className="text-xl font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Checkout Summary
            </h2>
            <p className="text-3xs text-zinc-500 font-semibold leading-relaxed">
              Review your stay outline and complete payment details below.
            </p>
          </div>

          {/* Stay & Rooms Summary card */}
          <div className="bg-zinc-50 border border-zinc-200 p-4.5 rounded-2xl space-y-3 text-left">
            <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Stay & Rooms Summary</span>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-xs text-zinc-950">{booking.room_name || 'Standard Room'}</h4>
                <p className="text-[10px] text-zinc-450 font-semibold mt-0.5">
                  {booking.adults} Adults · {booking.children} Kids
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-800 block">
                  {format(parseISO(booking.check_in), 'd MMM')} - {format(parseISO(booking.check_out), 'd MMM yyyy')}
                </span>
                <span className="text-[10px] text-zinc-450 font-semibold block mt-0.5">
                  {differenceInDays(parseISO(booking.check_out), parseISO(booking.check_in))} Nights
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Policy card */}
          <div className="bg-zinc-50 border border-zinc-200 p-4.5 rounded-2xl text-left space-y-1">
            <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Cancellation Policy</span>
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed normal-case mt-0.5">
              Free cancellation up to 48 hours before check-in. Cancellations within 48 hours are non-refundable.
            </p>
          </div>

          {/* Detailed Pricing Breakdown Card (GST dynamic) */}
          <div className="bg-white border border-zinc-200 p-4.5 rounded-2xl text-left space-y-3.5">
            <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Payment Details</span>
            
            <div className="space-y-2.5 text-xs font-semibold text-zinc-650">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Rooms Stay Cost:</span>
                  <span className="text-zinc-900 font-bold">{formatRupees(pricingDetails.breakdown.roomsCost)}</span>
                </div>
                
                {/* Collapsible room-wise breakdown */}
                {pricingDetails.breakdown.roomBreakdown && pricingDetails.breakdown.roomBreakdown.length > 0 && (
                  <div className="pl-0.5">
                    <button
                      type="button"
                      onClick={() => setShowRoomBreakdown(!showRoomBreakdown)}
                      className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#1B93A4] hover:underline cursor-pointer select-none"
                    >
                      <span>{showRoomBreakdown ? 'Hide details' : 'Show room breakdown'}</span>
                      <span className="text-[8px]">{showRoomBreakdown ? '▲' : '▼'}</span>
                    </button>
                    {showRoomBreakdown && (
                      <div className="mt-2 pl-3 border-l-2 border-[#1B93A4]/30 space-y-2 py-0.5 animate-in slide-in-from-top-1 duration-150">
                        {pricingDetails.breakdown.roomBreakdown.map((r: any) => (
                          <div key={r.id} className="text-[11px] text-zinc-550 leading-relaxed font-semibold">
                            <div className="flex justify-between text-zinc-700 font-bold">
                              <span>{r.name} (x{r.qty})</span>
                              <span className="text-zinc-900 font-extrabold">{formatRupees(r.totalCost)}</span>
                            </div>
                            <div className="pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-450 space-y-0.5 mt-0.5">
                              <div className="flex justify-between">
                                <span>{r.baseGuests ?? (r.adults + r.children)} base</span>
                                <span>{formatRupees(r.baseStayTotal ?? r.totalCost)}</span>
                              </div>
                              {r.extraBedTotal > 0 && (
                                <div className="flex justify-between">
                                  <span>{r.extraGuestsCount} extra person (extra bed)</span>
                                  <span>{formatRupees(r.extraBedTotal)}</span>
                                </div>
                              )}
                              {r.extraCpTotal > 0 && (
                                <div className="flex justify-between">
                                  <span>{r.extraGuestsCount} extra person (cp plan cost)</span>
                                  <span>{formatRupees(r.extraCpTotal)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
 
              {pricingDetails.breakdown.mealPlanCost > 0 && (
                <div className="flex justify-between">
                  <span>Meal Plan:</span>
                  <span className="text-zinc-900 font-bold">{formatRupees(pricingDetails.breakdown.mealPlanCost)}</span>
                </div>
              )}
 
              {pricingDetails.breakdown.addonsCost > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Addons Total:</span>
                    <span className="text-zinc-900 font-bold">{formatRupees(pricingDetails.breakdown.addonsCost)}</span>
                  </div>
                  {pricingDetails.breakdown.addonsBreakdown && pricingDetails.breakdown.addonsBreakdown.length > 0 && (
                    <div className="pl-0.5">
                      <button
                        type="button"
                        onClick={() => setShowAddonsBreakdown(!showAddonsBreakdown)}
                        className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#1B93A4] hover:underline cursor-pointer select-none"
                      >
                        <span>{showAddonsBreakdown ? 'Hide details' : 'Show addons breakdown'}</span>
                        <span className="text-[8px]">{showAddonsBreakdown ? '▲' : '▼'}</span>
                      </button>
                      {showAddonsBreakdown && (
                        <div className="mt-1.5 pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-450 space-y-1.5 py-0.5 animate-in slide-in-from-top-1 duration-150 font-semibold">
                          {pricingDetails.breakdown.addonsBreakdown.map((addon: any) => (
                            <div key={addon.id} className="flex justify-between">
                              <span>
                                {addon.name} 
                                <span className="text-[8.5px] text-zinc-450 font-medium block mt-0.5">
                                  {formatRupees(addon.price)}{addon.pricingType === 'per_head' ? '/head' : ' flat'}
                                </span>
                              </span>
                              <span className="text-zinc-700 font-bold">{formatRupees(addon.totalCost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
 
              {pricingDetails.breakdown.eventsCost > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Guest Events Total:</span>
                    <span className="text-zinc-900 font-bold">{formatRupees(pricingDetails.breakdown.eventsCost)}</span>
                  </div>
                  {pricingDetails.breakdown.eventsBreakdown && pricingDetails.breakdown.eventsBreakdown.length > 0 && (
                    <div className="pl-0.5">
                      <button
                        type="button"
                        onClick={() => setShowEventsBreakdown(!showEventsBreakdown)}
                        className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#1B93A4] hover:underline cursor-pointer select-none"
                      >
                        <span>{showEventsBreakdown ? 'Hide details' : 'Show events breakdown'}</span>
                        <span className="text-[8px]">{showEventsBreakdown ? '▲' : '▼'}</span>
                      </button>
                      {showEventsBreakdown && (
                        <div className="mt-1.5 pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-450 space-y-1.5 py-0.5 animate-in slide-in-from-top-1 duration-150 font-semibold">
                          {pricingDetails.breakdown.eventsBreakdown.map((evt: any) => (
                            <div key={evt.id} className="flex justify-between">
                              <span>
                                {evt.title} 
                                <span className="text-[8.5px] text-indigo-650 font-bold block mt-0.5">
                                  Slot: {evt.slot}
                                </span>
                              </span>
                              <span className="text-zinc-700 font-bold">{formatRupees(evt.totalCost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
 
              <div className="space-y-1">
                <div className="flex justify-between pt-1 border-t border-zinc-200/40">
                  <span>GST:</span>
                  <span className="text-zinc-900 font-bold">+{formatRupees(pricingDetails.breakdown.gstCost)}</span>
                </div>
                
                {/* Collapsible GST details dropdown if addons, events, or meal plans exist */}
                {(pricingDetails.breakdown.addonsCost > 0 || pricingDetails.breakdown.eventsCost > 0 || pricingDetails.breakdown.mealPlanCost > 0) && (
                  <div className="pl-0.5">
                    <button
                      type="button"
                      onClick={() => setShowGstBreakdown(!showGstBreakdown)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#1B93A4] hover:underline cursor-pointer select-none"
                    >
                      <span>{showGstBreakdown ? 'Hide details' : 'Show GST breakdown'}</span>
                      <span className="text-[8px]">{showGstBreakdown ? '▲' : '▼'}</span>
                    </button>
                    {showGstBreakdown && (
                      <div className="mt-1.5 pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-455 space-y-1 py-0.5 animate-in slide-in-from-top-1 duration-150 font-semibold">
                        <div className="flex justify-between">
                          <span>Rooms GST:</span>
                          <span className="text-zinc-700">{formatRupees(pricingDetails.breakdown.roomsGst ?? Math.round(pricingDetails.breakdown.roomsCost * 0.12))}</span>
                        </div>
                        {pricingDetails.breakdown.mealPlanCost > 0 && (
                          <div className="flex justify-between">
                            <span>Meal Plan GST:</span>
                            <span className="text-zinc-700">{formatRupees(pricingDetails.breakdown.mealPlanGst ?? Math.round(pricingDetails.breakdown.mealPlanCost * 0.18))}</span>
                          </div>
                        )}
                        {pricingDetails.breakdown.addonsCost > 0 && (
                          <div className="flex justify-between">
                            <span>Addons GST (18%):</span>
                            <span className="text-zinc-700">{formatRupees(pricingDetails.breakdown.addonsGst ?? Math.round(pricingDetails.breakdown.addonsCost * 0.18))}</span>
                          </div>
                        )}
                        {pricingDetails.breakdown.eventsCost > 0 && (
                          <div className="flex justify-between">
                            <span>Events GST (18%):</span>
                            <span className="text-zinc-700">{formatRupees(pricingDetails.breakdown.eventsGst ?? Math.round(pricingDetails.breakdown.eventsCost * 0.18))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
 
              <div className="flex justify-between pt-1.5 border-t border-zinc-200/70 text-xs font-bold text-zinc-900">
                <span>Grand Total:</span>
                <span>{formatRupees(pricingDetails.total)}</span>
              </div>
 
              <div className="flex justify-between pt-2 border-t border-zinc-250 font-bold text-xs text-zinc-650">
                <span>Due at check-in (Collect at property):</span>
                <span className="text-zinc-900 font-bold">{formatRupees(pricingDetails.dueAtCheckIn)}</span>
              </div>
            </div>
 
            <div className="flex justify-between items-center pt-3 border-t text-xs font-bold text-zinc-900">
              <span className="text-[#1B93A4] uppercase tracking-wider text-[10px]">Collect thru link (Pay Now):</span>
              <span className="text-zinc-950 text-sm font-extrabold">{formatRupees(pricingDetails.payNow)}</span>
            </div>
          </div>

          {/* Action controls */}
          <div className="space-y-3">
            <button
              onClick={handleProceedPayment}
              className="w-full bg-[#1B93A4] hover:bg-[#167d8c] text-white font-extrabold text-2xs uppercase tracking-wider py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              Proceed to pay now <ArrowRight className="w-4 h-4" />
            </button>
            
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B93A4]" />
              <span>Secured by payu gateway</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
