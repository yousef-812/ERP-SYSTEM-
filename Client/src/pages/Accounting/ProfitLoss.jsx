import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableRow, 
  CircularProgress,
  Button,
  TextField,
  Divider,
  Card,
  CardContent,
  alpha,
  useTheme,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Download as DownloadIcon, 
  Print as PrintIcon,
  TrendingUp,
  AccountBalance,
  Receipt,
  Assessment,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useSettings } from '../../context/SettingsContext';
import { format } from 'date-fns';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip as ChartTooltip, Legend, Filler
} from 'chart.js';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import PageHelp from '../../components/PageHelp';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, ChartTooltip, Legend, Filler);

const ModernCard = ({ title, value, icon, color, trend, isPositive }) => {
  const theme = useTheme();
  const mainColor = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Card sx={{ 
      height: '100%', 
      boxShadow: '0 4px 24px 0 rgba(0,0,0,0.04)', 
      borderRadius: 4,
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-4px)' }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: alpha(mainColor, 0.1), 
            color: mainColor,
            width: 44, height: 44,
            borderRadius: 2
          }}>
            {icon}
          </Avatar>
          {trend && (
            <Box sx={{ 
                display: 'flex', alignItems: 'center', gap: 0.5, 
                px: 1, py: 0.5, borderRadius: 1.5,
                bgcolor: isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                color: isPositive ? 'success.main' : 'error.main'
            }}>
                {isPositive ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />}
                <Typography variant="caption" fontWeight="bold">{trend}</Typography>
            </Box>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: -1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

const ProfitLoss = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`api/accounting/pl?start=${startDate}&end=${endDate}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching P&L data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const chartData = {
    labels: [t('revenue'), t('expenses'), t('net_profit')],
    datasets: [{
      label: t('amount'),
      data: [data?.TotalRevenue || 0, data?.TotalExpenses || 0, data?.NetProfit || 0],
      backgroundColor: [
        alpha(theme.palette.success.main, 0.6),
        alpha(theme.palette.error.main, 0.6),
        alpha(theme.palette.primary.main, 0.6),
      ],
      borderRadius: 10,
    }]
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const FinancialRow = ({ label, value, bold = false, indent = 0, color = 'text.primary' }) => {
    const { settings } = useSettings();
    return (
      <TableRow sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) } }}>
        <TableCell sx={{ pl: indent * 4 + 2, fontWeight: bold ? 800 : 500, border: 'none', py: 1.5 }}>
          {label}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: bold ? 800 : 500, border: 'none', py: 1.5, color }}>
          {parseFloat(value || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -1.5 }}>
              {t('profit_loss_report')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('comprehensive_financial_analysis_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="profit_loss" />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} sx={{ borderRadius: 2 }}>{t('print')}</Button>
          <Button variant="contained" startIcon={<DownloadIcon />} sx={{ borderRadius: 2 }}>{t('download_pdf')}</Button>
        </Box>
      </Box>

      {/* Date Filter Bar */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.5), backdropFilter: 'blur(10px)' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label={t('start_date')}
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label={t('end_date')}
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button 
                variant="contained" 
                fullWidth 
                startIcon={<Refresh />} 
                onClick={fetchData}
                sx={{ borderRadius: 2, height: 40, fontWeight: 'bold' }}
            >
              {t('update_report')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Highlights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ModernCard 
            title={t('total_revenue')} 
            value={`${data?.TotalRevenue?.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`}
            icon={<TrendingUp />} 
            color="success"
            trend="+8.2%"
            isPositive={true}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ModernCard 
            title={t('total_expenses')} 
            value={`${data?.TotalExpenses?.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`}
            icon={<AccountBalanceWallet />} 
            color="error"
            trend="-3.1%"
            isPositive={false}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ModernCard 
            title={t('net_profit')} 
            value={`${data?.NetProfit?.toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`}
            icon={<Assessment />} 
            color="primary"
            trend="+15.0%"
            isPositive={true}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="800">{t('breakdown_analysis')}</Typography>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 32, height: 32 }}>
                    <Receipt fontSize="small" />
                </Avatar>
            </Box>
            <Table size="small" sx={{ p: 2 }}>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2} sx={{ bgcolor: alpha(theme.palette.success.main, 0.04), py: 1.5 }}>
                    <Typography variant="body2" fontWeight="800" color="success.main" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{t('income')}</Typography>
                  </TableCell>
                </TableRow>
                <FinancialRow label={t('sales_revenue')} value={data?.TotalRevenue} indent={1} />
                <FinancialRow label={t('other_income')} value={0} indent={1} />
                <FinancialRow label={t('total_income')} value={data?.TotalRevenue} bold />
                
                <TableRow><TableCell sx={{ py: 2, border: 'none' }}></TableCell></TableRow>

                <TableRow>
                  <TableCell colSpan={2} sx={{ bgcolor: alpha(theme.palette.error.main, 0.04), py: 1.5 }}>
                    <Typography variant="body2" fontWeight="800" color="error.main" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{t('expenses')}</Typography>
                  </TableCell>
                </TableRow>
                <FinancialRow label={t('payroll_expenses')} value={data?.PayrollExpenses || 0} indent={1} />
                <FinancialRow label={t('operating_expenses')} value={data?.OperatingExpenses || 0} indent={1} />
                <FinancialRow label={t('general_administrative')} value={0} indent={1} />
                <FinancialRow label={t('total_expenses')} value={data?.TotalExpenses} bold color="error.main" />

                <TableRow><TableCell sx={{ py: 3, border: 'none' }}></TableCell></TableRow>
                
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                  <TableCell sx={{ fontWeight: 900, py: 2.5, borderRadius: '0 0 0 16px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalance sx={{ color: 'primary.main' }} />
                        {t('total_net_profit')}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, py: 2.5, borderRadius: '0 0 16px 0', color: 'primary.main', fontSize: '1.2rem' }}>
                    {data?.NetProfit?.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Visual Analytics Hub */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, height: '100%', border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
            <Typography variant="h6" fontWeight="800" gutterBottom sx={{ mb: 4 }}>{t('visual_summary')}</Typography>
            <Box sx={{ height: 300, mb: 6 }}>
              <Bar 
                data={chartData} 
                options={{ 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { border: { display: false }, grid: { color: theme.palette.divider } },
                        x: { border: { display: false }, grid: { display: false } }
                    }
                }} 
              />
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Box sx={{ pt: 2 }}>
                <Typography variant="subtitle2" fontWeight="800" gutterBottom>{t('financial_health_score')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('reinvestment_recommendation')}
                </Typography>
                <Button variant="soft" color="primary" fullWidth sx={{ fontWeight: 'bold' }}>{t('view_audit_logs')}</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfitLoss;
