import React, { useState } from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { loginSuccess } from '../../store/authSlice';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { API_URLS } from '../../api';

const getRedirectPath = (user) => {
  if (user.role === 'Admin') return '/dashboard';
  
  const perms = (user.permissions || []).map(p => p.trim());

  // Dashboard first if allowed
  if (perms.includes('عرض لوحة التحكم')) return '/dashboard';

  // Functional Fallbacks in order of priority
  if (perms.includes('عرض دفتر اليومية')) return '/finance/ledger';
  if (perms.includes('إدارة ملفات الموظفين') || perms.includes('عرض الموظفين')) return '/hr/dashboard';
  if (perms.includes('عرض مستويات المخزون')) return '/inventory/dashboard';
  if (perms.includes('عرض المبيعات') || perms.includes('إصدار الفواتير')) return '/orders';
  if (perms.includes('عرض الموردين') || perms.includes('إدارة الموردين')) return '/suppliers';
  if (perms.includes('التقارير المالية وذكاء الأعمال')) return '/finance/bi';
  if (perms.includes('إقفال الفترات المالية')) return '/finance/year-end';
  if (perms.includes('إدارة شجرة الحسابات')) return '/finance/coa';
  if (perms.includes('عرض المصاريف')) return '/expenses';
  if (perms.includes('عرض أوامر الشراء') || perms.includes('إنشاء أمر شراء')) return '/purchase-orders';
  if (perms.includes('إصدار أذونات التسليم')) return '/delivery-notes';
  
  return '/unauthorized'; // Redirect only if absolutely no modules available
};

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      const targetPath = getRedirectPath(user);
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);



    try {
      const res = await axios.post(API_URLS.AUTH.LOGIN, {
        username,
        password
      });

      // Dispatch token and user to Redux
      dispatch(loginSuccess({
        token: res.data.token,
        user: res.data.user
      }));

      // Find best redirect path
      const targetPath = from === '/' ? getRedirectPath(res.data.user) : from;
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(t('login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicNavbar />
      <Box 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          mb: 10
        }}
      >
        <Paper elevation={6} sx={{ p: 5, width: '100%', maxWidth: 400, borderRadius: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <LockOutlined color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
              {t('landing_title')} - {t('sign_in')}
            </Typography>
          </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleLogin}>
          <TextField
            id="username-input"
            name="username"
            autoComplete="username"
            label={t('username')}
            variant="outlined"
            fullWidth
            margin="normal"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            id="password-input"
            name="password"
            autoComplete="current-password"
            label={t('password')}
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, height: 50, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : t('sign_in')}
          </Button>
        </form>

      </Paper>
      </Box>
    </Box>
  );
};

export default Login;
