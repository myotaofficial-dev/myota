import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { CustomPage } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Layout, Link, PlusCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

// ─── Template definitions ───────────────────────────────────────────────────
type TemplateType = 'blog' | 'pool' | 'activities' | 'places' | 'restaurant' | 'banquet' | 'custom';

interface TemplateDef {
  type: TemplateType;
  emoji: string;
  label: string;
  description: string;
  accent: string;
  bg: string;
  defaultTitle: string;
  defaultTagline: string;
  defaultContent: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    type: 'blog',
    emoji: '📰',
    label: 'Blog & Stories',
    description: 'Share behind-the-scenes stories, travel tips, and nature essays from the resort.',
    accent: '#E07A5F',
    bg: '#FEF0ED',
    defaultTitle: 'Stories from the Canopy',
    defaultTagline: 'Moments, musings & mountain tales',
    defaultContent: 'Welcome to our blog where we share the stories, people, and magic that make this place home.'
  },
  {
    type: 'pool',
    emoji: '🏊',
    label: 'Swimming Pool & Spa',
    description: 'Showcase your pool, timings, rules, and amenities with a beautiful visual layout.',
    accent: '#1B93A4',
    bg: '#E6F4F6',
    defaultTitle: 'Infinity Pool & Wellness',
    defaultTagline: 'Unwind. Refresh. Restore.',
    defaultContent: 'Dip into our signature infinity pool overlooking the valley. A sanctuary of stillness above the clouds.'
  },
  {
    type: 'activities',
    emoji: '🧗',
    label: 'Extra Activities',
    description: 'List treks, yoga sessions, bonfires, and other resort experiences with schedules.',
    accent: '#81B29A',
    bg: '#EEF5F1',
    defaultTitle: 'Resort Activities',
    defaultTagline: 'Adventure, wellness & connection',
    defaultContent: 'From sunrise yoga to bonfire evenings — immerse yourself in experiences crafted for the curious soul.'
  },
  {
    type: 'places',
    emoji: '🗺️',
    label: 'Places to Visit',
    description: 'A curated guide to scenic spots, waterfalls, and villages near your resort.',
    accent: '#3D405B',
    bg: '#EEEEF3',
    defaultTitle: 'Explore the Region',
    defaultTagline: 'Hidden gems within reach',
    defaultContent: 'Beyond our doors lies a world of waterfalls, misty peaks, and ancient trails. Let us be your guide.'
  },
  {
    type: 'restaurant',
    emoji: '🍽️',
    label: 'Restaurant & Dining',
    description: 'Present your menu with photos, pricing, and a curated dining experience.',
    accent: '#E07A5F',
    bg: '#FEF0ED',
    defaultTitle: 'Farm-to-Table Dining',
    defaultTagline: 'Flavours rooted in the land',
    defaultContent: 'Every dish on our table tells the story of the soil it came from — fresh, local, and lovingly prepared.'
  },
  {
    type: 'banquet',
    emoji: '🎪',
    label: 'Banquet & Events',
    description: 'Feature your event venue with capacity, features, and an inquiry form.',
    accent: '#9B8EA0',
    bg: '#F3F0F5',
    defaultTitle: 'The Grand Lawn & Banquet',
    defaultTagline: 'Where celebrations come alive',
    defaultContent: 'Host your milestones amidst nature — weddings, corporate retreats, and family celebrations done beautifully.'
  },
];

// ─── Component ───────────────────────────────────────────────────────────────
export const CustomPagesView: React.FC = () => {
  const { customPages, addCustomPage, updateCustomPage, deleteCustomPage } = useHotel();

  // Flow: 'list' | 'pick-template' | 'form'
  const [flow, setFlow] = useState<'list' | 'pick-template' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chosenTemplate, setChosenTemplate] = useState<TemplateDef | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<TemplateType>('custom');
  const [tagline, setTagline] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [content, setContent] = useState('');
  const [active, setActive] = useState(true);

  // Restaurant
  const [menuItems, setMenuItems] = useState<{ name: string; price: number; description: string; photo?: string }[]>([]);
  // Banquet
  const [banquetCapacity, setBanquetCapacity] = useState(150);
  const [banquetFeatures, setBanquetFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  // Blog
  const [blogPosts, setBlogPosts] = useState<{ title: string; date: string; readTime: string; content: string; image?: string }[]>([]);
  // Activities
  const [activitiesList, setActivitiesList] = useState<{ title: string; time: string; description: string; image?: string }[]>([]);
  // Places
  const [placesList, setPlacesList] = useState<{ name: string; distance: string; description: string; image?: string }[]>([]);
  // Pool
  const [poolTimings, setPoolTimings] = useState('06:00 AM – 08:00 PM');
  const [poolFeatures, setPoolFeatures] = useState<string[]>([]);
  const [newPoolFeature, setNewPoolFeature] = useState('');

  // ── Reset form ──────────────────────────────────────────────────────────────
  const resetForm = (tmpl?: TemplateDef) => {
    setTitle(tmpl?.defaultTitle || '');
    setSlug(tmpl ? tmpl.defaultTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
    setType(tmpl?.type || 'custom');
    setTagline(tmpl?.defaultTagline || '');
    setBannerImage('');
    setContent(tmpl?.defaultContent || '');
    setActive(true);
    setMenuItems([]);
    setBanquetCapacity(150);
    setBanquetFeatures([]);
    setBlogPosts([]);
    setActivitiesList([]);
    setPlacesList([]);
    setPoolTimings('06:00 AM – 08:00 PM');
    setPoolFeatures([]);
    setEditingId(null);
  };

  // ── Open edit ───────────────────────────────────────────────────────────────
  const openEditModal = (page: CustomPage) => {
    setTitle(page.title);
    setSlug(page.slug);
    setType((page.type || 'custom') as TemplateType);
    setTagline(page.tagline || '');
    setBannerImage(page.bannerImage || '');
    setContent(page.content);
    setActive(page.active);
    setMenuItems(page.restaurantMenu || []);
    setBanquetCapacity(page.banquetCapacity || 150);
    setBanquetFeatures(page.banquetFeatures || []);
    setBlogPosts(page.blogPosts || []);
    setActivitiesList(page.activitiesList || []);
    setPlacesList(page.placesList || []);
    setPoolTimings(page.poolTimings || '06:00 AM – 08:00 PM');
    setPoolFeatures(page.poolFeatures || []);
    setEditingId(page.id);
    const tmpl = TEMPLATES.find(t => t.type === page.type) || null;
    setChosenTemplate(tmpl);
    setFlow('form');
  };

  // ── Slug auto-gen ───────────────────────────────────────────────────────────
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingId) setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  // ── Restaurant helpers ──────────────────────────────────────────────────────
  const addMenuItemRow = () => setMenuItems(p => [...p, { name: '', price: 0, description: '', photo: '' }]);
  const removeMenuItemRow = (i: number) => setMenuItems(p => p.filter((_, idx) => idx !== i));
  const updateMenuItemRow = (i: number, k: string, v: any) => setMenuItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  // ── Blog helpers ────────────────────────────────────────────────────────────
  const addBlogPostRow = () => setBlogPosts(p => [...p, { title: '', date: new Date().toISOString().split('T')[0], readTime: '5 min read', content: '', image: '' }]);
  const removeBlogPostRow = (i: number) => setBlogPosts(p => p.filter((_, idx) => idx !== i));
  const updateBlogPostRow = (i: number, k: string, v: any) => setBlogPosts(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  // ── Activities helpers ──────────────────────────────────────────────────────
  const addActivityRow = () => setActivitiesList(p => [...p, { title: '', time: '10:00 AM – 12:00 PM', description: '', image: '' }]);
  const removeActivityRow = (i: number) => setActivitiesList(p => p.filter((_, idx) => idx !== i));
  const updateActivityRow = (i: number, k: string, v: any) => setActivitiesList(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  // ── Places helpers ──────────────────────────────────────────────────────────
  const addPlaceRow = () => setPlacesList(p => [...p, { name: '', distance: '', description: '', image: '' }]);
  const removePlaceRow = (i: number) => setPlacesList(p => p.filter((_, idx) => idx !== i));
  const updatePlaceRow = (i: number, k: string, v: any) => setPlacesList(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  // ── Banquet / Pool feature tags ─────────────────────────────────────────────
  const addFeatureTag = () => {
    if (newFeature.trim() && !banquetFeatures.includes(newFeature.trim())) {
      setBanquetFeatures(p => [...p, newFeature.trim()]);
      setNewFeature('');
    }
  };
  const removeFeatureTag = (tag: string) => setBanquetFeatures(p => p.filter(x => x !== tag));

  const addPoolFeatureTag = () => {
    if (newPoolFeature.trim() && !poolFeatures.includes(newPoolFeature.trim())) {
      setPoolFeatures(p => [...p, newPoolFeature.trim()]);
      setNewPoolFeature('');
    }
  };
  const removePoolFeatureTag = (tag: string) => setPoolFeatures(p => p.filter(x => x !== tag));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const data = {
      title,
      slug: cleanSlug,
      content,
      active,
      type,
      tagline,
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200',
      restaurantMenu: menuItems,
      banquetCapacity,
      banquetFeatures,
      blogPosts,
      activitiesList,
      placesList,
      poolTimings,
      poolFeatures,
    };
    if (editingId) {
      updateCustomPage(editingId, data);
    } else {
      addCustomPage(data);
    }
    setFlow('list');
  };

  const templateForType = (t?: string) => TEMPLATES.find(tmpl => tmpl.type === t);

  // ─── RENDER: List ────────────────────────────────────────────────────────────
  if (flow === 'list') {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center justify-between text-left">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Custom Web Pages</h2>
            <p className="text-sm text-[#78716C]">Create beautiful standalone pages from professional templates.</p>
          </div>
          <button
            onClick={() => setFlow('pick-template')}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Page</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {customPages.map(page => {
            const tmpl = templateForType(page.type);
            return (
              <div key={page.id} className="ds-card overflow-hidden flex flex-col">
                {/* mini banner strip */}
                <div
                  className="h-1.5 w-full"
                  style={{ background: tmpl?.accent || '#1B93A4' }}
                />
                <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={{ background: tmpl?.bg || '#E6F4F6', color: tmpl?.accent || '#1B93A4' }}
                      >
                        {tmpl?.emoji || '📄'} {tmpl?.label || page.type || 'custom'}
                      </span>
                      <span className={`h-2 w-2 rounded-full block ${page.active ? 'bg-[#1B93A4]' : 'bg-zinc-300'}`} title={page.active ? 'Active' : 'Draft'} />
                    </div>
                    <h3 className="font-bold text-[#1C1917] text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>{page.title}</h3>
                    {page.tagline && <p className="text-[#78716C] text-xs italic line-clamp-1">{page.tagline}</p>}
                    <p className="text-[#78716C] text-xs line-clamp-2 leading-relaxed">
                      {page.type === 'restaurant' && `${page.restaurantMenu?.length || 0} menu items`}
                      {page.type === 'banquet' && `Capacity: ${page.banquetCapacity || 150} guests`}
                      {page.type === 'blog' && `${page.blogPosts?.length || 0} articles`}
                      {page.type === 'activities' && `${page.activitiesList?.length || 0} activities`}
                      {page.type === 'places' && `${page.placesList?.length || 0} places listed`}
                      {page.type === 'pool' && `Timings: ${page.poolTimings || '—'}`}
                      {(!page.type || page.type === 'custom') && 'Blank / custom HTML layout'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold pt-1">
                      <Link className="w-3.5 h-3.5" />
                      <span>/pages/{page.slug}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(page)}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${page.title}"?`)) deleteCustomPage(page.id);
                      }}
                      className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {customPages.length === 0 && (
            <div className="col-span-full py-16 text-center space-y-4">
              <span className="text-4xl">📄</span>
              <p className="text-sm text-[#A8A29E]">No pages yet. Click <strong>Create Page</strong> to choose a template.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Template Picker ─────────────────────────────────────────────────
  if (flow === 'pick-template') {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFlow('list')}
            className="p-1.5 rounded-lg border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Choose a Template</h2>
            <p className="text-sm text-[#78716C]">Pick a layout that fits what you want to create.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(tmpl => (
            <button
              key={tmpl.type}
              onClick={() => {
                setChosenTemplate(tmpl);
                resetForm(tmpl);
                setFlow('form');
              }}
              className="group relative text-left border border-[#E7E5E4] hover:border-transparent rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 bg-white cursor-pointer"
            >
              {/* accent bar */}
              <div className="h-1 w-full" style={{ background: tmpl.accent }} />
              <div className="p-5 space-y-3">
                {/* emoji badge */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs"
                  style={{ background: tmpl.bg }}
                >
                  {tmpl.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-[#1C1917] text-sm mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>{tmpl.label}</h3>
                  <p className="text-xs text-[#78716C] leading-relaxed">{tmpl.description}</p>
                </div>
                <div
                  className="flex items-center gap-1 text-[11px] font-bold transition"
                  style={{ color: tmpl.accent }}
                >
                  <span>Use this template</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          ))}

          {/* Blank / Custom option */}
          <button
            onClick={() => {
              setChosenTemplate(null);
              resetForm();
              setType('custom');
              setFlow('form');
            }}
            className="group text-left border-2 border-dashed border-[#D8E2DC] hover:border-[#1B93A4] rounded-2xl p-5 transition-all duration-200 bg-white hover:bg-[#F0FAF8] cursor-pointer space-y-3"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-zinc-100">📝</div>
            <div>
              <h3 className="font-bold text-[#1C1917] text-sm mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Blank / Custom</h3>
              <p className="text-xs text-[#78716C] leading-relaxed">Start from scratch with a free-form rich text or HTML editor.</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#1B93A4]">
              <span>Start blank</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: Page Builder Form ───────────────────────────────────────────────
  const tmpl = chosenTemplate;
  const accentColor = tmpl?.accent || '#1B93A4';

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFlow(editingId ? 'list' : 'pick-template')}
          className="p-1.5 rounded-lg border border-[#E7E5E4] hover:bg-[#FAFAF9] text-[#78716C] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          {tmpl && (
            <span className="text-2xl">{tmpl.emoji}</span>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {editingId ? 'Edit Page' : `Create — ${tmpl?.label || 'Custom Page'}`}
            </h2>
            <p className="text-xs text-[#78716C]">Fill in your content and images below.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Banner & Basic Info */}
        <div className="ds-card p-6 space-y-5">
          <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest flex items-center gap-2">
            <Layout className="w-4 h-4" style={{ color: accentColor }} />
            Page Basics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="ds-overline block">Page Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Explore the Hills"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="ds-input w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="ds-overline block">URL Slug *</label>
              <div className="flex items-center gap-1 ds-input px-0 overflow-hidden">
                <span className="px-2.5 text-zinc-400 text-xs border-r border-[#E7E5E4] select-none shrink-0">/pages/</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. explore-hills"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 bg-transparent outline-none px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ds-overline block">Page Tagline / Subtitle</label>
            <input
              type="text"
              placeholder="A short line shown beneath the page title"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="ds-input w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="ds-overline block">Banner / Hero Image</label>
            <MediaUpload label="" value={bannerImage} onChange={setBannerImage} />
          </div>

          <div className="space-y-1.5">
            <label className="ds-overline block">Introduction / Summary</label>
            <textarea
              placeholder="A brief overview shown at the top of the page..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="ds-input w-full resize-none"
            />
          </div>
        </div>

        {/* ── Template-specific sections ── */}

        {/* BLOG */}
        {type === 'blog' && (
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">📰 Blog Articles</h3>
              <button type="button" onClick={addBlogPostRow} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: accentColor }}>
                <PlusCircle className="w-4 h-4" /> Add Article
              </button>
            </div>
            <div className="space-y-3">
              {blogPosts.map((post, idx) => (
                <div key={idx} className="bg-[#FAFAF9] border border-[#E7E5E4] p-4 rounded-xl space-y-3 relative">
                  <button type="button" onClick={() => removeBlogPostRow(idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 transition cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <input type="text" placeholder="Article Title *" required value={post.title} onChange={(e) => updateBlogPostRow(idx, 'title', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={post.date} onChange={(e) => updateBlogPostRow(idx, 'date', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                        <input type="text" placeholder="Read time (e.g. 5 min)" value={post.readTime} onChange={(e) => updateBlogPostRow(idx, 'readTime', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                      </div>
                      <textarea placeholder="Article excerpt / content..." rows={2} required value={post.content} onChange={(e) => updateBlogPostRow(idx, 'content', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full resize-none" />
                    </div>
                    <MediaUpload value={post.image || ''} onChange={(v) => updateBlogPostRow(idx, 'image', v)} className="w-full" />
                  </div>
                </div>
              ))}
              {blogPosts.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-4">No articles yet. Click "Add Article" above.</p>}
            </div>
          </div>
        )}

        {/* POOL */}
        {type === 'pool' && (
          <div className="ds-card p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">🏊 Pool & Spa Details</h3>
            <div className="space-y-1.5">
              <label className="ds-overline block">Pool Timings</label>
              <input type="text" placeholder="e.g. 06:00 AM – 08:00 PM daily" value={poolTimings} onChange={(e) => setPoolTimings(e.target.value)} className="ds-input w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="ds-overline block">Add Feature / Rule</label>
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. Heated pool, Jacuzzi available, No glassware" value={newPoolFeature} onChange={(e) => setNewPoolFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPoolFeatureTag())} className="ds-input flex-1" />
                <button type="button" onClick={addPoolFeatureTag} className="ds-btn-primary px-4 py-1.5">Add</button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {poolFeatures.map(tag => (
                  <span key={tag} className="ds-badge ds-badge-teal flex items-center gap-1.5 font-semibold">
                    {tag}
                    <button type="button" onClick={() => removePoolFeatureTag(tag)} className="text-[#1B93A4] hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITIES */}
        {type === 'activities' && (
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">🧗 Activities Schedule</h3>
              <button type="button" onClick={addActivityRow} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: accentColor }}>
                <PlusCircle className="w-4 h-4" /> Add Activity
              </button>
            </div>
            <div className="space-y-3">
              {activitiesList.map((item, idx) => (
                <div key={idx} className="bg-[#FAFAF9] border border-[#E7E5E4] p-4 rounded-xl space-y-3 relative">
                  <button type="button" onClick={() => removeActivityRow(idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 cursor-pointer"><X className="w-4 h-4" /></button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Activity Name *" required value={item.title} onChange={(e) => updateActivityRow(idx, 'title', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                        <input type="text" placeholder="Timings (e.g. 7AM–9AM)" value={item.time} onChange={(e) => updateActivityRow(idx, 'time', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                      </div>
                      <input type="text" placeholder="Description / details..." required value={item.description} onChange={(e) => updateActivityRow(idx, 'description', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                    </div>
                    <MediaUpload value={item.image || ''} onChange={(v) => updateActivityRow(idx, 'image', v)} className="w-full" />
                  </div>
                </div>
              ))}
              {activitiesList.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-4">No activities yet. Click "Add Activity" above.</p>}
            </div>
          </div>
        )}

        {/* PLACES */}
        {type === 'places' && (
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">🗺️ Nearby Places</h3>
              <button type="button" onClick={addPlaceRow} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: accentColor }}>
                <PlusCircle className="w-4 h-4" /> Add Place
              </button>
            </div>
            <div className="space-y-3">
              {placesList.map((place, idx) => (
                <div key={idx} className="bg-[#FAFAF9] border border-[#E7E5E4] p-4 rounded-xl space-y-3 relative">
                  <button type="button" onClick={() => removePlaceRow(idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 cursor-pointer"><X className="w-4 h-4" /></button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Place Name *" required value={place.name} onChange={(e) => updatePlaceRow(idx, 'name', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                        <input type="text" placeholder="Distance (e.g. 4 km away)" value={place.distance} onChange={(e) => updatePlaceRow(idx, 'distance', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                      </div>
                      <input type="text" placeholder="What makes it special..." required value={place.description} onChange={(e) => updatePlaceRow(idx, 'description', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                    </div>
                    <MediaUpload value={place.image || ''} onChange={(v) => updatePlaceRow(idx, 'image', v)} className="w-full" />
                  </div>
                </div>
              ))}
              {placesList.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-4">No places yet. Click "Add Place" above.</p>}
            </div>
          </div>
        )}

        {/* RESTAURANT */}
        {type === 'restaurant' && (
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">🍽️ Menu Configuration</h3>
              <button type="button" onClick={addMenuItemRow} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer" style={{ color: accentColor }}>
                <PlusCircle className="w-4 h-4" /> Add Dish
              </button>
            </div>
            <div className="space-y-3">
              {menuItems.map((item, idx) => (
                <div key={idx} className="bg-[#FAFAF9] border border-[#E7E5E4] p-4 rounded-xl space-y-3 relative">
                  <button type="button" onClick={() => removeMenuItemRow(idx)} className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 cursor-pointer"><X className="w-4 h-4" /></button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Dish Name *" required value={item.name} onChange={(e) => updateMenuItemRow(idx, 'name', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                        <input type="number" placeholder="Price (₹)" min={0} value={item.price === 0 ? '' : item.price} onChange={(e) => updateMenuItemRow(idx, 'price', e.target.value === '' ? 0 : Number(e.target.value))} className="ds-input bg-white text-xs py-1.5 w-full" />
                      </div>
                      <input type="text" placeholder="Ingredients / short description..." value={item.description} onChange={(e) => updateMenuItemRow(idx, 'description', e.target.value)} className="ds-input bg-white text-xs py-1.5 w-full" />
                    </div>
                    <MediaUpload value={item.photo || ''} onChange={(v) => updateMenuItemRow(idx, 'photo', v)} className="w-full" />
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-4">No menu items yet. Click "Add Dish" above.</p>}
            </div>
          </div>
        )}

        {/* BANQUET */}
        {type === 'banquet' && (
          <div className="ds-card p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">🎪 Banquet Hall Specs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="ds-overline block">Maximum Capacity (guests)</label>
                <input type="number" min={10} value={banquetCapacity === 0 ? '' : banquetCapacity} onChange={(e) => setBanquetCapacity(e.target.value === '' ? 0 : Number(e.target.value))} className="ds-input w-full" />
              </div>
              <div className="space-y-1.5">
                <label className="ds-overline block">Add Hall Feature</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. Central AC, Stage, Valet" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeatureTag())} className="ds-input flex-1" />
                  <button type="button" onClick={addFeatureTag} className="ds-btn-primary px-3 py-1.5">Add</button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {banquetFeatures.map(tag => (
                <span key={tag} className="ds-badge ds-badge-teal flex items-center gap-1.5 font-semibold">
                  {tag}
                  <button type="button" onClick={() => removeFeatureTag(tag)} className="text-[#1B93A4] hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM */}
        {type === 'custom' && (
          <div className="ds-card p-6 space-y-4">
            <h3 className="text-xs font-extrabold text-[#1C1917] uppercase tracking-widest">📝 Custom HTML / Rich Text</h3>
            <textarea
              placeholder="<h2>Your custom content here...</h2>"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="ds-input w-full resize-none font-mono text-xs"
            />
          </div>
        )}

        {/* ── Status + Actions ── */}
        <div className="ds-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-zinc-700">Publish Page</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B93A4]"></div>
            </label>
            <span className="text-xs text-zinc-400">{active ? 'Live on site' : 'Draft (hidden)'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFlow(editingId ? 'list' : 'pick-template')}
              className="px-4 py-2 border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#78716C] text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="ds-btn-primary">
              {editingId ? 'Save Changes' : 'Create Page'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
