import React from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  DollarSign, CalendarDays, TrendingUp, ShieldCheck, 
  MessageSquareWarning, ArrowRight, UserCheck
} from 'lucide-react';

export const Overview: React.FC = () => {
  const { bookings, events, messages, setSelectedView } = useHotel();

  // Calculate stats
  const activeBookings = bookings.filter(b => b.bookingStatus === 'confirmed');
  const exchangeRate = 83; // USD mock pricing to INR
  const totalRevenue = activeBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0) * exchangeRate;
  const avgBookingVal = activeBookings.length > 0 ? (totalRevenue / activeBookings.length).toFixed(0) : '0';
  const unreadMessages = messages.filter(m => !m.read).length;

  // Format INR Helper
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Overview Dashboard</h2>
        <p className="text-sm text-[#78716C]">Real-time operational parameters, activity records, and channel feeds.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex items-center justify-between">
          <div className="space-y-1">
            <span className="ds-overline block">Total Sales</span>
            <h3 className="text-2xl font-black text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatRupees(totalRevenue)}</h3>
            <div className="flex items-center gap-1 text-[#2D6A4F] text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4% vs last month</span>
            </div>
          </div>
          <div className="p-3 bg-[#E8F5EF] rounded-xl text-[#2D6A4F]">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex items-center justify-between">
          <div className="space-y-1">
            <span className="ds-overline block">Active Bookings</span>
            <h3 className="text-2xl font-black text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>{activeBookings.length} Guests</h3>
            <div className="flex items-center gap-1 text-[#78716C] text-xs font-semibold">
              <span>{bookings.length} reservations overall</span>
            </div>
          </div>
          <div className="p-3 bg-[#FEF3E6] rounded-xl text-[#C9822F]">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Booking Price */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex items-center justify-between">
          <div className="space-y-1">
            <span className="ds-overline block">Avg Order Value</span>
            <h3 className="text-2xl font-black text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatRupees(Number(avgBookingVal))}</h3>
            <div className="flex items-center gap-1 text-[#78716C] text-xs font-semibold">
              <span>Per booked checkout</span>
            </div>
          </div>
          <div className="p-3 bg-[#E6F5F7] rounded-xl text-[#1B93A4]">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Guest Inquiries */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] flex items-center justify-between">
          <div className="space-y-1">
            <span className="ds-overline block">New Inquiries</span>
            <h3 className="text-2xl font-black text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>{unreadMessages} Messages</h3>
            <div className="flex items-center gap-1 text-[#E76F51] text-xs font-bold">
              <MessageSquareWarning className="w-3.5 h-3.5" />
              <span>Requires response</span>
            </div>
          </div>
          <div className="p-3 bg-[#FEF0ED] rounded-xl text-[#E76F51]">
            <MessageSquareWarning className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Bookings & Activity Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Recent Bookings */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Recent Reservations</h3>
            <button 
              onClick={() => setSelectedView('pricing-calendar')}
              className="text-xs font-bold text-[#1B93A4] hover:text-[#157A8A] flex items-center gap-1"
            >
              <span>Manage Rates</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E5E4] flex-1">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="p-5 flex items-center justify-between hover:bg-[#FAFAF9] transition duration-150">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--ds-primary-subtle)', color: 'var(--ds-primary)' }}>
                    {booking.guestName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#1C1917]">{booking.guestName}</h4>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      {booking.roomName} • {formatDateToDDMMYYYY(booking.checkIn)} to {formatDateToDDMMYYYY(booking.checkOut)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-[#1C1917] block">
                    {formatRupees(booking.totalPrice * exchangeRate)}
                  </span>
                  <span className={`ds-badge ${
                    booking.paymentStatus === 'paid' ? 'ds-badge-green' : 'ds-badge-amber'
                  } text-[8px] mt-1`}>
                    {booking.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="p-8 text-center text-[#A8A29E]">
                No recent bookings recorded.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Channels Sync & Event Logs */}
        <div className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Channel Matrix</h3>
            <span className="ds-badge ds-badge-teal flex items-center gap-1 text-[8px]">
              <ShieldCheck className="w-3 h-3" />
              <span>LIVE SYNCED</span>
            </span>
          </div>

          {/* Sync Stats */}
          <div className="grid grid-cols-3 divide-x divide-[#E7E5E4] border-b border-[#E7E5E4] bg-[#FAFAF9] py-3 text-center">
            {['Booking.com', 'Airbnb', 'Expedia'].map(ch => (
              <div key={ch}>
                <span className="text-[9px] text-[#A8A29E] font-bold uppercase tracking-wider">{ch}</span>
                <p className="text-xs font-bold text-[#1B93A4] mt-0.5">Connected</p>
              </div>
            ))}
          </div>

          {/* Activity Logs */}
          <div className="p-5 flex-1 overflow-y-auto max-h-[300px] space-y-4">
            {events.slice(0, 6).map((evt) => (
              <div key={evt.id} className="flex gap-3 text-xs">
                <div className="mt-0.5">
                  <span className={`w-2 h-2 rounded-full block ${
                    evt.type === 'booking' 
                      ? 'bg-[#C9822F]' 
                      : evt.type === 'channel' 
                      ? 'bg-[#1B93A4]' 
                      : 'bg-[#A8A29E]'
                  }`} />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-[#1C1917] block">{evt.title}</span>
                  <p className="text-[#78716C]">{evt.description}</p>
                  <span className="text-[9px] text-[#A8A29E] font-medium block">{evt.date}</span>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-6 text-[#A8A29E]">
                No activity logs available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
