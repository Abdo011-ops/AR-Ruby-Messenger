import { useState, useEffect, useRef } from 'react';
import { database, storage, auth } from '../firebase';
import { ref, push, onValue, update, set, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Geolocation } from '@capacitor/geolocation';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import Call from './Call';

const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.3;
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 2);
  oscillator.stop(audioContext.currentTime + 2);
};

export default function Chat({ userId, chatId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showCall, setShowCall] = useState(false);
  const fileInputRef = useRef();
  const imageInputRef = useRef();
  const prevMessagesLength = useRef(0);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingInterval = useRef(null);
  
  // Live location states
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const locationInterval = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    const chatRoomId = [userId, chatId].sort().join('_');
    const messagesRef = ref(database, `messages/${chatRoomId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        const sorted = msgs.sort((a, b) => a.timestamp - b.timestamp);
        if (sorted.length > prevMessagesLength.current) {
          const lastMsg = sorted[sorted.length - 1];
          if (lastMsg.from !== userId) {
            playNotificationSound();
          }
        }
        prevMessagesLength.current = sorted.length;
        setMessages(sorted);
      } else setMessages([]);
    });
    return unsubscribe;
  }, [userId, chatId]);

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const permission = await VoiceRecorder.requestAudioRecordingPermission();
      if (permission && permission.value !== 'granted') {
        alert('يجب السماح باستخدام الميكروفون لتسجيل الصوت');
        return;
      }
      await VoiceRecorder.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Start recording error:', error);
      alert('حدث خطأ أثناء بدء التسجيل');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording) return;
    clearInterval(recordingInterval.current);
    setIsRecording(false);
    try {
      const result = await VoiceRecorder.stopRecording();
      if (result && result.value && result.value.recordDataBase64) {
        const audioBlob = base64ToBlob(result.value.recordDataBase64, 'audio/mp4');
        const fileName = `voice_${Date.now()}.mp4`;
        const fileRefStorage = storageRef(storage, `voice/${fileName}`);
        await uploadBytes(fileRefStorage, audioBlob);
        const voiceUrl = await getDownloadURL(fileRefStorage);
        await sendMessage('voice', voiceUrl);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      alert('حدث خطأ أثناء إرسال الرسالة الصوتية');
    }
  };

  const base64ToBlob = (base64, type) => {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type });
  };

  // Live Location Functions
  const startLiveLocation = async () => {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        alert('يرجى السماح للتطبيق باستخدام الموقع');
        return;
      }
      setIsSharingLocation(true);
      await sendLiveLocationUpdate();
      locationInterval.current = setInterval(async () => {
        await sendLiveLocationUpdate();
      }, 5000);
    } catch (error) {
      console.error('Live location error:', error);
      alert('حدث خطأ أثناء بدء مشاركة الموقع الحي');
    }
  };

  const sendLiveLocationUpdate = async () => {
    try {
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const locationData = {
        lat: latitude,
        lng: longitude,
        timestamp: Date.now(),
      };
      await sendMessage('locationLive', locationData);
    } catch (error) {
      console.error('Send location update error:', error);
    }
  };

  const stopLiveLocation = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
    setIsSharingLocation(false);
    sendMessage('text', '📍 توقف عن مشاركة الموقع الحي');
  };

  const sendMessage = async (type, content) => {
    const msg = {
      from: userId,
      to: chatId,
      text: '',
      imageUrl: '',
      fileUrl: '',
      voiceUrl: '',
      locationUrl: '',
      locationLive: null,
      timestamp: Date.now(),
      deleted: false,
      read: false,
    };
    if (type === 'text') msg.text = content;
    else if (type === 'image') {
      const file = content;
      const fileRefStorage = storageRef(storage, `images/${Date.now()}_${file.name}`);
      await uploadBytes(fileRefStorage, file);
      msg.imageUrl = await getDownloadURL(fileRefStorage);
    } else if (type === 'file') {
      const file = content;
      const fileRefStorage = storageRef(storage, `files/${Date.now()}_${file.name}`);
      await uploadBytes(fileRefStorage, file);
      msg.fileUrl = await getDownloadURL(fileRefStorage);
    } else if (type === 'voice') {
      msg.voiceUrl = content;
      msg.text = '🎤 رسالة صوتية';
    } else if (type === 'location') {
      msg.locationUrl = content;
      msg.text = '📍 موقع';
    } else if (type === 'locationLive') {
      msg.locationLive = content;
      msg.text = '📍 موقع حي (تحديث تلقائي)';
    }
    const chatRoomId = [userId, chatId].sort().join('_');
    const messagesRef = ref(database, `messages/${chatRoomId}`);
    await push(messagesRef, msg);
    setText('');
  };

  const sendLocation = async () => {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        alert('يرجى السماح للتطبيق باستخدام الموقع');
        return;
      }
      const position = await Geolocation.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      await sendMessage('location', locationUrl);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء جلب الموقع');
    }
  };

  const deleteForEveryone = async (messageId) => {
    const chatRoomId = [userId, chatId].sort().join('_');
    const msgRef = ref(database, `messages/${chatRoomId}/${messageId}`);
    await update(msgRef, { deleted: true });
  };

  useEffect(() => {
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, []);

  if (!chatId) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>اختر محادثة</div>;
  if (showCall) return <Call calleeId={chatId} onEnd={() => setShowCall(false)} />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: 10, background: '#075E54', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><strong>{chatId.slice(0, 15)}</strong></span>
        <div>
          <button onClick={isSharingLocation ? stopLiveLocation : startLiveLocation} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, marginRight: 12 }}>
            {isSharingLocation ? '📍 إيقاف المشاركة' : '📍 مشاركة الموقع الحي'}
          </button>
          <button onClick={() => setShowCall(true)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20 }}>📞</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundRepeat: 'repeat' }}>
        {messages.map((msg) => !msg.deleted && (
          <div key={msg.id} style={{ textAlign: msg.from === userId ? 'right' : 'left', margin: 5 }}>
            <div style={{ display: 'inline-block', background: msg.from === userId ? '#DCF8C6' : '#FFFFFF', padding: 8, borderRadius: 8, maxWidth: '70%' }}>
              {msg.text && <p>{msg.text}</p>}
              {msg.imageUrl && <img src={msg.imageUrl} alt="img" style={{ maxWidth: 200, borderRadius: 8 }} />}
              {msg.fileUrl && <a href={msg.fileUrl} download>📎 تحميل ملف</a>}
              {msg.voiceUrl && <audio src={msg.voiceUrl} controls style={{ maxWidth: '200px', height: '40px' }} />}
              {msg.locationUrl && <a href={msg.locationUrl} target="_blank" rel="noreferrer">📍 عرض الموقع على الخريطة</a>}
              {msg.locationLive && (
                <div>
                  <a href={`https://www.google.com/maps?q=${msg.locationLive.lat},${msg.locationLive.lng}`} target="_blank" rel="noreferrer">
                    📍 موقع حي (تحديث {new Date(msg.locationLive.timestamp).toLocaleTimeString()})
                  </a>
                </div>
              )}
              {msg.from === userId && <button onClick={() => deleteForEveryone(msg.id)} style={{ marginLeft: 10, fontSize: 12, background: 'none', border: 'none', color: 'red' }}>🗑️</button>}
              <div style={{ fontSize: 10, color: '#667781', marginTop: 4 }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 10, background: '#fff', display: 'flex', gap: 5, borderTop: '1px solid #e0e0e0', flexWrap: 'wrap' }}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة..." style={{ flex: 1, padding: 8, borderRadius: 20, border: '1px solid #ccc' }} />
        <button onClick={() => sendMessage('text', text)} style={{ background: '#075E54', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px' }}>إرسال</button>
        <button onClick={() => imageInputRef.current.click()} style={{ background: 'none', border: 'none', fontSize: 20 }}>📷</button>
        <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: 'none', fontSize: 20 }}>📎</button>
        <button onClick={sendLocation} style={{ background: 'none', border: 'none', fontSize: 20 }}>📍</button>
        <button 
          onMouseDown={startRecording} 
          onMouseUp={stopRecordingAndSend} 
          onTouchStart={startRecording} 
          onTouchEnd={stopRecordingAndSend}
          style={{ background: isRecording ? 'red' : 'none', border: 'none', fontSize: 20, borderRadius: '50%', width: 40, height: 40 }}
        >
          🎤
        </button>
        {isRecording && <span style={{ color: 'red', fontSize: 12 }}>تسجيل... {recordingTime} ث</span>}
        <input type="file" ref={imageInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => sendMessage('image', e.target.files[0])} />
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => sendMessage('file', e.target.files[0])} />
      </div>
    </div>
  );
}
