import React, { useState, useRef } from 'react';
import { UploadCloud, X, Film, Loader2, AlertCircle } from 'lucide-react';
import { uploadMediaFile } from '../../services/StorageService';

interface MediaUploadProps {
  value: string;
  onChange: (val: string) => void;
  accept?: string; // e.g. "image/*" or "video/*" or "image/*,video/*"
  label?: string;
  className?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  value,
  onChange,
  accept = 'image/*',
  label,
  className = ''
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupError, setPopupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    setError(null);
    setPopupError(null);
    
    // File Size Validation
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 20 * 1024 * 1024 : 3 * 1024 * 1024;
    
    if (file.size > maxSize) {
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = isVideo ? '20MB' : '3MB';
      const msg = `"${file.name}" is ${actualSizeMB}MB, which exceeds the ${limitMB} upload limit. Please compress or resize your file before uploading.`;
      setError(msg);
      setPopupError(msg);
      return;
    }

    setIsLoading(true);

    if (!isVideo) {
      // Compress and resize image using HTML5 Canvas to save storage space & convert to WebP
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200; // Optimal HD resolution boundary

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Export to WebP Blob (Default to compressed WebP at 0.8 quality)
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  // Upload WebP blob directly to Supabase Storage Bucket
                  const publicUrl = await uploadMediaFile(blob, `${file.name.split('.')[0]}.webp`);
                  onChange(publicUrl);
                } catch (err: any) {
                  console.warn('[Storage] WebP upload failed, falling back to base64:', err);
                  // Fallback to offline base64 WebP if upload fails
                  onChange(canvas.toDataURL('image/webp', 0.8));
                }
              } else {
                // Fallback to jpeg base64 if toBlob fails
                onChange(canvas.toDataURL('image/jpeg', 0.75));
              }
              setIsLoading(false);
            }, 'image/webp', 0.8);
          } else {
            // Fallback to original read if canvas fails
            onChange(event.target?.result as string);
            setIsLoading(false);
          }
        };
        img.onerror = () => {
          onChange(event.target?.result as string);
          setIsLoading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // For videos or other file formats, upload directly to Supabase Storage
      const uploadDirect = async () => {
        try {
          const publicUrl = await uploadMediaFile(file, file.name);
          onChange(publicUrl);
        } catch (err) {
          console.warn('[Storage] Video upload failed, loading as local Data URL:', err);
          // Fallback to offline base64 Data URL
          const reader = new FileReader();
          reader.onload = (event) => {
            onChange(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        } finally {
          setIsLoading(false);
        }
      };
      uploadDirect();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const removeMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setError(null);
    setPopupError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isVideo = value.startsWith('data:video/') || value.toLowerCase().endsWith('.mp4') || value.toLowerCase().endsWith('.webm') || value.toLowerCase().endsWith('.mov');

  return (
    <div className={`space-y-2 text-left ${className}`}>
      {label && (
        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {value ? (
        // Preview Frame
        <div className="relative rounded-xl border border-zinc-200 overflow-hidden group aspect-video bg-zinc-950 flex items-center justify-center max-w-md shadow-sm">
          {isVideo ? (
            <video
              src={value}
              className="w-full h-full object-cover"
              controls
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-cover"
            />
          )}

          {/* Remove Overlay Button */}
          <button
            type="button"
            onClick={removeMedia}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-zinc-950/70 hover:bg-rose-600 text-white transition-all shadow-md active:scale-90 cursor-pointer"
            title="Remove Media"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Edit/Change Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 pointer-events-none">
            <button
              type="button"
              onClick={triggerBrowse}
              className="bg-white/90 text-zinc-900 text-3xs font-extrabold uppercase px-3 py-2 rounded-lg shadow-md hover:bg-white active:scale-95 transition pointer-events-auto cursor-pointer"
            >
              Change File
            </button>
          </div>
        </div>
      ) : (
        // Dropzone Area
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerBrowse}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-300 max-w-md select-none ${
            isDragActive
              ? 'border-teal-500 bg-teal-50/40 scale-[0.99]'
              : 'border-zinc-250 hover:border-teal-400 hover:bg-zinc-50/50 bg-zinc-50/20'
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              <span className="text-4xs text-zinc-500 font-extrabold uppercase tracking-widest">Processing file...</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white rounded-full border border-zinc-150 shadow-xs text-zinc-400 group-hover:text-teal-500 transition-colors">
                {accept.includes('video') ? (
                  <Film className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-3xs font-bold text-zinc-700">
                  Drag & drop your file here, or <span className="text-teal-600 hover:text-teal-700 font-extrabold">browse</span>
                </p>
                <p className="text-[9px] text-zinc-450 font-semibold uppercase tracking-wider">
                  Supports {accept.includes('video') ? 'MP4, WebM up to 20MB' : 'PNG, JPG, WebP up to 3MB'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {popupError && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#FAF6F0] rounded-2xl p-6 max-w-sm w-full border border-[#D8E2DC] shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#3D405B] text-sm uppercase tracking-wider font-sans">Upload Error</h3>
              <p className="text-2xs text-[#78716C] leading-relaxed font-sans">{popupError}</p>
            </div>
            <button
              type="button"
              onClick={() => setPopupError(null)}
              className="w-full bg-[#1B93A4] hover:bg-[#157A8A] text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
