import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Mail, Trash2, MessageSquare, Send, Check } from 'lucide-react';

export const GuestMessagesView: React.FC = () => {
  const { messages, markMessageRead, deleteMessage, addEventLog } = useHotel();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(messages[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const selectedMsg = messages.find(m => m.id === selectedMessageId);

  const handleMessageSelect = (id: string) => {
    setSelectedMessageId(id);
    markMessageRead(id);
    setReplySent(false);
    setReplyText('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText || !selectedMsg) return;

    addEventLog(
      'Guest Inquiry Replied',
      `Sent email response to ${selectedMsg.senderName} (${selectedMsg.senderEmail})`,
      'info'
    );

    setReplySent(true);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Guest Messages Inbox</h2>
        <p className="text-sm text-zinc-500">Read and respond to direct inquiries submitted via the guest-facing website contact forms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-[600px]">
        
        {/* Left Side: Inbox List */}
        <div className="divide-y divide-zinc-200 border-r border-zinc-200 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-200">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleMessageSelect(msg.id)}
              className={`w-full text-left p-5 hover:bg-zinc-50 transition flex flex-col space-y-2 relative select-none ${
                selectedMessageId === msg.id ? 'bg-amber-50/50' : ''
              }`}
            >
              {/* Unread dot */}
              {!msg.read && (
                <span className="absolute top-5 right-5 w-2 h-2 rounded-full bg-amber-500" />
              )}
              
              <div className="flex items-center justify-between pr-4">
                <h4 className={`text-sm truncate ${!msg.read ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                  {msg.senderName}
                </h4>
                <span className="text-4xs text-zinc-400 font-bold">{msg.date}</span>
              </div>
              
              <div className="space-y-0.5">
                <p className={`text-xs truncate ${!msg.read ? 'font-semibold text-zinc-900' : 'text-zinc-600'}`}>
                  {msg.subject}
                </p>
                <p className="text-3xs text-zinc-400 line-clamp-1 leading-normal">
                  {msg.message}
                </p>
              </div>
            </button>
          ))}

          {messages.length === 0 && (
            <div className="py-20 text-center text-zinc-400 text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <span>Inbox is clean!</span>
            </div>
          )}
        </div>

        {/* Right Side: Message Detail & Reply Panel */}
        <div className="lg:col-span-2 flex flex-col h-full bg-zinc-50/30">
          {selectedMsg ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Detail Header */}
              <div className="p-6 bg-white border-b border-zinc-200 flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-zinc-900">{selectedMsg.subject}</h3>
                  <div className="text-xs text-zinc-500">
                    From: <strong className="text-zinc-800">{selectedMsg.senderName}</strong> ({selectedMsg.senderEmail}) 
                    {selectedMsg.senderPhone && ` | Phone: ${selectedMsg.senderPhone}`}
                  </div>
                </div>

                <button
                  onClick={() => {
                    deleteMessage(selectedMsg.id);
                    setSelectedMessageId(messages.filter(m => m.id !== selectedMsg.id)[0]?.id || null);
                  }}
                  className="p-1.5 border border-zinc-200 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-100 text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                  {selectedMsg.message}
                </div>

                {replySent && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-center gap-2">
                    <Check className="w-4.5 h-4.5 text-emerald-600 font-bold" />
                    <span>Your response has been dispatched to {selectedMsg.senderEmail} successfully.</span>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="p-5 border-t border-zinc-200 bg-white">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={`Reply to ${selectedMsg.senderName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replySent}
                    className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-lg px-4 py-2 text-sm text-zinc-900 outline-hidden transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={replySent}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-zinc-950 font-bold px-5 py-2 rounded-lg text-sm transition shadow-2xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-600 font-bold">No inquiry selected</p>
                <p className="text-xs text-zinc-400 mt-1">Select a submission from the inbox sidebar to read details.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
