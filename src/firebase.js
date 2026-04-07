import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { getDatabase, ref, push, onValue, update, remove, set, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD1wXmaPWK1WGDKMnhyXrMVxdjjSk68cYs',
  authDomain: 'abdulrahman-mohammed-e57be.firebaseapp.com',
  databaseURL: 'https://abdulrahman-mohammed-e57be-default-rtdb.firebaseio.com',
  projectId: 'abdulrahman-mohammed-e57be',
  storageBucket: 'abdulrahman-mohammed-e57be.firebasestorage.app',
  messagingSenderId: '187230983098',
  appId: '1:187230983098:web:a9cae5138e38c4dc6dc383',
  measurementId: 'G-BRH3YWJKTV',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const changeEmail = async (currentPassword, newEmail) => {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updateEmail(user, newEmail);
};

export const updateAvatar = async (file) => {
  const user = auth.currentUser;
  const avatarRef = storageRef(storage, `avatars/${user.uid}`);
  await uploadBytes(avatarRef, file);
  const url = await getDownloadURL(avatarRef);
  await updateProfile(user, { photoURL: url });
  await set(ref(database, `users/${user.uid}/avatar`), url);
  return url;
};
