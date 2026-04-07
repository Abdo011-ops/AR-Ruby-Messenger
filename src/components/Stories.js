import { useState, useEffect } from 'react';
import { database, storage, auth } from '../firebase';
import { ref, push, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Stories() {
  const [stories, setStories] = useState([]);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const storiesRef = ref(database, 'stories');
    const unsubscribe = onValue(storiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const now = Date.now();
        const active = Object.entries(data)
          .filter(([_, story]) => story.expiresAt > now)
          .map(([id, story]) => ({ id, ...story }));
        setStories(active);
      } else setStories([]);
    });
    return unsubscribe;
  }, []);

  const addStory = async (file) => {
    if (!userId) return;
    const fileRefStorage = storageRef(storage, `stories/${Date.now()}_${file.name}`);
    await uploadBytes(fileRefStorage, file);
    const url = await getDownloadURL(fileRefStorage);
    const story = {
      userId,
      url,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    const storiesRef = ref(database, 'stories');
    await push(storiesRef, story);
  };

  return (
    <div style={{ borderBottom: '1px solid #e0e0e0', padding: 10, display: 'flex', overflowX: 'auto', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#075E54', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>+</div>
        <span style={{ fontSize: 12 }}>قصتك</span>
        <input type="file" accept="image/*,video/*" onChange={(e) => addStory(e.target.files[0])} style={{ display: 'none' }} />
      </label>
      {stories.map((s) => (
        <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={s.url} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #25D366' }} alt="story" />
          <span style={{ fontSize: 10 }}>{s.userId?.slice(0, 4)}</span>
        </div>
      ))}
    </div>
  );
}
