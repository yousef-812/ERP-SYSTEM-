import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './i18n'
import { CustomThemeProvider } from './theme/ThemeContext'
import { Provider } from 'react-redux'
import { store } from './store/store'
import axios from 'axios'
import { logout, sessionInvalidated } from './store/authSlice'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

// ── Global Axios Interceptors ─────────────────────────────────────────────────
// إضافة الـ JWT token لكل request
axios.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// معالجة 401 أو 403 (SecurityStamp قديم أو عدم تطابق)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || (error.response?.status === 403 && error.response?.headers?.['x-auth-revoked'])) {
      store.dispatch(sessionInvalidated());
    }
    return Promise.reject(error);
  }
);

// نفس الشيء للـ apiClient من api.js عبر custom event
window.addEventListener('auth:session-invalidated', () => {
  store.dispatch(sessionInvalidated());
});

import { SettingsProvider } from './context/SettingsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <CustomThemeProvider>
            <App />
          </CustomThemeProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
)
