import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider
} from '@mui/material';
import { Add, Visibility, Undo, CheckCircle, Warning, Error } from '@mui/icons-material';
import { Snackbar, Alert, TextField } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';
import { getCurrencySymbol } from '../../utils/currencyHelper';

const API_URL = API_URLS.ORDERS;

const Orders = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { hasPermission } = usePermissions();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState({}); // { productId: qty }
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) return;
    
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({ productId, returnQuantity: qty }));

    if (itemsToReturn.length === 0) {
      setSnackbar({ open: true, message: t('order_validation_error'), severity: 'warning' });
      return;
    }

    try {
      const payload = {
        orderId: selectedOrder.id,
        reason: returnReason,
        items: itemsToReturn
      };

      await axios.post(`${API_URL}/${selectedOrder.id}/return`, payload);
      
      setSnackbar({ open: true, message: t('return_order_success'), severity: 'success' });
      setReturnDialogOpen(false);
      setSelectedOrder(null);
      setReturnReason('');
      setReturnQuantities({});
      fetchOrders();
    } catch (err) {
      const errorMsg = err.response?.data || t('return_order_error');
      setSnackbar({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const calculateCreditTotal = () => {
    if (!selectedOrder) return 0;
    let subtotal = 0;
    Object.entries(returnQuantities).forEach(([productId, qty]) => {
      const item = selectedOrder.details.find(d => d.productId === productId);
      if (item) subtotal += item.unitPrice * qty;
    });
    // Add tax percentage (assuming consistent tax rate from original order)
    const taxRate = (selectedOrder.taxAmount / (selectedOrder.totalAmount - selectedOrder.taxAmount)) || 0.15;
    return subtotal * (1 + taxRate);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            {t('orders')}
          </Typography>
          <PageHelp helpKey="orders" />
        </Box>
        {hasPermission('إصدار الفواتير') && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={() => navigate('/orders/new')}
          >
            {t('create_order')}
          </Button>
        )}
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2, boxShadow: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t('order_id')}</TableCell>
                  <TableCell>{t('customer')}</TableCell>
                  <TableCell>{t('warehouse')}</TableCell>
                  <TableCell>{t('date')}</TableCell>
                  <TableCell align="right">{t('total_amount')}</TableCell>
                  <TableCell align="center">{t('status')}</TableCell>
                  {hasPermission('إصدار الفواتير') && <TableCell align="center">{t('actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(orders) && orders.map((row) => (
                  <TableRow hover key={row.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{row.id.substring(0,8).toUpperCase()}</TableCell>
                    <TableCell>{row.customer?.name || t('unknown')}</TableCell>
                    <TableCell>{row.warehouse?.name || t('unassigned')}</TableCell>
                    <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{row.totalAmount.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={row.status === 0 ? t('pending') : row.status === 1 ? t('completed') : row.status === 4 ? t('returned') : row.status === 2 ? t('cancelled') : t('unknown')} 
                        color={row.status === 0 ? 'warning' : row.status === 1 ? 'success' : row.status === 4 ? 'error' : row.status === 2 ? 'default' : 'default'}
                        size="small"
                        icon={row.status === 4 ? <Undo fontSize="small" /> : undefined}
                      />
                    </TableCell>
                    {hasPermission('إصدار الفواتير') && (
                      <TableCell align="center">
                        <IconButton color="primary" onClick={() => setSelectedOrder(row)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        {row.status !== 2 && row.status !== 4 && (
                          <IconButton color="warning" onClick={() => { setSelectedOrder(row); setReturnDialogOpen(true); }}>
                            <Undo fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!Array.isArray(orders) || orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      {t('no_orders')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      <Dialog open={!!selectedOrder && !returnDialogOpen} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        {selectedOrder && (
          <React.Fragment>
            <DialogTitle>
              {t('order_id')}: #{selectedOrder.id.substring(0,8).toUpperCase()}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={4}>
                  <Typography variant="subtitle2" color="textSecondary">{t('customer')}</Typography>
                  <Typography variant="body1">{selectedOrder.customer?.name}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="subtitle2" color="textSecondary">{t('warehouse')}</Typography>
                  <Typography variant="body1">{selectedOrder.warehouse?.name || t('unassigned')}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="subtitle2" color="textSecondary">{t('date')}</Typography>
                  <Typography variant="body1">{new Date(selectedOrder.orderDate).toLocaleString()}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" sx={{ mb: 2 }}>{t('order_items')}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('product_id')}</TableCell>
                    <TableCell align="right">{t('quantity')}</TableCell>
                    <TableCell align="right">{t('unit_price')}</TableCell>
                    <TableCell align="right">{t('subtotal')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(selectedOrder.details) && selectedOrder.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>{detail.productId.substring(0,8)}</TableCell>
                      <TableCell align="right">{detail.quantity}</TableCell>
                      <TableCell align="right">{detail.unitPrice.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</TableCell>
                      <TableCell align="right">
                        {(detail.quantity * detail.unitPrice).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Typography variant="h6">
                  {t('total_amount')}: {selectedOrder.totalAmount.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedOrder(null)} color="primary">
                {t('close')}
              </Button>
            </DialogActions>
          </React.Fragment>
        )}
      </Dialog>

      {/* Return Dialog (Partial Return Management) */}
      <Dialog 
        open={returnDialogOpen} 
        onClose={() => { setReturnDialogOpen(false); setReturnQuantities({}); }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('return_order')}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            {t('confirm_return_msg')}
          </Typography>

          {selectedOrder && (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>{t('order_items')}</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell>{t('item')}</TableCell>
                        <TableCell align="right">{t('ordered_qty')}</TableCell>
                        <TableCell align="right">{t('returned_so_far')}</TableCell>
                        <TableCell align="right" sx={{ width: 150 }}>{t('return_qty')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.details.map((item) => {
                        const remaining = item.quantity - (item.returnedQuantity || 0);
                        return (
                          <TableRow key={item.productId}>
                            <TableCell>{item.product?.name || item.productId.substring(0,8)}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>{item.returnedQuantity || 0}</TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                fullWidth
                                disabled={remaining <= 0}
                                placeholder={remaining > 0 ? `Max ${remaining}` : t('return_is_full')}
                                value={returnQuantities[item.productId] || ''}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value) || 0;
                                  if (val < 0) val = 0;
                                  if (val > remaining) {
                                    setSnackbar({ open: true, message: t('max_return_error', { qty: remaining }), severity: 'warning' });
                                    val = remaining;
                                  }
                                  setReturnQuantities({ ...returnQuantities, [item.productId]: val });
                                }}
                                inputProps={{ min: 0, max: remaining }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <TextField
                    fullWidth
                    label={t('return_reason')}
                    multiline
                    rows={2}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="overline">{t('credit_total')}</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {calculateCreditTotal().toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => { setReturnDialogOpen(false); setReturnQuantities({}); }}>{t('cancel')}</Button>
          <Button 
            onClick={handleReturn} 
            variant="contained" 
            color="warning" 
            disabled={!returnReason.trim() || calculateCreditTotal() <= 0}
            startIcon={<Undo />}
          >
            {t('confirm_return_btn')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Orders;
