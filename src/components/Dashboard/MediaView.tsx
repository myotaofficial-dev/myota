import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Upload, ImageIcon, Trash2, Check, Plus, X, Globe, Video, Play, Loader2 } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';
import { searchPlaces, getPlaceDetails } from '../../services/PlacesService';

export const MediaView: React.FC = () => {
  const { 
    hotelInfo, selectedView,
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
              addManagedPhoto({
                url,
                tags: ['google-business', 'imported'],
                isHero: false
              });
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
      console.error(err);
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncingGoogle(false);
    }
  };

  // Handle manual media additions
  const handleAddMedia = (url: string) => {
    if (!url) return;
    if (isVideoMode) {
      addManagedVideo({
        url,
        tags: ['general'],
        isHero: false
      });
      addEventLog('Media Library Updated', 'Added a new video to the library.', 'info');
    } else {
      addManagedPhoto({
        url,
        tags: ['general'],
        isHero: false
      });
      addEventLog('Media Library Updated', 'Added a new photo to the library.', 'info');
    }
    setNewUrl('');
  };

  // Add tag to media
  const handleAddTag = (id: string) => {
    const tag = tagInputText.trim().toLowerCase();
    if (!tag) return;
    if (isVideoMode) {
      const vid = managedVideos.find(v => v.id === id);
      if (vid && !vid.tags.includes(tag)) {
        updateManagedVideo(id, { tags: [...vid.tags, tag] });
      }
    } else {
      const photo = managedPhotos.find(p => p.id === id);
      if (photo && !photo.tags.includes(tag)) {
        updateManagedPhoto(id, { tags: [...photo.tags, tag] });
      }
    }
    setTagInputText('');
    setAddingTagId(null);
  };

  // Remove tag from media
  const handleRemoveTag = (id: string, tagToRemove: string) => {
    if (isVideoMode) {
      const vid = managedVideos.find(v => v.id === id);
      if (vid) {
        updateManagedVideo(id, { tags: vid.tags.filter(t => t !== tagToRemove) });
      }
    } else {
      const photo = managedPhotos.find(p => p.id === id);
      if (photo) {
        updateManagedPhoto(id, { tags: photo.tags.filter(t => t !== tagToRemove) });
      }
    }
  };

  // Toggle Cover Photo/Video
  const handleToggleCover = (id: string) => {
    if (isVideoMode) {
      const vid = managedVideos.find(v => v.id === id);
      if (!vid) return;
      const newIsHero = !vid.isHero;
      // Disable others if setting this to true
      if (newIsHero) {
        managedVideos.forEach(v => {
          if (v.id !== id && v.isHero) {
            updateManagedVideo(v.id, { isHero: false });
          }
        });
      }
      updateManagedVideo(id, { isHero: newIsHero });
      addEventLog('Hero Video Updated', `${newIsHero ? 'Set' : 'Removed'} video as cover.`, 'info');
    } else {
      const photo = managedPhotos.find(p => p.id === id);
      if (!photo) return;
      const newIsHero = !photo.isHero;
      updateManagedPhoto(id, { isHero: newIsHero });
      addEventLog('Hero Image Updated', `${newIsHero ? 'Set' : 'Removed'} image as cover.`, 'info');
    }
  };

  // Get active items
  const activeItems = isVideoMode ? managedVideos : managedPhotos;

  // Unique tags
  const allTags = Array.from(new Set(activeItems.flatMap(item => item.tags)));

  // Filter items
  const filteredItems = activeFilter === 'all'
    ? activeItems
    : activeItems.filter(item => item.tags.includes(activeFilter));

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
              ? 'Upload your property showcase videos, tag them by topic, and set your cover video background.'
              : 'Upload your property photos, add category tags (room, bathroom, pool, dining), and set hero cover images.'
            }
          </p>
        </div>

        {/* Sync Google Business Button (Only in Photos Mode) */}
        {!isVideoMode && (
          <button
            type="button"
            onClick={handleSyncGoogleBusiness}
            disabled={syncingGoogle}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {syncingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            <span>{syncingGoogle ? 'Syncing...' : 'Sync Google Business'}</span>
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-3xs p-6">
        <div className="border-2 border-dashed border-zinc-200 hover:border-blue-400 bg-[#FAF8FF] rounded-xl p-8 flex flex-col items-center justify-center text-center transition">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            {isVideoMode ? <Video className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
          </div>
          <span className="font-bold text-zinc-800 text-sm">
            {isVideoMode ? 'Upload or select your video clip' : 'Drag & drop your photos here'}
          </span>
          <span className="text-zinc-400 text-4xs font-bold uppercase tracking-widest mt-1">
            {isVideoMode ? 'Supports MP4, WebM formats' : 'High resolution JPEG, PNG or WEBP'}
          </span>
          
          <div className="mt-4 max-w-xs w-full">
            <MediaUpload
              label=""
              value={newUrl}
              onChange={handleAddMedia}
            />
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            activeFilter === 'all'
              ? 'bg-zinc-950 text-white'
              : 'bg-[#FAF8FF] text-zinc-650 hover:bg-zinc-200'
          }`}
        >
          All {isVideoMode ? 'Videos' : 'Photos'} ({activeItems.length})
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
              activeFilter === tag
                ? 'bg-zinc-950 text-white'
                : 'bg-[#FAF8FF] text-zinc-650 hover:bg-zinc-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className={`group bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between ${
              item.isHero ? 'border-blue-500 ring-2 ring-blue-100' : 'border-zinc-200'
            }`}
          >
            {/* Media container */}
            <div className="relative aspect-4/3 w-full bg-zinc-100 overflow-hidden flex items-center justify-center">
              {isVideoMode ? (
                <>
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-85 group-hover:opacity-100 transition">
                    <div className="w-10 h-10 bg-white/95 text-zinc-800 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition cursor-pointer">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <img 
                  src={item.url} 
                  alt="Property asset" 
                  className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                />
              )}
              {item.isHero && (
                <span className="absolute top-3 left-3 bg-blue-600 text-white text-4xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                  {isVideoMode ? 'COVER VIDEO' : 'COVER PHOTO'}
                </span>
              )}
            </div>

            {/* Tags & Actions */}
            <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              {/* Tags Section */}
              <div className="space-y-2">
                <span className="text-4xs font-bold text-zinc-400 uppercase tracking-widest block">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(t => (
                    <span 
                      key={t} 
                      className="bg-zinc-105 text-zinc-700 text-5xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 border border-zinc-200"
                    >
                      {t}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(item.id, t)}
                        className="hover:text-red-650 transition cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  
                  {addingTagId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={tagInputText}
                        onChange={e => setTagInputText(e.target.value)}
                        placeholder="Tag name"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddTag(item.id);
                          if (e.key === 'Escape') setAddingTagId(null);
                        }}
                        className="bg-white border border-zinc-200 px-1.5 py-0.5 text-5xs rounded outline-hidden w-20 font-bold"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleAddTag(item.id)}
                        className="p-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        setAddingTagId(item.id);
                        setTagInputText('');
                      }}
                      className="inline-flex items-center gap-0.5 text-zinc-500 hover:text-zinc-800 bg-[#FAF8FF] border border-zinc-200 text-5xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleToggleCover(item.id)}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    item.isHero
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-[#FAF8FF] border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${item.isHero ? 'text-blue-700' : 'text-zinc-400'}`} />
                  <span>{item.isHero ? (isVideoMode ? 'Cover Video' : 'Cover Photo') : 'Make Cover'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isVideoMode) {
                      deleteManagedVideo(item.id);
                      addEventLog('Media Library Updated', 'Removed video from library.', 'info');
                    } else {
                      deleteManagedPhoto(item.id);
                      addEventLog('Media Library Updated', 'Removed image from library.', 'info');
                    }
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title={isVideoMode ? 'Delete Video' : 'Delete Photo'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
            {isVideoMode ? (
              <Video className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            ) : (
              <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            )}
            <p className="text-zinc-500 text-xs font-semibold">
              No {isVideoMode ? 'videos' : 'photos'} match the selected tag.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
