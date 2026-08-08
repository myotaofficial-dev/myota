import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Upload, ImageIcon, Trash2, Plus, X, Globe, Video, Play, Loader2, Search, MapPin, AlertCircle } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';
import { searchPlaces, getPlaceDetails, type PlaceCandidate } from '../../services/PlacesService';
import { uploadMediaFile } from '../../services/StorageService';

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
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Search Google Business modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceCandidate[]>([]);
  const [searchError, setSearchError] = useState('');

  const handleSearchGoogle = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchPlaces(searchQuery.trim());
      if (results.length === 0) {
        setSearchError('No businesses found. Try including city or location details.');
      } else {
        setSearchResults(results);
      }
    } catch (e: any) {
      setSearchError(e?.message || 'Search failed. Please check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBusinessCandidate = (candidate: PlaceCandidate) => {
    updateHotelInfo({ googleBusinessName: candidate.displayName });
    addEventLog('Google Business ID Updated', `Set Google Business ID/Name to "${candidate.displayName}".`, 'info');
    setShowSearchModal(false);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Sync from Google Business (with WebP conversion & Supabase Storage upload)
  const handleSyncGoogleBusiness = async () => {
    try {
      setSyncingGoogle(true);
      setSyncStatus('Searching Google Business details...');

      const query = hotelInfo.googleBusinessName && hotelInfo.googleBusinessName.trim()
        ? hotelInfo.googleBusinessName
        : `${hotelInfo.name} ${hotelInfo.address}`;
      const candidates = await searchPlaces(query);
      if (candidates.length > 0) {
        if (candidates[0].id.startsWith('osm-')) {
          throw new Error("Your Google Maps API key is restricted or unauthorized. Please ensure 'Places API (New)' and 'Maps Embed API' are enabled for your key in the Google Cloud Console to sync Google Business listings.");
        }

        setSyncStatus('Fetching photos from Google Places...');
        const details = await getPlaceDetails(candidates[0].id);
        
        if (details.photos && details.photos.length > 0) {
          let count = 0;
          const newPhotoUrls: string[] = [];
          const totalPhotos = details.photos.length;

          for (let i = 0; i < totalPhotos; i++) {
            const rawUrl = details.photos[i];
            setSyncStatus(`Downloading & uploading photo ${i + 1} of ${totalPhotos} to Supabase Storage...`);

            let publicStorageUrl = rawUrl;

            try {
              const response = await fetch(rawUrl);
              const blob = await response.blob();

              const webpUrl = await new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const maxDim = 1200;

                  if (width > maxDim || height > maxDim) {
                    if (width > height) {
                      height = Math.round((height * maxDim) / width);
                      width = maxDim;
                    } else {
                      width = Math.round((width * maxDim) / height);
                      height = maxDim;
                    }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(async (webpBlob) => {
                      if (webpBlob) {
                        try {
                          const pubUrl = await uploadMediaFile(webpBlob, `google_sync_${Date.now()}_${i + 1}.webp`);
                          resolve(pubUrl);
                        } catch (uploadErr) {
                          reject(uploadErr);
                        }
                      } else {
                        reject(new Error('Canvas blob conversion failed'));
                      }
                    }, 'image/webp', 0.8);
                  } else {
                    reject(new Error('Canvas context failed'));
                  }
                };
                img.onerror = () => reject(new Error('Image failed to load'));
                img.src = URL.createObjectURL(blob);
              });

              publicStorageUrl = webpUrl;
            } catch (err) {
              console.warn(`[Google Sync] Photo ${i + 1} fallback to original URL:`, err);
            }

            if (!managedPhotos.some(p => p.url === publicStorageUrl)) {
              addManagedPhoto({ url: publicStorageUrl, tags: ['google-business', 'imported'], isHero: true });
              newPhotoUrls.push(publicStorageUrl);
              count++;
            }
          }

          // Sync imported photos into heroImages so frontend displays them immediately
          if (newPhotoUrls.length > 0) {
            const combinedHeroImages = Array.from(new Set([...newPhotoUrls, ...(hotelInfo.heroImages || [])]));
            updateHotelInfo({ 
              heroImages: combinedHeroImages,
              googleBusinessName: details.name || hotelInfo.googleBusinessName
            });
          }

          addEventLog('Google Business Synced', `Imported ${count} photos to Supabase Storage from Google Business ("${details.name}").`, 'info');
          alert(`Successfully imported ${count} new photos into Supabase Storage media bucket for "${details.name}"!`);
        } else {
          alert(`No photos found in Google Business listing for "${candidates[0].displayName}".`);
        }
      } else {
        alert('Could not find matching Google Business location. Please verify property name and address in settings.');
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setSyncingGoogle(false);
      setSyncStatus(null);
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

      {/* Google Business ID & Search Config */}
      <div className="ds-card p-5 space-y-3 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="ds-overline block">Google My Business ID / Name</label>
            <p className="text-[10px] text-zinc-400">
              Your property's Google Business Name or ID used to fetch listing details and photos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowSearchModal(true);
              setSearchQuery(hotelInfo.googleBusinessName || hotelInfo.name || '');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B93A4] hover:text-[#157A8A] bg-[#EFF9FA] hover:bg-[#E6F5F7] px-3 py-1.5 rounded-lg transition cursor-pointer border border-[#1B93A4]/20 self-start sm:self-auto shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find on Google</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={hotelInfo.googleBusinessName || ''}
            onChange={(e) => updateHotelInfo({ googleBusinessName: e.target.value })}
            placeholder="e.g. TGI Star Holiday Resort, Yercaud"
            className="ds-input w-full"
          />
        </div>
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

      {/* Google Business Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E7E5E4] overflow-hidden flex flex-col relative text-left">
            <div className="p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FAFAF9]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <h3 className="font-bold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Search Google Business
                </h3>
              </div>
              <button 
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchResults([]);
                  setSearchError('');
                }} 
                className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E] hover:text-[#1C1917] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#78716C]">
                Search Google Places to find your exact Google Business listing name and ID.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchGoogle()}
                  placeholder="e.g. TGI Star Holiday Resort Yercaud"
                  className="ds-input flex-1"
                />
                <button
                  type="button"
                  onClick={handleSearchGoogle}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#1C1917] hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>{searching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>

              {searchError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {searchError}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-[#E7E5E4] overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectBusinessCandidate(r)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#EFF9FA] transition cursor-pointer ${i > 0 ? 'border-t border-[#F5F5F4]' : ''}`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#1B93A4' }} />
                      <div>
                        <div className="font-semibold text-xs text-[#1C1917]">{r.displayName}</div>
                        <div className="text-[11px] text-[#78716C] mt-0.5">{r.formattedAddress}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#E7E5E4] bg-[#FAFAF9] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchResults([]);
                  setSearchError('');
                }}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Ingestion Overlay */}
      {syncStatus && (
        <div className="fixed inset-0 bg-[#1C1917]/80 backdrop-blur-xs z-[9999] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full flex flex-col items-center shadow-2xl">
            <Loader2 className="w-8 h-8 text-[#1B93A4] animate-spin mb-4" />
            <h4 className="font-bold text-sm text-zinc-100 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Syncing Google Business Photos
            </h4>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              {syncStatus}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
