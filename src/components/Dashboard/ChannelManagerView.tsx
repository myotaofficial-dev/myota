import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Globe, RefreshCw, ArrowRightLeft } from 'lucide-react';

interface ChannelConnection {
  name: string;
  connected: boolean;
  mappedRooms: number;
  lastSynced: string;
}

export const ChannelManagerView: React.FC = () => {
  const { rooms, addEventLog, events } = useHotel();
  const [syncing, setSyncing] = useState(false);
  const [connections, setConnections] = useState<ChannelConnection[]>([
    { name: 'Booking.com', connected: true, mappedRooms: rooms.length, lastSynced: '5 mins ago' },
    { name: 'Airbnb', connected: true, mappedRooms: Math.min(2, rooms.length), lastSynced: '15 mins ago' },
    { name: 'Expedia', connected: false, mappedRooms: 0, lastSynced: 'Never' }
  ]);

  const toggleConnection = (name: string) => {
    setConnections(prev => prev.map(conn => {
      if (conn.name === name) {
        const nextState = !conn.connected;
        addEventLog(
          nextState ? 'OTA Channel Connected' : 'OTA Channel Disconnected',
          `Successfully ${nextState ? 'integrated' : 'removed connection to'} ${name}.`,
          'channel'
        );
        return {
          ...conn,
          connected: nextState,
          mappedRooms: nextState ? rooms.length : 0,
          lastSynced: nextState ? 'Just now' : 'Never'
        };
      }
      return conn;
    }));
  };

  const handleSyncAll = () => {
    setSyncing(true);
    addEventLog('Manual OTA Sync Requested', 'Starting full inventory push to active channels.', 'channel');
    
    setTimeout(() => {
      setSyncing(false);
      setConnections(prev => prev.map(conn => 
        conn.connected ? { ...conn, lastSynced: 'Just now' } : conn
      ));
      addEventLog('Manual OTA Sync Finished', 'Synced rates and block schedules to Booking.com & Airbnb.', 'channel');
    }, 1500);
  };

  const channelLogs = events.filter(e => e.type === 'channel');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between text-left">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Channel Manager Integration</h2>
          <p className="text-sm text-[#78716C]">Sync live room rates and availability blocks across online travel agencies (OTAs) instantly.</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="ds-btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Pushing Inventory...' : 'Sync Channels Now'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns: Channels Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="ds-card p-6 space-y-6 bg-white">
            <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-[#1B93A4]" />
              <span>Available Integrations</span>
            </h3>

            <div className="divide-y divide-[#E7E5E4]">
              {connections.map((conn) => (
                <div key={conn.name} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FAFAF9] border border-[#E7E5E4] flex items-center justify-center font-bold text-sm text-[#78716C]">
                      {conn.name[0]}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#1C1917]">{conn.name}</h4>
                        <span className={`ds-badge ${
                          conn.connected 
                            ? 'ds-badge-green' 
                            : 'ds-badge-coral'
                        }`}>
                          {conn.connected ? 'Connected' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C]">
                        {conn.connected 
                          ? `Mapped Rooms: ${conn.mappedRooms} | Sync: Automatic (real-time)` 
                          : 'Rates and calendars are not pushed to this channel.'}
                      </p>
                      {conn.connected && (
                        <p className="text-4xs font-semibold text-[#A8A29E]">Last synchronized: {conn.lastSynced}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleConnection(conn.name)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      conn.connected 
                        ? 'border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED]' 
                        : 'bg-[#1B93A4] border-[#1B93A4] text-white hover:bg-[#157A8A]'
                    }`}
                  >
                    {conn.connected ? 'Disconnect' : 'Connect Channel'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Room Mapping Configuration */}
          <div className="ds-card p-6 space-y-4 bg-white">
            <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-4.5 h-4.5 text-[#1B93A4]" />
              <span>Room Mapping Status</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAFAF9] text-[#78716C] border-b border-[#E7E5E4]">
                    <th className="py-3 px-4 ds-overline">Local Room Category</th>
                    <th className="py-3 px-4 ds-overline">Booking.com Listing</th>
                    <th className="py-3 px-4 ds-overline">Airbnb Listing</th>
                    <th className="py-3 px-4 ds-overline text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]">
                  {rooms.map((room, idx) => (
                    <tr key={room.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-[#1C1917]">{room.name}</td>
                      <td className="py-3.5 px-4 text-[#78716C] font-semibold">BCOM-LN-{1000 + idx}</td>
                      <td className="py-3.5 px-4 text-[#78716C] font-semibold">
                        {idx < 2 ? `ABNB-ROOM-${5000 + idx}` : <span className="text-[#A8A29E] italic">Not mapped</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2D6A4F]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sync Logs */}
        <div className="ds-card p-6 flex flex-col h-full max-h-[550px] bg-white">
          <h3 className="font-bold text-[#1C1917] border-b border-[#E7E5E4] pb-2 flex items-center gap-2 mb-4">
            <RefreshCw className="w-4.5 h-4.5 text-[#1B93A4]" />
            <span>Channel Logs ({channelLogs.length})</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-200">
            {channelLogs.map((evt) => (
              <div key={evt.id} className="flex gap-2.5 text-xs bg-[#FAFAF9] p-3 rounded-xl border border-[#E7E5E4] text-left">
                <div className="mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#1B93A4] block" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-[#1C1917] block">{evt.title}</span>
                  <p className="text-[#78716C] text-3xs font-medium leading-relaxed">{evt.description}</p>
                  <span className="text-4xs text-[#A8A29E] block mt-1">{evt.date}</span>
                </div>
              </div>
            ))}

            {channelLogs.length === 0 && (
              <div className="text-center py-12 text-[#A8A29E]">
                No synchronization logs recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
