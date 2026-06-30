import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { CustomPage } from '../../context/HotelContext';
import { Users, CheckCircle, ArrowLeft, Calendar, Clock, Utensils, X } from 'lucide-react';

interface CustomPageRendererProps {
  page: CustomPage;
}

export const CustomPageRenderer: React.FC<CustomPageRendererProps> = ({ page }) => {
  const { setPreviewPath } = useHotel();
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  // Form states for Banquet inquiry
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySubmitted(true);
    setTimeout(() => {
      setInquirySubmitted(false);
      setGuestName('');
      setGuestEmail('');
      setEventDate('');
      setNotes('');
    }, 3000);
  };

  return (
    <div className="flex-1 w-full bg-[#FAF6F0] text-[#333D29] font-sans pb-16 animate-in fade-in duration-300">
      {/* Banner Hero */}
      <div className="h-60 md:h-80 bg-zinc-900 relative flex items-center justify-center">
        <img 
          src={page.bannerImage || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200"} 
          alt={page.title} 
          className="w-full h-full object-cover opacity-50 absolute inset-0"
        />
        <div className="relative text-center px-4 space-y-2 z-10">
          <span className="text-[10px] text-[#E07A5F] font-extrabold uppercase tracking-widest block bg-[#FAF6F0] px-3.5 py-1 rounded-full w-max mx-auto shadow-xs">
            {page.type || 'Custom page'}
          </span>
          <h1 className="text-xl md:text-3xl font-bold uppercase tracking-wider text-[#FAF6F0] font-serif">
            {page.title}
          </h1>
          {page.tagline && (
            <p className="text-4xs md:text-2xs text-[#FAF6F0]/80 italic max-w-lg mx-auto font-serif">
              {page.tagline}
            </p>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6F0] via-transparent to-transparent"></div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 text-left">
        {/* Back navigation link */}
        <button 
          onClick={() => setPreviewPath('/')}
          className="inline-flex items-center gap-2 text-5xs font-bold text-[#E07A5F] hover:text-[#c46950] uppercase tracking-wider mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        {/* Content summary */}
        {page.content && page.type !== 'custom' && (
          <p className="text-4xs text-zinc-600 leading-relaxed mb-8 max-w-2xl border-l-2 border-[#E07A5F] pl-4 italic">
            {page.content}
          </p>
        )}

        {/* PRESET TYPE RENDERERS */}

        {/* Preset 1: Restaurant Menu */}
        {page.type === 'restaurant' && (
          <div className="space-y-8">
            <h2 className="text-xs font-bold text-[#3D405B] uppercase tracking-widest flex items-center gap-2 border-b border-[#D8E2DC] pb-2.5">
              <Utensils className="w-4 h-4 text-[#E07A5F]" />
              <span>Gourmet Selection</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {page.restaurantMenu?.map((dish, i) => (
                <div key={i} className="bg-white border border-[#D8E2DC] rounded-2xl overflow-hidden flex shadow-xs hover:shadow-md transition">
                  <div className="w-24 h-24 shrink-0 bg-zinc-50 border-r border-[#D8E2DC]">
                    <img 
                      src={dish.photo || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=300"} 
                      alt={dish.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="text-4xs font-bold text-[#3D405B] uppercase">{dish.name}</h4>
                        <span className="text-4xs font-extrabold text-[#E07A5F] font-serif">
                          ${dish.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal mt-1 line-clamp-2">
                        {dish.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!page.restaurantMenu || page.restaurantMenu.length === 0) && (
              <p className="text-5xs text-zinc-400 italic">No menu items configured yet.</p>
            )}
          </div>
        )}

        {/* Preset 2: Banquet Hall */}
        {page.type === 'banquet' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-xs font-bold text-[#3D405B] uppercase tracking-widest border-b border-[#D8E2DC] pb-2.5">
                Venue Amenities
              </h2>
              
              {/* Capacity Card */}
              <div className="bg-white border border-[#D8E2DC] p-5 rounded-2xl flex items-center gap-4 shadow-xs">
                <div className="bg-[#FAF6F0] p-3 rounded-full text-[#E07A5F]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-5xs text-zinc-450 uppercase font-extrabold tracking-wider">Total Guest Capacity</span>
                  <h4 className="text-xs font-black text-[#3D405B]">{page.banquetCapacity || 150} Guests Sitting</h4>
                </div>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {page.banquetFeatures?.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-4xs font-bold text-zinc-700">
                    <CheckCircle className="w-4 h-4 text-[#81B29A] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inquiry Form Card */}
            <div className="bg-white border border-[#D8E2DC] p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-[10px] font-extrabold text-[#3D405B] uppercase tracking-widest">Inquire About Booking</h3>
              
              {inquirySubmitted ? (
                <div className="bg-[#E8F5E9] text-[#2E7D32] p-4 rounded-xl text-center space-y-1 animate-in fade-in duration-300">
                  <CheckCircle className="w-6 h-6 mx-auto text-[#2E7D32]" />
                  <h4 className="text-5xs font-bold uppercase">Inquiry Sent!</h4>
                  <p className="text-[9px] text-[#2E7D32]/85">Our coordinator will reach out shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3.5 text-5xs text-left font-sans">
                  <div className="space-y-1">
                    <label className="font-extrabold text-zinc-550 uppercase tracking-wider">Your Name</label>
                    <input 
                      type="text" 
                      required 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-[#D8E2DC] rounded-lg px-2.5 py-1.5 outline-hidden focus:border-[#E07A5F] transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-zinc-550 uppercase tracking-wider">Your Email</label>
                    <input 
                      type="email" 
                      required 
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-[#D8E2DC] rounded-lg px-2.5 py-1.5 outline-hidden focus:border-[#E07A5F] transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-zinc-550 uppercase tracking-wider">Event Date</label>
                    <input 
                      type="date" 
                      required 
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-[#D8E2DC] rounded-lg px-2.5 py-1.5 outline-hidden focus:border-[#E07A5F] transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-zinc-550 uppercase tracking-wider">Event Details / Requests</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-[#FAF6F0] border border-[#D8E2DC] rounded-lg px-2.5 py-1.5 outline-hidden focus:border-[#E07A5F] transition resize-none"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-[#E07A5F] hover:bg-[#c46950] text-[#FAF6F0] font-bold py-2 rounded-lg transition uppercase tracking-wider cursor-pointer"
                  >
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Preset 3: Blog Layout */}
        {page.type === 'blog' && (
          <div className="space-y-8">
            <h2 className="text-xs font-bold text-[#3D405B] uppercase tracking-widest border-b border-[#D8E2DC] pb-2.5">
              Canopy Chronicles
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {page.blogPosts?.map((post, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedPost(post)}
                  className="bg-white border border-[#D8E2DC] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#E07A5F]/40 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="h-40 bg-zinc-100">
                    <img 
                      src={post.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600"} 
                      alt={post.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[9px] text-[#E07A5F] font-extrabold uppercase">
                        <Calendar className="w-3 h-3" />
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>
                      <h4 className="text-4xs font-bold text-[#3D405B] uppercase tracking-wide line-clamp-1">{post.title}</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-3">
                        {post.content}
                      </p>
                    </div>
                    <span className="text-[9px] text-[#81B29A] font-extrabold uppercase tracking-widest flex items-center gap-1.5 group hover:text-[#3D405B] transition">
                      <span>Read Story</span>
                      <ArrowLeft className="w-3 h-3 rotate-180 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {(!page.blogPosts || page.blogPosts.length === 0) && (
              <p className="text-5xs text-zinc-400 italic">No articles published yet.</p>
            )}

            {/* Reading Modal overlay */}
            {selectedPost && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                <div className="bg-[#FAF6F0] rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-200">
                  <div className="h-44 bg-zinc-100 relative shrink-0">
                    <img src={selectedPost.image} alt={selectedPost.title} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setSelectedPost(null)}
                      className="absolute top-3 right-3 bg-zinc-950/70 hover:bg-zinc-950 text-[#FAF6F0] p-1.5 rounded-full shadow-md transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4 text-left flex-1">
                    <div className="flex items-center gap-2 text-[9px] text-[#E07A5F] font-extrabold uppercase">
                      <Calendar className="w-3 h-3" />
                      <span>{selectedPost.date}</span>
                      <span>•</span>
                      <span>{selectedPost.readTime}</span>
                    </div>
                    <h3 className="font-serif text-xs md:text-sm font-bold text-[#3D405B] uppercase leading-snug">{selectedPost.title}</h3>
                    <p className="text-4xs text-zinc-600 leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedPost.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preset 4: Activities Layout */}
        {page.type === 'activities' && (
          <div className="space-y-8">
            <h2 className="text-xs font-bold text-[#3D405B] uppercase tracking-widest border-b border-[#D8E2DC] pb-2.5">
              Scheduled Resort Activities
            </h2>

            <div className="space-y-4">
              {page.activitiesList?.map((activity, i) => (
                <div key={i} className="bg-white border border-[#D8E2DC] p-4 rounded-2xl flex flex-col sm:flex-row gap-4 shadow-xs hover:border-[#81B29A] transition">
                  <div className="w-full sm:w-32 h-24 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-[#D8E2DC]">
                    <img 
                      src={activity.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=300"} 
                      alt={activity.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between text-left space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] text-[#81B29A] font-extrabold uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{activity.time}</span>
                      </div>
                      <h4 className="text-4xs font-bold text-[#3D405B] uppercase">{activity.title}</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!page.activitiesList || page.activitiesList.length === 0) && (
              <p className="text-5xs text-zinc-400 italic">No activities listed.</p>
            )}
          </div>
        )}

        {/* Preset 5: Pool Amenities */}
        {page.type === 'pool' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xs font-bold text-[#3D405B] uppercase tracking-widest border-b border-[#D8E2DC] pb-2.5">
              Clay Infinity Pool Info
            </h2>
            <div className="bg-white border border-[#D8E2DC] p-6 rounded-2xl shadow-xs space-y-4 leading-relaxed text-4xs">
              <p className="text-zinc-600">
                Lined with locally sourced natural organic clay tiles, our temperature-regulated infinity pool blends seamlessly with the valley tree line.
              </p>
              <div className="pt-3 border-t border-zinc-100 space-y-2 text-[#3D405B] font-semibold">
                <h4 className="uppercase font-bold tracking-wide">Operational Guidelines:</h4>
                <ul className="list-disc pl-5 space-y-1.5 font-normal text-zinc-550 text-5xs">
                  <li>Pool Timings: 06:00 AM - 08:00 PM daily.</li>
                  <li>Proper swimwear is mandatory.</li>
                  <li>Glass containers and food are strictly prohibited on the pool deck.</li>
                  <li>Guests must shower before entering the pool.</li>
                  <li>No lifeguard is on duty; children under 12 must have adult supervision.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Preset 6: Blank / Custom HTML Page */}
        {(page.type === 'custom' || !page.type) && (
          <div className="prose max-w-2xl text-4xs text-zinc-600 leading-relaxed font-sans">
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
          </div>
        )}
      </div>
    </div>
  );
};
