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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Channel Manager Integration</h2>
          <p className="text-sm text-zinc-500">Sync live room rates and availability blocks across online travel agencies (OTAs) instantly.</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm shadow-md transition duration-150"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Pushing Inventory...' : 'Sync Channels Now'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns: Channels Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-amber-500" />
              <span>Available Integrations</span>
            </h3>

            <div className="divide-y divide-zinc-200">
              {connections.map((conn) => (
                <div key={conn.name} className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-sm text-zinc-700">
                      {conn.name[0]}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-zinc-900">{conn.name}</h4>
                        <span className={`flex items-center gap-0.5 px-2 py-0.5 text-5xs font-black uppercase rounded-full ${
                          conn.connected 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                        }`}>
                          {conn.connected ? 'Connected' : 'Offline'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {conn.connected 
                          ? `Mapped Rooms: ${conn.mappedRooms} | Sync: Automatic (real-time)` 
                          : 'Rates and calendars are not pushed to this channel.'}
                      </p>
                      {conn.connected && (
                        <p className="text-4xs font-semibold text-zinc-400">Last synchronized: {conn.lastSynced}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleConnection(conn.name)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                      conn.connected 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                        : 'bg-amber-500 border-amber-600 text-zinc-950 hover:bg-amber-600'
                    }`}
                  >
                    {conn.connected ? 'Disconnect' : 'Connect Channel'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Room Mapping Configuration */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
              <ArrowRightLeft className="w-4.5 h-4.5 text-amber-500" />
              <span>Room Mapping Status</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200">
                    <th className="py-2.5 px-4">Local Room Category</th>
                    <th className="py-2.5 px-4">Booking.com Listing</th>
                    <th className="py-2.5 px-4">Airbnb Listing</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rooms.map((room, idx) => (
                    <tr key={room.id} className="hover:bg-zinc-50/50 transition">
                      <td className="py-3 px-4 font-bold text-zinc-900">{room.name}</td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">BCOM-LN-{1000 + idx}</td>
                      <td className="py-3 px-4 text-zinc-600 font-medium">
                        {idx < 2 ? `ABNB-ROOM-${5000 + idx}` : <span className="text-zinc-400 italic">Not mapped</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Sync Logs */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col h-full max-h-[550px]">
          <h3 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2 mb-4">
            <RefreshCw className="w-4.5 h-4.5 text-amber-500" />
            <span>Channel Logs ({channelLogs.length})</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-200">
            {channelLogs.map((evt) => (
              <div key={evt.id} className="flex gap-2.5 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                <div className="mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-800 block">{evt.title}</span>
                  <p className="text-zinc-500 text-3xs font-medium leading-relaxed">{evt.description}</p>
                  <span className="text-4xs text-zinc-400 block mt-1">{evt.date}</span>
                </div>
              </div>
            ))}

            {channelLogs.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                No synchronization logs recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
