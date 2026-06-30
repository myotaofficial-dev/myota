import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { Coupon } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, BadgePercent, CheckCircle, XCircle } from 'lucide-react';

export const CouponsView: React.FC = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const [active, setActive] = useState(true);

  // Helper to format Rupees
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const openAddModal = () => {
    setCode('');
    setDiscountType('percent');
    setDiscountValue(10);
    setActive(true);
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setActive(coupon.active);
    setEditingId(coupon.id);
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      code: code.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      discountType,
      discountValue: Number(discountValue),
      active
    };

    if (editingId) {
      updateCoupon(editingId, data);
    } else {
      addCoupon(data);
    }
    setIsEditing(false);
  };

  const toggleStatus = (id: string, currentActive: boolean) => {
    updateCoupon(id, { active: !currentActive });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Coupons & Promo Codes</h2>
          <p className="text-sm text-[#78716C]">Create promotional discount codes that guests can enter during booking.</p>
        </div>
        <button
          onClick={openAddModal}
          className="ds-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {coupons.map(coupon => (
          <div key={coupon.id} className="ds-card p-5 flex flex-col space-y-4 hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between">
              <div className="bg-[#FAFAF9] border-2 border-dashed border-[#E7E5E4] font-mono font-bold text-sm tracking-widest text-[#1C1917] px-3 py-1.5 rounded-lg select-all">
                {coupon.code}
              </div>
              <button
                onClick={() => toggleStatus(coupon.id, coupon.active)}
                className={`ds-badge ${coupon.active ? 'ds-badge-green' : 'ds-badge-coral'}`}
              >
                {coupon.active ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    <span>Inactive</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-0.5">
              <span className="ds-overline block">Discount Value</span>
              <p className="font-extrabold text-xl text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {coupon.discountType === 'percent' ? `${coupon.discountValue}% Off` : `${formatRupees(coupon.discountValue * 83)} Off`}
              </p>
              <p className="text-xs text-[#78716C]">Applies to the total night stay subtotal at checkout.</p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#E7E5E4] flex items-center justify-end gap-2 mt-auto">
              <button
                onClick={() => openEditModal(coupon)}
                className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this coupon code?')) {
                    deleteCoupon(coupon.id);
                  }
                }}
                className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {coupons.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#A8A29E]">
            No coupon codes created. Click "Create Coupon" to launch one.
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-[#E7E5E4]">
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <BadgePercent className="w-5 h-5 text-[#1B93A4]" />
                <span>{editingId ? 'Edit Coupon' : 'Create New Coupon'}</span>
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="ds-overline block">Coupon Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="ds-input w-full uppercase"
                />
                <span className="text-[10px] text-[#A8A29E] block font-bold uppercase tracking-wider">Letters and numbers only.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="ds-overline block">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="ds-input w-full"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Cash (₹)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="ds-overline block">Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="ds-input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl">
                <span className="text-xs font-bold text-[#78716C]">Publish Instantly</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4.5 h-4.5 accent-[#1B93A4] rounded-sm cursor-pointer"
                />
              </div>

              <div className="p-5 border-t border-[#E7E5E4] flex items-center justify-end gap-3 pt-4 bg-[#FAFAF9] -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary"
                >
                  {editingId ? 'Save changes' : 'Generate Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
