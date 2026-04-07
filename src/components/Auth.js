import { useState } from 'react';
import { signUp, signIn } from '../firebase';

export default function Auth({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let userCred;
      if (isLogin) {
        userCred = await signIn(email, password);
      } else {
        userCred = await signUp(email, password);
      }
      setUser(userCred.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20, marginTop: 100 }}>
      <h2>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />
        <input
          type="password"
          placeholder="كلمة المرور (ثابتة مدى الحياة)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" style={{ padding: 10, width: '100%', background: '#075E54', color: 'white', border: 'none' }}>
          {isLogin ? 'دخول' : 'إنشاء حساب'}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#075E54' }}>
        {isLogin ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'لديك حساب بالفعل؟ سجل دخول'}
      </button>
    </div>
  );
          }
