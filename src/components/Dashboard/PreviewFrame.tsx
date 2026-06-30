import React from 'react';
import { useHotel } from '../../context/HotelContext';
import { OrganicTemplate } from '../Templates/OrganicTemplate';
import { Globe } from 'lucide-react';

export const PreviewFrame: React.FC = () => {
  const { previewDevice, hotelInfo } = useHotel();

  const getDeviceStyle = () => {
    switch (previewDevice) {
      case 'mobile':
        return 'w-[350px] h-[600px] border-[10px] border-zinc-950 rounded-[32px] shadow-lg relative my-auto mx-auto overflow-hidden bg-white shrink-0';
      case 'tablet':
        return 'w-[450px] h-[550px] border-[8px] border-zinc-900 rounded-[24px] shadow-lg relative my-auto mx-auto overflow-hidden bg-white shrink-0';
      case 'desktop':
      default:
        return 'w-full h-full border-l border-zinc-200 bg-white flex flex-col min-w-0';
    }
  };

  const renderActiveTemplate = () => {
    return <OrganicTemplate />;
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-200 overflow-hidden relative">
      {/* Device Frame Header Address Bar (Only when not in full desktop layout) */}
      {previewDevice !== 'desktop' && (
        <div className="w-full bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-3xs shrink-0 select-none">
          <div className="flex items-center gap-1.5 truncate max-w-[80%] bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
            <Globe className="w-3 h-3 text-zinc-500" />
            <span className="truncate">{hotelInfo.subdomain}.boltlabs.com</span>
          </div>
          <span className="font-bold text-emerald-400 uppercase tracking-widest text-[8px] animate-pulse">Live Draft</span>
        </div>
      )}

      {/* Frame Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
        <div className={getDeviceStyle()}>
          {/* Mobile Speaker/Camera bar */}
          {previewDevice === 'mobile' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-950 rounded-full z-40 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 block"></span>
            </div>
          )}
          
          {/* Inner content scroll frame */}
          <div className="w-full h-full flex flex-col overflow-hidden pt-0.5">
            {renderActiveTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};
