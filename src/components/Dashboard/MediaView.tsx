import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Upload, ImageIcon, Trash2, Check, Plus, X } from 'lucide-react';
import { MediaUpload } from '../ui/MediaUpload';

export const MediaView: React.FC = () => {
  const { 
    managedPhotos, addManagedPhoto, updateManagedPhoto, deleteManagedPhoto, 
    addEventLog 
  } = useHotel();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoTag, setNewPhotoTag] = useState('');
  const [addingTagPhotoId, setAddingTagPhotoId] = useState<string | null>(null);
  const [tagInputText, setTagInputText] = useState('');

  // Handle new photo addition from file upload / url
  const handleAddPhoto = (url: string) => {
    if (!url) return;
    addManagedPhoto({
      url,
      tags: ['general'],
      isHero: false
    });
    addEventLog('Media Library Updated', 'Added a new photo to the library.', 'info');
    setNewPhotoUrl('');
  };

  // Add tag to an existing photo
  const handleAddTag = (photoId: string) => {
    const tag = tagInputText.trim().toLowerCase();
    if (!tag) return;
    const photo = managedPhotos.find(p => p.id === photoId);
    if (photo && !photo.tags.includes(tag)) {
      updateManagedPhoto(photoId, {
        tags: [...photo.tags, tag]
      });
    }
    setTagInputText('');
    setAddingTagPhotoId(null);
  };

  // Remove tag from a photo
  const handleRemoveTag = (photoId: string, tagToRemove: string) => {
    const photo = managedPhotos.find(p => p.id === photoId);
    if (photo) {
      updateManagedPhoto(photoId, {
        tags: photo.tags.filter(t => t !== tagToRemove)
      });
    }
  };

  // Set / Toggle a photo as cover photo
  const handleToggleCover = (photoId: string) => {
    const photo = managedPhotos.find(p => p.id === photoId);
    if (!photo) return;
    
    // Toggle state: if it is already cover, toggle off. Otherwise toggle on.
    const newIsHero = !photo.isHero;
    updateManagedPhoto(photoId, { isHero: newIsHero });
    
    addEventLog('Hero Image Updated', `${photo.isHero ? 'Removed' : 'Set'} image as cover photo.`, 'info');
  };

  // Get all unique tags across all photos for filtering
  const allTags = Array.from(
    new Set(managedPhotos.flatMap(p => p.tags))
  );

  // Filter photos
  const filteredPhotos = activeFilter === 'all'
    ? managedPhotos
    : managedPhotos.filter(p => p.tags.includes(activeFilter));

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Manage Photos</h2>
        <p className="text-sm text-zinc-500">Upload your property photos, add category tags (room, bathroom, pool, dining), and set hero cover images.</p>
      </div>

      {/* Drag & Drop / Upload Zone (Image 4 Style) */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-3xs p-6">
        <div className="border-2 border-dashed border-zinc-200 hover:border-blue-400 bg-zinc-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <span className="font-bold text-zinc-800 text-sm">Drag & drop your photos here</span>
          <span className="text-zinc-400 text-4xs font-bold uppercase tracking-widest mt-1">High resolution JPEG, PNG or WEBP</span>
          
          <div className="mt-4 max-w-xs w-full">
            <MediaUpload
              label=""
              value={newPhotoUrl}
              onChange={handleAddPhoto}
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
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          All Photos ({managedPhotos.length})
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
              activeFilter === tag
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Grid of Photo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPhotos.map(photo => (
          <div 
            key={photo.id} 
            className={`group bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between ${
              photo.isHero ? 'border-blue-500 ring-2 ring-blue-100' : 'border-zinc-200'
            }`}
          >
            {/* Image container */}
            <div className="relative aspect-4/3 w-full bg-zinc-100 overflow-hidden">
              <img 
                src={photo.url} 
                alt="Property asset" 
                className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
              />
              {photo.isHero && (
                <span className="absolute top-3 left-3 bg-blue-600 text-white text-4xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                  COVER PHOTO
                </span>
              )}
            </div>

            {/* Content area: Tags & Actions */}
            <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              {/* Tags Section */}
              <div className="space-y-2">
                <span className="text-4xs font-bold text-zinc-400 uppercase tracking-widest block">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {photo.tags.map(t => (
                    <span 
                      key={t} 
                      className="bg-zinc-100 text-zinc-700 text-5xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 border border-zinc-200"
                    >
                      {t}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(photo.id, t)}
                        className="hover:text-red-600 transition"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  
                  {/* Add Tag Action button / Input */}
                  {addingTagPhotoId === photo.id ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={tagInputText}
                        onChange={e => setTagInputText(e.target.value)}
                        placeholder="Tag name"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddTag(photo.id);
                          if (e.key === 'Escape') setAddingTagPhotoId(null);
                        }}
                        className="bg-white border border-zinc-200 px-1.5 py-0.5 text-5xs rounded outline-hidden w-20 font-bold"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleAddTag(photo.id)}
                        className="p-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        setAddingTagPhotoId(photo.id);
                        setTagInputText('');
                      }}
                      className="inline-flex items-center gap-0.5 text-zinc-500 hover:text-zinc-800 bg-zinc-50 border border-zinc-200 text-5xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleToggleCover(photo.id)}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition ${
                    photo.isHero
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${photo.isHero ? 'text-blue-700' : 'text-zinc-400'}`} />
                  <span>{photo.isHero ? 'Cover Photo' : 'Make Cover'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    deleteManagedPhoto(photo.id);
                    addEventLog('Media Library Updated', 'Removed image from library.', 'info');
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
            <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-500 text-xs font-semibold">No photos match the selected tag.</p>
          </div>
        )}
      </div>
    </div>
  );
};
