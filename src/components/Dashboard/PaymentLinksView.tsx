import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../../context/HotelContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  Search, ChevronLeft, ChevronRight, X, XCircle, AlertTriangle, Link as LinkIcon, Copy, ExternalLink, Check, Plus
} from 'lucide-react';
import { 
  format, addDays, subDays, startOfMonth, endOfMonth, 
  eachDayOfInterval, isToday, parseISO, differenceInDays
} from 'date-fns';

// Guest distribution helper mirroring OrganicTemplate
const distributeAdultsAndChildren = (roomsList: any[], adults: number, children: number) => {
  const distribution = roomsList.map(() => ({ adults: 0, children: 0 }));
  if (roomsList.length === 0) return distribution;
  
  let remainingAdults = adults;
  let remainingChildren = children;

  // Phase 1: Give 1 adult to each room first (activation)
  for (let i = 0; i < roomsList.length && remainingAdults > 0; i++) {
    distribution[i].adults = 1;
    remainingAdults--;
  }
  
  // If we ran out of adults, use children to activate remaining rooms
  if (remainingAdults === 0) {
    for (let i = 0; i < roomsList.length && remainingChildren > 0; i++) {
      if (distribution[i].adults === 0) {
        distribution[i].children = 1;
        remainingChildren--;
      }
    }
  }
  
  // Phase 2: Fill up to base occupancy (adults first, then children)
  for (let i = 0; i < roomsList.length; i++) {
    const baseOcc = roomsList[i].base_occupancy || roomsList[i].capacityAdults || 2;
    
    const currentGuests = distribution[i].adults + distribution[i].children;
    const adultSpace = Math.max(0, baseOcc - currentGuests);
    const addAdults = Math.min(adultSpace, remainingAdults);
    distribution[i].adults += addAdults;
    remainingAdults -= addAdults;
    
    const currentGuestsAfterAdults = distribution[i].adults + distribution[i].children;
    const childSpace = Math.max(0, baseOcc - currentGuestsAfterAdults);
    const addChilds = Math.min(childSpace, remainingChildren);
    distribution[i].children += addChilds;
    remainingChildren -= addChilds;
  }
  
  // Phase 3: Fill up to max capacity
  for (let i = 0; i < roomsList.length; i++) {
    const maxCap = roomsList[i].capacityAdults || 2;
    
    const currentGuests = distribution[i].adults + distribution[i].children;
    const space = Math.max(0, maxCap - currentGuests);
    
    const addAdults = Math.min(space, remainingAdults);
    distribution[i].adults += addAdults;
    remainingAdults -= addAdults;
    
    const currentGuestsAfterAdults = distribution[i].adults + distribution[i].children;
    const childSpace = Math.max(0, maxCap - currentGuestsAfterAdults);
    const addChilds = Math.min(childSpace, remainingChildren);
    distribution[i].children += addChilds;
    remainingChildren -= addChilds;
  }
  
  // Fallback: put remaining guests in the first room
  if (remainingAdults > 0) {
    distribution[0].adults += remainingAdults;
  }
  if (remainingChildren > 0) {
    distribution[0].children += remainingChildren;
  }
  
  return distribution;
};

const getRoomPriceForGuests = (room: any, guestCount: number) => {
  if (!room.price_tiers || Object.keys(room.price_tiers).length === 0) {
    return room.basePrice;
  }
  const key = String(guestCount);
  if (room.price_tiers[key] !== undefined) {
    return room.price_tiers[key];
  }
  const sortedTiers = Object.entries(room.price_tiers)
    .map(([g, price]) => ({ guests: Number(g), price: Number(price) }))
    .sort((a, b) => a.guests - b.guests);
  
  if (sortedTiers.length === 0) return room.basePrice;

  let match = sortedTiers[0].price;
  for (const tier of sortedTiers) {
    if (guestCount >= tier.guests) {
      match = tier.price;
    }
  }
  return match;
};

export const PaymentLinksView: React.FC = () => {
  const { bookings, propertiesList, activePropertyId, getAvailableInventory, gstSettings } = useHotel();

  // Active links state
  const [linksList, setLinksList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal / Creator states
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Wizard state variables
  const [selectedPropId, setSelectedPropId] = useState(activePropertyId || propertiesList[0]?.id || '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  
  // Multi-room quantities selection
  const [selectedRoomQuantities, setSelectedRoomQuantities] = useState<Record<string, number>>({});

  // Guests bedding & pricing states
  const [roomAdultsCount, setRoomAdultsCount] = useState<Record<string, number>>({});
  const [roomKidsCount, setRoomKidsCount] = useState<Record<string, number>>({});
  const [selectedMealPlan, setSelectedMealPlan] = useState('EP');

  // Addons & Events selection states
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  // Customer profile states
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [expiryTime, setExpiryTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 48);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  });

  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [payNowAmount, setPayNowAmount] = useState<number | ''>('');
  const [showRoomBreakdown, setShowRoomBreakdown] = useState(false);
  const [showGstBreakdown, setShowGstBreakdown] = useState(false);
  const [showAddonsBreakdown, setShowAddonsBreakdown] = useState(false);
  const [showEventsBreakdown, setShowEventsBreakdown] = useState(false);
  const [selectedEventSlots, setSelectedEventSlots] = useState<Record<string, string>>({});

  // Property settings, room categories, addons, and events local cache
  const [propertySettings, setPropertySettings] = useState({
    childPolicyEnabled: false,
    childPolicyMinAge: 5,
    childPolicyMaxAge: 12,
    extraAdultRate: 0,
    extraChildRate: 0,
    mealPlanCpEnabled: false,
    mealPlanCpAdultRate: 0,
    mealPlanCpChildRate: 0,
    mealPlanMapEnabled: false,
    mealPlanMapAdultRate: 0,
    mealPlanMapChildRate: 0,
    mealPlanApEnabled: false,
    mealPlanApAdultRate: 0,
    mealPlanApChildRate: 0,
    defaultMealPlan: 'EP',
    paymentCollectionPercent: 50
  });

  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [addonsCache, setAddonsCache] = useState<any[]>([]);
  const [eventsCache, setEventsCache] = useState<any[]>([]);

  // Inline Date Picker state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [isSelectingCheckIn, setIsSelectingCheckIn] = useState(true);

  // Success toast / copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Today formatted helper
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Fetch all bookings for active property and filter payment links client-side
  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('*')
        .eq('property_id', activePropertyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const filtered = data.filter((b: any) => {
          let isLink = false;
          try {
            if (b.coupon_code && b.coupon_code.startsWith('{')) {
              const meta = JSON.parse(b.coupon_code);
              isLink = !!meta.isPaymentLink;
            }
          } catch (e) {
            // not JSON
          }
          return isLink && b.payment_status === 'pending' && b.booking_status !== 'cancelled';
        });
        setLinksList(filtered);
      }
    } catch (err) {
      console.warn('Error fetching payment links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [activePropertyId, bookings]);

  // Fetch room types, settings, addons, and events for selected property in creator
  useEffect(() => {
    if (!selectedPropId) return;

    const loadPropData = async () => {
      // 1. Fetch hotel_settings for child policies, extra rates, and meal plans
      const { data: settingsData } = await (supabase as any)
        .from('hotel_settings')
        .select('*')
        .eq('property_id', selectedPropId)
        .single();

      if (settingsData) {
        const s = settingsData as any;
        setPropertySettings({
          childPolicyEnabled: !!s.child_policy_enabled,
          childPolicyMinAge: s.child_policy_min_age ?? 5,
          childPolicyMaxAge: s.child_policy_max_age ?? 12,
          extraAdultRate: Number(s.extra_adult_rate) || 0,
          extraChildRate: Number(s.extra_child_rate) || 0,
          mealPlanCpEnabled: !!s.meal_plan_cp_enabled,
          mealPlanCpAdultRate: Number(s.meal_plan_cp_adult_rate) || 0,
          mealPlanCpChildRate: Number(s.meal_plan_cp_child_rate) || 0,
          mealPlanMapEnabled: !!s.meal_plan_map_enabled,
          mealPlanMapAdultRate: Number(s.meal_plan_map_adult_rate) || 0,
          mealPlanMapChildRate: Number(s.meal_plan_map_child_rate) || 0,
          mealPlanApEnabled: !!s.meal_plan_ap_enabled,
          mealPlanApAdultRate: Number(s.meal_plan_ap_adult_rate) || 0,
          mealPlanApChildRate: Number(s.meal_plan_ap_child_rate) || 0,
          defaultMealPlan: s.default_meal_plan || 'EP',
          paymentCollectionPercent: s.payment_collection_percent ?? 50
        });
        setSelectedMealPlan(s.default_meal_plan || 'EP');
      }

      // 2. Fetch room categories for that property
      const { data: roomsData } = await (supabase as any)
        .from('room_categories')
        .select('*')
        .eq('property_id', selectedPropId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (roomsData) {
        const mapped = (roomsData as any[]).map(r => ({
          ...r,
          capacityAdults: r.capacity_adults,
          capacityChildren: r.capacity_children,
          basePrice: r.base_price,
          totalInventory: r.total_inventory
        }));
        setRoomsList(mapped);
        const rList = mapped;
        // Default first room quantity to 1
        if (rList.length > 0) {
          setSelectedRoomQuantities({ [rList[0].id]: 1 });
          setRoomAdultsCount({ [rList[0].id]: rList[0].min_occupancy || 1 });
          setRoomKidsCount({ [rList[0].id]: 0 });
        } else {
          setSelectedRoomQuantities({});
          setRoomAdultsCount({});
          setRoomKidsCount({});
        }
      }

      // 3. Fetch active addons
      const { data: addonsData } = await (supabase as any)
        .from('addons')
        .select('*')
        .eq('property_id', selectedPropId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (addonsData) {
        setAddonsCache(addonsData);
      }

      // 4. Fetch active guest events
      const { data: eventsData } = await (supabase as any)
        .from('guest_events')
        .select('*')
        .eq('property_id', selectedPropId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (eventsData) {
        setEventsCache(eventsData);
      }
    };

    loadPropData();
  }, [selectedPropId]);

  // Construct selection of active rooms
  const activeSelectedRooms = useMemo(() => {
    const active: any[] = [];
    roomsList.forEach(r => {
      const qty = selectedRoomQuantities[r.id] || 0;
      for (let i = 0; i < qty; i++) {
        active.push(r);
      }
    });
    return active;
  }, [selectedRoomQuantities, roomsList]);

  // Sum up adults and kids selected inline across room selection cards
  const totalAdultsSelected = useMemo(() => {
    let sum = 0;
    Object.keys(selectedRoomQuantities).forEach(id => {
      if (selectedRoomQuantities[id] > 0) {
        sum += roomAdultsCount[id] || selectedRoomQuantities[id];
      }
    });
    return sum;
  }, [roomAdultsCount, selectedRoomQuantities]);

  const totalKidsSelected = useMemo(() => {
    let sum = 0;
    Object.keys(selectedRoomQuantities).forEach(id => {
      if (selectedRoomQuantities[id] > 0) {
        sum += roomKidsCount[id] || 0;
      }
    });
    return sum;
  }, [roomKidsCount, selectedRoomQuantities]);

  // Stay nights helper
  const stayNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    try {
      const diff = differenceInDays(new Date(checkOut), new Date(checkIn));
      return Math.max(0, diff);
    } catch {
      return 0;
    }
  }, [checkIn, checkOut]);

  // Generate stay dates list
  const stayDatesList = useMemo(() => {
    if (!checkIn || !checkOut || stayNights <= 0) return [];
    try {
      const start = new Date(checkIn);
      return Array.from({ length: stayNights }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return {
          dateStr: format(d, 'yyyy-MM-dd'),
          displayStr: format(d, 'dd.MM.yy')
        };
      });
    } catch {
      return [];
    }
  }, [checkIn, checkOut, stayNights]);

  // Check inventory status for all room categories across select stay dates
  const roomInventoryStatuses = useMemo(() => {
    const statusMap: Record<string, { selectable: boolean; datesInfo: { dateStr: string; displayStr: string; avail: number }[] }> = {};
    
    roomsList.forEach(r => {
      let selectable = true;
      const datesInfo = stayDatesList.map(item => {
        const avail = getAvailableInventory(r.id, item.dateStr);
        if (avail <= 0) {
          selectable = false;
        }
        return {
          dateStr: item.dateStr,
          displayStr: item.displayStr,
          avail
        };
      });
      statusMap[r.id] = { selectable, datesInfo };
    });

    return statusMap;
  }, [roomsList, stayDatesList, getAvailableInventory]);

  // Reset selected quantity of unselectable room types when stay dates change
  useEffect(() => {
    setSelectedRoomQuantities(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(rId => {
        const status = roomInventoryStatuses[rId];
        if (status && !status.selectable && next[rId] > 0) {
          next[rId] = 0;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [roomInventoryStatuses]);

  // Calculate dynamic extra beds automatically based on guests count exceeding base occupancy
  const calculatedExtraBeds = useMemo(() => {
    if (activeSelectedRooms.length === 0) return 0;
    const distribution = distributeAdultsAndChildren(activeSelectedRooms, totalAdultsSelected, totalKidsSelected);
    let totalBeds = 0;
    activeSelectedRooms.forEach((room, idx) => {
      const dist = distribution[idx] || { adults: 1, children: 0 };
      const baseOcc = room.base_occupancy || room.capacityAdults || 2;
      const guestsInRoom = dist.adults + dist.children;
      totalBeds += Math.max(0, guestsInRoom - baseOcc);
    });
    return totalBeds;
  }, [activeSelectedRooms, totalAdultsSelected, totalKidsSelected]);

  // Pricing calculations detailed breakdown (GST dynamic)
  const pricingBreakdown = useMemo(() => {
    if (activeSelectedRooms.length === 0 || stayNights <= 0) {
      return { roomsCost: 0, mealPlanCost: 0, addonsCost: 0, eventsCost: 0, gstCost: 0, grandTotal: 0 };
    }

    const distribution = distributeAdultsAndChildren(activeSelectedRooms, totalAdultsSelected, totalKidsSelected);

    let roomsCostTotal = 0;
    let roomsGst = 0;

    const isCpBase = propertySettings.defaultMealPlan === 'CP';
    const cpAdultRate = isCpBase ? (propertySettings.mealPlanCpAdultRate ?? 300) : 0;
    const cpChildRate = isCpBase ? (propertySettings.mealPlanCpChildRate ?? 250) : 0;

    // Room-specific rates (base + extra guests + default CP meal plan additions)
    activeSelectedRooms.forEach((room, idx) => {
      const dist = distribution[idx] || { adults: 1, children: 0 };

      const baseOcc = room.base_occupancy || room.capacityAdults || 2;
      const baseAdults = Math.min(dist.adults, baseOcc);
      const baseChildren = Math.min(dist.children, baseOcc - baseAdults);
      const baseGuests = baseAdults + baseChildren;
      
      const extraAdults = dist.adults - baseAdults;
      const extraChildren = dist.children - baseChildren;

      const baseRate = getRoomPriceForGuests(room, baseGuests);
      const cpCostPerNight = (isCpBase && selectedMealPlan !== 'EP') ? ((dist.adults * cpAdultRate) + (dist.children * cpChildRate)) : 0;
      const extraCostPerNight = (extraAdults * propertySettings.extraAdultRate) + (extraChildren * propertySettings.extraChildRate);
      const finalDayCost = baseRate + extraCostPerNight + cpCostPerNight;

      // Dynamic Room Slabs GST
      let rate = 0;
      if (gstSettings && gstSettings.room_slabs && gstSettings.room_slabs.length > 0) {
        const slab = gstSettings.room_slabs.find(
          (s: any) => finalDayCost >= s.min && finalDayCost <= s.max
        );
        if (slab) {
          rate = slab.rate / 100;
        }
      } else {
        if (finalDayCost > 7500) rate = 0.18;
        else if (finalDayCost > 1000) rate = 0.05;
      }

      roomsGst += Math.round(finalDayCost * rate) * stayNights;
      roomsCostTotal += finalDayCost * stayNights;
    });

    // Meal plan cost (upgrade difference vs default CP, or full cost under EP base)
    let mealPlanCost = 0;
    if (isCpBase) {
      if (selectedMealPlan === 'MAP') {
        const upgradeAdultRate = Math.max(0, propertySettings.mealPlanMapAdultRate - cpAdultRate);
        const upgradeChildRate = Math.max(0, propertySettings.mealPlanMapChildRate - cpChildRate);
        mealPlanCost = ((totalAdultsSelected * upgradeAdultRate) + (totalKidsSelected * upgradeChildRate)) * stayNights;
      } else if (selectedMealPlan === 'AP') {
        const upgradeAdultRate = Math.max(0, propertySettings.mealPlanApAdultRate - cpAdultRate);
        const upgradeChildRate = Math.max(0, propertySettings.mealPlanApChildRate - cpChildRate);
        mealPlanCost = ((totalAdultsSelected * upgradeAdultRate) + (totalKidsSelected * upgradeChildRate)) * stayNights;
      }
    } else {
      if (selectedMealPlan === 'CP') {
        mealPlanCost = ((totalAdultsSelected * propertySettings.mealPlanCpAdultRate) + (totalKidsSelected * propertySettings.mealPlanCpChildRate)) * stayNights;
      } else if (selectedMealPlan === 'MAP') {
        mealPlanCost = ((totalAdultsSelected * propertySettings.mealPlanMapAdultRate) + (totalKidsSelected * propertySettings.mealPlanMapChildRate)) * stayNights;
      } else if (selectedMealPlan === 'AP') {
        mealPlanCost = ((totalAdultsSelected * propertySettings.mealPlanApAdultRate) + (totalKidsSelected * propertySettings.mealPlanApChildRate)) * stayNights;
      }
    }
    const mealPlanGst = Math.round(mealPlanCost * ((gstSettings?.meal_plans_rate ?? 18) / 100));

    // Addons cost and breakdown
    let addonsCost = 0;
    const addonsBreakdown = selectedAddonIds.map(id => {
      const addon = addonsCache.find(a => a.id === id);
      if (!addon) return null;
      const cost = addon.pricing_type === 'per_head'
        ? addon.price * (totalAdultsSelected + totalKidsSelected)
        : addon.price;
      addonsCost += cost;
      return {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        pricingType: addon.pricing_type,
        totalCost: cost
      };
    }).filter(Boolean);
    const addonsGst = Math.round(addonsCost * ((gstSettings?.addons_rate ?? 18) / 100));

    // Events cost and breakdown
    let eventsCost = 0;
    const eventsBreakdown = selectedEventIds.map(id => {
      const evt = eventsCache.find(e => e.id === id);
      if (!evt) return null;
      const disc = evt.discount ?? 0;
      const baseAdult = evt.priceAdult ?? evt.price ?? 0;
      const baseChild = evt.priceChild ?? evt.price ?? 0;

      const adultPrice = disc > 0 ? Math.round(baseAdult * (1 - disc / 100)) : baseAdult;
      const childPrice = disc > 0 ? Math.round(baseChild * (1 - disc / 100)) : baseChild;

      const cost = (totalAdultsSelected * adultPrice) + (totalKidsSelected * childPrice);
      eventsCost += cost;
      
      const slots = evt.time ? evt.time.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const slot = selectedEventSlots[evt.id] || slots[0] || evt.time || 'Default';

      return {
        id: evt.id,
        title: evt.title,
        slot,
        adultsCost: totalAdultsSelected * adultPrice,
        kidsCost: totalKidsSelected * childPrice,
        totalCost: cost
      };
    }).filter(Boolean);
    const eventsGst = Math.round(eventsCost * ((gstSettings?.events_rate ?? 18) / 100));

    const gstCost = roomsGst + mealPlanGst + addonsGst + eventsGst;
    const grandTotal = roomsCostTotal + mealPlanCost + addonsCost + eventsCost + gstCost;

    const roomBreakdown = activeSelectedRooms.map((room, idx) => {
      const qty = selectedRoomQuantities[room.id] || 0;
      const dist = distribution[idx] || { adults: 1, children: 0 };
      const baseOcc = room.base_occupancy || room.capacityAdults || 2;
      const baseAdults = Math.min(dist.adults, baseOcc);
      const baseChildren = Math.min(dist.children, baseOcc - baseAdults);
      const baseGuests = baseAdults + baseChildren;

      const extraAdults = dist.adults - baseAdults;
      const extraChildren = dist.children - baseChildren;
      const extraGuestsCount = extraAdults + extraChildren;

      const baseRate = getRoomPriceForGuests(room, baseGuests);
      const baseCpCost = (isCpBase && selectedMealPlan !== 'EP') ? ((baseAdults * cpAdultRate) + (baseChildren * cpChildRate)) : 0;
      
      const extraBedCost = (extraAdults * propertySettings.extraAdultRate) + (extraChildren * propertySettings.extraChildRate);
      const extraCpCost = (isCpBase && selectedMealPlan !== 'EP') ? ((extraAdults * cpAdultRate) + (extraChildren * cpChildRate)) : 0;

      const baseStayTotal = (baseRate + baseCpCost) * stayNights;
      const extraBedTotal = extraBedCost * stayNights;
      const extraCpTotal = extraCpCost * stayNights;

      const roomStayTotal = baseStayTotal + extraBedTotal + extraCpTotal;

      return {
        id: room.id,
        name: room.name,
        qty,
        adults: dist.adults,
        children: dist.children,
        rate: baseRate + extraBedCost + extraCpCost,
        totalCost: roomStayTotal,
        baseGuests,
        baseStayTotal,
        extraGuestsCount,
        extraBedTotal,
        extraCpTotal
      };
    });

    return {
      roomsCost: roomsCostTotal,
      mealPlanCost,
      addonsCost,
      eventsCost,
      gstCost,
      grandTotal,
      roomBreakdown,
      roomsGst,
      addonsGst,
      eventsGst,
      mealPlanGst,
      addonsBreakdown,
      eventsBreakdown
    };
  }, [
    activeSelectedRooms, stayNights, totalAdultsSelected, totalKidsSelected,
    selectedMealPlan, propertySettings, selectedAddonIds, addonsCache,
    selectedEventIds, eventsCache, gstSettings, selectedRoomQuantities,
    selectedEventSlots
  ]);

  const suggestedTotal = pricingBreakdown.grandTotal;

  const suggestedPayNow = useMemo(() => {
    return Math.round(suggestedTotal * (propertySettings.paymentCollectionPercent / 100));
  }, [suggestedTotal, propertySettings.paymentCollectionPercent]);

  // Update amounts
  useEffect(() => {
    if (suggestedTotal > 0) {
      setTotalAmount(suggestedTotal);
      setPayNowAmount(suggestedPayNow);
    } else {
      setTotalAmount('');
      setPayNowAmount('');
    }
  }, [suggestedTotal, suggestedPayNow]);

  // Check inventory over selected dates
  const minAvailableRoomsInfo = useMemo(() => {
    if (activeSelectedRooms.length === 0 || !checkIn || !checkOut || stayNights <= 0) {
      return { ok: true, detail: '' };
    }
    
    try {
      const start = new Date(checkIn);
      const days = Array.from({ length: stayNights }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return format(d, 'yyyy-MM-dd');
      });

      const distinctSelectedMap: Record<string, number> = {};
      Object.entries(selectedRoomQuantities).forEach(([rId, qty]) => {
        if (qty > 0) distinctSelectedMap[rId] = qty;
      });

      for (const d of days) {
        for (const [rId, qty] of Object.entries(distinctSelectedMap)) {
          const avail = getAvailableInventory(rId, d);
          if (avail < qty) {
            const r = roomsList.find(x => x.id === rId);
            return { ok: false, detail: `Not enough rooms available of category ${r?.name || 'Selected Category'} on ${format(parseISO(d), 'dd MMM yyyy')} (${avail} remaining vs ${qty} requested).` };
          }
        }
      }
    } catch (e) {}

    return { ok: true, detail: '' };
  }, [activeSelectedRooms, selectedRoomQuantities, checkIn, checkOut, stayNights, getAvailableInventory, roomsList]);

  const hasInventoryError = !minAvailableRoomsInfo.ok;

  // Calendar days grid info
  const calendarDaysInfo = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const padding = Array.from({ length: start.getDay() });

    const monthDays = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return { day, dateStr };
    });

    return { monthDays, padding };
  }, [calendarMonth]);

  // Inline calendar day click
  const handleCalendarDayClick = (dateStr: string) => {
    if (dateStr < todayStr) return; 

    if (isSelectingCheckIn) {
      setCheckIn(dateStr);
      setCheckOut(''); 
      setIsSelectingCheckIn(false);
    } else {
      if (dateStr <= checkIn) {
        setCheckIn(dateStr);
        setCheckOut('');
      } else {
        setCheckOut(dateStr);
        setShowInlineCalendar(false); 
        setIsSelectingCheckIn(true);
      }
    }
  };

  // Toggle addons
  const handleToggleAddon = (id: string) => {
    setSelectedAddonIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle events
  const handleToggleEvent = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Handle room quantities counters
  const handleRoomQuantityChange = (roomId: string, val: number) => {
    setSelectedRoomQuantities(prev => ({
      ...prev,
      [roomId]: val
    }));
    
    // Initialize or reset guest selections inline
    const r = roomsList.find(x => x.id === roomId);
    if (r) {
      if (val > 0) {
        setRoomAdultsCount(prev => ({ ...prev, [roomId]: val * (r.min_occupancy || 1) }));
        setRoomKidsCount(prev => ({ ...prev, [roomId]: 0 }));
      } else {
        setRoomAdultsCount(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
        setRoomKidsCount(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }
    }
  };

  // Handle guest counts change per room category inline (Image 1 reference)
  const handleRoomGuestsChange = (roomId: string, type: 'adults' | 'kids', val: number) => {
    if (type === 'adults') {
      setRoomAdultsCount(prev => ({ ...prev, [roomId]: val }));
    } else {
      setRoomKidsCount(prev => ({ ...prev, [roomId]: val }));
    }
  };

  // Create booking link handler
  const handleCreateLink = async () => {
    if (activeSelectedRooms.length === 0 || !checkIn || !checkOut) {
      alert('Please select at least one room category and stay dates.');
      return;
    }
    if (hasInventoryError) {
      alert(`Cannot create booking link: ${minAvailableRoomsInfo.detail}`);
      return;
    }
    if (!customerName || !customerMobile) {
      alert('Please fill in customer name and mobile number.');
      return;
    }

    const totalVal = Number(totalAmount) || suggestedTotal || 0;
    const payNowVal = Number(payNowAmount) || suggestedPayNow || 0;

    // Generate short random code
    const shortCode = Math.random().toString(36).substring(2, 13);

    // Save metadata payload (with pricing breakdown) inside the coupon_code column
    const specRequestsObj = {
      isPaymentLink: true,
      expiry: expiryTime,
      payNowAmount: payNowVal,
      extraBeds: calculatedExtraBeds,
      originalNotes: '',
      breakdown: pricingBreakdown
    };

    const activeAddonNames: string[] = [];
    selectedAddonIds.forEach(id => {
      const a = addonsCache.find(x => x.id === id);
      if (a) activeAddonNames.push(a.name);
    });
    selectedEventIds.forEach(id => {
      const e = eventsCache.find(x => x.id === id);
      if (e) {
        const slots = e.time ? e.time.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const slot = selectedEventSlots[e.id] || slots[0] || e.time || 'Default';
        activeAddonNames.push(`EVENT:${e.title} (Slot: ${slot})`);
      }
    });
    activeAddonNames.push(`MEAL_PLAN:${selectedMealPlan}`);

    // Generate unique BK- ID
    const bookingId = 'BK-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const payload = {
      id: bookingId,
      property_id: selectedPropId,
      room_id: activeSelectedRooms.map(r => r.id).join(','),
      room_name: activeSelectedRooms.map(r => r.name).join(' + '),
      guest_name: customerName,
      guest_email: customerEmail || 'No email',
      guest_phone: customerMobile,
      check_in: checkIn,
      check_out: checkOut,
      adults: totalAdultsSelected,
      children: totalKidsSelected,
      total_price: totalVal,
      paid_amount: 0,
      payment_status: 'pending' as any,
      booking_status: 'confirmed' as any,
      selected_slot: shortCode, 
      addons: activeAddonNames,
      coupon_code: JSON.stringify(specRequestsObj)
    };

    try {
      const { error } = await (supabase as any)
        .from('bookings')
        .insert(payload);

      if (error) {
        alert('Database error: ' + error.message);
      } else {
        setIsCreatorOpen(false);
        setCheckIn('');
        setCheckOut('');
        setCustomerName('');
        setCustomerMobile('');
        setCustomerEmail('');
        setSelectedAddonIds([]);
        setSelectedEventIds([]);
        fetchLinks();
      }
    } catch (e: any) {
      alert('Failed to save link: ' + e.message);
    }
  };

  const handleCopyLink = (code: string) => {
    const linkUrl = `${window.location.origin}/?payment_link=${code}`;
    navigator.clipboard.writeText(linkUrl);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenLink = (code: string) => {
    const linkUrl = `${window.location.origin}/?payment_link=${code}`;
    window.open(linkUrl, '_blank');
  };

  const handleCancelLink = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking link?')) {
      return;
    }
    try {
      const { error } = await (supabase as any)
        .from('bookings')
        .update({ booking_status: 'cancelled' })
        .eq('id', id);

      if (!error) {
        fetchLinks();
      }
    } catch (err) {
      console.warn('Error cancelling link:', err);
    }
  };

  const filteredLinks = useMemo(() => {
    return linksList.filter(l => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (l.guest_name || '').toLowerCase().includes(query) ||
             (l.guest_phone || '').toLowerCase().includes(query) ||
             (l.room_name || '').toLowerCase().includes(query);
    });
  }, [linksList, searchQuery]);

  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Active Booking Links
          </h2>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Resend or cancel any booking link from here.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreatorOpen(true);
            setSelectedPropId(activePropertyId || propertiesList[0]?.id || '');
          }}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white rounded-full text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Booking Link
        </button>
      </div>

      {/* Search Filter bar */}
      <div className="flex items-center gap-3 bg-white p-3 border border-zinc-200 rounded-2xl">
        <Search className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Search guest, phone, room..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs font-semibold placeholder-zinc-350 outline-none"
        />
      </div>

      {/* Table listing */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-200">
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Booking</th>
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Property</th>
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Amounts</th>
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dates</th>
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Customer</th>
                <th className="p-4.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-xs text-zinc-450 font-semibold">
                    Loading booking links...
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2.5">
                      <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 border-dashed rounded-full flex items-center justify-center mx-auto text-zinc-400">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-zinc-500 font-bold">No active booking links found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link: any) => {
                  let payNow = link.total_price;
                  let expiryStr = 'Expires in 48 hours';
                  try {
                    if (link.coupon_code) {
                      const meta = JSON.parse(link.coupon_code);
                      payNow = meta.payNowAmount ?? link.total_price;
                      if (meta.expiry) {
                        expiryStr = `Expires ${format(parseISO(meta.expiry), 'dd MMM yyyy, hh:mm a')}`;
                      }
                    }
                  } catch (e) {}

                  const linkProp = propertiesList.find(p => p.id === link.property_id);
                  const isCopied = copiedId === link.selected_slot;

                  return (
                    <tr key={link.id} className="hover:bg-[#FAFAF9]/40 transition">
                      <td className="p-4.5 space-y-1 align-top">
                        <span className="font-extrabold text-zinc-900 text-xs block">
                          #{link.id}
                        </span>
                        <span className="text-[10px] text-zinc-450 font-bold block">
                          Created {format(parseISO(link.created_at), 'dd MMM yyyy, hh:mm a')}
                        </span>
                      </td>

                      <td className="p-4.5 space-y-0.5 align-top">
                        <span className="font-bold text-zinc-800 text-xs block">
                          {linkProp?.name || 'The Grandlake Resorts'}
                        </span>
                        <span className="text-[10px] text-zinc-455 font-semibold block">
                          Edappadi
                        </span>
                      </td>

                      <td className="p-4.5 space-y-1 align-top text-xs font-semibold text-zinc-700">
                        <div>Total: <strong className="text-zinc-900">{formatRupees(link.total_price)}</strong></div>
                        <div className="text-[10.5px] text-indigo-650">Pay now: <strong>{formatRupees(payNow)}</strong></div>
                      </td>

                      <td className="p-4.5 space-y-1 align-top">
                        <span className="font-bold text-zinc-800 text-xs block">
                          {format(parseISO(link.check_in), 'd MMM yyyy')} – {format(parseISO(link.check_out), 'd MMM yyyy')}
                        </span>
                        <span className="text-[10px] text-amber-600 font-bold block">
                          {expiryStr}
                        </span>
                      </td>

                      <td className="p-4.5 space-y-0.5 align-top">
                        <span className="font-bold text-zinc-800 text-xs block">{link.guest_name}</span>
                        <span className="text-[10px] text-zinc-455 font-semibold block">{link.guest_phone}</span>
                      </td>

                      <td className="p-4.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleCopyLink(link.selected_slot)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-zinc-650 hover:text-zinc-950 hover:bg-[#FAFAF9] text-3xs font-extrabold uppercase tracking-wide transition cursor-pointer"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenLink(link.selected_slot)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-zinc-650 hover:text-zinc-950 hover:bg-[#FAFAF9] text-3xs font-extrabold uppercase tracking-wide transition cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => handleCancelLink(link.id)}
                            className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Cancel Booking Link"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CREATE BOOKING LINK DRAWER / SLIDE-OVER
      ══════════════════════════════════════════════════════════════ */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-[999] overflow-hidden" onClick={() => setIsCreatorOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" />

          <div 
            className="absolute inset-y-0 right-0 max-w-xl w-full bg-[#FAF9F5] shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-white border-b border-zinc-200 flex items-center justify-between text-left shrink-0">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Create Booking Link
                </h3>
                <p className="text-3xs text-zinc-500 font-semibold leading-normal">
                  Pick the property, stay dates, and guest mix, then share the link with your guests
                </p>
              </div>
              <button
                onClick={() => setIsCreatorOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-650 transition cursor-pointer border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Scrollable Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 text-left">
              {/* PROPERTY SELECTION */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Property</label>
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 outline-none focus:border-[#1B93A4]"
                >
                  {propertiesList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* STEP 1: STAY DATES SELECTION */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Stay Dates</label>
                <div 
                  onClick={() => setShowInlineCalendar(prev => !prev)}
                  className="grid grid-cols-2 bg-white border border-zinc-200 rounded-xl divide-x divide-zinc-200 cursor-pointer overflow-hidden"
                >
                  <div className="px-4 py-3 text-left">
                    <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Check-in</span>
                    <span className="text-xs font-bold text-zinc-800 mt-1 block">
                      {checkIn ? format(new Date(checkIn), 'dd MMM yyyy') : 'Select Check-in'}
                    </span>
                  </div>
                  <div className="px-4 py-3 text-left">
                    <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider block">Check-out</span>
                    <span className="text-xs font-bold text-zinc-800 mt-1 block">
                      {checkOut ? format(new Date(checkOut), 'dd MMM yyyy') : 'Select Check-out'}
                    </span>
                  </div>
                </div>

                {/* INLINE CALENDAR */}
                {showInlineCalendar && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-250 rounded-2xl shadow-xl p-4.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-center">
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        type="button" 
                        onClick={() => setCalendarMonth(prev => subDays(prev, 30))}
                        className="p-1 border rounded-lg hover:bg-zinc-50"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-500" />
                      </button>
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-widest">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setCalendarMonth(prev => addDays(prev, 30))}
                        className="p-1 border rounded-lg hover:bg-zinc-50"
                      >
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-2">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarDaysInfo.padding.map((_, i) => (
                        <div key={`pad-${i}`} className="aspect-square bg-zinc-50/30 rounded-lg" />
                      ))}
                      {calendarDaysInfo.monthDays.map(item => {
                        const isSelectedCin = checkIn === item.dateStr;
                        const isSelectedCout = checkOut === item.dateStr;
                        const isInRange = checkIn && checkOut && item.dateStr > checkIn && item.dateStr < checkOut;
                        const isTodayDay = isToday(item.day);

                        const isPast = item.dateStr < todayStr;

                        return (
                          <button
                            key={item.dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() => handleCalendarDayClick(item.dateStr)}
                            className={`aspect-square p-2.5 rounded-xl border flex items-center justify-center text-xs transition select-none ${
                              isPast
                                ? 'opacity-30 bg-zinc-50 border-zinc-150 cursor-not-allowed'
                                : isSelectedCin || isSelectedCout
                                ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs cursor-pointer font-black'
                                : isInRange
                                ? 'bg-[#EFF9FA] border-[#DCEFF1] text-[#1B93A4] cursor-pointer'
                                : 'bg-white border-zinc-150 hover:bg-[#FAFAF9] cursor-pointer'
                            }`}
                          >
                            <span className={`${
                              isTodayDay && !isSelectedCin && !isSelectedCout
                                ? 'bg-[#1B93A4] text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold shadow-sm'
                                : ''
                            }`}>
                              {format(item.day, 'd')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(!checkIn || !checkOut) && (
                <div className="p-4 bg-amber-50/70 border border-amber-250/60 rounded-2xl text-center space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="text-amber-800 font-extrabold text-xs flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Dates Not Selected</span>
                  </div>
                  <p className="text-[10px] text-amber-600 font-semibold leading-relaxed">
                    Please choose check-in and check-out dates on the calendar above to proceed with rooms, meal plans, guest profiles, and rate details.
                  </p>
                </div>
              )}

              <div className={`space-y-6 transition duration-200 ${(!checkIn || !checkOut) ? 'pointer-events-none opacity-30 select-none' : ''}`}>

              {/* STEP 2: ROOM TYPES SELECTION & DATEWISE INVENTORY & INLINE GUEST PICKER (IMAGE 1 REF) */}
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">Rooms Selection</label>
                <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 space-y-3">
                  {roomsList.map(r => {
                    const qty = selectedRoomQuantities[r.id] || 0;
                    const isSelectable = roomInventoryStatuses[r.id]?.selectable ?? true;
                    const datesInfo = roomInventoryStatuses[r.id]?.datesInfo || [];

                    const roomAdults = roomAdultsCount[r.id] || qty;
                    const roomKids = roomKidsCount[r.id] || 0;
                    
                    const maxOccupancyLimit = qty * (r.capacityAdults || 2);

                    return (
                      <div 
                        key={r.id} 
                        className={`p-3.5 rounded-2xl border transition text-left space-y-3.5 ${
                          !isSelectable 
                            ? 'bg-zinc-50/50 border-zinc-200 opacity-60' 
                            : qty > 0 
                            ? 'bg-zinc-50/40 border-[#1B93A4]' 
                            : 'bg-white border-zinc-200 hover:bg-zinc-50/20'
                        }`}
                      >
                        {/* Title block */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-zinc-900 text-xs block">{r.name}</span>
                            <span className="text-[10px] text-zinc-450 block font-extrabold tracking-wide uppercase">
                              Base {r.base_occupancy || 0} · Min {r.min_occupancy || 1} · Max {r.capacityAdults || 2}
                            </span>
                          </div>
                          
                          {/* Counter buttons */}
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              disabled={qty <= 0}
                              onClick={() => handleRoomQuantityChange(r.id, Math.max(0, qty - 1))}
                              className="w-7 h-7 rounded-full border border-zinc-200 bg-white hover:bg-zinc-150 flex items-center justify-center font-bold text-zinc-650 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="w-3.5 text-center font-black text-xs text-zinc-800">{qty}</span>
                            <button
                              type="button"
                              disabled={!isSelectable}
                              onClick={() => handleRoomQuantityChange(r.id, qty + 1)}
                              className="w-7 h-7 rounded-full border border-zinc-200 bg-white hover:bg-zinc-150 flex items-center justify-center font-bold text-zinc-650 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Datewise inventory badges (Image 1 reference) */}
                        {datesInfo.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100">
                            {datesInfo.map(item => {
                              const isSoldOut = item.avail <= 0;
                              return (
                                <div 
                                  key={item.dateStr} 
                                  className={`flex flex-col items-center justify-center border rounded-xl px-2.5 py-1.5 min-w-[64px] text-center bg-white ${
                                    isSoldOut 
                                      ? 'border-rose-200 bg-rose-50/50' 
                                      : 'border-zinc-200'
                                  }`}
                                >
                                  <span className="text-[9px] font-bold text-zinc-455 block">{item.displayStr}</span>
                                  <span className={`text-[9.5px] font-black block mt-0.5 ${
                                    isSoldOut ? 'text-rose-600' : 'text-zinc-800'
                                  }`}>
                                    {isSoldOut ? 'Sold Out' : `${item.avail} avl`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* STEP 2.5: INLINE GUEST LIMIT CONTROLLERS (IMAGE 1 REF) */}
                        {qty > 0 && (
                          <div className="pt-3 border-t border-dashed border-zinc-200 space-y-2.5 bg-[#FAF9F5]/40 p-2.5 rounded-xl border border-zinc-200/60 text-xs">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">
                              Configure guests in {r.name}:
                            </span>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-600">Adults:</span>
                                <div className="flex items-center border border-zinc-250 bg-white rounded-lg overflow-hidden">
                                  <button
                                    type="button"
                                    disabled={roomAdults <= qty}
                                    onClick={() => handleRoomGuestsChange(r.id, 'adults', roomAdults - 1)}
                                    className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-[10.5px] font-black font-mono">{roomAdults}</span>
                                  <button
                                    type="button"
                                    disabled={roomAdults + roomKids >= maxOccupancyLimit}
                                    onClick={() => handleRoomGuestsChange(r.id, 'adults', roomAdults + 1)}
                                    className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="font-bold text-zinc-600">Kids:</span>
                                <div className="flex items-center border border-zinc-250 bg-white rounded-lg overflow-hidden">
                                  <button
                                    type="button"
                                    disabled={roomKids <= 0}
                                    onClick={() => handleRoomGuestsChange(r.id, 'kids', roomKids - 1)}
                                    className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-[10.5px] font-black font-mono">{roomKids}</span>
                                  <button
                                    type="button"
                                    disabled={roomAdults + roomKids >= maxOccupancyLimit}
                                    onClick={() => handleRoomGuestsChange(r.id, 'kids', roomKids + 1)}
                                    className="px-2 py-0.5 hover:bg-zinc-100 text-zinc-600 disabled:opacity-30 font-black cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-[9px] text-zinc-400 font-semibold text-right">
                              Total occupancy limit (Adults + Kids): max {maxOccupancyLimit}
                            </p>
                          </div>
                        )}

                        {/* Sold out alert badge */}
                        {!isSelectable && datesInfo.length > 0 && (
                          <div className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Sold out on some selected dates
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INVENTORY ERROR INDICATOR */}
              {hasInventoryError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-start gap-2.5 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold">Fully Booked!</p>
                    <p className="text-[10px] text-rose-500 mt-0.5">{minAvailableRoomsInfo.detail}</p>
                  </div>
                </div>
              )}

              {/* MEAL PLAN OVERRIDE */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Meal Plan</label>
                <select
                  value={selectedMealPlan}
                  onChange={(e) => setSelectedMealPlan(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 outline-none focus:border-[#1B93A4]"
                >
                  <option value="EP">EP — Room Only (No Meals)</option>
                  <option value="CP" disabled={!propertySettings.mealPlanCpEnabled && propertySettings.defaultMealPlan !== 'CP'}>
                    CP — Breakfast Included (Ad: {formatRupees(propertySettings.mealPlanCpAdultRate)}, Ch: {formatRupees(propertySettings.mealPlanCpChildRate)}/night)
                  </option>
                  <option value="MAP" disabled={!propertySettings.mealPlanMapEnabled && propertySettings.defaultMealPlan !== 'MAP'}>
                    MAP — Breakfast + Lunch/Dinner (Ad: {formatRupees(propertySettings.mealPlanMapAdultRate)}, Ch: {formatRupees(propertySettings.mealPlanMapChildRate)}/night)
                  </option>
                  <option value="AP" disabled={!propertySettings.mealPlanApEnabled && propertySettings.defaultMealPlan !== 'AP'}>
                    AP — All Meals Included (Ad: {formatRupees(propertySettings.mealPlanApAdultRate)}, Ch: {formatRupees(propertySettings.mealPlanApChildRate)}/night)
                  </option>
                </select>
              </div>

              {/* ADDONS CHECKBOX SECTION */}
              {addonsCache.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Add Addons</label>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
                    {addonsCache.map(addon => {
                      const checked = selectedAddonIds.includes(addon.id);
                      return (
                        <label 
                          key={addon.id} 
                          className="flex items-start gap-3 p-2 hover:bg-zinc-50 rounded-xl cursor-pointer transition text-xs font-semibold text-zinc-700"
                        >
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => handleToggleAddon(addon.id)}
                            className="mt-0.5 w-4 h-4 rounded-sm border-zinc-300 text-[#1B93A4] focus:ring-[#1B93A4]" 
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-zinc-900">{addon.name}</span>
                              <span className="text-zinc-500 font-extrabold">+{formatRupees(addon.price)}{addon.pricing_type === 'per_head' ? '/head' : ''}</span>
                            </div>
                            {addon.description && <p className="text-[10px] text-zinc-450 font-normal mt-0.5 leading-normal">{addon.description}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GUEST EVENTS CHECKBOX SECTION */}
              {eventsCache.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Add Guest Events</label>
                  <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
                    {eventsCache.map(evt => {
                      const checked = selectedEventIds.includes(evt.id);
                      const baseAdult = evt.priceAdult ?? evt.price ?? 0;
                      const baseChild = evt.priceChild ?? evt.price ?? 0;

                      // Timeslots selection parsing
                      const slots = evt.time ? evt.time.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                      const selectedSlot = selectedEventSlots[evt.id] || slots[0] || '';

                      return (
                        <div 
                          key={evt.id} 
                          className="flex flex-col p-2 hover:bg-zinc-55/40 rounded-xl transition text-xs font-semibold text-zinc-750 space-y-1.5"
                        >
                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={checked}
                              onChange={() => handleToggleEvent(evt.id)}
                              className="mt-0.5 w-4 h-4 rounded-sm border-zinc-300 text-[#1B93A4] focus:ring-[#1B93A4]" 
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-zinc-900">{evt.title}</span>
                                <span className="text-zinc-500 font-extrabold">+{formatRupees(baseAdult)}/ad, +{formatRupees(baseChild)}/ch</span>
                              </div>
                              <p className="text-[10px] text-indigo-650 font-bold mt-0.5">
                                Event Date: {format(parseISO(evt.from_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </label>

                          {/* Timeslot dropdown selector if checked and multiple slots exist */}
                          {checked && slots.length > 1 && (
                            <div className="pl-7 space-y-1">
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Choose Timeslot:</span>
                              <select
                                value={selectedSlot}
                                onChange={(e) => setSelectedEventSlots(prev => ({ ...prev, [evt.id]: e.target.value }))}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[10.5px] font-semibold text-zinc-750 outline-none focus:border-[#1B93A4]"
                              >
                                {slots.map((s: string) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Displays timeslot directly if only one exists */}
                          {checked && slots.length === 1 && slots[0] && (
                            <div className="pl-7 text-[9.5px] text-zinc-450 font-bold">
                              Time: <strong className="text-zinc-650 font-black">{slots[0]}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CUSTOMER PROFILE */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Guest full name"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Customer Mobile</label>
                  <input
                    type="text"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="+91 98xxxxxx10"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Optional email"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Link Expiry</label>
                  <input
                    type="datetime-local"
                    value={expiryTime}
                    onChange={(e) => setExpiryTime(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                </div>
              </div>

              {/* AMOUNT CONTROLS */}
              <div className="bg-white border border-zinc-200 p-5 rounded-3xl space-y-4">
                <h4 className="font-extrabold text-sm text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Amount Controls
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Amount</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                  <span className="text-[10px] text-zinc-455 block font-bold mt-1">Suggested: {formatRupees(suggestedTotal)}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pay Now Amount</label>
                  <input
                    type="number"
                    value={payNowAmount}
                    onChange={(e) => setPayNowAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#1B93A4]"
                  />
                  <span className="text-[10px] text-zinc-455 block font-bold mt-1">Suggested: {formatRupees(suggestedPayNow)}</span>
                </div>

                {/* STAY SUMMARY CARD (WITH DETAILED BREAKDOWN & 12% GST) */}
                <div className="bg-[#EFF9FA] border border-[#DCEFF1] p-4.5 rounded-2xl text-left space-y-3.5">
                  <div className="space-y-1 pb-2 border-b border-zinc-200/60">
                    <span className="text-[8px] text-[#1B93A4] font-extrabold uppercase tracking-widest block">Stay Summary</span>
                    <h5 className="text-xs font-black text-zinc-900 tracking-tight">
                      {checkIn && checkOut 
                        ? `${format(new Date(checkIn), 'dd MMM yyyy')} – ${format(new Date(checkOut), 'dd MMM yyyy')} (${stayNights} Night${stayNights === 1 ? '' : 's'})`
                        : 'Dates not set'}
                    </h5>
                    <p className="text-[10.5px] text-zinc-550 font-bold mt-0.5">
                      {totalAdultsSelected} Adults · {totalKidsSelected} Kids {calculatedExtraBeds > 0 ? `· ${calculatedExtraBeds} Extra Beds` : ''}
                    </p>
                  </div>

                  {/* Pricing breakdown breakdown list */}
                  <div className="space-y-2.5 text-xs font-semibold text-zinc-600">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Room Stay Cost:</span>
                        <span className="text-zinc-900 font-bold">{formatRupees(pricingBreakdown.roomsCost)}</span>
                      </div>
                      
                      {/* Collapsible room-wise breakdown */}
                      {activeSelectedRooms.length > 0 && (
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
                              {(pricingBreakdown.roomBreakdown || []).map((r: any) => {
                                if (r.qty <= 0) return null;
                                
                                return (
                                  <div key={r.id} className="text-[11px] text-zinc-550 leading-relaxed font-semibold">
                                    <div className="flex justify-between text-zinc-700 font-bold">
                                      <span>{r.name} (x{r.qty})</span>
                                      <span className="text-zinc-950 font-black">{formatRupees(r.totalCost)}</span>
                                    </div>
                                    <div className="pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-455 space-y-0.5 mt-0.5">
                                      <div className="flex justify-between">
                                        <span>{r.baseGuests} base</span>
                                        <span>{formatRupees(r.baseStayTotal)}</span>
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
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {pricingBreakdown.mealPlanCost > 0 && (
                      <div className="flex justify-between">
                        <span>Meal Plan ({selectedMealPlan.toUpperCase()}):</span>
                        <span className="text-zinc-900 font-bold">{formatRupees(pricingBreakdown.mealPlanCost)}</span>
                      </div>
                    )}

                    {pricingBreakdown.addonsCost > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Addons Total:</span>
                          <span className="text-zinc-900 font-bold">{formatRupees(pricingBreakdown.addonsCost)}</span>
                        </div>
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
                            <div className="mt-1.5 pl-2.5 border-l border-zinc-250/60 text-[9.5px] text-zinc-450 space-y-1.5 py-0.5 animate-in slide-in-from-top-1 duration-150">
                              {(pricingBreakdown.addonsBreakdown || []).map((addon: any) => (
                                <div key={addon.id} className="flex justify-between font-semibold">
                                  <span>
                                    {addon.name} 
                                    <span className="text-[8.5px] text-zinc-400 font-medium block mt-0.5">
                                      {formatRupees(addon.price)}{addon.pricingType === 'per_head' ? '/head' : ' flat'}
                                    </span>
                                  </span>
                                  <span className="text-zinc-700 font-bold">{formatRupees(addon.totalCost)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {pricingBreakdown.eventsCost > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Guest Events Total:</span>
                          <span className="text-zinc-900 font-bold">{formatRupees(pricingBreakdown.eventsCost)}</span>
                        </div>
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
                              {(pricingBreakdown.eventsBreakdown || []).map((evt: any) => (
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
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between pt-1 border-t border-zinc-200/40">
                        <span>GST:</span>
                        <span className="text-zinc-900 font-bold">+{formatRupees(pricingBreakdown.gstCost)}</span>
                      </div>
                      
                      {/* Collapsible GST details dropdown if addons, events, or meal plans exist */}
                      {(pricingBreakdown.addonsCost > 0 || pricingBreakdown.eventsCost > 0 || pricingBreakdown.mealPlanCost > 0) && (
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
                                <span className="text-zinc-700">{formatRupees(pricingBreakdown.roomsGst || 0)}</span>
                              </div>
                              {pricingBreakdown.mealPlanCost > 0 && (
                                <div className="flex justify-between">
                                  <span>Meal Plan GST:</span>
                                  <span className="text-zinc-700">{formatRupees(pricingBreakdown.mealPlanGst || 0)}</span>
                                </div>
                              )}
                              {pricingBreakdown.addonsCost > 0 && (
                                <div className="flex justify-between">
                                  <span>Addons GST (18%):</span>
                                  <span className="text-zinc-700">{formatRupees(pricingBreakdown.addonsGst || 0)}</span>
                                </div>
                              )}
                              {pricingBreakdown.eventsCost > 0 && (
                                <div className="flex justify-between">
                                  <span>Events GST (18%):</span>
                                  <span className="text-zinc-700">{formatRupees(pricingBreakdown.eventsGst || 0)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-1.5 border-t border-zinc-200/70 text-xs font-bold text-zinc-900">
                      <span>Grand Total:</span>
                      <span>{formatRupees(totalAmount !== '' ? Number(totalAmount) : pricingBreakdown.grandTotal)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-250 space-y-1.5 text-xs font-bold text-[#1B93A4]">
                    <div className="flex justify-between">
                      <span>Collect thru link:</span>
                      <span>{formatRupees(payNowAmount !== '' ? Number(payNowAmount) : suggestedPayNow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collect at property:</span>
                      <span>{formatRupees(Math.max(0, (totalAmount !== '' ? Number(totalAmount) : pricingBreakdown.grandTotal) - (payNowAmount !== '' ? Number(payNowAmount) : suggestedPayNow)))}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              </div> {/* prerequisite check-in end */}
            </div>

            {/* Bottom Button */}
            <div className="p-6 bg-white border-t border-zinc-200 shrink-0">
              <button
                onClick={handleCreateLink}
                disabled={hasInventoryError || activeSelectedRooms.length === 0 || !checkIn || !checkOut}
                className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-2xs uppercase tracking-wider py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Create booking link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
