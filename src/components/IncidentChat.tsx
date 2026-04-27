'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Send, User } from 'lucide-react';
import { StaffProfile } from '@/app/staff/StaffDashboardClient';

type Message = {
  id: string;
  incident_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  users: { name: string; avatar_url: string | null };
};

export default function IncidentChat({ 
  incidentId, 
  currentUser 
}: { 
  incidentId: string;
  currentUser: StaffProfile;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('incident_messages')
        .select('*, users(name, avatar_url)')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data as unknown as Message[]);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${incidentId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'incident_messages',
        filter: `incident_id=eq.${incidentId}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    await supabase.from('incident_messages').insert({
      incident_id: incidentId,
      sender_id: currentUser.id,
      message_text: newMessage.trim()
    });
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <div className="flex flex-col h-[400px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-50 p-3 border-b border-gray-200 shrink-0">
        <h3 className="text-sm font-bold text-gray-800">Team Comms</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-4">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`shrink-0 ${isMe ? 'ml-2' : 'mr-2'} mt-auto`}>
                    {msg.users?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.users.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-2 ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {!isMe && <p className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.users?.name}</p>}
                    <p className="text-sm">{msg.message_text}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0">
        <form onSubmit={sendMessage} className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isSending}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || isSending}
            className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
