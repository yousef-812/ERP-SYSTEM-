import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, API_URLS } from '../api';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    Currency: 'درهم إماراتي',
    VatPercentage: '14',
    LowStockAlert: '10',
    CompanyName: 'ERP System',
    PrimaryColor: '#4f46e5' // Default Indigo
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = API_URLS.SETTINGS_PUBLIC;
      
      // فقط لو كان الدخول بحساب له صلاحيات النظام نطلب الإعدادات الكاملة لتجنب خطأ 403 المزعج في الـ Console
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.role === 'Admin' || user?.permissions?.includes('Manage System Settings')) {
            url = API_URLS.SETTINGS;
          }
        } catch (e) { /* ignore parse error */ }
      }

      const res = await apiClient.get(url);
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      if (err.response?.status === 403) {
        // إذا حدث خطأ غير متوقع بالرغم من التحقق أعلاه، أحضر العامة كإجراء احتياطي
        try {
          const publicRes = await apiClient.get(API_URLS.SETTINGS_PUBLIC);
          setSettings(prev => ({ ...prev, ...publicRes.data }));
        } catch (publicErr) {
          console.error('Failed to fetch public settings:', publicErr);
        }
      } else {
        console.error('Failed to fetch settings:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = () => fetchSettings();

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
