import { useContext, useState } from 'react';
import { auth, changePassword, changeEmail, updateAvatar } from '../firebase';
import { ThemeContext } from '../contexts/ThemeContext';
import { LanguageContext } from '../contexts/LanguageContext';

export default function Settings({ onClose }) {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const { lang, setLang, t } = useContext(LanguageContext);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');

  const handlePasswordChange = async () => {
    try { await changePassword(currentPass, newPass); setMessage('تم تغيير كلمة المرور'); }
    catch (err) { setMessage(err.message); }
  };
  const handleEmailChange = async () => {
    try { await changeEmail(currentPass, newEmail); setMessage('تم تغيير البريد الإلكتروني'); }
    catch (err) { setMessage(err.message); }
  };
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) { await updateAvatar(file); setMessage('تم تحديث الصورة'); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: 'auto', background: darkMode ? '#1e1e1e' : '#fff', height: '100vh', overflowY: 'auto' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24 }}>✖️</button>
      <h2>{t('settings')}</h2>
      <div style={{ marginBottom: 20 }}><label>{t('darkMode')}</label><input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} /></div>
      <div style={{ marginBottom: 20 }}><label>{t('language')}</label><select value={lang} onChange={(e) => setLang(e.target.value)}><option value="ar">العربية</option><option value="en">English</option></select></div>
      <hr /><h3>الصورة الشخصية</h3><input type="file" accept="image/*" onChange={handleAvatarChange} />
      <hr /><h3>{t('changePassword')}</h3>
      <input type="password" placeholder="كلمة المرور الحالية" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
      <input type="password" placeholder="كلمة المرور الجديدة" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
      <button onClick={handlePasswordChange} style={{ background: '#075E54', color: 'white', padding: 8, border: 'none' }}>تحديث</button>
      <hr /><h3>{t('changePhone')}</h3>
      <input type="email" placeholder="البريد الإلكتروني الجديد" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ display: 'block', marginBottom: 10, width: '100%', padding: 8 }} />
      <button onClick={handleEmailChange} style={{ background: '#075E54', color: 'white', padding: 8, border: 'none' }}>تحديث البريد</button>
      {message && <p>{message}</p>}
      <hr /><button onClick={() => auth.signOut()} style={{ background: 'red', color: 'white', padding: 10, border: 'none', width: '100%' }}>{t('logout')}</button>
    </div>
  );
                                                  }
