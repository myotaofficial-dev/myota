import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import type { CustomPage } from '../../context/HotelContext';
import { Plus, Edit2, Trash2, X, Layout, FileText, ArrowRight, Save, Image, Link, Check, PlusCircle } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

export const CustomPagesView: React.FC = () => {
  const { customPages, addCustomPage, updateCustomPage, deleteCustomPage } = useHotel();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'blog' | 'restaurant' | 'pool' | 'banquet' | 'activities' | 'custom'>('custom');
  const [tagline, setTagline] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [content, setContent] = useState('');
  const [active, setActive] = useState(true);

  // Preset state variables
  // Restaurant Menu
  const [menuItems, setMenuItems] = useState<{ name: string; price: number; description: string; photo?: string }[]>([]);
  // Banquet features
  const [banquetCapacity, setBanquetCapacity] = useState(150);
  const [banquetFeatures, setBanquetFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  // Blog Posts
  const [blogPosts, setBlogPosts] = useState<{ title: string; date: string; readTime: string; content: string; image?: string }[]>([]);
  // Activities list
  const [activitiesList, setActivitiesList] = useState<{ title: string; time: string; description: string; image?: string }[]>([]);

  const openAddModal = () => {
    setTitle('');
    setSlug('');
    setType('custom');
    setTagline('');
    setBannerImage('');
    setContent('');
    setActive(true);
    setMenuItems([]);
    setBanquetCapacity(150);
    setBanquetFeatures([]);
    setBlogPosts([]);
    setActivitiesList([]);
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditModal = (page: CustomPage) => {
    setTitle(page.title);
    setSlug(page.slug);
    setType(page.type || 'custom');
    setTagline(page.tagline || '');
    setBannerImage(page.bannerImage || '');
    setContent(page.content);
    setActive(page.active);
    setMenuItems(page.restaurantMenu || []);
    setBanquetCapacity(page.banquetCapacity || 150);
    setBanquetFeatures(page.banquetFeatures || []);
    setBlogPosts(page.blogPosts || []);
    setActivitiesList(page.activitiesList || []);
    setEditingId(page.id);
    setIsEditing(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const addMenuItemRow = () => {
    setMenuItems(prev => [...prev, { name: '', price: 10, description: '', photo: '' }]);
  };

  const removeMenuItemRow = (index: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateMenuItemRow = (index: number, key: string, val: any) => {
    setMenuItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  const addBlogPostRow = () => {
    setBlogPosts(prev => [...prev, { title: '', date: new Date().toISOString().split('T')[0], readTime: '5 min read', content: '', image: '' }]);
  };

  const removeBlogPostRow = (index: number) => {
    setBlogPosts(prev => prev.filter((_, i) => i !== index));
  };

  const updateBlogPostRow = (index: number, key: string, val: any) => {
    setBlogPosts(prev => prev.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  const addActivityRow = () => {
    setActivitiesList(prev => [...prev, { title: '', time: '10:00 AM - 12:00 PM', description: '', image: '' }]);
  };

  const removeActivityRow = (index: number) => {
    setActivitiesList(prev => prev.filter((_, i) => i !== index));
  };

  const updateActivityRow = (index: number, key: string, val: any) => {
    setActivitiesList(prev => prev.map((item, i) => i === index ? { ...item, [key]: val } : item));
  };

  const addFeatureTag = () => {
    if (newFeature.trim() && !banquetFeatures.includes(newFeature.trim())) {
      setBanquetFeatures(prev => [...prev, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeatureTag = (tag: string) => {
    setBanquetFeatures(prev => prev.filter(x => x !== tag));
  };

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
      activitiesList
    };

    if (editingId) {
      updateCustomPage(editingId, data);
    } else {
      addCustomPage(data);
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Custom Web Pages</h2>
          <p className="text-sm text-zinc-500">Create standalone pages (like blogs, restaurant menu tables, or banquet layouts) that attach to your menu bar.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-955 font-semibold px-4 py-2 rounded-lg text-sm shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Page</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customPages.map(page => (
          <div key={page.id} className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {page.type || 'custom'}
                </span>
                <span className={`h-2.5 w-2.5 rounded-full block ${page.active ? 'bg-emerald-500' : 'bg-zinc-300'}`} title={page.active ? 'Active' : 'Draft'}></span>
              </div>
              <h3 className="font-bold text-zinc-900 text-base">{page.title}</h3>
              <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">
                {page.type === 'restaurant' && `Restaurant layout with ${page.restaurantMenu?.length || 0} menu items.`}
                {page.type === 'banquet' && `Banquet Hall layout supporting up to ${page.banquetCapacity || 150} guests.`}
                {page.type === 'blog' && `Blog layout with ${page.blogPosts?.length || 0} articles published.`}
                {page.type === 'activities' && `Activities list layout with ${page.activitiesList?.length || 0} scheduled events.`}
                {(!page.type || page.type === 'custom') && 'Blank page layout loaded with custom description details.'}
              </p>
              
              {/* Slug link info */}
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-semibold pt-1">
                <Link className="w-3.5 h-3.5" />
                <span>/pages/{page.slug}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button
                onClick={() => openEditModal(page)}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete the custom page "${page.title}"?`)) {
                    deleteCustomPage(page.id);
                  }
                }}
                className="p-1.5 rounded-lg border border-zinc-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {customPages.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-400 text-xs">
            No custom pages configured. Click "Create Page" to get started.
          </div>
        )}
      </div>

      {/* Page Builder Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm">
                <Layout className="w-5 h-5 text-amber-500" />
                <span>{editingId ? 'Edit Custom Page' : 'Create Custom Page'}</span>
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1 rounded-lg hover:bg-zinc-200 text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-left">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Page Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Activity Center"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. activities"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-zinc-900 outline-hidden transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Layout Preset Type</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-hidden focus:border-amber-500 transition"
                  >
                    <option value="custom">Blank Layout (Rich Text / HTML)</option>
                    <option value="restaurant">Restaurant Menu Layout</option>
                    <option value="banquet">Banquet / Marriage Hall Layout</option>
                    <option value="blog">Blog Articles Layout</option>
                    <option value="activities">Activities List Layout</option>
                    <option value="pool">Pool Amenities Layout</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <MediaUpload
                    label="Banner Image"
                    value={bannerImage}
                    onChange={setBannerImage}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Page Tagline / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Fine dining overlooking the hills"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-zinc-900 outline-hidden transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Page Description / Summary</label>
                <textarea
                  placeholder="Introduce the page content to visitors..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-3.5 py-2 text-sm text-zinc-900 outline-hidden transition resize-none"
                />
              </div>

              {/* Dynamic Preset Forms */}
              {type === 'restaurant' && (
                <div className="space-y-4 pt-4 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-zinc-800 uppercase tracking-wider text-[10px]">Restaurant Menu Configuration</h4>
                    <button
                      type="button"
                      onClick={addMenuItemRow}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold tracking-wide cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Dish</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuItems.map((item, idx) => (
                      <div key={idx} className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeMenuItemRow(idx)}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Dish Name"
                                required
                                value={item.name}
                                onChange={(e) => updateMenuItemRow(idx, 'name', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                              <input
                                type="number"
                                placeholder="Price"
                                required
                                min={0}
                                value={item.price}
                                onChange={(e) => updateMenuItemRow(idx, 'price', Number(e.target.value))}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Short ingredients description..."
                              value={item.description}
                              onChange={(e) => updateMenuItemRow(idx, 'description', e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden text-xs"
                            />
                          </div>
                          <div>
                            <MediaUpload
                              value={item.photo || ''}
                              onChange={(val) => updateMenuItemRow(idx, 'photo', val)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === 'banquet' && (
                <div className="space-y-4 pt-4 border-t border-zinc-200">
                  <h4 className="font-extrabold text-zinc-800 uppercase tracking-wider text-[10px]">Banquet Hall Specifications</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-550">Maximum Guest Capacity</label>
                      <input
                        type="number"
                        min={10}
                        value={banquetCapacity}
                        onChange={(e) => setBanquetCapacity(Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-zinc-550">Add Hall Feature / Amenity</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Central Air Conditioning"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeatureTag())}
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={addFeatureTag}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {banquetFeatures.map(tag => (
                      <span key={tag} className="bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-md px-2.5 py-1 flex items-center gap-1.5 font-semibold">
                        <span>{tag}</span>
                        <button type="button" onClick={() => removeFeatureTag(tag)} className="text-zinc-400 hover:text-rose-500 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {type === 'blog' && (
                <div className="space-y-4 pt-4 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-zinc-800 uppercase tracking-wider text-[10px]">Blog Articles Manager</h4>
                    <button
                      type="button"
                      onClick={addBlogPostRow}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold tracking-wide cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Write Article</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {blogPosts.map((post, idx) => (
                      <div key={idx} className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeBlogPostRow(idx)}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-2">
                            <input
                              type="text"
                              placeholder="Article Title"
                              required
                              value={post.title}
                              onChange={(e) => updateBlogPostRow(idx, 'title', e.target.value)}
                              className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={post.date}
                                onChange={(e) => updateBlogPostRow(idx, 'date', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Read Time (e.g. 5 min read)"
                                value={post.readTime}
                                onChange={(e) => updateBlogPostRow(idx, 'readTime', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                            </div>
                            <textarea
                              placeholder="Article content / description writeup..."
                              rows={2}
                              required
                              value={post.content}
                              onChange={(e) => updateBlogPostRow(idx, 'content', e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden resize-none text-xs"
                            />
                          </div>
                          <div>
                            <MediaUpload
                              value={post.image || ''}
                              onChange={(val) => updateBlogPostRow(idx, 'image', val)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === 'activities' && (
                <div className="space-y-4 pt-4 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-zinc-800 uppercase tracking-wider text-[10px]">Activities Schedule</h4>
                    <button
                      type="button"
                      onClick={addActivityRow}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold tracking-wide cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activitiesList.map((activity, idx) => (
                      <div key={idx} className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-lg space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => removeActivityRow(idx)}
                          className="absolute top-2 right-2 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Activity Title"
                                required
                                value={activity.title}
                                onChange={(e) => updateActivityRow(idx, 'title', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Schedule / Timings"
                                value={activity.time}
                                onChange={(e) => updateActivityRow(idx, 'time', e.target.value)}
                                className="bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden w-full text-xs"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Activity details/description..."
                              required
                              value={activity.description}
                              onChange={(e) => updateActivityRow(idx, 'description', e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1.5 outline-hidden text-xs"
                            />
                          </div>
                          <div>
                            <MediaUpload
                              value={activity.image || ''}
                              onChange={(val) => updateActivityRow(idx, 'image', val)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
                <span className="font-bold text-zinc-700">Publish Page Draft</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-sm font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 text-sm font-bold rounded-lg shadow-md transition"
                >
                  {editingId ? 'Save Changes' : 'Build Custom Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
