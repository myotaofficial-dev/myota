import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  ChevronLeft, ChevronRight, Lock, Unlock, Sparkles, Calendar, RefreshCcw, LayoutGrid, CalendarDays
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isToday, addMonths, subMonths, isBefore, startOfDay, addDays, subDays
} from 'date-fns';

export const PricingCalendarView: React.FC = () => {
  const { rooms, pricing, updateDateOverride, setRooms } = useHotel();
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'grid'>('calendar');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // 7-day grid starting date
  const [gridStartDate, setGridStartDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Popover override pricing
  const [overridePriceTiers, setOverridePriceTiers] = useState<Record<string, string>>({});
  const [overrideBlocked, setOverrideBlocked] = useState<boolean>(false);
  const [overrideInventory, setOverrideInventory] = useState<string>('');

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // INR Formatter
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 7-day dates
  const gridDates = Array.from({ length: 7 }).map((_, i) => addDays(gridStartDate, i));

  // Month navigation helpers
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array.from({ length: monthStart.getDay() });

  // Get info for a date
  const getDayInfo = (roomId: string, date: Date) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    const dateStr = format(date, 'yyyy-MM-dd');
    const roomPricing = pricing[roomId] || {};
    const override = roomPricing[dateStr];
    
    // Inventory override or default
    const inventory = targetRoom?.inventory_overrides?.[dateStr] ?? (targetRoom?.totalInventory ?? 5);
    
    // Price overrides per-tier or base fallback
    const basePrice = targetRoom?.basePrice ?? 3000;
    const rates: Record<string, number> = {};
    const guestCounts = Object.keys(targetRoom?.price_tiers || { '1': basePrice });
    
    guestCounts.forEach(g => {
      const dayOverrideRate = targetRoom?.rate_overrides?.[dateStr]?.[g];
      rates[g] = dayOverrideRate ?? (targetRoom?.price_tiers?.[g] ?? basePrice);
    });

    const singleDisplayPrice = override && override.price > 0 ? override.price : (targetRoom?.price_tiers?.['1'] ?? basePrice);

    return {
      price: singleDisplayPrice,
      rates,
      inventory,
      isBlocked: override ? override.isBlocked : false,
      hasOverride: (override && override.price > 0) || !!targetRoom?.rate_overrides?.[dateStr]
    };
  };

  const handleCellClick = (roomId: string, date: Date) => {
    setSelectedRoomId(roomId);
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDateStr(dateStr);

    const info = getDayInfo(roomId, date);
    setOverrideBlocked(info.isBlocked);
    setOverrideInventory(String(info.inventory));

    // Convert numeric rates to input string values
    const tierStrs: Record<string, string> = {};
    Object.entries(info.rates).forEach(([g, val]) => {
      tierStrs[g] = String(val);
    });
    setOverridePriceTiers(tierStrs);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !selectedRoomId || !selectedRoom) return;

    // 1. Update basic block status and legacy fallback price in Context's pricing override
    const primaryPrice = Number(overridePriceTiers['1']) || selectedRoom.basePrice;
    updateDateOverride(selectedRoomId, selectedDateStr, {
      date: selectedDateStr,
      price: primaryPrice,
      isBlocked: overrideBlocked
    });

    // 2. Update extended rate overrides and inventory overrides in rooms list in context
    const parsedRates: Record<string, number> = {};
    Object.entries(overridePriceTiers).forEach(([g, val]) => {
      parsedRates[g] = Number(val) || 3000;
    });

    setRooms(prev => prev.map(r => {
      if (r.id === selectedRoomId) {
        return {
          ...r,
          inventory_overrides: {
            ...(r.inventory_overrides || {}),
            [selectedDateStr]: Number(overrideInventory)
          },
          rate_overrides: {
            ...(r.rate_overrides || {}),
            [selectedDateStr]: parsedRates
          }
        };
      }
      return r;
    }));

    setSelectedDateStr(null);
  };

  const handleClearSettings = () => {
    if (!selectedDateStr || !selectedRoomId) return;

    // Reset Context pricing override
    updateDateOverride(selectedRoomId, selectedDateStr, {
      date: selectedDateStr,
      price: 0,
      isBlocked: false
    });

    // Reset extended overrides
    setRooms(prev => prev.map(r => {
      if (r.id === selectedRoomId) {
        const nextInventory = { ...(r.inventory_overrides || {}) };
        const nextRates = { ...(r.rate_overrides || {}) };
        delete nextInventory[selectedDateStr];
        delete nextRates[selectedDateStr];
        return {
          ...r,
          inventory_overrides: nextInventory,
          rate_overrides: nextRates
        };
      }
      return r;
    }));

    setSelectedDateStr(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Pricing & Inventory</h2>
          <p className="text-sm text-[#78716C]">Adjust daily prices, physical inventory allocations, and manage room blockout parameters.</p>
        </div>

        {/* Tab switchers */}
        <div className="flex p-0.5 rounded-lg border border-[#E7E5E4] bg-[#F5F5F4]">
          <button
            onClick={() => { setActiveTab('calendar'); setSelectedDateStr(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'calendar' ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly View</span>
          </button>
          <button
            onClick={() => { setActiveTab('grid'); setSelectedDateStr(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'grid' ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>7-Day Grid</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 text-left">
        {/* Main interactive area */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-[#E7E5E4] p-6 space-y-4">
          
          {activeTab === 'calendar' ? (
            /* ================= MONTHLY VIEW ================= */
            <>
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#78716C] uppercase">Select Room Category:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedDateStr(null); }}
                    className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg px-3 py-1.5 text-xs text-[#1C1917] font-semibold outline-none focus:border-[#1B93A4]"
                  >
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentMonth(new Date())} className="px-2.5 py-1 text-xs font-bold border border-[#E7E5E4] rounded-lg hover:bg-[#FAFAF9] text-[#78716C] transition">
                    Today
                  </button>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition">
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
                  const info = getDayInfo(selectedRoomId, day);
                  const isTodayDay = isToday(day);
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isPast = isBefore(day, startOfDay(new Date()));
                  
                  return (
                    <button
                      type="button"
                      key={dateKey}
                      disabled={isPast}
                      onClick={() => handleCellClick(selectedRoomId, day)}
                      className={`aspect-square p-2.5 rounded-lg border flex flex-col justify-between items-stretch text-left transition relative select-none ${
                        isPast 
                          ? 'bg-[#F5F5F4]/60 border-[#FAFAF9] text-[#A8A29E] cursor-not-allowed' 
                          : info.isBlocked
                          ? 'bg-[#FEF0ED] border-[#E76F51] text-[#E76F51] hover:bg-[#FEF0ED]/80'
                          : info.hasOverride
                          ? 'bg-[#FEF3E6] border-[#C9822F] hover:bg-[#FEF3E6]/80'
                          : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4] hover:bg-[#FAFAF9]'
                      } ${selectedDateStr === dateKey ? 'ring-2 ring-[#1C1917] ring-offset-2 border-transparent' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          isTodayDay ? 'bg-[#1B93A4] text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold shadow-sm' : 'text-[#78716C]'
                        } ${isPast ? 'text-[#A8A29E]' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {info.isBlocked && <Lock className="w-3 h-3 text-[#E76F51]" />}
                      </div>

                      {!isPast && (
                        <div className="text-right mt-auto">
                          <span className={`text-xs font-extrabold block leading-none ${
                            info.isBlocked ? 'text-[#E76F51] line-through' : info.hasOverride ? 'text-[#C9822F]' : 'text-[#1C1917]'
                          }`}>
                            {formatRupees(info.price)}
                          </span>
                          {info.hasOverride && !info.isBlocked && (
                            <span className="text-[8px] font-bold text-[#C9822F] block uppercase leading-none mt-0.5">Rate Adjusted</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ================= 7-DAY INVENTORY GRID ================= */
            <>
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4]">
                <h3 className="font-extrabold text-sm text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-4 h-4 text-[#1B93A4]" />
                  <span>Interactive Inventory Matrix</span>
                </h3>

                {/* Nav */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setGridStartDate(subDays(gridStartDate, 7))} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setGridStartDate(new Date())} className="px-2.5 py-1 text-xs font-bold border border-[#E7E5E4] rounded-lg hover:bg-[#FAFAF9] text-[#78716C] transition">
                    Today
                  </button>
                  <button onClick={() => setGridStartDate(addDays(gridStartDate, 7))} className="p-1.5 hover:bg-[#FAFAF9] border border-[#E7E5E4] rounded-lg text-[#78716C] transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Matrix Layout */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] bg-[#FAFAF9]">
                      <th className="p-3 font-bold text-[#78716C] uppercase tracking-wider min-w-[150px]">Room Type</th>
                      {gridDates.map(date => {
                        const isTodayDate = isToday(date);
                        return (
                          <th key={format(date, 'yyyy-MM-dd')} className="p-3 text-center border-l border-[#E7E5E4] min-w-[90px]">
                            <span className={`block font-bold text-xs ${isTodayDate ? 'text-[#1B93A4] font-black' : 'text-[#1C1917]'}`}>
                              {format(date, 'EEE, dd')}
                            </span>
                            <span className="text-[10px] text-[#A8A29E] font-medium">{format(date, 'MMM')}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4]">
                    {rooms.map(room => (
                      <tr key={room.id} className="hover:bg-[#FAFAF9]/40 transition">
                        <td className="p-3 font-bold text-[#1C1917] align-middle">{room.name}</td>
                        {gridDates.map(date => {
                          const info = getDayInfo(room.id, date);
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const cellId = `${room.id}-${dateStr}`;
                          const isSelected = selectedRoomId === room.id && selectedDateStr === dateStr;

                          return (
                            <td key={dateStr} className={`p-2 text-center border-l border-[#E7E5E4] align-middle transition ${
                              isSelected ? 'bg-[#E6F5F7]/30' : ''
                            }`}>
                              <button
                                type="button"
                                onClick={() => handleCellClick(room.id, date)}
                                className={`w-full p-2.5 rounded-xl border flex flex-col items-center space-y-1 transition text-center ${
                                  info.isBlocked
                                    ? 'bg-[#FEF0ED] border-[#E76F51] text-[#E76F51]'
                                    : info.hasOverride
                                    ? 'bg-[#FEF3E6] border-[#C9822F] text-[#C9822F]'
                                    : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4] text-[#1C1917]'
                                }`}
                              >
                                {/* Rate */}
                                <span className="font-extrabold">{formatRupees(info.price)}</span>
                                {/* Inventory Count */}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  info.isBlocked ? 'bg-[#FEF0ED]' : 'bg-[#FAFAF9] border border-[#E7E5E4]'
                                }`} style={{ color: 'var(--ds-text-secondary)' }}>
                                  {info.isBlocked ? 'Blocked' : `${info.inventory} Rooms`}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Override Configuration Panel */}
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 flex flex-col">
          {selectedDateStr && selectedRoom ? (
            <form onSubmit={handleSaveSettings} className="space-y-5 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#E7E5E4]">
                  <h4 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#1B93A4]" />
                    <span>Override Settings</span>
                  </h4>
                  <p className="text-[11px] text-[#78716C] mt-1">Room: <strong>{selectedRoom.name}</strong></p>
                  <p className="text-[11px] text-[#78716C]">Date: <strong>{selectedDateStr}</strong></p>
                </div>

                {/* Overwrite inventory alloc */}
                <div className="space-y-1.5">
                  <label className="ds-overline block">Physical Inventory</label>
                  <input
                    type="number"
                    min={0}
                    max={selectedRoom.totalInventory}
                    disabled={overrideBlocked}
                    value={overrideInventory}
                    onChange={(e) => setOverrideInventory(e.target.value)}
                    className="ds-input w-full"
                  />
                  <span className="text-[10px] text-[#A8A29E] block">Physical ceiling: {selectedRoom.totalInventory} rooms</span>
                </div>

                {/* Price Override Tiers Inputs */}
                <div className="space-y-2 pt-2 border-t border-[#E7E5E4]">
                  <span className="ds-overline block">Price overrides by Guest Count</span>
                  <div className="space-y-2">
                    {Object.keys(selectedRoom.price_tiers || { '1': selectedRoom.basePrice }).map(g => (
                      <div key={g} className="flex items-center justify-between gap-3 bg-[#FAFAF9] p-2 rounded-xl border border-[#E7E5E4]">
                        <span className="text-xs font-bold text-[#78716C]">{g} {Number(g) === 1 ? 'Guest' : 'Guests'}</span>
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#78716C]">₹</span>
                          <input
                            type="number"
                            required
                            min={100}
                            disabled={overrideBlocked}
                            value={overridePriceTiers[g] || ''}
                            onChange={(e) => setOverridePriceTiers({ ...overridePriceTiers, [g]: e.target.value })}
                            className="ds-input w-full pl-6 pr-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blocking Checkbox */}
                <div className="space-y-1.5 pt-2 border-t border-[#E7E5E4]">
                  <span className="ds-overline block">Room Blockout Status</span>
                  <button
                    type="button"
                    onClick={() => setOverrideBlocked(!overrideBlocked)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm font-semibold transition ${
                      overrideBlocked
                        ? 'bg-[#FEF0ED] border-[#E76F51] text-[#E76F51]'
                        : 'bg-[#FAFAF9] border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]'
                    }`}
                  >
                    {overrideBlocked ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Inventory Blocked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Available for Guests</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-4 border-t border-[#E7E5E4] mt-auto">
                <button
                  type="submit"
                  className="ds-btn-primary w-full"
                >
                  Save Date Rules
                </button>
                
                <button
                  type="button"
                  onClick={handleClearSettings}
                  className="w-full py-2 border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span>Restore Base Rates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDateStr(null)}
                  className="w-full py-2 text-center text-xs font-semibold text-[#A8A29E] hover:text-[#78716C]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#A8A29E] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAFAF9] flex items-center justify-center border border-[#E7E5E4]">
                <Sparkles className="w-5 h-5 text-[#A8A29E]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Select cell to override</p>
                <p className="text-3xs text-[#A8A29E] max-w-[180px] mx-auto mt-1">Select a calendar date or a cell in the 7-day matrix to update rates and allocations.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
