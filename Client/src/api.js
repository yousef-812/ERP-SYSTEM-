// Centralized API Configuration
// This reads the Base URL from the .env file (VITE_API_BASE_URL)
// If not found, it defaults to localhost for development.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://192.168.100.11:5000' : '');

export const API_BASE_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

// ── Axios Instance مع interceptors ──────────────────────────────────────────
// كل الـ requests تحمل الـ JWT تلقائيًا
// كل 401 response يُشغّل logout تلقائيًا (SecurityStamp قديم أو انتهى الـ Token)

export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Request interceptor: إضافة الـ Authorization header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: معالجة 401 أو 403 (SecurityStamp قديم أو عدم تطابق)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || (error.response?.status === 403 && error.response?.headers?.['x-auth-revoked'])) {
      window.dispatchEvent(new CustomEvent('auth:session-invalidated'));
    }
    return Promise.reject(error);
  }
);

// Endpoints
export const API_URLS = {
  SETTINGS: `${API_BASE_URL}/api/settings`,
  SETTINGS_PUBLIC: `${API_BASE_URL}/api/settings/public`,
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  PRODUCTS: `${API_BASE_URL}/api/products`,
  CUSTOMERS: `${API_BASE_URL}/api/customers`,
  ORDERS: `${API_BASE_URL}/api/orders`,
  INVOICES: `${API_BASE_URL}/api/invoices`,
  STOCK: {
    RECEIVE: `${API_BASE_URL}/api/stock/receive`,
    ADJUST: `${API_BASE_URL}/api/stock/adjust`,
    ADJUSTMENTS: `${API_BASE_URL}/api/stock/adjustments`,
    HISTORY: (productId) => `${API_BASE_URL}/api/stock/history/${productId}`,
    DAMAGE_REQUESTS: `${API_BASE_URL}/api/damagerequests`,
    DASHBOARD: `${API_BASE_URL}/api/stock/dashboard-stats`
  },
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`
  },
  SUPPLIERS: `${API_BASE_URL}/api/suppliers`,
  EMPLOYEES: `${API_BASE_URL}/api/employees`,
  ATTENDANCE: `${API_BASE_URL}/api/attendance`,
  PAYROLL: `${API_BASE_URL}/api/payroll`,
  FINANCE: `${API_BASE_URL}/api/financialtransactions`,
  ACCOUNTING: {
    PL: `${API_BASE_URL}/api/accounting/pl`,
    ANNUAL_REPORT: `${API_BASE_URL}/api/accounting/annual-report`,
    CLOSE_PERIOD: `${API_BASE_URL}/api/accounting/close-period`,
    CLOSE_YEAR: `${API_BASE_URL}/api/accounting/close-year`,
    JOURNAL: `${API_BASE_URL}/api/accounting/journal`,
    JOURNAL_DETAILS: `${API_BASE_URL}/api/accounting/journal-details`
  },
  AUDIT_LOGS: `${API_BASE_URL}/api/auditlogs`,
  FINANCIAL_REPORT: `${API_BASE_URL}/api/dashboard/report`,
  USERS: `${API_BASE_URL}/api/users`,
  PERMISSIONS: `${API_BASE_URL}/api/permissions`,
  WAREHOUSES: `${API_BASE_URL}/api/warehouses`,
  PURCHASE_ORDERS: `${API_BASE_URL}/api/purchaseorders`,
  PURCHASE_REQUESTS: `${API_BASE_URL}/api/purchaserequests`,
  WAREHOUSE_TRANSFERS: `${API_BASE_URL}/api/warehousetransfers`,
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  DOCUMENTS: `${API_BASE_URL}/api/documents`,
  HR: {
    BASE: `${API_BASE_URL}/api/HRManagement`,
    JOBS: `${API_BASE_URL}/api/HRManagement/jobs`,
    APPRAISALS: `${API_BASE_URL}/api/appraisals`,
    DASHBOARD: `${API_BASE_URL}/api/HRManagement/dashboard-stats`
  }
};
