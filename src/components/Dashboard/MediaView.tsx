import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Upload, ImageIcon, Trash2, Plus, X, Globe, Video, Play, Loader2 } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';
import { searchPlaces, getPlaceDetails } from '../../services/PlacesService';

export const MediaView: React.FC = () => {
  const { 
    hotelInfo, selectedView, updateHotelInfo,
    managedPhotos, addManagedPhoto, updateManagedPhoto, deleteManagedPhoto,
    managedVideos, addManagedVideo, updateManagedVideo, deleteManagedVideo,
    addEventLog 
  } = useHotel();

  const isVideoMode = selectedView === 'media-videos';

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [newUrl, setNewUrl] = useState('');
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [tagInputText, setTagInputText] = useState('');
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // Sync from Google Business
  const handleSyncGoogleBusiness = async () => {
    try {
      setSyncingGoogle(true);
      const query = `${hotelInfo.name} ${hotelInfo.address}`;
      const candidates = await searchPlaces(query);
      if (candidates.length > 0) {
        if (candidates[0].id.startsWith('osm-')) {
          throw new Error("Your Google Maps API key is restricted or unauthorized. Please ensure 'Places API (New)' and 'Maps Embed API' are enabled for your key in the Google Cloud Console to sync Google Business listings.");
        }
        const details = await getPlaceDetails(candidates[0].id);
        if (details.photos && details.photos.length > 0) {
          let count = 0;
          details.photos.forEach(url => {
            if (!managedPhotos.some(p => p.url === url)) {
              addManagedPhoto({ url, tags: ['google-business', 'imported'], isHero: false });
              count++;
            }
          });
          addEventLog('Google Business Synced', `Imported ${count} photos from Google Place listings.`, 'info');
          alert(`Successfully imported ${count} new photos from Google Business!`);
        } else {
          alert('No photos found in Google Business listing.');
        }
      } else {
        alert('Could not find matching Google Business location. Please verify property name and address.');
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleAddMedia = (url: string) => {
    if (!url) return;
    if (isVideoMode) {
      addManagedVideo({ url, tags: ['general'], isHero: false });
      addEventLog('Media Library Updated', 'Added a new video to the library.', 'info');
    } else {
      addManagedPhoto({ url, tags: ['general'], isHero: false });
      addEventLog('Media Library Updated', 'Added a new photo to the library.', 'info');
    }
    setNewUrl('');
  };

  const handleAddTag = (id: string) => {
    const tag = tagInputText.trim().toLowerCase();
    if (!tag) return;
    if (isVideoMode) {
      const vid = managedVideos.find(v => v.id === id);
      if (vid && !vid.tags.includes(tag)) updateManagedVideo(id, { tags: [...vid.tags, tag] });
    } else {
      const photo = managedPhotos.find(p => p.id === id);
      if (photo && !photo.tags.includes(tag)) updateManagedPhoto(id, { tags: [...photo.tags, tag] });
    }
    setTagInputText('');
    setAddingTagId(null);
  };

  const handleRemoveTag = (id: string, tagToRemove: string) => {
    if (isVideoMode) {
      const vid = managedVideos.find(v => v.id === id);
      if (vid) updateManagedVideo(id, { tags: vid.tags.filter(t => t !== tagToRemove) });
    } else {
      const photo = managedPhotos.find(p => p.id === id);
      if (photo) updateManagedPhoto(id, { tags: photo.tags.filter(t => t !== tagToRemove) });
    }
  };

  const activeItems = isVideoMode ? managedVideos : managedPhotos;
  const allTags = Array.from(new Set(activeItems.flatMap(item => item.tags)));
  const filteredItems = activeFilter === 'all' ? activeItems : activeItems.filter(item => item.tags.includes(activeFilter));

  return (
    <div className="space-y-6 text-left font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isVideoMode ? 'Manage Videos' : 'Manage Photos'}
          </h2>
          <p className="text-sm text-[#78716C]">
            {isVideoMode
              ? 'Upload showcase videos, tag them by topic, and set your cover video.'
              : 'Upload photos, add category tags (rooms, pool, dining…), and set hero images.'}
          </p>
        </div>
        {!isVideoMode && (
          <button
            type="button"
            onClick={handleSyncGoogleBusiness}
            disabled={syncingGoogle}
            className="inline-flex items-center gap-2 bg-[#1B93A4] hover:bg-[#157A8A] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {syncingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            <span>{syncingGoogle ? 'Syncing...' : 'Sync Google Business'}</span>
          </button>
        )}
      </div>

      {/* Gallery Title Config */}
      <div className="ds-card p-5 space-y-2 text-left">
        <label className="ds-overline block">Gallery Section Title</label>
        <p className="text-[10px] text-zinc-400">The heading shown above the photo gallery on the homepage.</p>
        <input
          type="text"
          value={hotelInfo.galleryTitle || 'Natural Vignettes'}
          onChange={(e) => updateHotelInfo({ galleryTitle: e.target.value })}
          placeholder="e.g. Natural Vignettes"
          className="ds-input w-full"
        />
      </div>

      {/* Upload Zone */}
      <div className="ds-card p-5">
        <div className="border-2 border-dashed border-[#E7E5E4] hover:border-[#1B93A4] bg-[#FAFAF9] rounded-xl p-8 flex flex-col items-center justify-center text-center transition">
          <div className="w-11 h-11 bg-[#E6F5F7] text-[#1B93A4] rounded-full flex items-center justify-center mb-3">
            {isVideoMode ? <Video className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
          </div>
          <span className="font-semibold text-[#1C1917] text-sm mb-0.5">
            {isVideoMode ? 'Upload your video clip' : 'Drag & drop your photos here'}
          </span>
          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-medium">
            {isVideoMode ? 'MP4, WebM' : 'JPEG, PNG, WEBP'}
          </span>
          <div className="mt-4 max-w-xs w-full">
            <MediaUpload label="" value={newUrl} onChange={handleAddMedia} />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...allTags]).map(tag => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition capitalize ${
              activeFilter === tag
                ? 'bg-[#1B93A4] text-white'
                : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200'
            }`}
          >
            {tag === 'all' ? `All (${activeItems.length})` : tag}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`ds-card overflow-hidden transition-all duration-205 flex flex-col justify-between ${
              item.isHero ? 'ring-2 ring-[#1B93A4] border-[#1B93A4]' : ''
            }`}
          >
            {/* Image / Video Container */}
            <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden flex items-center justify-center">
              {isVideoMode ? (
                <>
                  <video src={item.url} className="w-full h-full object-cover" preload="metadata" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                </>
              ) : (
                <img src={item.url} alt="Property view" className="w-full h-full object-cover" />
              )}
              {item.isHero && (
                <span className="absolute top-3 left-3 bg-[#1B93A4] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                  COVER
                </span>
              )}
            </div>

            {/* Content & Tag Row */}
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
                {item.tags.map(t => (
                  <span
                    key={t}
                    className="ds-badge ds-badge-teal text-[10px] font-bold capitalize"
                  >
                    {t}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAddingTagId(item.id);
                  }}
                  className="inline-flex items-center gap-1 text-[#78716C] hover:text-[#1C1917] bg-white border border-[#E7E5E4] text-[10px] font-medium px-2.5 py-0.5 rounded-full cursor-pointer transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tag</span>
                </button>
              </div>

              {/* Action row Divider */}
              <div className="border-t border-[#E7E5E4] pt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this media?')) {
                      if (isVideoMode) {
                        deleteManagedVideo(item.id);
                      } else {
                        deleteManagedPhoto(item.id);
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#E76F51] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[#FAFAF9] border border-dashed border-[#E7E5E4] rounded-2xl">
            {isVideoMode ? <Video className="w-8 h-8 text-zinc-300 mx-auto mb-2" /> : <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />}
            <p className="text-zinc-500 text-xs font-semibold">
              No {isVideoMode ? 'videos' : 'photos'} match the selected tag.
            </p>
          </div>
        )}
      </div>

      {/* Image Labels Modal */}
      {addingTagId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E7E5E4] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 relative text-left">
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <h3 className="font-bold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Image Labels</h3>
              <button 
                onClick={() => setAddingTagId(null)} 
                className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#78716C]">
                Search existing labels from the database or create a new one for this image.
              </p>

              {/* Selected Tags list with remove buttons */}
              <div className="min-h-[42px] p-2.5 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl flex flex-wrap gap-1.5 items-center">
                {(() => {
                  const targetItem = activeItems.find(item => item.id === addingTagId);
                  if (!targetItem) return null;
                  return targetItem.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-[#E6F5F7] border border-[#1B93A4]/35 text-[#1B93A4] text-xs font-bold px-2 py-0.5 rounded-full"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(addingTagId, tag)}
                        className="hover:text-[#E76F51] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ));
                })()}
                <input
                  type="text"
                  placeholder="Type tag name..."
                  value={tagInputText}
                  onChange={e => setTagInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddTag(addingTagId);
                    }
                  }}
                  className="bg-transparent border-0 p-0 text-xs text-zinc-800 focus:ring-0 outline-hidden flex-1 min-w-[80px]"
                />
              </div>

              {/* Pre-made standard categories list */}
              <div>
                <span className="ds-overline block mb-2">
                  Suggested Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {['room', 'bath', 'pool', 'restaurant', 'amenities', 'games'].map(suggestedTag => {
                    const targetItem = activeItems.find(item => item.id === addingTagId);
                    const isSelected = targetItem?.tags.includes(suggestedTag);
                    return (
                      <button
                        key={suggestedTag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemoveTag(addingTagId, suggestedTag);
                          } else {
                            if (isVideoMode) {
                              updateManagedVideo(addingTagId, {
                                tags: [...(targetItem?.tags || []), suggestedTag],
                              });
                            } else {
                              updateManagedPhoto(addingTagId, {
                                tags: [...(targetItem?.tags || []), suggestedTag],
                              });
                            }
                          }
                        }}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#1B93A4] border-[#1B93A4] text-white font-bold'
                            : 'bg-zinc-50 hover:bg-zinc-100 border-[#E7E5E4] text-[#78716C]'
                        }`}
                      >
                        {suggestedTag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E7E5E4] flex justify-end">
                <button
                  type="button"
                  onClick={() => setAddingTagId(null)}
                  className="ds-btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
