
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, UserRole } from '../types';
import { X, Send, User as UserIcon, Shield, Bike, Store, MessageCircle } from 'lucide-react';
import { db } from '../services/mockDb';

interface ChatModalProps {
  orderId: string;
  currentUser: User;
  messages: ChatMessage[];
  onClose: () => void;
  onRefresh: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ orderId, currentUser, messages, onClose, onRefresh }) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      await db.addMessageToOrder(orderId, currentUser, inputText);
      setInputText('');
      onRefresh(); // Trigger parent refresh to show new message
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setIsSending(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case UserRole.ADMIN: return <Shield size={12} />;
      case UserRole.DRIVER: return <Bike size={12} />;
      case UserRole.CLIENT: return <Store size={12} />;
      default: return <UserIcon size={12} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overscroll-none">
      <div 
        className="bg-white w-full max-w-md h-full sm:h-[600px] sm:max-h-[90vh] sm:rounded-[2rem] border-x-0 sm:border-4 border-black flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#4FC1E9] p-4 flex justify-between items-center border-b-4 border-black sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-lg border-2 border-black">
                <MessageCircle size={20} />
             </div>
             <div>
                <h3 className="font-['Titan_One'] text-lg uppercase tracking-tight">Chat do Pedido</h3>
                <p className="text-[10px] font-black opacity-60 font-mono uppercase">ID: #{orderId.slice(-4)}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F0F4F8] no-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
              <MessageCircle size={48} className="mb-2" />
              <p className="text-xs font-black uppercase">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    isMe 
                      ? 'bg-[#FFCE54] rounded-br-none' 
                      : 'bg-white rounded-bl-none'
                  }`}>
                    {!isMe && (
                      <div className="flex items-center gap-1 text-[9px] font-black mb-1 uppercase tracking-wider opacity-60">
                        {getRoleIcon(msg.senderRole)}
                        {msg.senderName}
                      </div>
                    )}
                    <p className="text-sm font-bold leading-tight whitespace-pre-wrap">{msg.content}</p>
                    <span className={`text-[8px] font-black block text-right mt-1 opacity-40 uppercase`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t-4 border-black">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Sua mensagem..."
              className="flex-1 bg-gray-50 border-2 border-black rounded-xl px-4 py-3 font-bold text-sm outline-none focus:bg-white transition-all"
            />
            <button 
              type="submit" 
              disabled={!inputText.trim() || isSending}
              className="bg-[#A0D468] border-2 border-black p-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
