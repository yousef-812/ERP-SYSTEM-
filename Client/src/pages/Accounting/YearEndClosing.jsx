import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField,
  useTheme,
  alpha,
  Divider,
  Alert,
  Snackbar,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { 
  LockOutlined as Lock, 
  WarningAmberOutlined as Warning,
  CheckCircleOutlined as CheckCircle
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URLS } from '../../api';
import { useConfirm } from '../../context/ConfirmContext';
import PageHelp from '../../components/PageHelp';

const YearEndClosing = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const confirm = useConfirm();

  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseYear = async () => {
    if (await confirm({ 
      title: t('confirm_year_end_title'), 
      message: t('confirm_year_end_msg', { year })
    })) {
      try {
        setLoading(true);
        await axios.post(API_URLS.ACCOUNTING.CLOSE_YEAR, { year, month: 12 });
        showSnackbar(t('year_end_success', { year }), 'success');
      } catch (err) {
        showSnackbar(err.response?.data || t('year_end_error'), 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <PageHelp helpKey="year_end_closing" />
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Lock sx={{ fontSize: 60, color: theme.palette.error.main, mb: 2 }} />
        <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
          {t('year_end_closing')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('year_end_subtitle')}
        </Typography>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 4, 
          border: `1px solid ${theme.palette.divider}`,
          mb: 4
        }}
      >
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 4, borderRadius: 2 }}>
          <Typography fontWeight="700" gutterBottom>{t('critical_action')}</Typography>
          {t('year_end_warning_text')}
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>{t('year_end_bullet_1')}</li>
            <li>{t('year_end_bullet_2')}</li>
            <li>{t('year_end_bullet_3')}</li>
          </ul>
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight="700" gutterBottom>{t('select_fiscal_year')}</Typography>
            <TextField 
              select 
              fullWidth
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <MenuItem key={y} value={y}>{y}</MenuItem>;
              })}
            </TextField>
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button 
              variant="contained" 
              color="error" 
              size="large" 
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Lock />}
              onClick={handleCloseYear}
              disabled={loading}
              fullWidth
            >
              {loading ? t('processing') : t('permanently_close_btn', { year })}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CheckCircle color="success" />
          <Typography variant="h6" fontWeight="700" color="success.main">{t('pre_closing_checklist')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('checklist_intro')}
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 0, display: 'flex', flexDirection: 'column', gap: 1, '& li': { color: 'text.secondary' } }}>
          <li>{t('checklist_item_1')}</li>
          <li>{t('checklist_item_2')}</li>
          <li>{t('checklist_item_3')}</li>
          <li>{t('checklist_item_4')}</li>
        </Box>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default YearEndClosing;
