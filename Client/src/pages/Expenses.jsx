import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Grid, 
  TextField, Chip, Avatar, CircularProgress, Alert, MenuItem, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, useMediaQuery, Card, CardContent, Divider
} from '@mui/material';
import { 
  AddCircle, Delete, Receipt, TrendingDown,
  Business, Bolt, Campaign, Category, AccountBalanceWallet,
  CalendarMonth, Description, MoreVert
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { API_URLS } from '../api';
import { getCurrencySymbol } from '../utils/currencyHelper';
import axios from 'axios';
import { format } from 'date-fns';
import { useConfirm } from '../context/ConfirmContext';
import { usePermissions } from '../hooks/usePermissions';
import PageHelp from '../components/PageHelp';


const EXPENSE_CATEGORIES = (t) => [
  { value: 'Rent', label: t('office_shop_rent'), icon: <Business /> },
  { value: 'Utilities', label: t('utilities'), icon: <Bolt /> },
  { value: 'Salaries', label: t('internal_salaries'), icon: <AccountBalanceWallet /> },
  { value: 'Marketing', label: t('marketing_ads'), icon: <Campaign /> },
  { value: 'Maintenance', label: t('maintenance'), icon: <Category /> },
  { value: 'Other', label: t('miscellaneous'), icon: <MoreVert /> },
];

const Expenses = () => {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { settings } = useSettings();
  const { assignedWarehouses, isAdmin } = usePermissions();


  const [expenses, setExpenses] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 1, // 1 for Expense in FinancialTransaction Enum
    category: 'Other',
    warehouseId: ''
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const [expRes, whRes] = await Promise.all([
        axios.get(API_URLS.FINANCE),
        axios.get(API_URLS.WAREHOUSES)
      ]);
      const filteredWarehouses = whRes.data;
      
      console.log("Debug - Assigned IDs from State:", assignedWarehouses);
      console.log("Debug - Warehouses from API:", whRes.data);

      setExpenses(expRes.data.filter(t => t.type === 1)); // Filter for Expenses
      setWarehouses(filteredWarehouses);
      
      if (filteredWarehouses.length > 0) {
          // If only one warehouse, select it by default
          if (filteredWarehouses.length === 1 && !newExpense.warehouseId) {
            setNewExpense(prev => ({ ...prev, warehouseId: filteredWarehouses[0].id }));
          }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async () => {
    try {
      await axios.post(API_URLS.FINANCE, {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        description: `[${newExpense.category}] ${newExpense.description}`
      });
      setOpenAdd(false);
      fetchExpenses();
      setNewExpense({ description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), type: 1, category: 'Other', warehouseId: warehouses.length === 1 ? warehouses[0].id : '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: t('delete_expense_title'), message: t('delete_expense_msg') })) {
      try {
        await axios.delete(`${API_URLS.FINANCE}/${id}`);
        fetchExpenses();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main">
              {t('expenses_management')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('expenses_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="expenses" />
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddCircle />} 
          onClick={() => setOpenAdd(true)}
          sx={{ borderRadius: 3, boxShadow: 6, px: 3 }}
        >
          {t('add_expense') || 'Add Expense'}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: theme.palette.error.soft, color: 'error.main', borderRadius: 4, border: '1px solid', borderColor: 'error.light' }}>
            <Avatar sx={{ bgcolor: 'error.main', color: 'white', width: 50, height: 50 }}><TrendingDown /></Avatar>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 'bold', opacity: 0.8 }}>{t('total_monthly_expenses')}</Typography>
              <Typography variant="h5" fontWeight="900">{totalExpenses.toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', elevation: 0 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('description')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('amount')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('warehouse')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>{format(new Date(exp.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">{exp.description}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    - {exp.amount.toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={warehouses.find(w => w.id === exp.warehouseId)?.name || t('global')} 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('no_records_found')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Modal */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('add_new_expense')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField 
                select fullWidth label={t('category')} 
                value={newExpense.category} 
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              >
                {EXPENSE_CATEGORIES(t).map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField 
                required fullWidth type="number" label={t('amount')} 
                value={newExpense.amount} 
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              />
            </Grid>
            <Grid size={12}>
              <TextField 
                select fullWidth label={t('warehouse')} 
                value={newExpense.warehouseId} 
                onChange={(e) => setNewExpense({...newExpense, warehouseId: e.target.value})}
                required
              >
                <MenuItem value="" disabled>{t('select_warehouse')}</MenuItem>
                {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField 
                fullWidth label={t('date')} type="date" 
                value={newExpense.date} 
                onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <TextField 
                fullWidth label={t('notes')} multiline rows={2} 
                value={newExpense.description} 
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdd(false)} color="inherit">{t('cancel')}</Button>
          <Button variant="contained" onClick={handleAddExpense}>{t('save_expense')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
