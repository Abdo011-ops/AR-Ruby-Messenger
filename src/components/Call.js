import { useState, useEffect, useRef } from 'react';
import { database, auth } from '../firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import { Camera } from '@capacitor/camera';
import { VoiceRecorder } from '@capacitor-community/voice-recorder';

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function Call({ calleeId, onEnd }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef(null);
  const userId = auth.currentUser.uid;

  useEffect(() => {
    const startCall = async () => {
      const cameraPerm = await Camera.requestPermissions();
      const micPerm = await VoiceRecorder.requestAudioRecordingPermission();
      if (cameraPerm.camera !== 'granted' || (micPerm && micPerm.value !== 'granted')) {
        alert('يرجى السماح باستخدام الكاميرا والميكروفون');
        onEnd();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      peerConnection.current = new RTCPeerConnection(configuration);
      stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      const callRef = ref(database, `calls/${userId}_${calleeId}`);
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) set(ref(database, `calls/${userId}_${calleeId}/candidate`), event.candidate);
      };

      if (userId < calleeId) {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        await set(callRef, { offer });
      }

      onValue(callRef, async (snapshot) => {
        const data = snapshot.val();
        if (data?.offer && !peerConnection.current.currentRemoteDescription) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          await set(callRef, { answer });
        }
        if (data?.answer) await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        if (data?.candidate) await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      });
    };
    startCall();

    return () => {
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (peerConnection.current) peerConnection.current.close();
      remove(ref(database, `calls/${userId}_${calleeId}`));
    };
  }, [calleeId]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#000', zIndex: 1000 }}>
      <video ref={localVideoRef} autoPlay muted style={{ position: 'absolute', bottom: 20, right: 20, width: 120, borderRadius: 10, zIndex: 2 }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <button onClick={onEnd} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'red', color: 'white', padding: 12, borderRadius: 50, border: 'none' }}>إنهاء المكالمة</button>
    </div>
  );
  }
