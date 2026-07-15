import React, { useState, useMemo } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  Search, Calendar, Filter, ChevronLeft, ChevronRight, SlidersHorizontal,
  CalendarDays, Phone, Mail, ArrowRight, X, ArrowLeft, RotateCcw, Edit, 
  XCircle, Clock, Landmark, Tag, AlertTriangle
} from 'lucide-react';
import { 
  format, addDays, subDays, startOfMonth, endOfMonth, 
  eachDayOfInterval, isToday, parseISO
} from 'date-fns';

export const BookingsView: React.FC = () => {
  const { bookings, hotelInfo, propertiesList, setActivePropertyId, activePropertyId, updateHotelInfo, updateBooking } = useHotel();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Navigation Tabs: 'search' | 'calendar' | 'filter'
  const [activeNavTab, setActiveNavTab] = useState<'search' | 'calendar' | 'filter'>('search');
  
  // Selected date for day navigator (starts today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Month state for Calendar View tab
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  
  // Toggle filter for Calendar View bottom list: 'checkin' | 'checkout'
  const [calendarToggleMode, setCalendarToggleMode] = useState<'checkin' | 'checkout'>('checkin');

  // Booking category tabs: 'upcoming' | 'new' | 'past' | 'cancelled'
  const [activeCategoryTab, setActiveCategoryTab] = useState<'upcoming' | 'new' | 'past' | 'cancelled'>('upcoming');

  // Search input states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Filter criteria states
  const [filterBy, setFilterBy] = useState<'checkin' | 'checkout' | 'booking_date'>('checkin');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterBookingStatuses, setFilterBookingStatuses] = useState<string[]>(['confirmed']);
  const [filterPaymentStatuses, setFilterPaymentStatuses] = useState<string[]>([]);
  const [filterPayModes, setFilterPayModes] = useState<string[]>([]);
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Sidebar & Action states
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'details' | 'edit' | 'refund' | 'history'>('details');

  // Edit form states
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editTotalPrice, setEditTotalPrice] = useState(0);

  // Refund form states
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundType, setRefundType] = useState<'source' | 'credits'>('source');
  const [refundReason, setRefundReason] = useState('');

  // Edit reservation handler
  const handleEditReservation = async (booking: any) => {
    if (!editCheckIn || !editCheckOut || editTotalPrice <= 0) {
      alert("Please fill in all stay dates and total amount correctly.");
      return;
    }
    await updateBooking(booking.id, {
      checkIn: editCheckIn,
      checkOut: editCheckOut,
      totalPrice: Number(editTotalPrice)
    });
    setSelectedBooking((prev: any) => ({
      ...prev,
      checkIn: editCheckIn,
      checkOut: editCheckOut,
      totalPrice: Number(editTotalPrice)
    }));
    setActiveSidebarTab('details');
  };

  // Issue refund handler
  const handleIssueRefund = async (booking: any) => {
    const maxRefund = booking.paidAmount || 0;
    if (refundAmount <= 0 || refundAmount > maxRefund) {
      alert(`Invalid refund amount. Maximum you can refund is ${formatRupees(maxRefund)}.`);
      return;
    }
    if (!refundReason.trim()) {
      alert("Please enter a reason for the refund.");
      return;
    }

    const newRefund = {
      id: `ref-${Date.now()}`,
      amount: Number(refundAmount),
      reason: refundReason,
      createdAt: new Date().toISOString(),
      refundType
    };

    const updatedRefunds = [newRefund, ...(booking.refunds || [])];
    const newPaidAmount = Math.max(0, (booking.paidAmount || 0) - refundAmount);
    const newPaymentStatus = newPaidAmount === 0 
      ? 'refunded' 
      : newPaidAmount < booking.totalPrice 
      ? 'partially_paid' 
      : 'paid';

    await updateBooking(booking.id, {
      paidAmount: newPaidAmount,
      refunds: updatedRefunds,
      paymentStatus: newPaymentStatus
    });

    setSelectedBooking((prev: any) => ({
      ...prev,
      paidAmount: newPaidAmount,
      refunds: updatedRefunds,
      paymentStatus: newPaymentStatus
    }));

    setActiveSidebarTab('details');
  };

  // Cancel reservation handler
  const handleCancelReservation = async (booking: any) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }
    await updateBooking(booking.id, {
      bookingStatus: 'cancelled'
    });
    setSelectedBooking((prev: any) => ({
      ...prev,
      bookingStatus: 'cancelled'
    }));
  };

  // Helper: Format Rupee
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Navigation handlers
  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  // 1. Calculate operational parameters for the selected day
  const dailyCheckins = useMemo(() => {
    return bookings.filter(b => b.checkIn === selectedDateStr && b.bookingStatus !== 'cancelled');
  }, [bookings, selectedDateStr]);

  const dailyCheckouts = useMemo(() => {
    return bookings.filter(b => b.checkOut === selectedDateStr && b.bookingStatus !== 'cancelled');
  }, [bookings, selectedDateStr]);

  const dailyBookingsCreated = useMemo(() => {
    return bookings.filter(b => {
      if (!b.createdAt) return false;
      try {
        const createdDateStr = b.createdAt.split('T')[0];
        return createdDateStr === selectedDateStr;
      } catch {
        return false;
      }
    });
  }, [bookings, selectedDateStr]);

  // 2. Filter bookings list for Sub-tabs on the selected day
  const categoryBookings = useMemo(() => {
    // Base active list for checkins/outs/created today
    const dayFilteredBookings = bookings.filter(b => {
      // Show if it starts, ends, or was created today
      const createdDateStr = b.createdAt ? b.createdAt.split('T')[0] : '';
      return b.checkIn === selectedDateStr || 
             b.checkOut === selectedDateStr || 
             createdDateStr === selectedDateStr;
    });

    switch (activeCategoryTab) {
      case 'upcoming':
        return dayFilteredBookings.filter(b => b.checkIn >= selectedDateStr && b.bookingStatus === 'confirmed');
      case 'new':
        return dayFilteredBookings.filter(b => {
          const createdDateStr = b.createdAt ? b.createdAt.split('T')[0] : '';
          return createdDateStr === selectedDateStr && b.bookingStatus !== 'cancelled';
        });
      case 'past':
        return dayFilteredBookings.filter(b => b.checkOut <= selectedDateStr && b.bookingStatus !== 'cancelled');
      case 'cancelled':
        return dayFilteredBookings.filter(b => b.bookingStatus === 'cancelled');
      default:
        return [];
    }
  }, [bookings, selectedDateStr, activeCategoryTab]);

  // 3. Search Mode logic
  const searchResults = useMemo(() => {
    if (activeNavTab !== 'search' || (!searchQuery && !searchDate)) return [];
    
    return bookings.filter(b => {
      const matchesText = searchQuery
        ? b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.guestEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.guestPhone.includes(searchQuery)
        : true;

      const matchesDate = searchDate
        ? b.checkIn === searchDate || b.checkOut === searchDate
        : true;

      return matchesText && matchesDate;
    });
  }, [bookings, searchQuery, searchDate, activeNavTab]);

  // 4. Calendar View Mode calculation (Legend check-ins & check-outs)
  const calendarDaysInfo = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const padding = Array.from({ length: start.getDay() });

    const monthDays = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const checkinsCount = bookings.filter(b => b.checkIn === dateStr && b.bookingStatus !== 'cancelled').length;
      const checkoutsCount = bookings.filter(b => b.checkOut === dateStr && b.bookingStatus !== 'cancelled').length;

      return {
        day,
        dateStr,
        hasCheckins: checkinsCount > 0,
        hasCheckouts: checkoutsCount > 0
      };
    });

    return { monthDays, padding };
  }, [bookings, calendarMonth]);

  // Bookings list for clicked date in Calendar View
  const calendarDateBookings = useMemo(() => {
    if (activeNavTab !== 'calendar') return [];
    return bookings.filter(b => {
      if (b.bookingStatus === 'cancelled') return false;
      if (calendarToggleMode === 'checkin') {
        return b.checkIn === selectedDateStr;
      } else {
        return b.checkOut === selectedDateStr;
      }
    });
  }, [bookings, selectedDateStr, calendarToggleMode, activeNavTab]);

  // 5. Advanced Filter Mode logic
  const filteredBookings = useMemo(() => {
    if (activeNavTab !== 'filter' || !filtersApplied) return [];

    return bookings.filter(b => {
      // 1. Date filter type
      let targetDate = '';
      if (filterBy === 'checkin') targetDate = b.checkIn;
      else if (filterBy === 'checkout') targetDate = b.checkOut;
      else targetDate = b.createdAt ? b.createdAt.split('T')[0] : '';

      if (filterStartDate && targetDate < filterStartDate) return false;
      if (filterEndDate && targetDate > filterEndDate) return false;

      // 2. Booking Status
      if (filterBookingStatuses.length > 0) {
        // Map status names to chips
        let mappedStatus = b.bookingStatus;
        if (mappedStatus === 'checked_in') mappedStatus = 'confirmed'; // treating checked_in as confirmed for simple status maps
        if (!filterBookingStatuses.includes(mappedStatus)) return false;
      }

      // 3. Payment Status
      if (filterPaymentStatuses.length > 0 && !filterPaymentStatuses.includes(b.paymentStatus)) {
        return false;
      }

      // 4. Pay Mode (mock tags inside booking meta or defaults)
      if (filterPayModes.length > 0) {
        const payMode = b.paymentStatus === 'paid' ? 'Pay Now' : 'Pay@Hotel';
        if (!filterPayModes.includes(payMode)) return false;
      }

      return true;
    });
  }, [bookings, filterBy, filterStartDate, filterEndDate, filterBookingStatuses, filterPaymentStatuses, filterPayModes, filtersApplied, activeNavTab]);

  // Toggle helpers for filter chips
  const toggleStatusFilter = (status: string) => {
    setFilterBookingStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePaymentFilter = (status: string) => {
    setFilterPaymentStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePayModeFilter = (mode: string) => {
    setFilterPayModes(prev => 
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  const handleClearFilters = () => {
    setFilterBy('checkin');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterBookingStatuses([]);
    setFilterPaymentStatuses([]);
    setFilterPayModes([]);
    setFiltersApplied(false);
  };

  // Layout switcher for top view tabs
  const renderNavTabContent = () => {
    switch (activeNavTab) {
      case 'search':
        return (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-4 animate-in fade-in duration-150 text-left">
            <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
              <Search className="w-4 h-4 text-[#1B93A4]" />
              Search Reservations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Search Text / ID</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 bg-[#FAFAF9]">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Enter Booking ID, Guest Name, Email..."
                    className="flex-grow bg-transparent border-none outline-none text-xs text-[#1C1917] placeholder-zinc-400"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Date</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 bg-[#FAFAF9]">
                  <input 
                    type="date"
                    value={searchDate}
                    onChange={e => setSearchDate(e.target.value)}
                    className="flex-grow bg-transparent border-none outline-none text-xs text-[#1C1917]"
                  />
                </div>
              </div>
            </div>

            {/* Search Results rendering */}
            {(searchQuery || searchDate) && (
              <div className="pt-4 border-t border-zinc-100">
                <h4 className="font-bold text-xs text-zinc-500 mb-3 uppercase tracking-wider">Search Results ({searchResults.length})</h4>
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map(b => renderBookingRow(b))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-zinc-400">No bookings match your search query.</p>
                )}
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-6 animate-in fade-in duration-150 text-left w-full">
            {/* Constrain only the Calendar grid widget to max 440px width */}
            <div className="max-w-[440px] mx-auto w-full space-y-4">
              {/* Calendar Grid Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#1B93A4]" />
                  <span>Calendar View</span>
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCalendarMonth(prev => subDays(prev, 30))}
                    className="p-1 hover:bg-[#FAFAF9] border rounded-lg text-zinc-500 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-zinc-700 min-w-[100px] text-center">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </span>
                  <button 
                    onClick={() => setCalendarMonth(prev => addDays(prev, 30))}
                    className="p-1 hover:bg-[#FAFAF9] border rounded-lg text-zinc-500 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
              </div>

              {/* Legend Line */}
              <div className="flex justify-center items-center gap-4 text-[10px] font-bold text-zinc-500 py-1.5 border-b border-zinc-100 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse" />
                  <span>Checkins today</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block animate-pulse" />
                  <span>Checkouts today</span>
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDaysInfo.padding.map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square bg-zinc-50/40 rounded-lg" />
                ))}
                {calendarDaysInfo.monthDays.map(item => {
                  const isSelected = selectedDateStr === item.dateStr;
                  const isTodayDay = isToday(item.day);
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.day)}
                      className={`aspect-square p-1 rounded-lg border flex flex-col justify-between items-center transition select-none ${
                        isSelected 
                          ? 'bg-zinc-950 border-zinc-950 text-white shadow-sm' 
                          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-[#FAFAF9]'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${
                        isTodayDay && !isSelected 
                          ? 'bg-[#1B93A4] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold' 
                          : isSelected ? 'text-white' : 'text-zinc-750'
                      }`}>
                        {format(item.day, 'd')}
                      </span>
                      <div className="flex gap-1 justify-center w-full pb-0.5">
                        {item.hasCheckins && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" title="Check-ins today" />
                        )}
                        {item.hasCheckouts && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block" title="Check-outs today" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom details inside Calendar tab */}
            <div className="pt-4 border-t border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-zinc-500 uppercase tracking-wider">
                  {format(selectedDate, 'eeee, dd MMMM yyyy')}
                </h4>

                {/* Filter toggle switches */}
                <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCalendarToggleMode('checkin')}
                    className={`px-3 py-1 rounded-md font-bold transition text-[10px] uppercase tracking-wider cursor-pointer ${
                      calendarToggleMode === 'checkin' ? 'bg-white text-zinc-800 shadow-xs font-extrabold' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Checkins
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarToggleMode('checkout')}
                    className={`px-3 py-1 rounded-md font-bold transition text-[10px] uppercase tracking-wider cursor-pointer ${
                      calendarToggleMode === 'checkout' ? 'bg-white text-zinc-800 shadow-xs font-extrabold' : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    Checkouts
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {calendarDateBookings.length > 0 ? (
                  calendarDateBookings.map(b => renderBookingRow(b))
                ) : (
                  <p className="text-center py-6 text-xs text-zinc-400">
                    No active {calendarToggleMode === 'checkin' ? 'checkins' : 'checkouts'} on this date.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-5 animate-in fade-in duration-150 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#1B93A4]" />
                Filter Reservations
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-700 transition"
                >
                  CLEAR ALL
                </button>
                <button 
                  onClick={() => setFiltersApplied(true)}
                  className="bg-[#1C1917] hover:bg-zinc-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition"
                >
                  APPLY
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Col 1: Filter Type & Date Range */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Filter By</label>
                  <select 
                    value={filterBy}
                    onChange={e => setFilterBy(e.target.value as any)}
                    className="w-full bg-[#FAFAF9] border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  >
                    <option value="checkin">Check In Date</option>
                    <option value="checkout">Check Out Date</option>
                    <option value="booking_date">Booking Created Date</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Start Date</label>
                    <input 
                      type="date"
                      value={filterStartDate}
                      onChange={e => setFilterStartDate(e.target.value)}
                      className="w-full bg-[#FAFAF9] border border-zinc-200 rounded-xl px-2 py-1.5 text-xs outline-none focus:border-[#1B93A4]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">End Date</label>
                    <input 
                      type="date"
                      value={filterEndDate}
                      onChange={e => setFilterEndDate(e.target.value)}
                      className="w-full bg-[#FAFAF9] border border-zinc-200 rounded-xl px-2 py-1.5 text-xs outline-none focus:border-[#1B93A4]"
                    />
                  </div>
                </div>
              </div>

              {/* Col 2: Booking Status */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Booking Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {['pending', 'confirmed', 'cancelled'].map(status => {
                    const active = filterBookingStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition capitalize ${
                          active 
                            ? 'bg-[#1C1917] border-[#1C1917] text-white' 
                            : 'bg-white border-zinc-250 text-zinc-600 hover:bg-[#FAFAF9]'
                        }`}
                      >
                        {status === 'confirmed' ? 'Confirmed / Checked In' : status}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Col 3: Payment Status & Pay Mode */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Payment Status</span>
                  <div className="flex gap-1.5">
                    {['pending', 'paid', 'refunded'].map(status => {
                      const active = filterPaymentStatuses.includes(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => togglePaymentFilter(status)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition capitalize ${
                            active 
                              ? 'bg-[#1C1917] border-[#1C1917] text-white' 
                              : 'bg-white border-zinc-250 text-zinc-600 hover:bg-[#FAFAF9]'
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Pay Mode</span>
                  <div className="flex gap-1.5">
                    {['Pay Now', 'Pay@Hotel'].map(mode => {
                      const active = filterPayModes.includes(mode);
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => togglePayModeFilter(mode)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                            active 
                              ? 'bg-[#1C1917] border-[#1C1917] text-white' 
                              : 'bg-white border-zinc-250 text-zinc-600 hover:bg-[#FAFAF9]'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Results list */}
            {filtersApplied && (
              <div className="pt-4 border-t border-zinc-100">
                <h4 className="font-bold text-xs text-zinc-500 mb-3 uppercase tracking-wider">Filtered Results ({filteredBookings.length})</h4>
                {filteredBookings.length > 0 ? (
                  <div className="space-y-3">
                    {filteredBookings.map(b => renderBookingRow(b))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-xs text-zinc-400">No bookings match the selected filters.</p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Shared booking row component
  const renderBookingRow = (booking: any) => {
    const isCancelled = booking.bookingStatus === 'cancelled';
    
    // Format checkin / checkout stay dates
    let stayDates = '';
    try {
      stayDates = `${format(parseISO(booking.checkIn), 'dd MMM yyyy')} - ${format(parseISO(booking.checkOut), 'dd MMM yyyy')}`;
    } catch {
      stayDates = `${booking.checkIn} - ${booking.checkOut}`;
    }

    // Format updated date
    let updatedDate = '';
    try {
      const targetDate = booking.updatedAt || booking.createdAt;
      updatedDate = `Updated ${format(parseISO(targetDate.split('T')[0]), 'dd MMM yyyy')}`;
    } catch {
      updatedDate = 'Updated 08 Jul 2026';
    }

    // Calculate total refunds
    const refundsTotal = booking.refunds 
      ? booking.refunds.reduce((sum: number, r: any) => sum + r.amount, 0)
      : 0;

    return (
      <div 
        key={booking.id} 
        onClick={() => {
          setSelectedBooking(booking);
          setIsSidebarOpen(true);
          setActiveSidebarTab('details');
        }}
        className={`p-6 rounded-3xl border border-zinc-200 bg-white text-left transition hover:shadow-md cursor-pointer space-y-4 hover:border-zinc-300 relative ${
          isCancelled ? 'opacity-65' : ''
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-extrabold text-sm text-[#1C1917] tracking-tight uppercase">
              {booking.guestName}
            </h4>
            <span className="font-mono text-3xs font-extrabold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md">
              {booking.id}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'checked_in'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
              {booking.bookingStatus === 'confirmed' ? 'Confirmed' : booking.bookingStatus === 'checked_in' ? 'Checked In' : 'Cancelled'}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400" />
        </div>

        {/* Hotel Name */}
        <p className="text-2xs text-[#78716C] font-semibold -mt-2">
          {hotelInfo.name || 'The Grandlake Resorts'}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-4 pt-1">
          {/* Stay Info */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Stay</span>
            <span className="text-xs font-bold text-zinc-800">{stayDates}</span>
          </div>

          {/* Price Info */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total Amount</span>
            <span className="text-xs font-bold text-zinc-800 flex flex-wrap items-center gap-1.5">
              {formatRupees(booking.totalPrice)}
              <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                booking.paymentStatus === 'paid' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' 
                  : booking.paymentStatus === 'partially_paid'
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                {booking.paymentStatus === 'paid' 
                  ? 'Paid' 
                  : booking.paymentStatus === 'partially_paid'
                  ? 'Partially'
                  : 'Unpaid'}
              </span>
            </span>
          </div>

          {/* Guests Info */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Guests</span>
            <span className="text-xs font-bold text-zinc-800">{booking.adults || 2} guests · 1 room</span>
          </div>

          {/* Refunds Info */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Refunds</span>
            <span className="text-xs font-bold text-zinc-800">
              {refundsTotal > 0 ? formatRupees(refundsTotal) : 'None'}
            </span>
          </div>
        </div>

        {/* Contact details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-4xs font-bold text-[#78716C] uppercase tracking-wider pt-2 border-t border-dashed border-zinc-155">
          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-zinc-400" /> {booking.guestPhone}</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-zinc-400" /> {booking.guestEmail || 'No email'}</span>
        </div>

        {/* Room Category Pill */}
        <div className="pt-1 flex items-center justify-between">
          <span className="inline-flex px-3 py-1 bg-zinc-50 border border-zinc-200 text-[#1C1917] rounded-full text-[10px] font-extrabold tracking-tight uppercase">
            {booking.roomName || 'Standard Room'}
          </span>
          {/* Footer date */}
          <div className="text-[10px] font-semibold text-zinc-400">
            {updatedDate}
          </div>
        </div>
      </div>
    );
  };

  // Sidebar Render Helpers
  const renderSidebarDetails = (booking: any) => {
    // Format checkin / checkout dates
    let cinDate = booking.checkIn;
    let coutDate = booking.checkOut;
    let stayDuration = '1 night stay';
    try {
      cinDate = format(parseISO(booking.checkIn), 'dd MMM yyyy');
      coutDate = format(parseISO(booking.checkOut), 'dd MMM yyyy');
      const diffTime = Math.abs(new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime());
      const nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      stayDuration = `${nightsCount} ${nightsCount === 1 ? 'night' : 'nights'} stay`;
    } catch (e) {
      console.warn(e);
    }

    // Format accepted date
    let acceptedStr = 'Accepted 08 Jul 2026';
    try {
      acceptedStr = `Accepted ${format(parseISO((booking.createdAt || '').split('T')[0]), 'dd MMM yyyy')}`;
    } catch {
      acceptedStr = `Accepted ${booking.createdAt || '08 Jul 2026'}`;
    }

    // Calculate total refunds
    const refundsTotal = booking.refunds 
      ? booking.refunds.reduce((sum: number, r: any) => sum + r.amount, 0)
      : 0;

    return (
      <div className="space-y-6 text-left font-sans">
        {/* Header Details Card */}
        <div className="p-5 bg-gradient-to-br from-zinc-50 to-zinc-100/60 border border-zinc-200 rounded-3xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black text-sm uppercase shrink-0">
            {booking.guestName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'checked_in'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}>
                {booking.bookingStatus === 'confirmed' ? 'Confirmed' : booking.bookingStatus === 'checked_in' ? 'Checked In' : 'Cancelled'}
              </span>
              <span className="font-mono text-3xs font-extrabold bg-white border text-zinc-500 px-2 py-0.5 rounded-md">
                {booking.id}
              </span>
            </div>
            <h3 className="font-extrabold text-base text-[#1C1917] uppercase tracking-wide">
              {booking.guestName}
            </h3>
            <p className="text-3xs text-zinc-500 font-semibold leading-relaxed">
              {hotelInfo.name || 'The Grandlake Resorts'} · {cinDate} - {coutDate}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              <span>{acceptedStr}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="px-1.5 py-0.5 bg-zinc-200 text-zinc-650 rounded-md font-black text-4xs">AUTO</span>
            </div>
          </div>
        </div>

        {/* Payment Summary Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-left">
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Vendor Total</span>
            <span className="text-sm font-black text-[#1C1917] block mt-1">{formatRupees(booking.totalPrice)}</span>
          </div>
          <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-4 text-left">
            <span className="text-[9px] font-extrabold text-blue-500 uppercase tracking-wider block">Paid</span>
            <span className="text-sm font-black text-blue-900 block mt-1">{formatRupees(booking.paidAmount || 0)}</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-150 rounded-2xl p-4 text-left">
            <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block">Collect at check-in</span>
            <span className="text-sm font-black text-amber-900 block mt-1">
              {formatRupees(Math.max(0, booking.totalPrice - (booking.paidAmount || 0)))}
            </span>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Check-In */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Calendar className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Check-in</span>
              <p className="text-2xs font-extrabold text-zinc-800">{cinDate}</p>
              <p className="text-[10px] text-zinc-400 font-semibold">{stayDuration}</p>
            </div>
          </div>

          {/* Check-Out */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Calendar className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Check-out</span>
              <p className="text-2xs font-extrabold text-zinc-800">{coutDate}</p>
              <p className="text-[10px] text-zinc-400 font-semibold">{booking.selectedSlot || 'Edappadi'}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Phone className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Phone</span>
              <p className="text-2xs font-extrabold text-zinc-800">{booking.guestPhone || '9655925123'}</p>
              <p className="text-[10px] text-zinc-400 font-semibold">Primary booking contact</p>
            </div>
          </div>

          {/* Email */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Email</span>
              <p className="text-2xs font-extrabold text-zinc-800">{booking.guestEmail || 'No email'}</p>
              <p className="text-[10px] text-zinc-400 font-semibold">Booking communication</p>
            </div>
          </div>

          {/* Guests and rooms */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <CalendarDays className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Guests and rooms</span>
              <p className="text-2xs font-extrabold text-zinc-800">
                {(booking.adults || 2) + (booking.children || 0)} guests · 1 room
              </p>
              <p className="text-[10px] text-zinc-400 font-semibold">Booked accommodation count</p>
            </div>
          </div>

          {/* Property */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Landmark className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Property</span>
              <p className="text-2xs font-extrabold text-zinc-800">{hotelInfo.name || 'The Grandlake Resorts'}</p>
              <p className="text-[9px] text-zinc-400 font-semibold leading-normal truncate max-w-[200px]" title={hotelInfo.address}>
                {hotelInfo.address}
              </p>
            </div>
          </div>

          {/* Gateway */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Tag className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Gateway</span>
              <p className="text-2xs font-extrabold text-zinc-800">payu</p>
              <p className="text-[10px] text-zinc-400 font-semibold">Order {booking.id}</p>
            </div>
          </div>

          {/* Refunds */}
          <div className="p-3 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#8FA89B] shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Refunds</span>
              <p className="text-2xs font-extrabold text-zinc-800">
                {refundsTotal > 0 ? formatRupees(refundsTotal) : 'No refunds yet'}
              </p>
              <p className="text-[10px] text-zinc-400 font-semibold">
                {booking.refunds?.length || 0} refund records
              </p>
            </div>
          </div>
        </div>

        {/* Booked Rooms section */}
        <div className="space-y-2">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Booked Rooms</span>
          <div className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-start justify-between">
            <div className="space-y-1 text-left">
              <h4 className="font-extrabold text-xs text-zinc-950">{booking.roomName || 'Blue Lagoon Premium Room'}</h4>
              <p className="text-[10px] text-zinc-500 font-medium">{booking.roomName || 'Blue Lagoon Premium Room'}</p>
            </div>
            <span className="px-2.5 py-1 bg-zinc-55 text-zinc-800 rounded-md font-extrabold text-4xs shrink-0 uppercase tracking-wider border">
              {(booking.adults || 2) + (booking.children || 0)} Guests
            </span>
          </div>
        </div>

        {/* Manage Reservation options */}
        <div className="p-5 border border-zinc-200 rounded-3xl space-y-4 bg-white">
          <div className="text-left space-y-0.5">
            <h4 className="font-black text-sm text-[#1C1917]">Manage reservation</h4>
            <p className="text-3xs text-zinc-500 font-semibold">Update dates, issue refunds, or cancel this booking.</p>
          </div>

          <div className="divide-y divide-zinc-100">
            {/* Edit reservation */}
            <button
              onClick={() => {
                setEditCheckIn(booking.checkIn);
                setEditCheckOut(booking.checkOut);
                setEditTotalPrice(booking.totalPrice);
                setActiveSidebarTab('edit');
              }}
              className="w-full py-3.5 flex items-center justify-between hover:bg-zinc-50/55 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-500">
                  <Edit className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-2xs font-extrabold text-zinc-900 uppercase tracking-wide">Edit reservation</h5>
                  <p className="text-3xs text-zinc-400 font-bold">Update stay dates and vendor total amount</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Issue refund */}
            <button
              onClick={() => {
                setRefundAmount(0);
                setRefundReason('');
                setRefundType('source');
                setActiveSidebarTab('refund');
              }}
              className="w-full py-3.5 flex items-center justify-between hover:bg-zinc-50/55 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-500">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-2xs font-extrabold text-zinc-900 uppercase tracking-wide">Issue refund</h5>
                  <p className="text-3xs text-zinc-400 font-bold">Send money back to the source or convert to credits</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Cancel reservation */}
            <button
              onClick={() => handleCancelReservation(booking)}
              className="w-full py-3.5 flex items-center justify-between hover:bg-rose-50/55 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-2xs font-extrabold text-rose-700 uppercase tracking-wide">Cancel reservation</h5>
                  <p className="text-3xs text-rose-500 font-bold">Mark this booking as cancelled</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Refund history */}
            <button
              onClick={() => setActiveSidebarTab('history')}
              className="w-full py-3.5 flex items-center justify-between hover:bg-zinc-50/55 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-2xs font-extrabold text-zinc-900 uppercase tracking-wide">Refund history</h5>
                  <p className="text-3xs text-zinc-400 font-bold">View past refund transactions for this booking</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarEdit = (booking: any) => {
    return (
      <div className="space-y-5 text-left font-sans animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidebarTab('details')}
            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">Edit reservation</h3>
        </div>

        <div className="space-y-4 bg-[#FAFAF9] border border-zinc-250 p-5 rounded-2xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Check-in Date</label>
            <input
              type="date"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8FA89B]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Check-out Date</label>
            <input
              type="date"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8FA89B]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Vendor Total Price (₹)</label>
            <input
              type="number"
              value={editTotalPrice}
              onChange={(e) => setEditTotalPrice(Number(e.target.value))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8FA89B]"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => handleEditReservation(booking)}
              className="flex-1 bg-[#1C1917] hover:bg-zinc-800 text-white font-extrabold text-2xs uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Save changes
            </button>
            <button
              onClick={() => setActiveSidebarTab('details')}
              className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-650 font-extrabold text-2xs uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarRefund = (booking: any) => {
    const maxRefund = booking.paidAmount || 0;
    return (
      <div className="space-y-5 text-left font-sans animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidebarTab('details')}
            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">Issue refund</h3>
        </div>

        <div className="space-y-4 bg-[#FAFAF9] border border-zinc-250 p-5 rounded-2xl">
          <div className="p-3 bg-zinc-100/60 rounded-xl flex items-start gap-2.5 border text-left">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 font-semibold leading-normal">
              Maximum amount available to refund is <strong className="text-zinc-850">{formatRupees(maxRefund)}</strong> (amount paid by guest).
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Refund Amount (₹)</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              max={maxRefund}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8FA89B]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Refund Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundType('source')}
                className={`py-2 px-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border text-center transition cursor-pointer ${
                  refundType === 'source'
                    ? 'bg-[#1C1917] border-[#1C1917] text-white'
                    : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                }`}
              >
                Back to source
              </button>
              <button
                type="button"
                onClick={() => setRefundType('credits')}
                className={`py-2 px-3 text-xs font-extrabold uppercase tracking-wider rounded-xl border text-center transition cursor-pointer ${
                  refundType === 'credits'
                    ? 'bg-[#1C1917] border-[#1C1917] text-white'
                    : 'bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50'
                }`}
              >
                Convert to credits
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Refund Reason</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Booking date modification, double booking, etc."
              rows={3}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8FA89B] placeholder-zinc-350"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => handleIssueRefund(booking)}
              className="flex-1 bg-[#1C1917] hover:bg-zinc-800 text-white font-extrabold text-2xs uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Issue refund
            </button>
            <button
              onClick={() => setActiveSidebarTab('details')}
              className="flex-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-650 font-extrabold text-2xs uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarRefundHistory = (booking: any) => {
    return (
      <div className="space-y-5 text-left font-sans animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidebarTab('details')}
            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-extrabold text-sm text-zinc-900 uppercase tracking-wider">Refund History</h3>
        </div>

        <div className="space-y-3">
          {booking.refunds && booking.refunds.length > 0 ? (
            booking.refunds.map((ref: any) => (
              <div key={ref.id} className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-600">{formatRupees(ref.amount)}</span>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md font-bold text-4xs uppercase tracking-wider border">
                    {ref.refundType === 'source' ? 'Source' : 'Credits'}
                  </span>
                </div>
                <p className="text-2xs text-zinc-700 font-semibold leading-relaxed">
                  Reason: {ref.reason}
                </p>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider pt-0.5">
                  Refunded on {format(parseISO(ref.createdAt), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 bg-zinc-50/50 border border-dashed rounded-2xl text-center text-xs text-zinc-400 font-medium">
              No past refund transactions found for this booking.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* ─── Header Dropdown & Nav Bar (Image 2) ──────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div 
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <h2 className="text-2xl font-black text-[#1C1917] font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {hotelInfo.name || 'THE GRAND LAKE RESORTS'}
            </h2>
            <ChevronDownIcon className="w-4 h-4 text-[#1B93A4] transition group-hover:scale-110" />
          </div>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 w-72 bg-white border border-[#E7E5E4] rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3.5 py-1.5 border-b border-zinc-100">
                  Switch Property
                </div>
                <ul className="max-h-60 overflow-y-auto mt-1.5 space-y-0.5">
                  {propertiesList.map(p => {
                    const isActive = p.id === activePropertyId;
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => {
                            setActivePropertyId(p.id);
                            updateHotelInfo({ name: p.name });
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                            isActive 
                              ? 'bg-zinc-100 text-[#1B93A4]' 
                              : 'text-zinc-700 hover:bg-[#FAFAF9]'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1B93A4]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
          <p className="text-xs text-zinc-400 font-semibold mt-1">Hotel | {hotelInfo.address?.split(',').slice(-2)[0]?.trim() || 'Sankari'}</p>
        </div>

        {/* Tab switcher nav bar */}
        <div className="flex bg-[#F5F5F4] p-0.5 rounded-xl border border-[#E7E5E4] shrink-0">
          {(['search', 'calendar', 'filter'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveNavTab(tab); setFiltersApplied(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                activeNavTab === tab 
                  ? 'bg-white text-[#1B93A4] shadow-xs' 
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {tab === 'search' && <Search className="w-3.5 h-3.5" />}
              {tab === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
              {tab === 'filter' && <Filter className="w-3.5 h-3.5" />}
              <span>{tab === 'calendar' ? 'Calendar View' : tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Render Dynamic Nav Tab Panel */}
      {renderNavTabContent()}

      {/* ─── Daily Navigator & Operational Counters (Image 2) ─────────── */}
      {activeNavTab === 'search' && (
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 space-y-6">
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={handlePrevDay} 
              className="p-2 border border-zinc-200 hover:bg-[#FAFAF9] rounded-xl text-[#78716C] transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h3 className="font-extrabold text-base text-amber-600 sm:text-lg min-w-[200px] text-center" style={{ color: '#D97706', fontFamily: 'Outfit, sans-serif' }}>
              {format(selectedDate, 'eeee, MMMM do yyyy')}
            </h3>
            <button 
              onClick={handleNextDay} 
              className="p-2 border border-zinc-200 hover:bg-[#FAFAF9] rounded-xl text-[#78716C] transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-3 divide-x divide-zinc-200 text-center border-t border-b border-zinc-150 py-5">
            <div>
              <p className="text-3xl font-black text-indigo-900" style={{ color: '#312E81', fontFamily: 'Outfit, sans-serif' }}>
                {dailyCheckins.length}
              </p>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mt-1">Checkins</span>
            </div>
            <div>
              <p className="text-3xl font-black text-indigo-900" style={{ color: '#312E81', fontFamily: 'Outfit, sans-serif' }}>
                {dailyCheckouts.length}
              </p>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mt-1">Checkouts</span>
            </div>
            <div>
              <p className="text-3xl font-black text-indigo-900" style={{ color: '#312E81', fontFamily: 'Outfit, sans-serif' }}>
                {dailyBookingsCreated.length}
              </p>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mt-1">Bookings</span>
            </div>
          </div>

          {/* Categorized sub-tabs (Upcoming, New, Past, Cancelled) */}
          <div className="space-y-4">
            <div className="flex border-b border-zinc-200">
              {(['upcoming', 'new', 'past', 'cancelled'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveCategoryTab(tab)}
                  className={`pb-3 px-4 text-xs font-bold capitalize border-b-2 transition -mb-px cursor-pointer ${
                    activeCategoryTab === tab 
                      ? 'border-indigo-650 text-indigo-650 font-black' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-800'
                  }`}
                  style={activeCategoryTab === tab ? { borderColor: '#4338CA', color: '#4338CA' } : {}}
                >
                  {tab
                }</button>
              ))}
            </div>

            {/* Bookings rows list for category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryBookings.length > 0 ? (
                categoryBookings.map(b => renderBookingRow(b))
              ) : (
                /* Mockup empty state */
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-10 space-y-4 text-center">
                  <div className="relative w-40 h-32 opacity-80 flex items-center justify-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                    <CalendarDays className="w-12 h-12 text-indigo-400/40" />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 font-sans">No bookings found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details Sidebar overlay */}
      {isSidebarOpen && selectedBooking && (
        <div className="fixed inset-0 z-[999] overflow-hidden" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" />
          
          <div 
            className="absolute inset-y-0 right-0 max-w-xl w-full bg-[#FAF9F5] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between text-left shrink-0 bg-white">
              <div className="space-y-1">
                <span className="text-[9px] text-[#1B93A4] tracking-[0.25em] uppercase font-bold block">RESERVATION</span>
                <h2 className="text-xl font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Reservation details
                </h2>
                <p className="text-3xs text-zinc-500 font-semibold leading-relaxed">
                  Review reservation details, manage dates, view payments, or issue refunds below.
                </p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-650 transition cursor-pointer border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {activeSidebarTab === 'details' && renderSidebarDetails(selectedBooking)}
              {activeSidebarTab === 'edit' && renderSidebarEdit(selectedBooking)}
              {activeSidebarTab === 'refund' && renderSidebarRefund(selectedBooking)}
              {activeSidebarTab === 'history' && renderSidebarRefundHistory(selectedBooking)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple ChevronDownIcon helper for header dropdown
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
