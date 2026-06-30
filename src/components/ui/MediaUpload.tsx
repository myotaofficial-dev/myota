import React, { useState, useRef } from 'react';
import { UploadCloud, X, Image as ImageIcon, Film, Loader2 } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    setIsLoading(true);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      // Compress and resize image using HTML5 Canvas to save localStorage space
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 900;

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
            // Export to JPEG with 0.75 quality (highly optimized base64)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            onChange(compressedBase64);
          } else {
            // Fallback to original read if canvas fails
            onChange(event.target?.result as string);
          }
          setIsLoading(false);
        };
        img.onerror = () => {
          onChange(event.target?.result as string);
          setIsLoading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // For videos and other types, read directly as data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target?.result as string);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isVideo = value.startsWith('data:video/') || value.toLowerCase().endsWith('.mp4') || value.toLowerCase().endsWith('.webm') || value.toLowerCase().endsWith('.mov');

  return (
    <div className={`space-y-1 text-left ${className}`}>
      {label && (
        <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider block">
          {label}
        </label>
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
              ? 'border-amber-500 bg-amber-50/40 scale-[0.99]'
              : 'border-zinc-250 hover:border-amber-400 hover:bg-zinc-50/50 bg-zinc-50/20'
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <span className="text-4xs text-zinc-500 font-extrabold uppercase tracking-widest">Processing file...</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white rounded-full border border-zinc-150 shadow-xs text-zinc-400 group-hover:text-amber-500 transition-colors">
                {accept.includes('video') ? (
                  <Film className="w-6 h-6" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="text-3xs font-bold text-zinc-700">
                  Drag & drop your file here, or <span className="text-amber-600 hover:text-amber-700 font-extrabold">browse</span>
                </p>
                <p className="text-[9px] text-zinc-450 font-semibold uppercase tracking-wider">
                  Supports {accept.includes('video') ? 'MP4, WebM up to 10MB' : 'PNG, JPG, WebP'}
                </p>
              </div>
            </>
          )}
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
