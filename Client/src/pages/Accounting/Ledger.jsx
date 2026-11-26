import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  CircularProgress, 
  Card,
  CardContent,
  Avatar,
  TextField,
  MenuItem,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider
} from '@mui/material';
import { 
  ReceiptLong, 
  TrendingUp, 
  TrendingDown, 
  AccountBalance,
  FilterAlt,
  Download,
  Print,
  MoreVert,
  HelpOutline
} from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { API_URLS } from '../../api';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import { usePermissions } from '../../hooks/usePermissions';
import PageHelp from '../../components/PageHelp';


const Ledger = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [helpOpen, setHelpOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const { assignedWarehouses, isAdmin } = usePermissions();


  useEffect(() => {
    fetchTransactions();
    fetchWarehouses();
  }, [selectedWarehouse]);


  useEffect(() => {
    if (printPreview) {
      const timer = setTimeout(() => {
        window.print();
        setPrintPreview(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [printPreview]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URLS.ACCOUNTING.JOURNAL_DETAILS}${selectedWarehouse ? `?warehouseId=${selectedWarehouse}` : ''}`);
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(API_URLS.WAREHOUSES);
      const filtered = res.data.filter(w => isAdmin || assignedWarehouses.includes(w.id));
      setWarehouses(filtered);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const filteredTransactions = Array.isArray(transactions) ? transactions.filter(tx => 
    filterType === 'all' || tx.lines?.some(l => l.type?.toLowerCase() === filterType)
  ) : [];

  const totalDebits = Array.isArray(transactions) ? transactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0) : 0;
  
  const translateDynamicDescription = (desc) => {
    if (!desc) return '';
    let translated = desc;
    
    const patterns = [
        { en: 'Inventory Adjustment', key: 'inventory_adjustment_desc' },
        { en: 'Inventory Damage', key: 'inventory_damage_desc' },
        { en: 'Inventory Receiving', key: 'inventory_receiving_desc' },
        { en: 'Inventory Issue', key: 'inventory_issue_desc' },
        { en: 'Inventory Return', key: 'inventory_return_desc' },
        { en: 'Stock Receive', key: 'stock_receive_desc' },
        { en: 'Stock Loss', key: 'stock_loss_desc' },
        { en: 'Stock Gain', key: 'stock_gain_desc' },
        { en: 'Revenue from Invoice', key: 'revenue_from_invoice_desc' },
        { en: 'Refund for Return', key: 'refund_for_return_desc' },
        { en: 'Invoice Payment', key: 'invoice_payment_desc' },
        { en: 'Salary Payment', key: 'salary_payment_desc' },
        { en: '(Auto-sync)', key: 'auto_sync', wrap: true }
    ];

    patterns.forEach(p => {
        if (p.wrap) {
            if (desc.includes(p.en)) {
                translated = translated.replace(p.en, `(${t(p.key)})`);
            }
        } else {
            if (desc.includes(p.en)) {
                translated = translated.replace(p.en, t(p.key));
            }
        }
    });
    
    return translated;
  };

  if (loading && transactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ReceiptLong color="primary" fontSize="large" /> {t('general_ledger')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('view_all_financial_transactions')}
            </Typography>
          </Box>
          <PageHelp helpKey="general_ledger" />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }} className="no-print">
           <Tooltip title={t('help')}>
             <IconButton color="primary" onClick={() => setHelpOpen(true)}>
                <HelpOutline fontSize="small" />
             </IconButton>
           </Tooltip>
           <IconButton onClick={() => setPrintPreview(true)} title={t('print')}>
             <Print fontSize="small" />
           </IconButton>
        </Box>
      </Box>

      {/* Print-Only Header */}
      <Box className="print-only" sx={{ display: 'none', textAlign: 'center', mb: 4 }}>
         <Typography variant="h4" fontWeight="bold">{settings.CompanyName || t('app_name')}</Typography>
         <Typography variant="h5" sx={{ mt: 1 }}>{t('general_ledger')}</Typography>
         <Divider sx={{ my: 2, borderColor: 'black' }} />
      </Box>
      {/* Financial Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }} className="no-print">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', borderRadius: 2 }}>
                  <AccountBalance />
                </Avatar>
                <Chip label={t('total_journal_volume')} size="small" color="primary" variant="soft" sx={{ fontWeight: 'bold' }} />
              </Box>
              <Typography variant="h4" fontWeight="800">
                {totalDebits.toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
           <Card sx={{ borderRadius: 4, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', borderRadius: 2 }}>
                  <ReceiptLong />
                </Avatar>
                <Chip label={t('entries_count')} size="small" color="success" variant="soft" sx={{ fontWeight: 'bold' }} />
              </Box>
              <Typography variant="h4" fontWeight="800">
                {transactions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 4, p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 3 }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterAlt color="action" />
          <Typography variant="body2" fontWeight="700">{t('filters')}:</Typography>
        </Box>
        <TextField
          select
          size="small"
          label={t('account_type')}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          <MenuItem value="all">{t('all_types')}</MenuItem>
          <MenuItem value="asset">{t('asset')}</MenuItem>
          <MenuItem value="liability">{t('liability')}</MenuItem>
          <MenuItem value="equity">{t('equity')}</MenuItem>
          <MenuItem value="revenue">{t('revenue')}</MenuItem>
          <MenuItem value="expense">{t('expense')}</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label={t('warehouse')}
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          <MenuItem value="">{t('all_warehouses', 'كافة المستودعات')}</MenuItem>
          {warehouses.map(w => (
            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
          ))}
        </TextField>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Table stickyHeader>
          <TableHead sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: '700' }}>{t('date')}</TableCell>
              <TableCell sx={{ fontWeight: '700' }}>{t('journal_reference')}</TableCell>
              <TableCell sx={{ fontWeight: '700' }}>{t('journal_account')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: '700' }}>{t('journal_debit')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: '700' }}>{t('journal_credit')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.length > 0 ? filteredTransactions.map((tx) => (
              <React.Fragment key={tx.id}>
                {/* Journal Header Row */}
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  <TableCell rowSpan={Math.max(tx.lines?.length || 1, 1) + 1} sx={{ verticalAlign: 'top', borderRight: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="700">{new Date(tx.date).toLocaleDateString(i18n.language)}</Typography>
                     <Typography variant="caption" color="text.secondary">{new Date(tx.date).toLocaleTimeString(i18n.language)}</Typography>
                  </TableCell>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" fontWeight="800" color="primary.main">{tx.reference}</Typography>
                    <Typography variant="caption" color="text.secondary">{translateDynamicDescription(tx.description)}</Typography>
                  </TableCell>
                </TableRow>
                {/* Journal Lines */}
                {Array.isArray(tx.lines) && tx.lines.map((line, idx) => (
                    <TableRow key={idx}>
                        <TableCell>
                            <Box sx={{ pl: line.credit > 0 ? 4 : 0 }}>
                                <Typography variant="body2" fontWeight="600">{t(line.accountName)}</Typography>
                                <Typography variant="caption" color="text.secondary">{t('code')}: {line.accountCode} • {t('type')}: {t(line.type?.toLowerCase())}</Typography>
                            </Box>
                        </TableCell>
                        <TableCell align="right">
                           {line.debit > 0 ? (
                               <Typography fontWeight="bold">{line.debit.toLocaleString(i18n.language)} {getCurrencySymbol(tx.currency, i18n.language)}</Typography>
                           ) : '-'}
                        </TableCell>
                        <TableCell align="right">
                            {line.credit > 0 ? (
                               <Typography fontWeight="bold">{line.credit.toLocaleString(i18n.language)} {getCurrencySymbol(tx.currency, i18n.language)}</Typography>
                           ) : '-'}
                        </TableCell>
                    </TableRow>
                ))}
              </React.Fragment>
            )) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{t('no_journal_entries')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>

        </Table>
      </TableContainer>

      {/* Help Dialog */}
      <Dialog 
        open={helpOpen} 
        onClose={() => setHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: '900', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutline />
          {t('ledger_help_title')}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
            {t('ledger_help_intro')}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="800" color="primary" gutterBottom>
              {t('ledger_help_filters_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('ledger_help_filters_desc')}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="800" color="primary" gutterBottom>
              {t('ledger_help_metrics_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {t('ledger_help_metrics_desc')}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Box>
            <Typography variant="subtitle1" fontWeight="800" color="primary" gutterBottom>
              {t('ledger_help_table_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('ledger_help_table_desc')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setHelpOpen(false)} 
            variant="contained" 
            sx={{ borderRadius: 2, px: 4 }}
          >
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Print Preview Dialog */}
      <Dialog 
        open={printPreview} 
        onClose={() => setPrintPreview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: { xs: 4, print: 0 }, bgcolor: 'white', color: 'black', boxShadow: { print: 'none' } } }}
      >
        <DialogContent sx={{ p: 4 }}>
            {/* The actual content to be printed */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">{settings.CompanyName || t('app_name')}</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{t('general_ledger')}</Typography>
                <Divider sx={{ my: 2, borderColor: 'black' }} />
                <Typography variant="body2" sx={{ mb: 2 }}>{t('report_date')}: {new Date().toLocaleDateString(i18n.language)}</Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: { xs: '1px solid #eee', print: 'none' } }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{t('journal_reference')}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{t('journal_account')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('journal_debit')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('journal_credit')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTransactions.map((tx) => (
                            <React.Fragment key={tx.id}>
                                <TableRow sx={{ bgcolor: '#fafafa' }}>
                                    <TableCell sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>{new Date(tx.date).toLocaleDateString()}</TableCell>
                                    <TableCell colSpan={4}>
                                        <Typography variant="body2" fontWeight="bold">{tx.reference}</Typography>
                                        <Typography variant="caption">{translateDynamicDescription(tx.description)}</Typography>
                                    </TableCell>
                                </TableRow>
                                {tx.lines?.map((line, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell sx={{ pl: line.credit > 0 ? 4 : 2 }}>{t(line.accountName)}</TableCell>
                                        <TableCell align="right">{line.debit > 0 ? line.debit.toLocaleString() : '-'}</TableCell>
                                        <TableCell align="right">{line.credit > 0 ? line.credit.toLocaleString() : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))}
                        <TableRow sx={{ bgcolor: '#eee' }}>
                           <TableCell colSpan={3} sx={{ fontWeight: 'bold', textAlign: 'right' }}>{t('total')}</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalDebits.toLocaleString()}</TableCell>
                           <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalDebits.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Ledger;
