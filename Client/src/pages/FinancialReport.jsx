import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Grid, Card, CardContent, 
  CircularProgress, Divider, Avatar, useTheme, Alert, Chip,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  TextField, MenuItem
} from '@mui/material';
import { 
  TrendingUp, TrendingDownOutlined as TrendingDown, Receipt, Print, 
  AccountBalanceWallet, Insights, Assessment,
  PieChart as PieIcon, BarChart as BarIcon, Download,
  FileDownload, Description, Refresh, DateRange
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { format } from 'date-fns';
import { API_URLS } from '../api';
import { useSettings } from '../context/SettingsContext';
import { getCurrencySymbol } from '../utils/currencyHelper';
import PageHelp from '../components/PageHelp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const FinancialReport = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(API_URLS.WAREHOUSES);
      setWarehouses(res.data);
    } catch (err) {}
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const warehouseParam = selectedWarehouseId ? `&warehouseId=${selectedWarehouseId}` : '';
      const response = await axios.get(`${API_URLS.FINANCIAL_REPORT}?startDate=${startDate}&endDate=${endDate}${warehouseParam}`);
      setData(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedWarehouseId]);

  const getCurrencyEn = (curr) => {
    const map = {
      'درهم إماراتي': 'AED',
      'ريال سعودي': 'SAR',
      'جنيه مصري': 'EGP',
      'دولار أمريكي': 'USD',
      'دينار كويتي': 'KWD',
      'ريال قطري': 'QAR'
    };
    return map[curr] || curr || 'EGP';
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [25, 118, 210]; // Blue
    const currencyEn = getCurrencyEn(settings.Currency);

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(settings.CompanyName || "ERP SYSTEM", 15, 25);
    doc.setFontSize(12);
    doc.text(t('financial_profit_loss_report').toUpperCase(), 15, 35);
    
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 195, 25, { align: "right" });
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 195, 32, { align: "right" });

    // Summary Cards
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(t('executive_summary').toUpperCase(), 15, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [[t('metric'), t('value')]],
      body: [
        [t('total_revenue'), `${revenue.toLocaleString()} ${currencyEn}`],
        [t('total_expenses'), `${expenses.toLocaleString()} ${currencyEn}`],
        [t('net_profit'), `${netProfit.toLocaleString()} ${currencyEn}`],
        [t('profit_margin'), `${profitMargin}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    // Transactions Table
    doc.text(t('transaction_details').toUpperCase(), 15, doc.lastAutoTable.finalY + 15);
    
    const tableColumn = [t('date_col'), t('description_col'), t('type_col'), t('category_col'), t('amount_col')];
    const tableRows = (data?.transactions || []).map(t_item => [
      format(new Date(t_item.date), 'yyyy-MM-dd'),
      t_item.description,
      t_item.type,
      t_item.category,
      `${t_item.amount.toLocaleString()} ${currencyEn}`
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    doc.save(`Financial_Report_${startDate}_to_${endDate}.pdf`);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data.transactions.map(t_item => ({
      [t('date_col')]: format(new Date(t_item.date), 'yyyy-MM-dd'),
      [t('description_col')]: t_item.description,
      [t('type_col')]: t('type_' + t_item.type.toLowerCase()),
      [t('category_col')]: t_item.category,
      [t('amount_col')]: t_item.amount,
      [t('currency_col')]: settings.Currency
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Financial_Report_${startDate}_to_${endDate}.xlsx`);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;

  const revenue = data?.totalRevenue || 0;
  const expenses = data?.totalExpenses || 0;
  const netProfit = data?.netProfit || 0;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

  const trendData = {
    labels: data?.mainTrend?.labels || [],
    datasets: [
      {
        label: t('total_revenue'),
        data: data?.mainTrend?.sales || [],
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main + '20',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('total_expenses'),
        data: data?.mainTrend?.expenses || [],
        borderColor: theme.palette.error.main,
        backgroundColor: theme.palette.error.main + '20',
        fill: true,
        tension: 0.4,
      }
    ],
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 0 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' }, 
        gap: 3,
        mb: 4, 
        '@media print': { display: 'none' } 
      }}>
        <Box sx={{ textAlign: { xs: 'center', md: 'left' }, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
              {t('financial_reports')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('financial_reports_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="profit_loss" />
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 1.5, 
          flexWrap: 'wrap', 
          justifyContent: { xs: 'center', md: 'flex-end' },
          alignItems: 'center'
        }}>
          <TextField
            select
            size="small"
            label={t('warehouse')}
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            sx={{ minWidth: 200, bgcolor: 'background.paper', borderRadius: 1 }}
          >
            <MenuItem value="">{t('all_warehouses')}</MenuItem>
            {warehouses.map(w => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={exportToExcel} sx={{ borderRadius: 2, flex: { xs: 1, sm: 'none' }, height: 40 }}>Excel</Button>
          <Button variant="contained" startIcon={<Description />} onClick={exportToPDF} sx={{ borderRadius: 2, flex: { xs: 1, sm: 'none' } }}>PDF</Button>
          <Button variant="outlined" onClick={() => window.print()} startIcon={<Print />} sx={{ borderRadius: 2, flex: { xs: 1, sm: 'none' } }}>{t('print')}</Button>
        </Box>
      </Box>

      <Box id="report-to-export">
        {/* Date and Company Info at Top of PDF Only */}
        <Box className="printable-only" sx={{ display: 'none', textAlign: 'center', mb: 3, '@media print': { display: 'block' } }}>
          <Typography variant="h5" fontWeight="bold">{settings.CompanyName}</Typography>
          <Typography variant="body2">{startDate} {t('to')} {endDate}</Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                <TrendingUp fontSize="large" />
              </Avatar>
              <Typography variant="h4" fontWeight="900">{revenue.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
              <Typography variant="subtitle2" color="text.secondary">{t('total_revenue_paid')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar sx={{ bgcolor: 'error.soft', color: 'error.main', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                <TrendingDown fontSize="large" />
              </Avatar>
              <Typography variant="h4" fontWeight="900">{expenses.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
              <Typography variant="subtitle2" color="text.secondary">{t('total_operational_expenses')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, bgcolor: netProfit >= 0 ? 'success.main' : 'error.main', color: 'white', boxShadow: 10 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mx: 'auto', mb: 2, width: 60, height: 60 }}>
                <Insights fontSize="large" />
              </Avatar>
              <Typography variant="h4" fontWeight="900">{netProfit.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>{t('net_profit')}</Typography>
              <Chip label={`${profitMargin}% ${t('margin')}`} size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={12}>
          <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', elevation: 0 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('description')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('type')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('category')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('amount')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.transactions || []).map((t_item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{format(new Date(t_item.date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>{t_item.description}</TableCell>
                    <TableCell>
                      <Chip 
                        label={t(t_item.type.toLowerCase())} 
                        size="small" 
                        color={t_item.type === 'Revenue' ? 'success' : 'error'} 
                        sx={{ borderRadius: 1.5, fontWeight: 'bold' }} 
                      />
                    </TableCell>
                    <TableCell>{t_item.category}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: t_item.type === 'Revenue' ? 'success.main' : 'error.main' }}>
                      {t_item.type === 'Revenue' ? '+' : '-'} {t_item.amount.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.transactions || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {t('no_transactions_found')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BarIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">{t('profit_loss_trend')}</Typography>
            </Box>
            <Box sx={{ height: 400 }}>
              <Line data={trendData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <PieIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">{t('expense_breakdown')}</Typography>
            </Box>
            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
               {(data?.totalExpenses > 0 || data?.manualExpenses > 0) ? (
                 <Pie 
                   data={{
                     labels: [t('payroll_label'), t('operating_expenses_label')],
                     datasets: [{
                       data: [
                         (data?.totalExpenses || 0) - (data?.manualExpenses || 0), 
                         data?.manualExpenses || 0
                       ],
                       backgroundColor: [theme.palette.warning.main, theme.palette.error.main],
                     }]
                   }} 
                 />
               ) : (
                 <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', opacity: 0.5 }}>
                   <PieIcon sx={{ fontSize: 60, mb: 1 }} />
                   <Typography variant="body2">{t('no_expense_data')}</Typography>
                 </Box>
               )}
            </Box>
            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
                {t('net_profit_info')}
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <style>
        {`
          @media print {
            body { padding: 0; margin: 0; }
            .MuiAppBar-root, .MuiDrawer-root, button { display: none !important; }
            main { margin-top: 0 !important; padding: 0 !important; }
            .printable-only { display: block !important; }
            .MuiPaper-root { border: none !important; box-shadow: none !important; }
          }
        `}
      </style>
      </Box>
    </Box>
  );
};

export default FinancialReport;
