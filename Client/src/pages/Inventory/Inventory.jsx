import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, MenuItem, CircularProgress, Snackbar, Alert,
  Tabs, Tab, Divider
} from '@mui/material';
import { AddBox, History, Assessment, Adjust } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';

const Inventory = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { hasPermission } = usePermissions();
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { assignedWarehouses, isAdmin } = usePermissions();
  
  // Modals
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState([]);

  // Form States
  const [adjustForm, setAdjustForm] = useState({ productId: '', warehouseId: '', adjustmentQuantity: 0, note: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Products and Warehouses (critical for the page)
      const [prodRes, whRes] = await Promise.all([
        axios.get(API_URLS.PRODUCTS),
        axios.get(API_URLS.WAREHOUSES)
      ]);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);

      // Fetch Suppliers gracefully (optional, might throw 403 if user lacks Procurement permissions)
      try {
        const suppRes = await axios.get(API_URLS.SUPPLIERS);
        setSuppliers(suppRes.data);
      } catch (suppErr) {
        console.warn("Could not fetch suppliers (User might lack View Suppliers permission).", suppErr);
        setSuppliers([]); // Default to empty array
      }

    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchHistory = async (productId) => {
    try {
      const res = await axios.get(API_URLS.STOCK.HISTORY(productId));
      setHistory(res.data);
      setHistoryOpen(true);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    }
  };



  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API_URLS.STOCK.ADJUST, adjustForm);
      showSnackbar(t('stock_adjust_success'));
      setAdjustOpen(false);
      fetchData();
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    }
  };

  const getMovementTypeLabel = (type) => {
    switch (type) {
      case 0: return { label: t('incoming'), color: 'success' };
      case 1: return { label: t('outgoing'), color: 'error' };
      case 2: return { label: t('adjustment'), color: 'warning' };
      case 3: return { label: t('return'), color: 'info' };
      case 4: return { label: t('internal_transfer'), color: 'primary' };
      default: return { label: t('unknown'), color: 'default' };
    }
  };

  if (loading && products.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {t('inventory_levels')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('inventory_levels_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="inventory" />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={t('current_stock')} icon={<Assessment />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box>
           <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>

            {hasPermission('تسويات مخزنية') && (
              <Button 
                  variant="outlined" 
                  startIcon={<Adjust />} 
                  onClick={() => setAdjustOpen(true)}
                  color="warning"
              >
                  {t('adjust_stock')}
              </Button>
            )}
          </Box>

          <Paper sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('product_name')}</TableCell>
                    <TableCell>{t('sku')}</TableCell>
                    <TableCell align="right">{t('price')}</TableCell>
                    <TableCell align="right">{t('stock')}</TableCell>
                    <TableCell align="right">{t('min_stock_level')}</TableCell>
                    <TableCell align="center">{t('actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(products) && products.map((p) => (
                    <TableRow key={p?.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {i18n.language === 'en' ? (p?.nameEn || p?.name) : p?.name}
                      </TableCell>
                      <TableCell>{p?.sku}</TableCell>
                      <TableCell align="right">{(p?.price || 0).toLocaleString()} {settings?.Currency}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={p?.stockQuantity || 0} 
                          color={(p?.stockQuantity || 0) <= (p?.minStockLevel || 0) ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{p?.minStockLevel || 0}</TableCell>
                      <TableCell align="center">
                        <IconButton color="info" onClick={() => fetchHistory(p?.id)} title={t('stock_history')}>
                          <History fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}



      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAdjustSubmit}>
          <DialogTitle>{t('adjust_stock')}</DialogTitle>
          <DialogContent dividers sx={{ minWidth: { xs: '100%', sm: 500 } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <TextField
                select
                fullWidth
                label={t('select_product')}
                value={adjustForm.productId}
                onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                required
              >
                <MenuItem value="" disabled>{t('none')}</MenuItem>
                {Array.isArray(products) && products.map(p => (
                  <MenuItem key={p?.id} value={p?.id}>
                    {i18n.language === 'en' ? (p?.nameEn || p?.name) : p?.name} ({p?.stockQuantity || 0} {t('in_stock_count')})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label={t('select_warehouse')}
                value={adjustForm.warehouseId}
                onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                required
              >
                <MenuItem value="" disabled>{t('none')}</MenuItem>
                {Array.isArray(warehouses) && warehouses.map(w => (
                  <MenuItem key={w?.id} value={w?.id}>
                    {i18n.language === 'en' ? (w?.nameEn || w?.name) : w?.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                type="number"
                label={t('qty')}
                value={adjustForm.adjustmentQuantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentQuantity: parseInt(e.target.value) })}
                required
                helperText={t('adjustment_helper')}
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('note')}
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                required
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAdjustOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" variant="contained" color="warning">{t('adjust_stock')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('stock_history')}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('date')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell>{t('qty')}</TableCell>
                <TableCell>{t('supplier_name')}</TableCell>
                <TableCell>{t('unit_cost')}</TableCell>
                <TableCell>{t('note')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(history) && history.map((m) => {
                const info = getMovementTypeLabel(m?.type);
                return (
                  <TableRow key={m?.id}>
                    <TableCell>{m?.movementDate ? new Date(m.movementDate).toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <Chip label={info?.label || t('unknown')} color={info?.color || 'default'} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {(m?.quantity || 0) > 0 ? `+${m?.quantity}` : m?.quantity}
                    </TableCell>
                    <TableCell>
                        {i18n.language === 'en' ? (m?.supplier?.nameEn || m?.supplier?.name || '-') : (m?.supplier?.name || '-')}
                    </TableCell>
                    <TableCell>{(m?.unitCost || 0).toLocaleString()} {getCurrencySymbol(settings?.Currency, i18n?.language)}</TableCell>
                    <TableCell>{m?.note || '-'}</TableCell>
                  </TableRow>
                );
              })}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>{t('no_movement_history')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)} color="primary">{t('close')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Inventory;
