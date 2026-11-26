import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  useTheme, 
  alpha,
  CircularProgress,
  Snackbar,
  Link,
  Breadcrumbs,
  Grid,
  Alert
} from '@mui/material';
import { 
  BarChartOutlined as BarChartIcon, 
  PieChartOutlined as PieChart, 
  TimelineOutlined as Timeline, 
  DownloadOutlined as Download,
  RefreshOutlined as Refresh,
  FilterListOutlined as FilterList,
  Sync as SyncIcon,
  FileDownload as FileDownloadIcon,
  TrendingUp as TrendingUpIcon,
  Assessment,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { useSettings } from '../../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { apiClient as axios, API_URLS } from '../../api';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import PageHelp from '../../components/PageHelp';

const BISpreadsheet = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // التحقق من الصلاحية محلياً أولاً لتجنب استدعاء الـ API غير المصرح به
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // التحقق من الصلاحية المدمجة الجديدة
          if (user.role !== 'Admin' && !user.permissions?.some(p => p === 'التقارير المالية وذكاء الأعمال')) {
            setError(t('error_no_permission_annual_report') || "ليس لديك صلاحية لعرض التقارير المالية والتحليلات");
            setLoading(false);
            return;
          }
        } catch (e) { /* fallback to API if parse fails */ }
      }

      const year = new Date().getFullYear();
      const res = await axios.get(`${API_URLS.ACCOUNTING.ANNUAL_REPORT}?year=${year}`);
      setData(res.data);
    } catch (err) {
      setError(t('bi_load_error'));
      setSnackbar({ open: true, message: t('bi_load_error'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error" sx={{ mb: 3 }}>{error}</Alert></Box>;
  if (!data) return null;

  const { totalRevenue = 0, totalExpenses = 0, netProfit = 0, payrollExpenses = 0, operatingExpenses = 0, quarters = [] } = data;

  const expenseData = [
    { name: t('internal_salaries') || 'Payroll', value: payrollExpenses || 0, color: theme.palette.primary.main },
    { name: t('operating_expenses') || 'Operating', value: operatingExpenses || 0, color: theme.palette.warning.main },
    { name: t('miscellaneous') || 'Others', value: Math.max(0, (totalExpenses - (payrollExpenses || 0) - (operatingExpenses || 0))) || 0, color: theme.palette.error.main },
  ].filter(d => d.value > 0);

  const payrollPct = totalExpenses > 0 ? Math.round(((payrollExpenses || 0) / totalExpenses) * 100) : 0;
  const operatingPct = totalExpenses > 0 ? Math.round(((operatingExpenses || 0) / totalExpenses) * 100) : 0;

  // Calculate quarterly heights for Trend Analysis
  const maxRev = quarters.length > 0 ? Math.max(...quarters.map(q => q.rev || 1)) : 100;
  const trendBars = quarters.map(q => ({
    label: q.q,
    height: Math.max(10, Math.round(((q.rev || 0) / maxRev) * 100))
  }));

  const formatCurrency = (amount) => {
    const symbol = getCurrencySymbol(settings.Currency, i18n.language);
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount).toLocaleString();
    
    // Standard negative sign as requested
    if (isNegative) {
      return `-${absoluteAmount} ${symbol}`;
    }
    return `${absoluteAmount} ${symbol}`;
  };

  const businessMetrics = [
    { 
      label: t('total_revenue') || 'Total Revenue', 
      value: formatCurrency(totalRevenue), 
      color: theme.palette.success.main, 
      icon: <TrendingUpIcon /> 
    },
    { 
      label: t('net_profit') || 'Net Profit', 
      value: formatCurrency(netProfit), 
      color: netProfit >= 0 ? theme.palette.primary.main : theme.palette.error.main, 
      icon: <Assessment /> 
    },
    { 
      label: t('total_expenses') || 'Total Expenses', 
      value: formatCurrency(totalExpenses), 
      color: theme.palette.warning.main, 
      icon: <TrendingDownIcon /> 
    },
  ];

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('bi_spreadsheet')}
            </Typography>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" color="inherit" href="/finance">{t('menu_financials')}</Link>
              <Typography color="text.primary">{t('bi_spreadsheet')}</Typography>
            </Breadcrumbs>
          </Box>
          <PageHelp helpKey="bi_spreadsheet" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {businessMetrics.map((metric, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={index}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                border: `1px solid ${theme.palette.divider}`,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { boxShadow: theme.shadows[4] }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(metric.color, 0.1), color: metric.color }}>
                  {metric.icon}
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5, color: metric.color }}>{metric.value}</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="600">{metric.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: `1px solid ${theme.palette.divider}`,
              minHeight: 400
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
              <Typography variant="h6" fontWeight="700">{t('financial_trend_analysis')}</Typography>
              <Timeline color="primary" />
            </Box>
            {/* Visualizer Mocked bars */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 250, px: 2 }}>
              {trendBars.length > 0 ? trendBars.map((bar, i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                   <Box sx={{ 
                     width: { xs: 30, md: 50 }, 
                     height: `${bar.height}%`, 
                     bgcolor: theme.palette.primary.main, 
                     borderRadius: '8px 8px 0 0', 
                     opacity: 0.8,
                     transition: 'height 0.5s ease-in-out',
                     position: 'relative',
                     display: 'flex',
                     justifyContent: 'center',
                     '&:hover': { opacity: 1 }
                   }}>
                     <Typography variant="caption" sx={{ position: 'absolute', top: -25, whiteSpace: 'nowrap', fontWeight: 'bold', color: 'text.primary' }}>
                        {quarters[i].rev?.toLocaleString()}
                     </Typography>
                   </Box>
                   <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ mt: 1 }}>{bar.label}</Typography>
                </Box>
              )) : (
                <Box sx={{ width: '100%', textAlign: 'center', pb: 10 }}>
                  <Typography variant="body2" color="text.secondary">{t('no_trend_data') || 'No data available for the current year'}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: `1px solid ${theme.palette.divider}`,
              minHeight: 400
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
              <Typography variant="h6" fontWeight="700">{t('expense_distribution')}</Typography>
              <PieChart color="secondary" />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                { label: t('payroll_expenses_label'), value: `${payrollPct}%`, color: theme.palette.info.main, amount: payrollExpenses || 0 },
                { label: t('operating_expenses_label'), value: `${operatingPct}%`, color: theme.palette.warning.main, amount: operatingExpenses || 0 }
              ].map((item, index) => (
                <Box key={index}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight="700">{item.label} ({item.amount.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)})</Typography>
                    <Typography variant="caption" fontWeight="800" color="primary">{item.value}</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 10, bgcolor: alpha(item.color, 0.1), borderRadius: 5 }}>
                    <Box sx={{ width: item.value, height: 10, bgcolor: item.color, borderRadius: 5 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BISpreadsheet;
