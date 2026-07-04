import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, Save, Plus, Pencil, Trash2, X } from 'lucide-react';

interface CustomPolicy {
  id: string;
  xx: number;
  yy: number;
}

export const CancellationPoliciesView: React.FC = () => {
  const { hotelInfo, updateHotelInfo } = useHotel();
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Custom form toggles and inputs
  const [showForm, setShowForm] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [formXX, setFormXX] = useState<number>(10);
  const [formYY, setFormYY] = useState<number>(5);
  const [formError, setFormError] = useState<string | null>(null);

  // Local draft states for saving the entire page
  const [localPolicyType, setLocalPolicyType] = useState<string>(
    hotelInfo.cancellationPolicyType || '2d'
  );
  const [localCustomPolicies, setLocalCustomPolicies] = useState<CustomPolicy[]>(
    hotelInfo.customCancellationPolicies || []
  );
  const [localDiscountAmount, setLocalDiscountAmount] = useState<number>(
    hotelInfo.nonRefundableDiscountAmount ?? 200
  );

  // Policies descriptions mapping
  const getPolicyDescription = (type: string) => {
    if (type === '2d') {
      return 'Full refund if cancelled up to 2 days before check-in.';
    }
    if (type === '7d_4d') {
      return 'Full refund if cancelled up to 7 days before check-in. 50% refund if cancelled up to 4 days before check-in.';
    }
    if (type === '15d_10d') {
      return 'Full refund if cancelled up to 15 days before check-in. 50% refund if cancelled up to 10 days before check-in.';
    }
    if (type === 'non_refundable') {
      return 'Non-cancellable. No refunds will be provided.';
    }
    // Check custom list
    const found = localCustomPolicies.find(p => p.id === type);
    if (found) {
      return `Full refund if cancelled up to ${found.xx} days before check-in. 50% refund if cancelled up to ${found.yy} days before check-in.`;
    }
    return '';
  };

  // Step 1: Open Add Custom form
  const handleOpenAddCustom = () => {
    setEditingPolicyId(null);
    setFormXX(10);
    setFormYY(5);
    setFormError(null);
    setShowForm(true);
  };

  // Step 1b: Open Edit Custom form
  const handleOpenEditCustom = (e: React.MouseEvent, policy: CustomPolicy) => {
    e.stopPropagation(); // prevent selecting the button while editing
    setEditingPolicyId(policy.id);
    setFormXX(policy.xx);
    setFormYY(policy.yy);
    setFormError(null);
    setShowForm(true);
  };

  // Step 2 & 3: Save custom policy to local list
  const handleSaveCustomPolicy = () => {
    if (formXX <= formYY) {
      setFormError(`Full refund days (XX: ${formXX}) must be strictly greater than 50% refund days (YY: ${formYY}).`);
      return;
    }
    setFormError(null);

    let updatedList: CustomPolicy[];
    if (editingPolicyId) {
      // Edit existing
      updatedList = localCustomPolicies.map(p => 
        p.id === editingPolicyId ? { ...p, xx: formXX, yy: formYY } : p
      );
    } else {
      // Add new
      const newId = `custom_${Date.now()}`;
      updatedList = [...localCustomPolicies, { id: newId, xx: formXX, yy: formYY }];
      // Select the newly created policy
      setLocalPolicyType(newId);
    }

    setLocalCustomPolicies(updatedList);
    setShowForm(false);
    setEditingPolicyId(null);
  };

  // Delete custom policy
  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent selecting
    const updatedList = localCustomPolicies.filter(p => p.id !== id);
    setLocalCustomPolicies(updatedList);
    
    // If the active policy was deleted, reset to 2D
    if (localPolicyType === id) {
      setLocalPolicyType('2d');
    }
  };

  // Page-wide Save
  const handleSavePage = () => {
    updateHotelInfo({
      cancellationPolicyType: localPolicyType,
      customCancellationPolicies: localCustomPolicies,
      nonRefundableDiscountAmount: localDiscountAmount
    });

    setSaveSuccess(true);
    alert('Cancellation policies saved successfully!');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto pb-12 animate-in fade-in duration-150 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Cancellation Policies</h2>
          <p className="text-sm text-[#78716C]">Define refund conditions for guest cancellations and non-refundable booking incentives.</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E8F5EF] border border-[#2D6A4F] text-[#2D6A4F] text-xs font-semibold rounded-lg animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved Successfully</span>
          </div>
        )}
      </div>

      {/* Card 1: Cancellation Policy */}
      <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="space-y-1">
          <h3 className="text-[#1C1917] font-extrabold text-sm flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-[#1B93A4]" />
            <span>Cancellation policy</span>
          </h3>
          <p className="text-xs text-[#78716C]">
            Choose the default cancellation policy for this base price.
          </p>
        </div>

        {/* Buttons / Pills Group */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Preset 1 */}
          <button
            type="button"
            onClick={() => setLocalPolicyType('2d')}
            className={`px-4.5 py-2.5 rounded-full text-xs font-extrabold tracking-wide transition border duration-200 cursor-pointer ${
              localPolicyType === '2d'
                ? 'bg-[#1C1917] border-[#1C1917] text-white shadow-sm'
                : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#1C1917]'
            }`}
          >
            2D
          </button>
          
          {/* Preset 2 */}
          <button
            type="button"
            onClick={() => setLocalPolicyType('7d_4d')}
            className={`px-4.5 py-2.5 rounded-full text-xs font-extrabold tracking-wide transition border duration-200 cursor-pointer ${
              localPolicyType === '7d_4d'
                ? 'bg-[#1C1917] border-[#1C1917] text-white shadow-sm'
                : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#1C1917]'
            }`}
          >
            7D/4D
          </button>

          {/* Preset 3 */}
          <button
            type="button"
            onClick={() => setLocalPolicyType('15d_10d')}
            className={`px-4.5 py-2.5 rounded-full text-xs font-extrabold tracking-wide transition border duration-200 cursor-pointer ${
              localPolicyType === '15d_10d'
                ? 'bg-[#1C1917] border-[#1C1917] text-white shadow-sm'
                : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#1C1917]'
            }`}
          >
            15D/10D
          </button>

          {/* Preset 4 */}
          <button
            type="button"
            onClick={() => setLocalPolicyType('non_refundable')}
            className={`px-4.5 py-2.5 rounded-full text-xs font-extrabold tracking-wide transition border duration-200 cursor-pointer ${
              localPolicyType === 'non_refundable'
                ? 'bg-[#1C1917] border-[#1C1917] text-white shadow-sm'
                : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#1C1917]'
            }`}
          >
            Non-cancellable
          </button>

          {/* Custom Pills (Step 3: show in list of buttons with edit and delete option) */}
          {localCustomPolicies.map((policy) => {
            const isActive = localPolicyType === policy.id;
            return (
              <div
                key={policy.id}
                onClick={() => setLocalPolicyType(policy.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wide transition border duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#1C1917] border-[#1C1917] text-white shadow-sm'
                    : 'bg-white border-[#E7E5E4] text-[#1C1917] hover:border-[#1C1917]'
                }`}
              >
                <span>{policy.xx}D/{policy.yy}D</span>
                <div className="flex items-center gap-1 border-l border-current pl-1.5 ml-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditCustom(e, policy)}
                    className="p-0.5 hover:scale-110 active:scale-95 transition text-current cursor-pointer"
                    title="Edit Policy"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCustom(e, policy.id)}
                    className="p-0.5 hover:text-rose-600 hover:scale-110 active:scale-95 transition text-current cursor-pointer"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Custom Button (Step 1: click add custom button) */}
          <button
            type="button"
            onClick={handleOpenAddCustom}
            className="flex items-center gap-1 px-4 py-2.5 rounded-full text-xs font-bold border border-dashed border-[#1B93A4] bg-white text-[#1B93A4] hover:bg-[#1B93A4]/5 hover:border-solid transition cursor-pointer"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom</span>
          </button>
        </div>

        {/* Step 2: input XX and YY details (Slide-down custom form) */}
        {showForm && (
          <div className="bg-[#FAF6F0]/50 border border-[#E07A5F]/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200 text-left">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-1">
              <h4 className="text-2xs font-extrabold text-[#E07A5F] uppercase tracking-wider">
                {editingPolicyId ? 'Edit Custom Policy' : 'Create Custom Policy'}
              </h4>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-rose-800 text-xs">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span className="font-semibold leading-relaxed font-sans">{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {/* Full Refund XX Days */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">
                  Full Refund Duration (XX days)
                </label>
                <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 bg-white transition ${formXX <= formYY ? 'border-rose-300' : 'border-[#E7E5E4]'}`}>
                  <input
                    type="number"
                    min="0"
                    placeholder="XX"
                    value={formXX === 0 ? '' : formXX}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormXX(val);
                      if (val > formYY) setFormError(null);
                    }}
                    className="w-full text-xs font-bold text-zinc-800 bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-400">Days</span>
                </div>
              </div>

              {/* 50% Refund YY Days */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">
                  50% Refund Duration (YY days)
                </label>
                <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 bg-white transition ${formXX <= formYY ? 'border-rose-300' : 'border-[#E7E5E4]'}`}>
                  <input
                    type="number"
                    min="0"
                    placeholder="YY"
                    value={formYY === 0 ? '' : formYY}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormYY(val);
                      if (formXX > val) setFormError(null);
                    }}
                    className="w-full text-xs font-bold text-zinc-800 bg-transparent outline-none"
                  />
                  <span className="text-[10px] font-bold text-zinc-400">Days</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[#E7E5E4] rounded-xl text-[#78716C] hover:bg-zinc-50 font-bold text-2xs uppercase tracking-wider transition cursor-pointer"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPolicy}
                className="px-4 py-2 rounded-xl text-white font-bold text-2xs uppercase tracking-wider transition cursor-pointer bg-[#1B93A4] hover:bg-[#1B93A4]/90"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Save Custom Policy
              </button>
            </div>
          </div>
        )}

        {/* Selected Policy Information Panel */}
        <div className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#78716C] mt-0.5 shrink-0" />
          <div className="space-y-1 w-full">
            <span className="text-[10px] font-black uppercase text-[#78716C] tracking-wider font-sans">
              Active Refund Terms Description:
            </span>
            <p className="text-xs text-[#1C1917] font-semibold leading-relaxed font-sans mt-1">
              {getPolicyDescription(localPolicyType) || 'Select a policy button above to activate refund terms.'}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Non-refundable Discount */}
      <div className="bg-white border border-[#E7E5E4] rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="space-y-1">
          <h3 className="text-[#1C1917] font-extrabold text-sm">
            Non-refundable discount
          </h3>
          <p className="text-xs text-[#78716C]">
            Set a per person discount for non-refundable bookings.
          </p>
        </div>

        {/* Non refundable Input Box (Image 2 style) */}
        <div className="border border-[#E7E5E4] rounded-2xl p-4 bg-white flex items-center justify-between max-w-sm">
          <span className="text-xs font-bold text-zinc-400 uppercase font-sans">
            INR
          </span>
          <input
            type="number"
            value={localDiscountAmount === 0 ? '' : localDiscountAmount}
            onChange={(e) => setLocalDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            className="w-24 text-center font-bold text-sm text-[#1C1917] bg-[#FAFAF9] border border-[#E7E5E4] focus:border-[#1B93A4] focus:bg-white rounded-xl px-2 py-1.5 outline-none font-sans"
          />
          <span className="text-xs font-bold text-zinc-400 font-sans">
            / person
          </span>
        </div>
      </div>

      {/* Page Save Button Section */}
      <div className="pt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSavePage}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider transition shadow-sm hover:scale-[1.01] active:scale-95 cursor-pointer bg-[#1C1917] hover:bg-zinc-800"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          <Save className="w-4 h-4 text-white" />
          <span>Save Cancellation Policies</span>
        </button>
      </div>
    </div>
  );
};
