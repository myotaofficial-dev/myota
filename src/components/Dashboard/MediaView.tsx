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
          <h2 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isVideoMode ? 'Manage Videos' : 'Manage Photos'}
          </h2>
          <p className="text-sm text-zinc-500">
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
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {syncingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            <span>{syncingGoogle ? 'Syncing...' : 'Sync Google Business'}</span>
          </button>
        )}
      </div>

      {/* Gallery Title Config */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-2">
        <label className="text-xs font-bold text-zinc-700">Gallery Section Title</label>
        <p className="text-[10px] text-zinc-400">The heading shown above the photo gallery on the homepage.</p>
        <input
          type="text"
          value={hotelInfo.galleryTitle || 'Natural Vignettes'}
          onChange={(e) => updateHotelInfo({ galleryTitle: e.target.value })}
          placeholder="e.g. Natural Vignettes"
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 outline-hidden transition"
        />
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs p-5">
        <div className="border-2 border-dashed border-zinc-200 hover:border-blue-400 bg-zinc-50/60 rounded-xl p-8 flex flex-col items-center justify-center text-center transition">
          <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
            {isVideoMode ? <Video className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
          </div>
          <span className="font-semibold text-zinc-700 text-sm mb-0.5">
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
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
            className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
              item.isHero ? 'border-blue-500 ring-2 ring-blue-100' : 'border-zinc-200'
            }`}
          >
            {/* Image / Video Container */}
            <div className="relative aspect-[4/3] bg-zinc-150 overflow-hidden flex items-center justify-center">
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
                <span className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded">
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
                    className="inline-flex items-center bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold capitalize px-2.5 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setAddingTagId(item.id);
                  }}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-800 bg-white border border-zinc-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full cursor-pointer transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tag</span>
                </button>
              </div>

              {/* Action row Divider */}
              <div className="border-t border-zinc-100 pt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isVideoMode) {
                      deleteManagedVideo(item.id);
                    } else {
                      deleteManagedPhoto(item.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-650 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
            {isVideoMode ? <Video className="w-8 h-8 text-zinc-300 mx-auto mb-2" /> : <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />}
            <p className="text-zinc-500 text-xs font-semibold">
              No {isVideoMode ? 'videos' : 'photos'} match the selected tag.
            </p>
          </div>
        )}
      </div>

      {/* Image Labels Modal */}
      {addingTagId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative text-left">
            <button
              onClick={() => setAddingTagId(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-950 font-sans">Image Labels</h3>
            <p className="text-xs text-zinc-500 mt-1 font-sans">
              Search existing labels from the database or create a new one for this image.
            </p>

            <div className="mt-4 space-y-4">
              {/* Selected Tags list with remove buttons */}
              <div className="min-h-[42px] p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap gap-1.5 items-center">
                {(() => {
                  const targetItem = activeItems.find(item => item.id === addingTagId);
                  if (!targetItem) return null;
                  return targetItem.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(addingTagId, tag)}
                        className="hover:text-red-500 cursor-pointer"
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
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">
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
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        {suggestedTag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setAddingTagId(null)}
                className="bg-zinc-950 hover:bg-zinc-850 active:scale-97 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
