import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ProcedureMessage } from '@prisma/client';
import { toast } from 'sonner';

export function ProcedureChat({
  procedureId,
  messages,
  setMessages,
  user,
}: {
  procedureId: string;
  messages: ProcedureMessage[];
  setMessages: (msg: ProcedureMessage[]) => void;
  user?: { username: string; role: string; id: string };
}) {
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load draft message from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`draft-note-${procedureId}`);
    if (draft) setNewMessage(draft);
  }, [procedureId]);

  // Save draft message to localStorage
  useEffect(() => {
    if (newMessage) {
      localStorage.setItem(`draft-note-${procedureId}`, newMessage);
    } else {
      localStorage.removeItem(`draft-note-${procedureId}`);
    }
  }, [newMessage, procedureId]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      const container = chatEndRef.current.parentElement;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/procedures/${procedureId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages([...messages, message]);
        setNewMessage('');
        localStorage.removeItem(`draft-note-${procedureId}`);
        setTimeout(scrollToBottom, 100);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl flex flex-col h-[700px] overflow-hidden">
      <div className="p-8 border-b border-gray-100 bg-gray-50/50">
        <h4 className="text-xs font-black text-gray-900 flex items-center tracking-[0.2em] uppercase">
          <div className="bg-blue-600 p-2 rounded-xl mr-4 shadow-lg shadow-blue-100">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          Review Notes
        </h4>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <MessageSquare className="w-16 h-16 text-gray-400 mb-6" />
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">No discussion yet</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === user?.username ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center space-x-3 mb-2 px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{msg.sender}</span>
              <span suppressHydrationWarning className="text-[9px] text-gray-300 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={`px-6 py-4 rounded-2xl max-w-[90%] text-sm shadow-sm leading-relaxed border ${
              msg.sender === user?.username 
                ? 'bg-blue-600 text-white rounded-tr-none border-blue-500 shadow-blue-50' 
                : 'bg-gray-50 text-gray-800 border-gray-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-6 bg-gray-50/50 border-t border-gray-100 flex space-x-3">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Add a review note..."
          className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sendingMessage}
          aria-label="Send Message"
          className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-90 border border-blue-500"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
