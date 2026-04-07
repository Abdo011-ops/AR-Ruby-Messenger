import React, { createContext, useState, useEffect } from 'react';

const translations = {
  ar: {
    chats: 'المحادثات',
    settings: 'الإعدادات',
    calls: 'المكالمات',
    darkMode: 'الوضع الداكن',
    language: 'اللغة',
    changePassword: 'تغيير كلمة المرور',
    changePhone: 'تغيير رقم الهاتف',
    logout: 'تسجيل الخروج',
    send: 'إرسال',
    typeMessage: 'اكتب رسالة...',
    groups: 'المجموعات',
    favorites: 'المفضلة',
    unread: 'غير مقروءة',
    all: 'الكل',
  },
  en: {
    chats: 'Chats',
    settings: 'Settings',
    calls: 'Calls',
    darkMode: 'Dark Mode',
    language: 'Language',
    changePassword: 'Change Password',
    changePhone: 'Change Phone Number',
    logout: 'Logout',
    send: 'Send',
    typeMessage: 'Type a message...',
    groups: 'Groups',
    favorites: 'Favorites',
    unread: 'Unread',
    all: 'All',
  },
};

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'ar');
  const t = (key) => translations[lang][key] || key;

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
