import React, { useState, useRef } from 'react';
import { UploadCloud, X, Film, Loader2, AlertCircle, Crop, Check, ZoomIn, ZoomOut, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadMediaFile } from '../../services/StorageService';
import { useHotel } from '../../context/HotelContext';

type ManagedPhoto = { id: string; url: string; tags: string[]; isHero: boolean };

interface MediaUploadProps {
  value: string;
  onChange: (val: string) => void;
  accept?: string; // e.g. "image/*" or "video/*" or "image/*,video/*"
  label?: string;
  className?: string;
  aspectRatio?: 'free' | '1:1' | '16:9' | '3:1';
}

// Inner component that safely calls useHotel() at the top level
const MediaUploadInner: React.FC<MediaUploadProps & { managedPhotos: ManagedPhoto[] }> = ({
  value,
  onChange,
  accept = 'image/*',
  label,
  className = '',
  aspectRatio = 'free',
  managedPhotos
}) => {

  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Crop Modal states
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>('image.webp');
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '16:9' | '3:1'>(aspectRatio);
  const cropImageRef = useRef<HTMLImageElement>(null);

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

    if (!isVideo) {
      // Open Crop modal for images
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropSrc(event.target?.result as string);
        setCropFileName(file.name.split('.')[0] + '.webp');
        setCropZoom(1);
      };
      reader.readAsDataURL(file);
    } else {
      // Direct video upload to Supabase Storage
      setIsLoading(true);
      const uploadDirect = async () => {
        try {
          const publicUrl = await uploadMediaFile(file, file.name);
          onChange(publicUrl);
        } catch (err) {
          console.warn('[Storage] Video upload failed, loading as local Data URL:', err);
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

  const handleApplyCrop = async () => {
    if (!cropSrc) return;
    setIsLoading(true);
    const srcToCrop = cropSrc;
    setCropSrc(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let targetW = img.width;
      let targetH = img.height;

      if (cropAspect === '1:1') {
        const side = Math.min(img.width, img.height);
        targetW = side;
        targetH = side;
      } else if (cropAspect === '3:1') {
        targetH = Math.round(img.width / 3);
        if (targetH > img.height) {
          targetH = img.height;
          targetW = img.height * 3;
        }
      } else if (cropAspect === '16:9') {
        targetH = Math.round((img.width * 9) / 16);
        if (targetH > img.height) {
          targetH = img.height;
          targetW = Math.round((img.height * 16) / 9);
        }
      }

      // Max resolution boundary
      const maxDim = 1200;
      let finalW = targetW;
      let finalH = targetH;
      if (finalW > maxDim || finalH > maxDim) {
        if (finalW > finalH) {
          finalH = Math.round((finalH * maxDim) / finalW);
          finalW = maxDim;
        } else {
          finalW = Math.round((finalW * maxDim) / finalH);
          finalH = maxDim;
        }
      }

      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalW, finalH);

        const cropX = Math.max(0, (img.width - targetW) / 2);
        const cropY = Math.max(0, (img.height - targetH) / 2);

        // Draw cropped and scaled image onto canvas
        ctx.drawImage(img, cropX, cropY, targetW, targetH, 0, 0, finalW, finalH);

        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              const publicUrl = await uploadMediaFile(blob, cropFileName);
              onChange(publicUrl);
            } catch (err) {
              console.warn('[Storage] WebP cropped upload failed, falling back to base64:', err);
              onChange(canvas.toDataURL('image/webp', 0.85));
            }
          } else {
            onChange(canvas.toDataURL('image/jpeg', 0.8));
          }
          setIsLoading(false);
        }, 'image/webp', 0.85);
      } else {
        onChange(srcToCrop);
        setIsLoading(false);
      }
    };
    img.onerror = () => {
      onChange(srcToCrop);
      setIsLoading(false);
    };
    img.src = srcToCrop;
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
    if (accept.includes('video') || managedPhotos.length === 0) {
      fileInputRef.current?.click();
    } else {
      setShowPickerModal(true);
    }
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
        // Single Clean Preview Frame
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
              className="w-full h-full object-contain bg-zinc-100"
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

          {/* Change Overlay */}
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
              <span className="text-4xs text-zinc-500 font-extrabold uppercase tracking-widest">Saving to Supabase...</span>
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
                <p className="text-[9px] text-zinc-455 font-semibold uppercase tracking-wider">
                  Supports {accept.includes('video') ? 'MP4, WebM up to 20MB' : 'PNG, JPG, WebP up to 3MB'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Media Library Selection Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh] text-left">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-900 text-sm uppercase tracking-wider">
                  Select Photo
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Choose an existing photo from your Photos Library or upload a new image file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPickerModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Managed Photos */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Photos Library ({managedPhotos.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPickerModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B93A4] hover:text-[#157A8A] bg-[#EFF9FA] hover:bg-[#E6F5F7] px-3 py-1.5 rounded-lg border border-[#1B93A4]/20 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New File</span>
                </button>
              </div>

              {managedPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
                  {managedPhotos.map((photo) => {
                    const isSelected = value === photo.url;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          onChange(photo.url);
                          setShowPickerModal(false);
                        }}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                          isSelected ? 'border-[#1B93A4] ring-2 ring-[#1B93A4]/30 shadow-md' : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <img src={photo.url} alt="Photo option" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#1B93A4] text-white p-1 rounded-full shadow-md">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {photo.isHero && (
                          <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded">
                            HERO
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold bg-[#1B93A4] px-2.5 py-1 rounded-md shadow-md">
                            {isSelected ? 'Selected' : 'Use Photo'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl space-y-2">
                  <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-500 font-semibold">No photos found in your media library.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickerModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B93A4] hover:underline"
                  >
                    Upload a new photo from your device
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowPickerModal(false);
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from Computer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPickerModal(false)}
                className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-zinc-800 text-sm uppercase tracking-wider">Crop & Scale Image</h3>
              </div>
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Preview Area */}
            <div className="relative overflow-hidden bg-zinc-950 rounded-xl aspect-video flex items-center justify-center p-2 border border-zinc-800">
              <img
                ref={cropImageRef}
                src={cropSrc}
                alt="Crop candidate"
                style={{ transform: `scale(${cropZoom})` }}
                className="max-h-56 object-contain transition-transform duration-200"
              />
            </div>

            {/* Aspect Ratio & Zoom Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-600 uppercase text-[10px] tracking-wider">Crop Ratio:</span>
                <div className="flex gap-1.5">
                  {(['free', '1:1', '3:1', '16:9'] as const).map(asp => (
                    <button
                      key={asp}
                      type="button"
                      onClick={() => setCropAspect(asp)}
                      className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase transition ${
                        cropAspect === asp
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {asp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-zinc-400 shrink-0" />
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCropSrc(null)}
                className="flex-1 py-2.5 border border-zinc-300 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Save & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {popupError && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-[#FAF6F0] rounded-2xl p-6 max-w-sm w-full border border-[#D8E2DC] shadow-xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#3D405B] text-sm uppercase tracking-wider">Upload Error</h3>
              <p className="text-2xs text-[#78716C] leading-relaxed">{popupError}</p>
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

// Exported wrapper: calls useHotel at the top level (Rule of Hooks compliant)
export const MediaUpload: React.FC<MediaUploadProps> = (props) => {
  const { managedPhotos } = useHotel();
  return <MediaUploadInner {...props} managedPhotos={managedPhotos || []} />;
};
