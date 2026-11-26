import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Grid, 
  TextField, Chip, Avatar, CircularProgress, Alert, MenuItem, 
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  useTheme, useMediaQuery, Card, CardContent, Snackbar, Tooltip,
  alpha
} from '@mui/material';
import { 
  AttachMoney, Payment, Receipt, Print, Delete, AddCircle, 
  TrendingUp, TrendingDown, AccountBalanceWallet, Person, CalendarMonth,
  PictureAsPdf, Search as SearchIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../context/ConfirmContext';
import { apiClient, API_URLS } from '../api';
import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { getCurrencySymbol } from '../utils/currencyHelper';
import PageHelp from '../components/PageHelp';
import { usePermissions } from '../hooks/usePermissions';

const Payroll = () => {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { settings } = useSettings();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("معالجة الرواتب");

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${API_URLS.PAYROLL}?month=${month}&year=${year}`);
      setPayrollData(response.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await apiClient.get(API_URLS.WAREHOUSES);
      setWarehouses(response.data);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    fetchPayroll();
    fetchWarehouses();
  }, [month, year]);

  const generateMonthlyPayroll = async () => {
    if (!(await confirm({ 
      title: t('confirm_generate_title'), 
      message: t('confirm_generate_msg') 
    }))) return;
    setGenerating(true);
    try {
      await apiClient.post(`${API_URLS.PAYROLL}/generate`, { month, year });
      showSnackbar(t('payroll_generated_success') || t('employee_updated_success'));
      fetchPayroll();
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const clearMonthlyPayroll = async () => {
    if (!(await confirm({ 
      title: t('confirm_clear_title'), 
      message: t('confirm_clear_msg') 
    }))) return;
    
    try {
      await apiClient.delete(`${API_URLS.PAYROLL}/clear?month=${month}&year=${year}`);
      showSnackbar(t('payroll_cleared_success'));
      fetchPayroll();
    } catch (err) {
      showSnackbar(t('error_clearing'), 'error');
    }
  };

  const handleUpdatePayroll = async (id, field, value) => {
    // Allow empty string for easier typing
    const numValue = value === "" ? 0 : parseFloat(value) || 0;
    
    // 1. Update locally first for instant feedback (No Lag)
    setPayrollData(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: numValue };
        // Recalculate net salary locally
        updated.netSalary = (updated.basicSalary || 0) + (updated.bonus || 0) - 
                           (updated.socialInsurance || 0) - (updated.incomeTax || 0) - (updated.deductions || 0);
        return updated;
      }
      return p;
    }));

    // 2. Sync with server in background
    try {
      const record = payrollData.find(p => p.id === id);
      const updatedRecord = { ...record, [field]: numValue };
      await apiClient.put(`${API_URLS.PAYROLL}/${id}`, updatedRecord);
    } catch (err) {
      console.error("Error syncing payroll:", err);
    }
  };

  const handleProcessPayment = async (p) => {
    if (await confirm({ 
      title: t('confirm_payment_title'), 
      message: t('confirm_payment_msg') 
    })) {
      try {
        await apiClient.put(`${API_URLS.PAYROLL}/${p.id}/pay`);
        showSnackbar(t('payment_success') || t('employee_updated_success'));
        fetchPayroll();
      } catch (err) {
        showSnackbar(t('error_saving'), 'error');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [isExporting, setIsExporting] = useState(false);
  const downloadPDF = () => {
    if (!selectedPayroll) return;
    
    const doc = new jsPDF();
    const primaryColor = [25, 118, 210]; // Blue
    const currencyEn = getCurrencySymbol(settings.Currency, 'en');

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(settings.CompanyName || "ERP SYSTEM", 15, 25);
    doc.setFontSize(12);
    doc.text(t('official_payslip').toUpperCase(), 15, 35);
    
    doc.setFontSize(10);
    doc.text(`${t('month')}: ${t(format(new Date(year, month - 1, 1), 'MMMM').toLowerCase())} ${year}`, 195, 25, { align: "right" });
    doc.text(`${t('generated')}: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 195, 32, { align: "right" });

    // Employee Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(t('employee_details').toUpperCase(), 15, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [[t('field'), t('value')]],
      body: [
        [t('employee_name'), selectedPayroll.employee?.nameEn || selectedPayroll.employee?.name || "---"],
        [t('position'), selectedPayroll.employee?.positionEn || selectedPayroll.employee?.position || "---"],
        [t('department'), selectedPayroll.employee?.departmentEn || selectedPayroll.employee?.department || "---"],
        [t('status'), t((selectedPayroll.status || 'Pending').toLowerCase())]
      ],
      theme: 'striped',
      headStyles: { fillColor: primaryColor }
    });

    // Earnings & Deductions
    doc.text(t('salary_breakdown').toUpperCase(), 15, doc.lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [[t('description'), t('amount')]],
      body: [
        [t('basic_salary'), `${(selectedPayroll.basicSalary || 0).toLocaleString()} ${currencyEn}`],
        [t('bonus'), `+ ${(selectedPayroll.bonus || 0).toLocaleString()} ${currencyEn}`],
        [t('social_insurance'), `- ${(selectedPayroll.socialInsurance || 0).toLocaleString()} ${currencyEn}`],
        [t('income_tax'), `- ${(selectedPayroll.incomeTax || 0).toLocaleString()} ${currencyEn}`],
        [t('other_deductions'), `- ${(selectedPayroll.deductions || 0).toLocaleString()} ${currencyEn}`],
        [{ content: t('net_salary'), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: `${(selectedPayroll.netSalary || 0).toLocaleString()} ${currencyEn}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    // Signatures
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.line(20, finalY, 80, finalY);
    doc.text(t('employee_signature'), 50, finalY + 5, { align: "center" });
    
    doc.line(130, finalY, 190, finalY);
    doc.text(t('manager_official_stamp'), 160, finalY + 5, { align: "center" });

    doc.save(`Payslip_${selectedPayroll.employee?.nameEn || selectedPayroll.employee?.name}_${month}_${year}.pdf`);
  };

  // Filtered Payroll Data
  const filteredPayroll = payrollData.filter(p => {
    const matchesSearch = p.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || p.employee?.warehouseId === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const totalPaid = filteredPayroll.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalUnpaid = filteredPayroll.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalBonuses = filteredPayroll.reduce((sum, p) => sum + (p.bonus || 0), 0);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Modern Header & Control Panel */}
      <Box sx={{ mb: 4, '@media print': { display: 'none' } }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, boxShadow: 3 }}>
                   <AttachMoney fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="primary.main">
                    {t('payroll')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('payroll_subtitle')}
                  </Typography>
                </Box>
                <PageHelp helpKey="payroll" />
             </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
             <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                <Grid container spacing={2}>
                   <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField 
                        fullWidth size="small" placeholder={t('search_employees')} 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ 
                          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> 
                        }}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      />
                   </Grid>
                   <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <TextField 
                        select fullWidth size="small" label={t('warehouse')}
                        value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      >
                        <MenuItem value="all">{t('all_warehouses')}</MenuItem>
                        {warehouses.map(w => (
                          <MenuItem key={w.id} value={w.id}>
                            {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                          </MenuItem>
                        ))}
                      </TextField>
                   </Grid>
                   <Grid size={{ xs: 6, md: 3 }}>
                      <TextField 
                        select fullWidth size="small" label={t('month')} 
                        value={month} onChange={(e) => setMonth(e.target.value)} 
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      >
                        {[...Array(12)].map((_, i) => (
                          <MenuItem key={i+1} value={i+1}>{t(format(new Date(2024, i, 1), 'MMMM').toLowerCase())}</MenuItem>
                        ))}
                      </TextField>
                   </Grid>
                   <Grid size={{ xs: 6, md: 2 }}>
                      <TextField 
                        fullWidth size="small" label={t('year')} type="number"
                        value={year} onChange={(e) => setYear(e.target.value)}
                        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                      />
                   </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                   {canManage && (
                     <Button 
                       variant="contained" startIcon={<AddCircle />} 
                       onClick={generateMonthlyPayroll}
                       disabled={generating}
                       sx={{ borderRadius: 2, px: 3, boxShadow: 2 }}
                     >
                       {generating ? '...' : t('generate_payroll')}
                     </Button>
                   )}
                   {canManage && (
                     <Button 
                       variant="outlined" color="error" startIcon={<Delete />} 
                       onClick={clearMonthlyPayroll}
                       disabled={filteredPayroll.length === 0}
                       sx={{ borderRadius: 2, px: 3 }}
                     >
                       {t('clear_all')}
                     </Button>
                   )}
                   <Button 
                     variant="outlined" startIcon={<Print />} 
                     onClick={() => window.print()}
                     disabled={filteredPayroll.length === 0}
                     sx={{ borderRadius: 2, px: 3 }}
                   >
                     {t('print_all')}
                   </Button>
                </Box>
             </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4, '@media print': { display: 'none' } }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'success.main', color: 'white', borderRadius: 4 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 50, height: 50 }}><AccountBalanceWallet /></Avatar>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{t('total_paid_payout')}</Typography>
              <Typography variant="h5" fontWeight="900">{totalPaid.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'warning.main', color: 'white', borderRadius: 4 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 50, height: 50 }}><Payment /></Avatar>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{t('total_unpaid_payout')}</Typography>
              <Typography variant="h5" fontWeight="900">{totalUnpaid.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main', width: 50, height: 50 }}><TrendingUp /></Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('incentives_bonuses')}</Typography>
              <Typography variant="h5" fontWeight="900">
                {totalBonuses.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0, '@media print': { display: 'none' } }}>
              <Table stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('employee')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('basic_salary')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('bonus')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('social_insurance')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('income_tax')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('deductions')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('net_salary')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(filteredPayroll) && filteredPayroll.map((p) => (
                    <TableRow key={p?.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main' }}><Person /></Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {i18n.language === 'en' ? (p?.employee?.nameEn || p?.employee?.name) : p?.employee?.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {i18n.language === 'en' ? (p?.employee?.positionEn || p?.employee?.position) : p?.employee?.position}
                              </Typography>
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                • {i18n.language === 'en' ? (p?.employee?.warehouse?.nameEn || p?.employee?.warehouse?.name) : p?.employee?.warehouse?.name}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{(p?.basicSalary || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <TextField 
                          disabled={!canManage || p?.status === 'Paid'} size="small" type="number" variant="standard"
                          value={p?.bonus || 0} onChange={(e) => handleUpdatePayroll(p?.id, 'bonus', e.target.value)} 
                          sx={{ width: 60 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'error.main', fontSize: '0.8rem' }}>
                        {(p?.socialInsurance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ color: 'error.main', fontSize: '0.8rem' }}>
                        {(p?.incomeTax || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <TextField 
                          disabled={!canManage || p?.status === 'Paid'} size="small" type="number" variant="standard"
                          value={p?.deductions || 0} onChange={(e) => handleUpdatePayroll(p?.id, 'deductions', e.target.value)} 
                          sx={{ width: 60 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: '900', color: 'primary.main' }}>
                        {(p?.netSalary || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={t((p?.status || 'Pending').toLowerCase())} size="small" color={p?.status === 'Paid' ? 'success' : 'warning'} sx={{ borderRadius: 1, fontWeight: 'bold' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('view_payslip')}>
                          <IconButton onClick={() => { setSelectedPayroll(p); setOpenView(true); }} color="info"><Receipt fontSize="small" /></IconButton>
                        </Tooltip>
                        {canManage && p?.status !== 'Paid' && (
                          <Tooltip title={t('pay_salary')}>
                            <IconButton onClick={() => handleProcessPayment(p)} color="success"><Payment fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <Grid container spacing={2} sx={{ '@media print': { display: 'none' } }}>
              {Array.isArray(payrollData) && payrollData.map((p) => (
                <Grid size={12} key={p?.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p:2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}><Person /></Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {i18n.language === 'en' ? (p?.employee?.nameEn || p?.employee?.name) : p?.employee?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {i18n.language === 'en' ? (p?.employee?.positionEn || p?.employee?.position) : p?.employee?.position}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={t((p?.status || 'Pending').toLowerCase())} size="small" color={p?.status === 'Paid' ? 'success' : 'warning'} />
                      </Box>
                      
                      <Divider sx={{ mb: 2, opacity: 0.5 }} />
                      
                      <Grid container spacing={1}>
                        <Grid size={4}>
                          <Typography variant="caption" color="text.secondary">{t('basic')}</Typography>
                          <Typography variant="body2" fontWeight="bold">{(p?.basicSalary || 0).toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="success.main">{t('bonus')}</Typography>
                          <TextField size="small" variant="standard" type="number" fullWidth value={p?.bonus || 0} onChange={(e) => handleUpdatePayroll(p?.id, 'bonus', e.target.value)} disabled={!canManage || p?.status === 'Paid'} />
                        </Grid>
                        <Grid size={4}>
                          <Typography variant="caption" color="error.main">{t('deductions')}</Typography>
                          <TextField size="small" variant="standard" type="number" fullWidth value={p?.deductions || 0} onChange={(e) => handleUpdatePayroll(p?.id, 'deductions', e.target.value)} disabled={!canManage || p?.status === 'Paid'} />
                        </Grid>
                      </Grid>
 
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.soft', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="900" color="primary.main">{(p?.netSalary || 0).toLocaleString()} {getCurrencySymbol(settings?.Currency, i18n?.language)}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" onClick={() => { setSelectedPayroll(p); setOpenView(true); }} startIcon={<Receipt />}>{t('payslip')}</Button>
                          {canManage && p?.status !== 'Paid' && (
                            <Button size="small" variant="outlined" color="success" onClick={() => handleProcessPayment(p)} startIcon={<Payment />}>{t('pay')}</Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {payrollData.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="body1" color="text.secondary">{t('no_payroll_generated') || 'No payroll generated for this period.'}</Typography>
            </Box>
          )}
        </>
      )}

      {/* Payslip View Modal */}
      <Dialog open={openView} onClose={() => setOpenView(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', '@media print': { display: 'none' } }}>{t('payslip')}</DialogTitle>
        <DialogContent dividers id="printable-payslip" sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h6" fontWeight="bold" color="primary">{t('official_payslip')}</Typography>
            <Typography variant="subtitle2" sx={{ mt: 0.5, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 'bold', color: 'text.secondary' }}>
              {settings.CompanyName}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, gap: 1 }}>
              <CalendarMonth fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {t(format(new Date(year, month - 1, 1), 'MMMM').toLowerCase())} {year}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', bgcolor: 'action.hover' }}>
            <Grid container sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('employee')}</Typography>
                <Typography variant="subtitle1" fontWeight="900">
                  {i18n.language === 'en' ? (selectedPayroll?.employee?.nameEn || selectedPayroll?.employee?.name) : selectedPayroll?.employee?.name}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('department')}</Typography>
                <Typography variant="subtitle1" fontWeight="700">
                  {i18n.language === 'en' ? (selectedPayroll?.employee?.departmentEn || selectedPayroll?.employee?.department) : selectedPayroll?.employee?.department}
                </Typography>
              </Grid>
            </Grid>
            
            {/* Attendance Summary Section */}
            <Grid container spacing={2} sx={{ mt: 1, p: 2 }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Grid size={4}><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('present')}</Typography><Typography variant="body2" fontWeight="bold">{selectedPayroll?.presentDays || 0}</Typography></Grid>
              <Grid size={4}><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('absent')}</Typography><Typography variant="body2" fontWeight="bold" color="error.main">{selectedPayroll?.absentDays || 0}</Typography></Grid>
              <Grid size={4}><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('leave')}</Typography><Typography variant="body2" fontWeight="bold" color="warning.main">{selectedPayroll?.leaveDays || 0}</Typography></Grid>
            </Grid>
 
            <Grid container sx={{ p: 2 }}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('position')}</Typography>
                <Typography variant="body1" fontWeight="medium">{selectedPayroll?.employee?.position || '---'}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('status')}</Typography>
                <Chip 
                  label={t((selectedPayroll?.status || 'Pending').toLowerCase())} 
                  size="small" 
                  color={selectedPayroll?.status === 'Paid' ? 'success' : 'warning'} 
                  sx={{ fontWeight: 'bold', borderRadius: 1.5 }}
                />
              </Grid>
            </Grid>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 4, mb: 1.5, px: 1, fontWeight: 'bold', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp fontSize="small" /> {t('hr_payroll')}
          </Typography>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('basic_salary')}</Typography>
              <Typography variant="body2" fontWeight="bold">{(selectedPayroll?.basicSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', color: 'success.main' }}>
              <Typography variant="body2">{t('bonus')}</Typography>
              <Typography variant="body2" fontWeight="bold">+ {(selectedPayroll?.bonus || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', color: 'error.main' }}>
              <Typography variant="body2">{t('social_insurance')}</Typography>
              <Typography variant="body2" fontWeight="bold">- {(selectedPayroll?.socialInsurance || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', color: 'error.main' }}>
              <Typography variant="body2">{t('income_tax')}</Typography>
              <Typography variant="body2" fontWeight="bold">- {(selectedPayroll?.incomeTax || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid', borderColor: 'divider', color: 'error.main' }}>
              <Typography variant="body2">{t('other_deductions')}</Typography>
              <Typography variant="body2" fontWeight="bold">- {(selectedPayroll?.deductions || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" fontWeight="900">{t('net_salary')}</Typography>
              <Typography variant="h6" fontWeight="900">
                {(selectedPayroll?.netSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={5} sx={{ mt: 5, textAlign: 'center' }}>
            <Grid size={6} sx={{ textAlign: 'center' }}>
              <Divider sx={{ mb: 1, borderStyle: 'dashed' }} />
              <Typography variant="caption" color="text.secondary">{t('employee_signature')}</Typography>
            </Grid>
            <Grid size={6} sx={{ textAlign: 'center' }}>
              <Divider sx={{ mb: 1, borderStyle: 'dashed' }} />
              <Typography variant="caption" color="text.secondary">{t('manager_official_stamp')}</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, '@media print': { display: 'none' } }}>
          <Button onClick={() => setOpenView(false)} color="inherit">{t('cancel')}</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>{t('print')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-payslip, #printable-payslip *, #bulk-printable-area, #bulk-printable-area * {
              visibility: visible;
            }
            #printable-payslip, #bulk-printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .payslip-page {
              page-break-after: always;
              padding: 40px;
              border-bottom: 2px dashed #eee;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .MuiChip-root {
              border: 1px solid #000 !important;
              color: #000 !important;
            }
          }
        `}
      </style>

      {/* Bulk Print Hidden Area */}
      <Box id="bulk-printable-area" sx={{ display: 'none', '@media print': { display: 'block' } }}>
        {filteredPayroll.map((p, idx) => (
          <Box key={p.id} className="payslip-page">
             <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: '#d32f2f' }}>{t('official_payslip')}</Typography>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold' }}>{settings.CompanyName}</Typography>
              <Typography variant="body1">
                {t(format(new Date(year, month - 1, 1), 'MMMM').toLowerCase())} {year}
              </Typography>
            </Box>

            <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

            <Box sx={{ border: '1px solid #eee', borderRadius: 3, p: 3, mb: 4 }}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>{t('employee')}</Typography>
                  <Typography variant="h6" fontWeight="bold">{p.employee?.name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: '#66', display: 'block' }}>{t('department')}</Typography>
                  <Typography variant="h6">{p.employee?.department}</Typography>
                </Grid>
                <Grid size={6} sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: '#66', display: 'block' }}>{t('position')}</Typography>
                  <Typography variant="body1">{p.employee?.position}</Typography>
                </Grid>
                <Grid size={6} sx={{ mt: 2 }}>
                   <Typography variant="caption" sx={{ color: '#66', display: 'block' }}>{t('warehouse')}</Typography>
                   <Typography variant="body1">{p.employee?.warehouse?.name}</Typography>
                </Grid>
                <Grid size={6} sx={{ mt: 2 }}>
                   <Typography variant="caption" sx={{ color: '#66', display: 'block' }}>{t('status')}</Typography>
                   <Typography variant="body1" fontWeight="bold">{t((p.status || 'Pending').toLowerCase())}</Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ border: '1px solid #eee', borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #eee' }}>
                <Typography>{t('basic_salary')}</Typography>
                <Typography fontWeight="bold">{(p.basicSalary || 0).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #eee' }}>
                <Typography>{t('bonus')}</Typography>
                <Typography fontWeight="bold">+ {(p.bonus || 0).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #eee' }}>
                <Typography>{t('deductions')}</Typography>
                <Typography fontWeight="bold">- {(p.socialInsurance + p.incomeTax + p.deductions || 0).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f9f9f9' }}>
                <Typography variant="h6" fontWeight="900">{t('net_salary')}</Typography>
                <Typography variant="h6" fontWeight="900">{(p.netSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 'auto', pt: 10 }}>
              <Grid container spacing={5} sx={{ textAlign: 'center' }}>
                <Grid size={6}>
                  <Divider sx={{ mb: 1, borderStyle: 'dashed', borderColor: '#000' }} />
                  <Typography variant="caption">{t('employee_signature')}</Typography>
                </Grid>
                <Grid size={6}>
                  <Divider sx={{ mb: 1, borderStyle: 'dashed', borderColor: '#000' }} />
                  <Typography variant="caption">{t('manager_official_stamp')}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Payroll;
