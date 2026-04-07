import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const [allMessages, setAllMessages] = useState([]);
  const [allStories, setAllStories] = useState([]);

  useEffect(() => {
    const messagesRef = ref(database, 'messages');
    const unsubMsg = onValue(messagesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const msgs = [];
        Object.values(data).forEach((chat) => Object.values(chat).forEach((msg) => msgs.push(msg)));
        setAllMessages(msgs);
      }
    });
    const storiesRef = ref(database, 'stories');
    const unsubStory = onValue(storiesRef, (snap) => {
      const data = snap.val();
      if (data) setAllStories(Object.values(data));
    });
    return () => { unsubMsg(); unsubStory(); };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>لوحة التحكم (Real-time)</h2>
      <h3>الرسائل ({allMessages.length})</h3>
      <table border="1" cellPadding="5" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>من</th><th>إلى</th><th>نص</th><th>صورة</th><th>ملف</th><th>صوت</th><th>موقع حي</th><th>وقت</th><th>محذوف</th></tr></thead>
        <tbody>
          {allMessages.map((msg, idx) => (
            <tr key={idx}>
              <td>{msg.from}侧
              <td>{msg.to}侧
              <td>{msg.text}侧
              <td>{msg.imageUrl ? '✅' : ''}侧
              <td>{msg.fileUrl ? '✅' : ''}侧
              <td>{msg.voiceUrl ? '✅' : ''}侧
              <td>{msg.locationLive ? '✅' : ''}侧
              <td>{new Date(msg.timestamp).toLocaleString()}侧
              <td>{msg.deleted ? 'نعم' : 'لا'}侧
            </tr>
          ))}
        </tbody>
      </table>
      <h3>الحالات ({allStories.length})</h3>
      <table border="1" cellPadding="5" style={{ width: '100%' }}>
        <thead><tr><th>المستخدم</th><th>الرابط</th><th>تنتهي بعد</th></tr></thead>
        <tbody>
          {allStories.map((story, idx) => (
            <tr key={idx}>
              <td>{story.userId}侧
              <td><a href={story.url} target="_blank" rel="noreferrer">عرض</a>侧
              <td>{new Date(story.expiresAt).toLocaleString()}侧
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  }
