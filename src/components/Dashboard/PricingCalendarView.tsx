import React, { useState, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { 
  ChevronLeft, ChevronRight, Lock, Unlock, Sparkles, Calendar, RefreshCcw, LayoutGrid, CalendarDays, Edit2
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isToday, addMonths, subMonths, isBefore, startOfDay, addDays, subDays
} from 'date-fns';

export const PricingCalendarView: React.FC = () => {
  const { rooms, pricing, updateDateOverride, setRooms, hotelInfo } = useHotel();
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'grid'>('calendar');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // 7-day grid starting date
  const [gridStartDate, setGridStartDate] = useState<Date>(new Date());
  
  // Selection mode states
  const [selectionMode, setSelectionMode] = useState<'multi' | 'range'>('multi');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // 7-day single date selection
  const [gridSelectedDateStr, setGridSelectedDateStr] = useState<string | null>(null);
  const [gridInventoryMap, setGridInventoryMap] = useState<Record<string, number>>({});
  const [gridBlockedMap, setGridBlockedMap] = useState<Record<string, boolean>>({});
  const [gridPriceTiersMap, setGridPriceTiersMap] = useState<Record<string, Record<string, string>>>({});
  const [gridPriceExpandedMap, setGridPriceExpandedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!gridSelectedDateStr) return;
    const date = new Date(gridSelectedDateStr);
    const initialInventory: Record<string, number> = {};
    const initialBlocked: Record<string, boolean> = {};
    const initialPriceTiers: Record<string, Record<string, string>> = {};

    rooms.forEach(room => {
      const info = getDayInfo(room.id, date);
      initialInventory[room.id] = info.inventory;
      initialBlocked[room.id] = info.isBlocked;
      
      const tierStrs: Record<string, string> = {};
      Object.entries(info.rates).forEach(([g, val]) => {
        tierStrs[g] = String(val);
      });
      initialPriceTiers[room.id] = tierStrs;
    });

    setGridInventoryMap(initialInventory);
    setGridBlockedMap(initialBlocked);
    setGridPriceTiersMap(initialPriceTiers);
  }, [gridSelectedDateStr, rooms]);

  // Popover override pricing
  const [overridePriceTiers, setOverridePriceTiers] = useState<Record<string, string>>({});
  const [overrideBlocked, setOverrideBlocked] = useState<boolean>(false);
  const [overrideInventory, setOverrideInventory] = useState<string>('');
  const [overrideCancellationPolicy, setOverrideCancellationPolicy] = useState<string>('');

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // INR Formatter
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatPriceK = (price: number) => {
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}k`;
    }
    return `₹${price}`;
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

  // Get dates between range helper
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
    
    const startG = Math.max(1, targetRoom?.min_occupancy ?? 1);
    const endG = Math.max(startG, targetRoom?.base_occupancy ?? targetRoom?.capacityAdults ?? 1);

    for (let i = startG; i <= endG; i++) {
      const dayOverrideRate = targetRoom?.rate_overrides?.[dateStr]?.[String(i)];
      rates[String(i)] = dayOverrideRate ?? (targetRoom?.price_tiers?.[String(i)] ?? basePrice);
    }

    // Default booking meal plan check
    const isCpBase = hotelInfo.defaultMealPlan === 'CP';
    const cpRate = isCpBase ? (hotelInfo.mealPlanCpAdultRate ?? 300) : 0;

    // Single display price on the calendar cell (inclusive of CP rate if CP default)
    const basePriceVal = override && override.price > 0 
      ? override.price 
      : (targetRoom?.price_tiers?.[String(startG)] ?? basePrice);
    const singleDisplayPrice = basePriceVal + (cpRate * startG);

    const cancellationPolicy = targetRoom?.cancellation_policy_overrides?.[dateStr] ?? hotelInfo.cancellationPolicyType ?? '2d';

    return {
      price: singleDisplayPrice,
      rates,
      inventory,
      cancellationPolicy,
      isBlocked: override ? override.isBlocked : false,
      hasOverride: (override && override.price > 0) || !!targetRoom?.rate_overrides?.[dateStr]
    };
  };

  const handleCellClick = (roomId: string, date: Date) => {
    setSelectedRoomId(roomId);
    const dateStr = format(date, 'yyyy-MM-dd');

    if (selectionMode === 'multi') {
      setSelectedDates(prev => {
        const exists = prev.includes(dateStr);
        const next = exists ? prev.filter(d => d !== dateStr) : [...prev, dateStr];
        
        // Pre-fill fields with the latest clicked cell info
        const info = getDayInfo(roomId, date);
        setOverrideBlocked(info.isBlocked);
        setOverrideInventory(String(info.inventory));
        setOverrideCancellationPolicy(info.cancellationPolicy);
        
        const tierStrs: Record<string, string> = {};
        Object.entries(info.rates).forEach(([g, val]) => {
          tierStrs[g] = String(val);
        });
        setOverridePriceTiers(tierStrs);

        return next;
      });
    } else {
      // Range mode
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

      const info = getDayInfo(roomId, date);
      setOverrideBlocked(info.isBlocked);
      setOverrideInventory(String(info.inventory));
      setOverrideCancellationPolicy(info.cancellationPolicy);
      
      const tierStrs: Record<string, string> = {};
      Object.entries(info.rates).forEach(([g, val]) => {
        tierStrs[g] = String(val);
      });
      setOverridePriceTiers(tierStrs);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !selectedRoom) return;

    // Get targets based on mode
    let targetDates: string[] = [];
    if (selectionMode === 'multi') {
      targetDates = selectedDates;
    } else {
      targetDates = getDatesInRange(fromDate, toDate);
    }

    if (targetDates.length === 0) {
      alert('Please select at least one date or a date range.');
      return;
    }

    const minOcc = selectedRoom.min_occupancy ?? 1;
    // Primary fallback price is the first guest tier price
    const primaryPrice = Number(overridePriceTiers[String(minOcc)]) || selectedRoom.basePrice;

    // Parse overrides rates
    const parsedRates: Record<string, number> = {};
    Object.entries(overridePriceTiers).forEach(([g, val]) => {
      parsedRates[g] = Number(val) || selectedRoom.basePrice;
    });

    // Update Context pricing override
    targetDates.forEach(dateStr => {
      updateDateOverride(selectedRoomId, dateStr, {
        date: dateStr,
        price: primaryPrice,
        isBlocked: overrideBlocked
      });
    });

    // Update rooms list in Context
    setRooms(prev => prev.map(r => {
      if (r.id === selectedRoomId) {
        const nextInventory = { ...(r.inventory_overrides || {}) };
        const nextRates = { ...(r.rate_overrides || {}) };
        const nextCancellation = { ...(r.cancellation_policy_overrides || {}) };
        
        targetDates.forEach(dateStr => {
          nextInventory[dateStr] = Number(overrideInventory);
          nextRates[dateStr] = parsedRates;
          nextCancellation[dateStr] = overrideCancellationPolicy;
        });

        return {
          ...r,
          inventory_overrides: nextInventory,
          rate_overrides: nextRates,
          cancellation_policy_overrides: nextCancellation
        };
      }
      return r;
    }));

    // Reset selection
    setSelectedDates([]);
    setFromDate('');
    setToDate('');
  };

  const handleClearSettings = () => {
    if (!selectedRoomId) return;

    let targetDates: string[] = [];
    if (selectionMode === 'multi') {
      targetDates = selectedDates;
    } else {
      targetDates = getDatesInRange(fromDate, toDate);
    }

    if (targetDates.length === 0) {
      alert('Please select at least one date or a date range to restore.');
      return;
    }

    targetDates.forEach(dateStr => {
      updateDateOverride(selectedRoomId, dateStr, {
        date: dateStr,
        price: 0,
        isBlocked: false
      });
    });

    setRooms(prev => prev.map(r => {
      if (r.id === selectedRoomId) {
        const nextInventory = { ...(r.inventory_overrides || {}) };
        const nextRates = { ...(r.rate_overrides || {}) };
        const nextCancellation = { ...(r.cancellation_policy_overrides || {}) };
        
        targetDates.forEach(dateStr => {
          delete nextInventory[dateStr];
          delete nextRates[dateStr];
          delete nextCancellation[dateStr];
        });

        return {
          ...r,
          inventory_overrides: nextInventory,
          rate_overrides: nextRates,
          cancellation_policy_overrides: nextCancellation
        };
      }
      return r;
    }));

    // Reset selection
    setSelectedDates([]);
    setFromDate('');
    setToDate('');
  };

  const handleSaveGridSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gridSelectedDateStr) return;

    rooms.forEach(room => {
      const isBlocked = gridBlockedMap[room.id] ?? false;
      const overridePriceTiers = gridPriceTiersMap[room.id] || {};

      const minOcc = room.min_occupancy ?? 1;
      const primaryPrice = Number(overridePriceTiers[String(minOcc)]) || room.basePrice;

      const parsedRates: Record<string, number> = {};
      Object.entries(overridePriceTiers).forEach(([g, val]) => {
        parsedRates[g] = Number(val) || room.basePrice;
      });

      // Update Context override object
      updateDateOverride(room.id, gridSelectedDateStr, {
        date: gridSelectedDateStr,
        price: primaryPrice,
        isBlocked
      });
    });

    // Update rooms list in Context
    setRooms(prev => prev.map(r => {
      const overrideInventory = gridInventoryMap[r.id] ?? r.totalInventory;
      const overridePriceTiers = gridPriceTiersMap[r.id] || {};

      const parsedRates: Record<string, number> = {};
      Object.entries(overridePriceTiers).forEach(([g, val]) => {
        parsedRates[g] = Number(val) || r.basePrice;
      });

      return {
        ...r,
        inventory_overrides: {
          ...(r.inventory_overrides || {}),
          [gridSelectedDateStr]: Number(overrideInventory)
        },
        rate_overrides: {
          ...(r.rate_overrides || {}),
          [gridSelectedDateStr]: parsedRates
        }
      };
    }));

    setGridSelectedDateStr(null);
  };

  const handleClearGridSettings = () => {
    if (!gridSelectedDateStr) return;

    rooms.forEach(room => {
      updateDateOverride(room.id, gridSelectedDateStr, {
        date: gridSelectedDateStr,
        price: 0,
        isBlocked: false
      });
    });

    setRooms(prev => prev.map(r => {
      const nextInventory = { ...(r.inventory_overrides || {}) };
      const nextRates = { ...(r.rate_overrides || {}) };
      delete nextInventory[gridSelectedDateStr];
      delete nextRates[gridSelectedDateStr];
      return {
        ...r,
        inventory_overrides: nextInventory,
        rate_overrides: nextRates
      };
    }));

    setGridSelectedDateStr(null);
  };

  const showCalendarSidebar = activeTab === 'calendar' && (selectionMode === 'range' || selectedDates.length > 0) && !!selectedRoom;
  const showGridSidebar = activeTab === 'grid' && gridSelectedDateStr !== null;
  const showSidebar = showCalendarSidebar || showGridSidebar;

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
            onClick={() => { setActiveTab('calendar'); setSelectedDates([]); setFromDate(''); setToDate(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'calendar' ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly View</span>
          </button>
          <button
            onClick={() => { setActiveTab('grid'); setSelectedDates([]); setFromDate(''); setToDate(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === 'grid' ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>7-Day Grid</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 text-left items-stretch relative min-h-[650px] w-full">
        {/* Main interactive area */}
        <div className="flex-grow flex-1 min-w-0 bg-white rounded-2xl border border-[#E7E5E4] p-6 space-y-4">
          
          {activeTab === 'calendar' ? (
            /* ================= MONTHLY VIEW ================= */
            <>
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#78716C] uppercase">Select Room Category:</span>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedDates([]); setFromDate(''); setToDate(''); }}
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
                  
                  const isSelected = selectionMode === 'multi'
                    ? selectedDates.includes(dateKey)
                    : (fromDate && toDate && dateKey >= fromDate && dateKey <= toDate) || (fromDate === dateKey) || (toDate === dateKey);

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
                      } ${isSelected ? 'ring-2 ring-[#1C1917] ring-offset-2 border-transparent bg-teal-50/20' : ''}`}
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
                        <div className="mt-auto flex flex-col items-end w-full space-y-1">
                          {/* Line 1: Price */}
                          <span className={`text-[10px] sm:text-xs font-extrabold block leading-none ${
                            info.isBlocked ? 'text-[#E76F51] line-through' : info.hasOverride ? 'text-[#C9822F]' : 'text-[#1C1917]'
                          }`}>
                            {formatRupees(info.price)}
                          </span>
                          {/* Line 2: Inventory */}
                          <span className={`text-[9px] font-bold block leading-none px-1.5 py-0.5 rounded-md ${
                            info.isBlocked
                              ? 'bg-rose-50 text-[#E76F51]'
                              : info.inventory === 0
                              ? 'bg-red-50 text-red-500'
                              : 'bg-zinc-50 text-[#78716C]'
                          }`}>
                            {info.isBlocked ? 'Blocked' : `${info.inventory} R`}
                          </span>
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
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isSelectedCol = gridSelectedDateStr === dateStr;
                        const isTodayDate = isToday(date);
                        return (
                          <th 
                            key={dateStr} 
                            onClick={() => {
                              setGridSelectedDateStr(dateStr);
                            }}
                            className={`p-3 text-center border-l border-[#E7E5E4] min-w-[90px] cursor-pointer transition select-none ${
                              isSelectedCol 
                                ? 'bg-zinc-950 text-white border-zinc-950' 
                                : 'bg-[#FAFAF9] hover:bg-[#F5F5F4]'
                            }`}
                          >
                            <span className={`block font-bold text-xs uppercase ${
                              isSelectedCol ? 'text-white' : isTodayDate ? 'text-[#1B93A4] font-black' : 'text-[#1C1917]'
                            }`}>
                              {format(date, 'EEE')}
                            </span>
                            <span className={`block font-black text-sm ${
                              isSelectedCol ? 'text-white' : 'text-zinc-800'
                            }`}>
                              {format(date, 'd')}
                            </span>
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
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const info = getDayInfo(room.id, date);
                          const isSelectedCol = gridSelectedDateStr === dateStr;

                          return (
                            <td key={dateStr} className={`p-2 text-center border-l border-[#E7E5E4] align-middle transition ${
                              isSelectedCol ? 'bg-zinc-50' : ''
                            }`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setGridSelectedDateStr(dateStr);
                                }}
                                className={`w-full p-2.5 rounded-xl border flex flex-col items-center space-y-1 transition text-center ${
                                  isSelectedCol
                                    ? 'bg-zinc-900 border-zinc-950 text-white shadow-md'
                                    : info.isBlocked
                                    ? 'bg-[#FEF0ED] border-[#E76F51] text-[#E76F51]'
                                    : info.hasOverride
                                    ? 'bg-[#FEF3E6] border-[#C9822F] text-[#C9822F]'
                                    : 'bg-white border-[#E7E5E4] hover:border-[#1B93A4] text-[#1C1917]'
                                }`}
                              >
                                {/* Rate */}
                                <span className={`font-extrabold ${isSelectedCol ? 'text-white' : ''}`}>
                                  {formatPriceK(info.price)}
                                </span>
                                {/* Inventory Count */}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  isSelectedCol 
                                    ? 'bg-zinc-800 text-zinc-300' 
                                    : info.isBlocked 
                                    ? 'bg-[#FEF0ED]' 
                                    : 'bg-[#FAFAF9] border border-[#E7E5E4]'
                                }`}>
                                  {info.isBlocked ? 'Blocked' : `${info.inventory} Left`}
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
        {showSidebar && (
          <div className="w-full xl:w-[360px] bg-white rounded-2xl border border-[#E7E5E4] p-6 flex flex-col shrink-0">
          {activeTab === 'grid' ? (
            /* ================= 7-DAY GRID SELECTED DAY PANEL ================= */
            gridSelectedDateStr ? (
              <form onSubmit={handleSaveGridSettings} className="space-y-5 h-full flex flex-col justify-between overflow-y-auto pr-1">
                <div className="space-y-4">
                  <div className="pb-3 border-b border-[#E7E5E4] flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#1B93A4]" />
                        <span>
                          {(() => {
                            try {
                              return format(new Date(gridSelectedDateStr), 'EEE d MMM');
                            } catch (e) {
                              return gridSelectedDateStr;
                            }
                          })()}
                        </span>
                      </h4>
                      <p className="text-[10px] text-[#A8A29E] mt-0.5">Select options to edit prices and inventory</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGridSelectedDateStr(null)}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                    {rooms.map(room => {
                      const isBlocked = gridBlockedMap[room.id] ?? false;
                      const currentInventory = gridInventoryMap[room.id] ?? room.totalInventory;
                      const currentPriceTiers = gridPriceTiersMap[room.id] || {};
                      
                      // Calculate price range dynamically from the local tier states
                      const prices = Object.values(currentPriceTiers).map(Number).filter(p => !isNaN(p) && p > 0);
                      const minPrice = prices.length > 0 ? Math.min(...prices) : room.basePrice;
                      const maxPrice = prices.length > 0 ? Math.max(...prices) : room.basePrice;
                      const rangeString = minPrice === maxPrice 
                        ? formatRupees(minPrice) 
                        : `${formatRupees(minPrice)} – ${formatRupees(maxPrice)}`;

                      const isExpanded = !!gridPriceExpandedMap[room.id];

                      return (
                        <div key={room.id} className="border border-zinc-200 rounded-2xl p-4 bg-[#FAFAF9] space-y-3.5 text-left">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-zinc-800 leading-snug break-words">
                              {room.name}
                            </span>
                          </div>

                          {/* Price Range and Inline Edit Toggle */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Price</span>
                            <div 
                              onClick={() => setGridPriceExpandedMap(prev => ({ ...prev, [room.id]: !isExpanded }))}
                              className="flex items-center gap-1.5 cursor-pointer text-zinc-800 font-extrabold text-sm hover:text-[#1B93A4] group w-fit"
                            >
                              <span>{rangeString}</span>
                              <Edit2 className="w-3 h-3 text-zinc-400 group-hover:text-[#1B93A4]" />
                            </div>
                          </div>

                          {/* Expanded Price Tiers Inputs */}
                          {isExpanded && (
                            <div className="space-y-2 pt-2 border-t border-zinc-200/60 mt-1.5">
                              {(() => {
                                const startG = Math.max(1, room.min_occupancy ?? 1);
                                const endG = Math.max(startG, room.base_occupancy ?? room.capacityAdults ?? 1);
                                const guestTiers = [];
                                for (let i = startG; i <= endG; i++) {
                                  guestTiers.push(String(i));
                                }
                                return guestTiers.map(g => (
                                  <div key={g} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="text-zinc-500 font-bold">{g} {Number(g) === 1 ? 'Guest' : 'Guests'}</span>
                                    <div className="relative w-24">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                                      <input
                                        type="number"
                                        min={100}
                                        disabled={isBlocked}
                                        value={currentPriceTiers[g] || ''}
                                        onChange={(e) => setGridPriceTiersMap(prev => ({
                                          ...prev,
                                          [room.id]: {
                                            ...(prev[room.id] || {}),
                                            [g]: e.target.value
                                          }
                                        }))}
                                        className="ds-input w-full pl-5 pr-2 py-0.5 text-xs text-right font-mono"
                                      />
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}

                          {/* Availability ON / OFF Toggle Pill */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200/60">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Available</span>
                            <div className="flex bg-zinc-200 p-0.5 rounded-lg border border-zinc-300 shrink-0">
                              <button
                                type="button"
                                onClick={() => setGridBlockedMap(prev => ({ ...prev, [room.id]: false }))}
                                className={`px-2.5 py-1 rounded-md font-bold transition text-[10px] sm:text-xs cursor-pointer ${
                                  !isBlocked ? 'bg-white text-zinc-800 shadow-xs font-extrabold' : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                              >
                                ON
                              </button>
                              <button
                                type="button"
                                onClick={() => setGridBlockedMap(prev => ({ ...prev, [room.id]: true }))}
                                className={`px-2.5 py-1 rounded-md font-bold transition text-[10px] sm:text-xs cursor-pointer ${
                                  isBlocked ? 'bg-white text-zinc-800 shadow-xs font-extrabold' : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                              >
                                OFF
                              </button>
                            </div>
                          </div>

                          {/* Rooms Available Counter */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Rooms available</span>
                            <div className="flex items-center border border-zinc-300 rounded-lg bg-zinc-150 overflow-hidden shrink-0">
                              <button
                                type="button"
                                disabled={isBlocked || currentInventory <= 0}
                                onClick={() => setGridInventoryMap(prev => {
                                  const cur = prev[room.id] ?? room.totalInventory;
                                  return { ...prev, [room.id]: Math.max(0, cur - 1) };
                                })}
                                className="px-2 py-0.5 text-zinc-650 hover:text-zinc-900 disabled:opacity-30 font-bold transition text-xs cursor-pointer hover:bg-zinc-200"
                              >
                                -
                              </button>
                              <span className="px-2 text-[11px] font-bold font-mono text-zinc-850 min-w-[20px] text-center bg-white border-l border-r border-zinc-200">
                                {currentInventory}
                              </span>
                              <button
                                type="button"
                                disabled={isBlocked || currentInventory >= room.totalInventory}
                                onClick={() => setGridInventoryMap(prev => {
                                  const cur = prev[room.id] ?? room.totalInventory;
                                  return { ...prev, [room.id]: Math.min(room.totalInventory, cur + 1) };
                                })}
                                className="px-2 py-0.5 text-zinc-650 hover:text-zinc-900 disabled:opacity-30 font-bold transition text-xs cursor-pointer hover:bg-zinc-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-[#E7E5E4] mt-auto shrink-0">
                  <button
                    type="submit"
                    className="ds-btn-primary w-full"
                  >
                    Save All Room Rules
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleClearGridSettings}
                    className="w-full py-2 border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    <span>Restore Base Rates</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#A8A29E] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FAFAF9] flex items-center justify-center border border-[#E7E5E4]">
                  <Sparkles className="w-5 h-5 text-[#A8A29E]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">Select Day</p>
                  <p className="text-3xs text-[#A8A29E] max-w-[180px] mx-auto mt-1">Select a cell or header in the 7-day matrix to edit pricing and inventory for all room categories.</p>
                </div>
              </div>
            )
          ) : (
            /* ================= MONTHLY CALENDAR PANELS ================= */
            <>
              {/* Mode Switcher */}
              <div className="flex p-0.5 rounded-lg border border-[#E7E5E4] bg-[#F5F5F4] mb-4 shrink-0">
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
                  Multiple Dates
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
                  Date Range
                </button>
              </div>

              {(selectionMode === 'range' || selectedDates.length > 0) && selectedRoom ? (
                <form onSubmit={handleSaveSettings} className="space-y-5 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-[#E7E5E4]">
                      <h4 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#1B93A4]" />
                        <span>Override Settings</span>
                      </h4>
                      <p className="text-[11px] text-[#78716C] mt-1">Room: <strong>{selectedRoom.name}</strong></p>
                      
                      {selectionMode === 'multi' ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-[#78716C]">
                            Selected: <strong>{selectedDates.length} Date(s)</strong>
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                            {selectedDates.map(d => (
                              <span key={d} className="inline-flex items-center gap-1 bg-[#E6F5F7] text-[#1B93A4] text-[9px] font-bold px-2 py-0.5 rounded-md">
                                {d}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDates(prev => prev.filter(x => x !== d))}
                                  className="text-[#1B93A4] hover:text-red-500 font-extrabold cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">From Date</label>
                            <input
                              type="date"
                              required
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                              className="ds-input w-full py-1 text-xs"
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">To Date</label>
                            <input
                              type="date"
                              required
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                              className="ds-input w-full py-1 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overwrite inventory alloc */}
                    <div className="space-y-1.5 text-left">
                      <label className="ds-overline block">Physical Inventory Override</label>
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
                    <div className="space-y-2 pt-2 border-t border-[#E7E5E4] text-left">
                      <span className="ds-overline block">Price overrides by Guest Count</span>
                      <div className="space-y-2">
                        {(() => {
                          const startG = Math.max(1, selectedRoom.min_occupancy ?? 1);
                          const endG = Math.max(startG, selectedRoom.base_occupancy ?? selectedRoom.capacityAdults ?? 1);
                          const tiers = [];
                          for (let i = startG; i <= endG; i++) {
                            tiers.push(String(i));
                          }
                          return tiers.map(g => (
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
                          ));
                        })()}
                      </div>
                      {hotelInfo.defaultMealPlan === 'CP' && (
                        <p className="text-[10px] text-zinc-400 italic mt-1 leading-normal">
                          * Rates are room-only (EP). Since CP is active default, ₹{(hotelInfo.mealPlanCpAdultRate ?? 300)} per person breakfast charge is added automatically at checkout.
                        </p>
                      )}
                    </div>

                    {/* Cancellation Policy Override */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E7E5E4] text-left">
                      <label className="ds-overline block">Cancellation Policy Override</label>
                      <select
                        value={overrideCancellationPolicy}
                        onChange={(e) => setOverrideCancellationPolicy(e.target.value)}
                        className="ds-input w-full bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#1B93A4] rounded-xl px-3 py-2 text-xs font-semibold text-zinc-850 outline-none cursor-pointer font-sans"
                      >
                        <option value="2d">2D (Full refund up to 2 days)</option>
                        <option value="7d_4d">7D/4D (Full refund up to 7 days, 50% up to 4 days)</option>
                        <option value="15d_10d">15D/10D (Full refund up to 15 days, 50% up to 10 days)</option>
                        <option value="non_refundable">Non-cancellable (No refund)</option>
                        {(hotelInfo.customCancellationPolicies || []).map((policy: any) => (
                          <option key={policy.id} value={policy.id}>
                            {policy.xx}D/{policy.yy}D (Custom range)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Blocking Checkbox */}
                    <div className="space-y-1.5 pt-2 border-t border-[#E7E5E4] text-left">
                      <span className="ds-overline block">Room Blockout Status</span>
                      <button
                        type="button"
                        onClick={() => setOverrideBlocked(!overrideBlocked)}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm font-semibold transition cursor-pointer ${
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
                      className="w-full py-2 border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Restore Base Rates</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDates([]);
                        setFromDate('');
                        setToDate('');
                      }}
                      className="w-full py-2 text-center text-xs font-semibold text-[#A8A29E] hover:text-[#78716C] cursor-pointer"
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
                    <p className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
                      {selectionMode === 'multi' ? 'Select Date(s)' : 'Select Date Range'}
                    </p>
                    <p className="text-3xs text-[#A8A29E] max-w-[180px] mx-auto mt-1">
                      {selectionMode === 'multi' 
                        ? 'Click one or more calendar dates or cells in the grid to bulk edit rates and block status.'
                        : 'Click a start date and end date on the calendar, or specify them in the fields above.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
};
