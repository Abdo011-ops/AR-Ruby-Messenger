import { useState, useEffect, useContext } from 'react';
import { database, auth } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { ThemeContext } from '../contexts/ThemeContext';
import { LanguageContext } from '../contexts/LanguageContext';

export default function ChatsList({ setCurrentChat }) {
  const [chats, setChats] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const { darkMode } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    const messagesRef = ref(database, 'messages');

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const chatsMap = new Map();
      Object.values(data).forEach((chatRoom) => {
        Object.values(chatRoom).forEach((msg) => {
          const otherId = msg.from === userId ? msg.to : msg.from;
          const chatId = [userId, otherId].sort().join('_');
          if (!chatsMap.has(chatId)) {
            let lastMessageText = msg.text || '';
            if (msg.imageUrl) lastMessageText = '🖼️ صورة';
            else if (msg.fileUrl) lastMessageText = '📎 ملف';
            else if (msg.voiceUrl) lastMessageText = '🎤 رسالة صوتية';
            else if (msg.locationLive) lastMessageText = '📍 موقع حي';
            chatsMap.set(chatId, {
              id: chatId,
              name: otherId.slice(0, 12),
              lastMessage: lastMessageText,
              timestamp: msg.timestamp,
              unreadCount: msg.to === userId && !msg.read ? 1 : 0,
              participants: [userId, otherId],
              avatarInitial: otherId.charAt(0).toUpperCase(),
            });
          } else {
            const existing = chatsMap.get(chatId);
            if (msg.timestamp > existing.timestamp) {
              let lastMessageText = msg.text || '';
              if (msg.imageUrl) lastMessageText = '🖼️ صورة';
              else if (msg.fileUrl) lastMessageText = '📎 ملف';
              else if (msg.voiceUrl) lastMessageText = '🎤 رسالة صوتية';
              else if (msg.locationLive) lastMessageText = '📍 موقع حي';
              existing.lastMessage = lastMessageText;
              existing.timestamp = msg.timestamp;
            }
            if (msg.to === userId && !msg.read) existing.unreadCount += 1;
          }
        });
      });

      let chatsArray = Array.from(chatsMap.values());
      chatsArray.sort((a, b) => b.timestamp - a.timestamp);
      if (activeTab === 'unread') chatsArray = chatsArray.filter((c) => c.unreadCount > 0);
      setChats(chatsArray);
    });

    return () => unsubscribe();
  }, [userId, activeTab]);

  const formatTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const oneDay = 24 * 3600 * 1000;
    if (diff < oneDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 2 * oneDay) return 'أمس';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${darkMode ? '#2b2b2b' : '#e0e0e0'}`, background: darkMode ? '#1e1e1e' : '#fff' }}>
        {['groups', 'favorites', 'unread', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? `3px solid ${darkMode ? '#25D366' : '#075E54'}` : 'none',
              color: activeTab === tab ? (darkMode ? '#25D366' : '#075E54') : (darkMode ? '#e0e0e0' : '#667781'),
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {tab === 'groups' && t('groups')}
            {tab === 'favorites' && t('favorites')}
            {tab === 'unread' && t('unread')}
            {tab === 'all' && t('all')}
          </button>
        ))}
      </div>
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => setCurrentChat(chat.participants.find((id) => id !== userId))}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: `1px solid ${darkMode ? '#2b2b2b' : '#f0f2f5'}`,
            background: darkMode ? '#1e1e1e' : '#fff',
          }}
        >
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: darkMode ? '#2b2b2b' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 20, color: darkMode ? '#fff' : '#000', marginRight: 12 }}>
            {chat.avatarInitial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000' }}>{chat.name}</span>
              <span style={{ fontSize: 12, color: darkMode ? '#aaa' : '#667781' }}>{formatTime(chat.timestamp)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: darkMode ? '#aaa' : '#667781' }}>{chat.lastMessage}</span>
              {chat.unreadCount > 0 && <span style={{ background: '#25D366', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 12, fontWeight: 'bold' }}>{chat.unreadCount}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
