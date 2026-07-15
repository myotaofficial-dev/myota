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
      <div className="text-left">
        <h2 className="text-2xl font-extrabold text-[#1C1917]" style={{ fontFamily: 'Outfit, sans-serif' }}>Guest Messages Inbox</h2>
        <p className="text-sm text-[#78716C]">Read and respond to direct inquiries submitted via the guest-facing website contact forms.</p>
      </div>

      <div className="ds-card grid grid-cols-1 lg:grid-cols-3 overflow-hidden h-[600px] bg-white">
        
        {/* Left Side: Inbox List */}
        <div className="divide-y divide-[#E7E5E4] border-r border-[#E7E5E4] overflow-y-auto h-full scrollbar-thin scrollbar-thumb-zinc-200">
          {messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleMessageSelect(msg.id)}
              className={`w-full text-left p-5 hover:bg-zinc-50 transition flex flex-col space-y-2 relative select-none ${
                selectedMessageId === msg.id ? 'bg-[#E6F5F7]/40' : ''
              }`}
            >
              {/* Unread dot */}
              {!msg.read && (
                <span className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#1B93A4]" />
              )}
              
              <div className="flex items-center justify-between pr-4">
                <h4 className={`text-sm truncate ${!msg.read ? 'font-bold text-[#1C1917]' : 'text-zinc-700'}`}>
                  {msg.senderName}
                </h4>
                <span className="text-4xs text-zinc-400 font-bold">{msg.date}</span>
              </div>
              
              <div className="space-y-0.5">
                <p className={`text-xs truncate ${!msg.read ? 'font-semibold text-[#1C1917]' : 'text-zinc-650'}`}>
                  {msg.subject}
                </p>
                <p className="text-3xs text-zinc-400 line-clamp-1 leading-normal">
                  {msg.message}
                </p>
              </div>
            </button>
          ))}

          {messages.length === 0 && (
            <div className="py-20 text-center text-[#A8A29E] text-xs">
              <Mail className="w-8 h-8 mx-auto mb-2 text-[#A8A29E]/60" />
              <span>Inbox is clean!</span>
            </div>
          )}
        </div>

        {/* Right Side: Message Detail & Reply Panel */}
        <div className="lg:col-span-2 flex flex-col h-full bg-zinc-50/30">
          {selectedMsg ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Detail Header */}
              <div className="p-6 bg-white border-b border-[#E7E5E4] flex items-start justify-between">
                <div className="space-y-1 text-left">
                  <h3 className="font-extrabold text-lg text-[#1C1917]">{selectedMsg.subject}</h3>
                  <div className="text-xs text-[#78716C]">
                    From: <strong className="text-[#1C1917]">{selectedMsg.senderName}</strong> ({selectedMsg.senderEmail}) 
                    {selectedMsg.senderPhone && ` | Phone: ${selectedMsg.senderPhone}`}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Delete this message permanently?')) {
                      deleteMessage(selectedMsg.id);
                      setSelectedMessageId(messages.filter(m => m.id !== selectedMsg.id)[0]?.id || null);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-[#E7E5E4] text-[#E76F51] hover:bg-[#FEF0ED] transition cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Message Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-150 text-sm text-zinc-700 leading-relaxed whitespace-pre-line text-left">
                  {selectedMsg.message}
                </div>

                {replySent && (
                  <div className="bg-[#E8F5EF] border border-[#2D6A4F]/20 text-[#2D6A4F] text-xs p-4 rounded-xl flex items-center gap-2">
                    <Check className="w-4.5 h-4.5 text-[#2D6A4F] font-bold" />
                    <span>Your response has been dispatched to {selectedMsg.senderEmail} successfully.</span>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="p-5 border-t border-[#E7E5E4] bg-white">
                <form onSubmit={handleSendReply} className="flex gap-3">
                  <input
                    type="text"
                    required
                    placeholder={`Reply to ${selectedMsg.senderName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replySent}
                    className="ds-input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={replySent}
                    className="ds-btn-primary flex items-center gap-1.5"
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
                <p className="text-sm font-bold text-[#1C1917]">No inquiry selected</p>
                <p className="text-xs text-[#78716C] mt-1">Select a submission from the inbox sidebar to read details.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
