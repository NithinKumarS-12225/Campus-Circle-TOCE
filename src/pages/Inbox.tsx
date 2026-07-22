import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function Inbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat');

  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all chats for the current user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatList);
      setLoadingChats(false);
    });

    return unsubscribe;
  }, [user]);

  // Fetch messages for the active chat
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return unsubscribe;
  }, [user, activeChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChatId || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const now = new Date().toISOString();
      
      // Add message
      await addDoc(collection(db, `chats/${activeChatId}/messages`), {
        senderId: user.uid,
        text: messageText,
        createdAt: now
      });

      // Update chat's last message
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: messageText,
        lastMessageTime: now
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex">
      
      {/* Chat List (Sidebar) */}
      <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-600" /> Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p>No messages yet.</p>
              <p className="text-sm mt-1">Start a chat from a listing!</p>
            </div>
          ) : (
            chats.map(chat => {
              const isBuyer = chat.buyerId === user.uid;
              const otherPersonName = isBuyer ? chat.sellerName : chat.buyerName;
              
              return (
                <button
                  key={chat.id}
                  onClick={() => setSearchParams({ chat: chat.id })}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 items-center ${activeChatId === chat.id ? 'bg-orange-50/50' : ''}`}
                >
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-semibold text-gray-900 truncate">{otherPersonName}</h3>
                      {chat.lastMessageTime && (
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                          {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-orange-600 truncate mb-1">{chat.listingTitle}</p>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={`w-full md:w-2/3 flex flex-col bg-gray-50/50 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3">
              <button 
                onClick={() => navigate('/inbox')}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {activeChat.buyerId === user.uid ? activeChat.sellerName : activeChat.buyerName}
                </h3>
                <p className="text-xs text-gray-500">Regarding: <span className="font-medium text-gray-700">{activeChat.listingTitle}</span></p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p>Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === user.uid;
                  const showTime = index === 0 || new Date(msg.createdAt).getTime() - new Date(messages[index-1].createdAt).getTime() > 5 * 60 * 1000;
                  
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showTime && (
                        <span className="text-[10px] text-gray-400 mb-2 mt-2">
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      )}
                      <div 
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          isMe 
                            ? 'bg-orange-600 text-white rounded-br-sm' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 border-transparent focus:bg-white border focus:border-orange-500 rounded-full outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-11 h-11 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 transition-colors shrink-0"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
