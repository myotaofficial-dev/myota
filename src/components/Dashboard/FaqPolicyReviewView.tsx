import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Star, HelpCircle, ShieldAlert, FileText } from 'lucide-react';

interface FaqPolicyReviewViewProps {
  defaultTab?: 'faqs' | 'reviews' | 'policies';
}

export const FaqPolicyReviewView: React.FC<FaqPolicyReviewViewProps> = ({ defaultTab = 'faqs' }) => {
  const { 
    faqs, addFAQ, updateFAQ, deleteFAQ, 
    testimonials, addTestimonial, deleteTestimonial,
    policies, addPolicy, updatePolicy, deletePolicy,
    hotelInfo, updateHotelInfo
  } = useHotel();

  const [activeTab, setActiveTab] = useState<'faqs' | 'reviews' | 'policies'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  
  // Editor Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [faqQ, setFaqQ] = useState('');
  const [faqA, setFaqA] = useState('');
  
  const [revAuthor, setRevAuthor] = useState('');
  const [revContent, setRevContent] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revDate, setRevDate] = useState('');

  const [polTitle, setPolTitle] = useState('');
  const [polDesc, setPolDesc] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFaqQ('');
    setFaqA('');
    setRevAuthor('');
    setRevContent('');
    setRevRating(5);
    setRevDate(new Date().toISOString().split('T')[0]);
    setPolTitle('');
    setPolDesc('');
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'faqs') {
      setFaqQ(item.question);
      setFaqA(item.answer);
    } else if (activeTab === 'policies') {
      setPolTitle(item.title);
      setPolDesc(item.description);
    }
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'faqs') {
      if (editingId) {
        updateFAQ(editingId, { question: faqQ, answer: faqA });
      } else {
        addFAQ({ question: faqQ, answer: faqA });
      }
    } else if (activeTab === 'reviews') {
      addTestimonial({
        author: revAuthor,
        content: revContent,
        rating: Number(revRating),
        stayDate: revDate
      });
    } else if (activeTab === 'policies') {
      if (editingId) {
        updatePolicy(editingId, { title: polTitle, description: polDesc });
      } else {
        addPolicy({ title: polTitle, description: polDesc });
      }
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Policies, FAQs & Reviews</h2>
          <p className="text-sm text-[#78716C]">Configure information panels, check cancellation policies, or publish guest testimonials.</p>
        </div>
        
        <button
          onClick={openAddModal}
          className="ds-btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'faqs' ? 'Add FAQ' : activeTab === 'reviews' ? 'Add Review' : 'Add Policy'}
          </span>
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#E7E5E4]">
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition ${
            activeTab === 'faqs' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition ${
            activeTab === 'reviews' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Testimonials ({testimonials.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-5 py-2.5 font-bold text-sm border-b-2 -mb-[2px] transition ${
            activeTab === 'policies' 
              ? 'border-[#1B93A4] text-[#1B93A4]' 
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          Stay Policies ({policies.length})
        </button>
      </div>

      {/* Content panes */}
      <div className="ds-card p-6">
        
        {/* FAQs Panel */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-4 shadow-3xs space-y-2 mb-4">
              <label className="ds-overline block">FAQs Section Title</label>
              <input 
                type="text" 
                value={hotelInfo.faqsTitle || 'Resort FAQs'} 
                onChange={(e) => updateHotelInfo({ faqsTitle: e.target.value })}
                placeholder="e.g. Resort FAQs"
                className="ds-input w-full" 
              />
            </div>
            {faqs.map(faq => (
              <div key={faq.id} className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-sm text-[#1C1917] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                    <span>{faq.question}</span>
                  </h4>
                  <p className="text-xs text-[#78716C] pl-5 leading-relaxed">{faq.answer}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(faq)}
                    className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this FAQ?')) {
                        deleteFAQ(faq.id);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {faqs.length === 0 && (
              <div className="py-12 text-center text-[#A8A29E] text-xs">No FAQs created yet.</div>
            )}
          </div>
        )}

        {/* Reviews Panel */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-4 shadow-3xs space-y-2 mb-4">
              <label className="ds-overline block">Reviews Section Title</label>
              <input 
                type="text" 
                value={hotelInfo.reviewsTitle || 'Guest Reviews'} 
                onChange={(e) => updateHotelInfo({ reviewsTitle: e.target.value })}
                placeholder="e.g. Guest Reviews"
                className="ds-input w-full" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map(review => (
                <div key={review.id} className="p-5 border border-[#E7E5E4] rounded-xl space-y-3 relative hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#1C1917] text-sm">{review.author}</h4>
                      <span className="text-[10px] text-[#A8A29E] font-semibold uppercase">Stayed: {review.stayDate}</span>
                    </div>
                    
                    {/* Rating stars */}
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#78716C] leading-relaxed italic">"{review.content}"</p>

                  <button
                    onClick={() => {
                      if (confirm('Delete this review testimonial?')) {
                        deleteTestimonial(review.id);
                      }
                    }}
                    className="absolute bottom-4 right-4 p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {testimonials.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#A8A29E] text-xs">No guest reviews uploaded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Policies Panel */}
        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E7E5E4] rounded-xl p-4 shadow-3xs space-y-2 mb-4">
              <label className="ds-overline block">Policies Section Title</label>
              <input 
                type="text" 
                value={hotelInfo.policiesTitle || 'Resort Guidelines'} 
                onChange={(e) => updateHotelInfo({ policiesTitle: e.target.value })}
                placeholder="e.g. Resort Guidelines"
                className="ds-input w-full" 
              />
            </div>
            <div className="space-y-5 divide-y divide-zinc-150">
              {policies.map((policy, idx) => (
                <div key={policy.id} className={`flex items-start justify-between gap-4 ${idx > 0 ? 'pt-5' : ''}`}>
                  <div className="space-y-1 text-left">
                    <h4 className="font-extrabold text-sm text-[#1C1917] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#1B93A4]" />
                      <span>{policy.title}</span>
                    </h4>
                    <p className="text-xs text-[#78716C] leading-relaxed pl-5 whitespace-pre-line">{policy.description}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditModal(policy)}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this policy record?')) {
                          deletePolicy(policy.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <div className="py-12 text-center text-[#A8A29E] text-xs">No policies defined yet.</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-[#E7E5E4]">
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <h3 className="font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <FileText className="w-5 h-5 text-[#1B93A4]" />
                <span>
                  {editingId ? 'Edit Info Record' : 'Create Info Record'}
                </span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* FAQ Fields */}
              {activeTab === 'faqs' && (
                <>
                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Frequently Asked Question</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Do you offer shuttle services?"
                      value={faqQ}
                      onChange={(e) => setFaqQ(e.target.value)}
                      className="ds-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Helpful Answer</label>
                    <textarea
                      required
                      placeholder="Write answer details clearly..."
                      value={faqA}
                      onChange={(e) => setFaqA(e.target.value)}
                      rows={4}
                      className="ds-input w-full resize-none"
                    />
                  </div>
                </>
              )}

              {/* Review Testimonials Fields */}
              {activeTab === 'reviews' && (
                <>
                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Guest Author Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={revAuthor}
                      onChange={(e) => setRevAuthor(e.target.value)}
                      className="ds-input w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="ds-overline block">Rating</label>
                      <select
                        value={revRating}
                        onChange={(e) => setRevRating(Number(e.target.value))}
                        className="ds-input w-full"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                        <option value="3">⭐⭐⭐ (3 Stars)</option>
                        <option value="2">⭐⭐ (2 Stars)</option>
                        <option value="1">⭐ (1 Star)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="ds-overline block">Stay Date</label>
                      <input
                        type="date"
                        required
                        value={revDate}
                        onChange={(e) => setRevDate(e.target.value)}
                        className="ds-input w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Review Content</label>
                    <textarea
                      required
                      placeholder="Paste review feedback..."
                      value={revContent}
                      onChange={(e) => setRevContent(e.target.value)}
                      rows={3}
                      className="ds-input w-full resize-none"
                    />
                  </div>
                </>
              )}

              {/* Policy Fields */}
              {activeTab === 'policies' && (
                <>
                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Policy Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pet Accommodation Policy"
                      value={polTitle}
                      onChange={(e) => setPolTitle(e.target.value)}
                      className="ds-input w-full"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="ds-overline block">Policy Description</label>
                    <textarea
                      required
                      placeholder="Explain policy conditions, fees, and rules..."
                      value={polDesc}
                      onChange={(e) => setPolDesc(e.target.value)}
                      rows={4}
                      className="ds-input w-full resize-none"
                    />
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="p-5 border-t border-[#E7E5E4] flex items-center justify-end gap-3 pt-4 bg-[#FAFAF9] -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary"
                >
                  {editingId ? 'Save changes' : 'Generate Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
