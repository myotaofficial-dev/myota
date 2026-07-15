import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay, addMonths, subMonths 
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Tag, Trash2, CheckCircle2, Pencil 
} from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  roomIds: string[];
  discountType: 'percent' | 'flat';
  discountValue: number;
  dates: string[];
}

export const OffersPromotionsView: React.FC = () => {
  const { hotelInfo, updateHotelInfo, rooms } = useHotel();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectionMode, setSelectionMode] = useState<'multi' | 'range'>('multi');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Form states for creating a new offer
  const [offerName, setOfferName] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(10);

  const offers: Offer[] = hotelInfo.offers || [];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array.from({ length: monthStart.getDay() });

  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    if (!startStr) return [];
    if (!endStr) return [startStr];
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const dates: string[] = [];
      let current = new Date(start);
      while (current <= end) {
        dates.push(format(current, 'yyyy-MM-dd'));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    } catch (err) {
      return [];
    }
  };

  const handleCellClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (selectionMode === 'multi') {
      setSelectedDates(prev => 
        prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
      );
    } else {
      if (!fromDate || (fromDate && toDate)) {
        setFromDate(dateStr);
        setToDate('');
      } else {
        if (dateStr < fromDate) {
          setFromDate(dateStr);
        } else {
          setToDate(dateStr);
        }
      }
    }
  };

  const activeSelectedDates = selectionMode === 'multi' 
    ? selectedDates 
    : getDatesInRange(fromDate, toDate);

  const handleSelectAllRooms = () => {
    if (selectedRoomIds.length === rooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(rooms.map(r => r.id));
    }
  };

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerName.trim()) {
      alert('Please enter an offer name.');
      return;
    }
    if (selectedRoomIds.length === 0) {
      alert('Please select at least one room category.');
      return;
    }
    if (activeSelectedDates.length === 0) {
      alert('Please select at least one date on the calendar.');
      return;
    }

    let updatedOffers = [...offers];
    if (editingOfferId) {
      updatedOffers = offers.map(o => o.id === editingOfferId ? {
        ...o,
        name: offerName.trim(),
        roomIds: [...selectedRoomIds],
        discountType,
        discountValue: Number(discountValue) || 0,
        dates: [...activeSelectedDates]
      } : o);
      setEditingOfferId(null);
    } else {
      const newOffer: Offer = {
        id: `offer_${Date.now()}`,
        name: offerName.trim(),
        roomIds: [...selectedRoomIds],
        discountType,
        discountValue: Number(discountValue) || 0,
        dates: [...activeSelectedDates]
      };
      updatedOffers.push(newOffer);
    }

    updateHotelInfo({ offers: updatedOffers });

    setOfferName('');
    setSelectedRoomIds([]);
    setSelectedDates([]);
    setFromDate('');
    setToDate('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeleteOffer = (offerId: string) => {
    const updatedOffers = offers.filter(o => o.id !== offerId);
    if (editingOfferId === offerId) {
      setEditingOfferId(null);
      setOfferName('');
      setSelectedRoomIds([]);
      setSelectedDates([]);
      setFromDate('');
      setToDate('');
    }
    updateHotelInfo({ offers: updatedOffers });
  };

  const getOffersForDate = (dateStr: string) => {
    return offers.filter(o => o.dates.includes(dateStr));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Offers & Promotions</h2>
          <p className="text-sm text-[#78716C]">Create special room discount campaigns targeting specific room categories across the calendar.</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E8F5EF] border border-[#2D6A4F] text-[#2D6A4F] text-xs font-semibold rounded-lg animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Campaign Created!</span>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 text-left items-stretch relative min-h-[650px] w-full">
        {/* Main interactive area */}
        <div className="flex-grow flex-1 min-w-0 bg-white rounded-2xl border border-[#E7E5E4] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4]">
            <h3 className="text-xs font-black text-[#78716C] uppercase tracking-wider">
              Calendar Month View
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-[#1C1917] px-2.5">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase tracking-wider text-[#A8A29E] py-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square bg-[#FAFAF9]/40 rounded-lg" />
            ))}

            {daysInMonth.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const isPast = isBefore(day, startOfDay(new Date()));
              const isTodayDay = isToday(day);
              const isSelected = activeSelectedDates.includes(dateKey);
              const dateOffers = getOffersForDate(dateKey);

              return (
                <button
                  type="button"
                  key={dateKey}
                  disabled={isPast}
                  onClick={() => handleCellClick(day)}
                  className={`aspect-square p-2 rounded-lg border flex flex-col justify-between items-stretch text-left transition relative select-none cursor-pointer ${
                    isPast 
                      ? 'bg-[#F5F5F4]/60 border-[#FAFAF9] text-[#A8A29E] cursor-not-allowed' 
                      : dateOffers.length > 0
                      ? 'bg-[#EBF5EF] border-[#8FA89B] text-zinc-800'
                      : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4] hover:bg-[#FAFAF9]'
                  } ${isSelected ? 'ring-2 ring-[#1C1917] ring-offset-2 border-transparent bg-teal-50/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      isTodayDay ? 'bg-[#1B93A4] text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold shadow-sm' : 'text-[#78716C]'
                    } ${isPast ? 'text-[#A8A29E]' : ''}`}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="mt-auto space-y-0.5 w-full overflow-hidden">
                    {dateOffers.slice(0, 2).map(o => (
                      <span 
                        key={o.id} 
                        className="block text-[8px] font-bold px-1 py-0.5 rounded truncate text-center leading-none bg-amber-100 text-amber-800"
                      >
                        🏷️ {o.name}
                      </span>
                    ))}
                    {dateOffers.length > 2 && (
                      <span className="block text-[7px] text-zinc-400 font-bold text-center">
                        +{dateOffers.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Sidebar */}
        <div className="w-full xl:w-[360px] bg-white rounded-2xl border border-[#E7E5E4] p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-5">
            <div>
              <h4 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#1B93A4]" />
                <span>{editingOfferId ? 'Edit Campaign' : 'Create Campaign'}</span>
              </h4>
              <p className="text-[10px] text-[#A8A29E] mt-0.5">Select date range on the calendar to activate the launch button</p>
            </div>

            {/* Selection Mode Switcher */}
            <div className="flex p-0.5 rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('multi');
                  setSelectedDates([]);
                  setFromDate('');
                  setToDate('');
                }}
                className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectionMode === 'multi' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Multi-Select
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('range');
                  setSelectedDates([]);
                  setFromDate('');
                  setToDate('');
                }}
                className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectionMode === 'range' ? 'bg-white text-[#1C1917] shadow-xs' : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Range Select
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Monsoon Special"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  className="ds-input w-full px-3 py-2 text-xs text-zinc-800 bg-white border border-[#E7E5E4] rounded-lg outline-none"
                />
              </div>

              {/* Individual Room Selection */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">Select Room Categories</label>
                  <button
                    type="button"
                    onClick={handleSelectAllRooms}
                    className="text-[9px] font-bold text-[#1B93A4] hover:underline uppercase tracking-wider"
                  >
                    {selectedRoomIds.length === rooms.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto border border-[#E7E5E4] rounded-lg p-2.5 bg-[#FAFAF9]">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoomIds(prev => [...prev, room.id]);
                          } else {
                            setSelectedRoomIds(prev => prev.filter(id => id !== room.id));
                          }
                        }}
                        className="rounded border-gray-300 text-[#1B93A4] focus:ring-[#1B93A4] h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide block">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-3 py-2 w-full text-xs font-semibold text-zinc-800 focus:border-[#1B93A4]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Price (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide block">Discount Value</label>
                  <input
                    type="number"
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="ds-input w-full px-3 py-2 text-xs text-zinc-800 bg-white border border-[#E7E5E4] rounded-lg outline-none"
                  />
                </div>
              </div>

              {activeSelectedDates.length > 0 ? (
                <div className="bg-[#FAFAF9] border border-[#E8E5E4] rounded-xl p-3.5 space-y-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide block font-sans">Selected Campaign Dates</span>
                  <p className="text-[10px] font-extrabold text-zinc-700 leading-normal">
                    {activeSelectedDates.length} days selected starting from {activeSelectedDates[0]}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded-xl font-semibold text-center leading-normal">
                  ⚠️ Select dates on the calendar first to activate campaign launching.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={activeSelectedDates.length === 0}
                  className="ds-btn-primary flex-grow py-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans uppercase text-3xs font-extrabold tracking-wider"
                >
                  {editingOfferId ? 'Save Changes' : 'Launch Campaign'}
                </button>
                {editingOfferId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOfferId(null);
                      setOfferName('');
                      setSelectedRoomIds([]);
                      setSelectedDates([]);
                      setFromDate('');
                      setToDate('');
                    }}
                    className="border border-[#E7E5E4] bg-white hover:bg-[#FAFAF9] text-zinc-600 rounded-lg px-3.5 py-2.5 text-3xs font-extrabold uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Active Campaigns List */}
          {offers.length > 0 && (
            <div className="pt-4 border-t border-[#E7E5E4] mt-4 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide block text-left">Active Campaigns</span>
              <div className="space-y-2">
                {offers.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2.5 border border-zinc-150 rounded-xl bg-zinc-50 text-left text-xs">
                    <div className="max-w-[70%]">
                      <span className="font-extrabold text-zinc-800 block truncate">{o.name}</span>
                      <span className="text-[9px] text-[#1B93A4] font-bold block truncate">
                        {o.roomIds.map(rid => rooms.find(r => r.id === rid)?.name).filter(Boolean).join(', ')}
                      </span>
                      <span className="text-[9px] text-zinc-450 block font-bold capitalize">
                        {o.discountType === 'percent' ? `${o.discountValue}% Off` : `₹${o.discountValue} Off`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOfferId(o.id);
                          setOfferName(o.name);
                          setSelectedRoomIds(o.roomIds);
                          setDiscountType(o.discountType);
                          setDiscountValue(o.discountValue);
                          if (o.dates && o.dates.length > 0) {
                            setSelectionMode('multi');
                            setSelectedDates(o.dates);
                          }
                        }}
                        className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer text-zinc-400"
                        title="Edit Campaign"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(o.id)}
                        className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer text-zinc-400"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
