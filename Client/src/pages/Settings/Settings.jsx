import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, useTheme,
  TextField, Button, 
  CircularProgress, Snackbar, Alert, Divider, MenuItem,
  IconButton, Tooltip, Avatar, Chip, Tabs, Tab
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Business, AccountBalance, Inventory, Save, Palette,
  CheckCircle, ColorLens
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiClient as axios, API_URLS } from '../../api';
import { useSettings as useGlobalSettings } from '../../context/SettingsContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 4 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PRESET_COLORS = [
  { name: 'indigo', value: '#4f46e5' },
  { name: 'midnight', value: '#0f172a' },
  { name: 'emerald', value: '#10b981' },
  { name: 'rose', value: '#e11d48' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'vault_blue', value: '#1976d2' },
  { name: 'deep_purple', value: '#7c3aed' },
];

const Settings = () => {
  const { t } = useTranslation();
  const { refreshSettings } = useGlobalSettings();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URLS.SETTINGS);
      setSettings(res.data || {});
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post(API_URLS.SETTINGS, settings);
      showSnackbar(t('settings_saved'), 'success');
      refreshSettings(); // Sync global state
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -1 }}>
            {t('settings')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('ui_desc')}
          </Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ width: '100%', borderRadius: 4, overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            px: 2,
            pt: 2,
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': { py: 2, minHeight: 64, fontWeight: 600 }
          }}
        >
          <Tab icon={<Business sx={{ mr: 1 }} />} iconPosition="start" label={t('company_info')} />
          <Tab icon={<AccountBalance sx={{ mr: 1 }} />} iconPosition="start" label={t('financial_settings')} />
          <Tab icon={<Inventory sx={{ mr: 1 }} />} iconPosition="start" label={t('stock_settings')} />
          <Tab icon={<Palette sx={{ mr: 1 }} />} iconPosition="start" label={t('ui_customization')} />
        </Tabs>

        {/* Company Info */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                label={t('company_name')} 
                fullWidth 
                variant="outlined"
                value={settings.CompanyName || ''} 
                onChange={(e) => handleInputChange('CompanyName', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                label={t('tax_number')} 
                fullWidth 
                variant="outlined"
                value={settings.TaxNumber || ''} 
                onChange={(e) => handleInputChange('TaxNumber', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <TextField 
                label={t('address')} 
                fullWidth 
                variant="outlined"
                multiline 
                rows={3}
                value={settings.Address || ''} 
                onChange={(e) => handleInputChange('Address', e.target.value)}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Financial Settings */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                select
                label={t('currency')} 
                fullWidth 
                value={settings.Currency || 'AED'} 
                onChange={(e) => handleInputChange('Currency', e.target.value)}
              >
                <MenuItem value="AED">AED - {t('currency_aed') || 'درهم إماراتي'}</MenuItem>
                <MenuItem value="SAR">SAR - {t('currency_sar') || 'ريال سعودي'}</MenuItem>
                <MenuItem value="EGP">EGP - {t('currency_egp') || 'جنيه مصري'}</MenuItem>
                <MenuItem value="USD">USD - {t('currency_usd') || 'دولار أمريكي'}</MenuItem>
                <MenuItem value="KWD">KWD - {t('currency_kwd')}</MenuItem>
                <MenuItem value="QAR">QAR - {t('currency_qar')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                label={t('vat_percentage')} 
                type="number"
                fullWidth 
                value={settings.VatPercentage || ''} 
                onChange={(e) => handleInputChange('VatPercentage', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                label={t('social_insurance_percentage')} 
                type="number"
                fullWidth 
                value={settings.SocialInsurancePercentage || ''} 
                onChange={(e) => handleInputChange('SocialInsurancePercentage', e.target.value)}
                helperText={t('percentage_basic_salary')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                label={t('income_tax_percentage')} 
                type="number"
                fullWidth 
                value={settings.IncomeTaxPercentage || ''} 
                onChange={(e) => handleInputChange('IncomeTaxPercentage', e.target.value)}
                helperText={t('percentage_basic_salary')}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Stock Settings */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                label={t('low_stock_threshold')} 
                type="number"
                fullWidth 
                value={settings.LowStockAlert || ''} 
                onChange={(e) => handleInputChange('LowStockAlert', e.target.value)}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* UI Customization */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight="700" gutterBottom>
              {t('primary_color')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('ui_customization_desc')}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
              {PRESET_COLORS.map((color) => (
                <Tooltip key={color.name} title={t(color.name)}>
                  <Box 
                    onClick={() => handleInputChange('PrimaryColor', color.value)}
                    sx={{ 
                      width: 50, 
                      height: 50, 
                      bgcolor: color.value, 
                      borderRadius: '50%', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid white',
                      boxShadow: settings.PrimaryColor === color.value ? `0 0 0 3px ${color.value}` : '0 4px 10px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                  >
                    {settings.PrimaryColor === color.value && <CheckCircle sx={{ color: 'white' }} />}
                  </Box>
                </Tooltip>
              ))}
            </Box>

            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField 
                  label={t('custom_hex_code')}
                  fullWidth
                  value={settings.PrimaryColor || '#4f46e5'}
                  onChange={(e) => handleInputChange('PrimaryColor', e.target.value)}
                  InputProps={{
                    startAdornment: <ColorLens sx={{ color: settings.PrimaryColor, mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid size="auto">
                <Button 
                   variant="outlined" 
                   onClick={() => handleInputChange('PrimaryColor', '#4f46e5')}
                   sx={{ height: 56 }}
                >
                  {t('reset_default')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <Divider />
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'flex-end', bgcolor: 'background.default' }}>
          <Button 
            variant="contained" 
            size="large"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{ 
              px: 6, 
              py: 1.5,
              borderRadius: 3, 
              fontWeight: 'bold',
              boxShadow: `0 8px 20px -6px ${settings.PrimaryColor || 'primary'}80`
            }}
          >
            {t('save_changes')}
          </Button>
        </Box>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
