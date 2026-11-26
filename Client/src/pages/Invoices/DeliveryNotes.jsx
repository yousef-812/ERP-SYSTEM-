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
  IconButton, 
  Button, 
  alpha,
  useTheme,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  LocalShipping, 
  Visibility, 
  PictureAsPdf, 
  Search, 
  CheckCircle, 
  PendingActions,
  FilterList
} from '@mui/icons-material';
import { API_URLS, apiClient } from '../../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

const DeliveryNotes = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(API_URLS.ORDERS);
      const deliveryReady = Array.isArray(res.data) ? res.data.filter(o => o.status === 1 || o.status === 3) : [];
      setOrders(deliveryReady);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId, shouldPrint = false) => {
    try {
      // Find and set basic order data from the list first so the dialog isn't empty while loading
      const basicOrder = orders.find(o => o.id === orderId);
      if (basicOrder) setSelectedOrder(basicOrder);

      setLoading(true);
      const res = await apiClient.get(`${API_URLS.ORDERS}/${orderId}`);
      
      if (res.data && res.data.id) {
        // Use functional update to merge data safely
        setSelectedOrder(prev => ({ ...prev, ...res.data }));
      }
      
      if (shouldPrint) {
        // Give time for state to update and dialog to render
        setTimeout(() => {
          handlePrint(orderId);
        }, 300);
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      // If full fetch fails, at least we have the basic info shown
      if (!selectedOrder) {
         setSnackbar({ open: true, message: t('error_fetching'), severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (orderId) => {
    const originalTitle = document.title;
    const orderNum = orderId ? String(orderId).substring(0, 8).toUpperCase() : 'Doc';
    document.title = `DeliveryNote_${orderNum}`;
    window.print();
    document.title = originalTitle;
  };

  const handleShipOrder = async (orderId) => {
    try {
      setLoading(true);
      await apiClient.post(`${API_URLS.ORDERS}/${orderId}/ship`);
      setSnackbar({ open: true, message: t('order_shipped_success'), severity: 'success' });
      fetchOrders(); // Refresh list
    } catch (err) {
      console.error("Error shipping order:", err);
      setSnackbar({ open: true, message: t('error_shipping'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(o => {
    const matchesSearch = (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (o.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'ready' && o.status === 1) || 
                         (statusFilter === 'shipped' && o.status === 3);
    return matchesSearch && matchesStatus;
  }) : [];

  if (loading && orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -1.5 }}>
            {t('delivery_notes')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('manage_shipping_and_deliveries')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder={t('search_orders')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { borderRadius: 2 }
            }}
          />
          <Button 
            variant="outlined" 
            startIcon={<FilterList />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
          >
            {t('filter')} {statusFilter !== 'all' && `(${t(statusFilter)})`}
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => { setStatusFilter('all'); setAnchorEl(null); }}>{t('all')}</MenuItem>
            <MenuItem onClick={() => { setStatusFilter('ready'); setAnchorEl(null); }}>{t('ready_for_shipping')}</MenuItem>
            <MenuItem onClick={() => { setStatusFilter('shipped'); setAnchorEl(null); }}>{t('shipped')}</MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }} className="no-print">
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2, width: 44, height: 44 }}>
                    <PendingActions />
                </Avatar>
                <Box>
                    <Typography variant="h5" fontWeight="800">{(Array.isArray(orders) ? orders : []).filter(o => o.status === 1).length}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">{t('ready_for_shipping')}</Typography>
                </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', borderRadius: 2, width: 44, height: 44 }}>
                    <LocalShipping />
                </Avatar>
                <Box>
                    <Typography variant="h5" fontWeight="800">{(Array.isArray(orders) ? orders : []).filter(o => o.status === 3).length}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">{t('shipped')}</Typography>
                </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} className="no-print" sx={{ borderRadius: 4, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.04)', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: alpha(theme.palette.background.default, 0.5) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: '700' }}>{t('order_id')}</TableCell>
              <TableCell sx={{ fontWeight: '700' }}>{t('customer')}</TableCell>
              <TableCell sx={{ fontWeight: '700' }}>{t('date')}</TableCell>
              <TableCell sx={{ fontWeight: '700' }}>{t('status')}</TableCell>
              <TableCell align="center" sx={{ fontWeight: '700' }}>{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>
                    <Typography variant="body2" fontWeight="700">#{(order.id || '').substring(0,8).toUpperCase()}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="600">{order.customer?.name || t('unknown')}</Typography>
                  <Typography variant="caption" color="text.secondary">{order.customer?.phone}</Typography>
                </TableCell>
                <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                <TableCell>
                   <Chip 
                    label={order.status === 3 ? t('shipped') : t('ready_to_ship')} 
                    color={order.status === 3 ? "success" : "primary"}
                    size="small"
                    variant="soft"
                    sx={{ fontWeight: '700' }}
                  />
                </TableCell>
                <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title={t('view_details')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDetails(order.id, false)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<PictureAsPdf />}
                            onClick={() => handleViewDetails(order.id, true)}
                            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 'bold' }}
                        >
                            {t('delivery_note')}
                        </Button>
                        {order.status === 1 && (
                            <Button 
                                variant="contained" 
                                size="small" 
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleShipOrder(order.id)}
                                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 'bold' }}
                            >
                                {t('confirm_shipping')}
                            </Button>
                        )}
                    </Box>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">{t('no_orders_found')}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog / Printable Section */}
      <Dialog 
        open={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedOrder && (
          <Box id="delivery-note-print">
            <DialogTitle sx={{ fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight="800">
                  {t('delivery_note')} #{(selectedOrder.id || '').substring(0,8).toUpperCase()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedOrder.orderDate || selectedOrder.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Chip 
                label={selectedOrder.status === 3 ? t('shipped') : t('ready_to_ship')} 
                color={selectedOrder.status === 3 ? "success" : "primary"}
                size="small"
                className="no-print"
                sx={{ fontWeight: '700' }}
              />
            </DialogTitle>
            <DialogContent dividers>
              {/* Print Header (Only visible when printing) */}
              <Box sx={{ display: 'none', displayPrint: 'block', mb: 4 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary">{settings.CompanyName}</Typography>
                  <Typography variant="body2">{settings.Address}</Typography>
                  <Divider sx={{ my: 2 }} />
              </Box>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="700">{t('customer_details')}</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, borderRadius: 2, bgcolor: 'action.hover', borderStyle: 'dashed' }}>
                    <Typography variant="body1" fontWeight="700">{selectedOrder.customer?.name || t('unknown')}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedOrder.customer?.phone || t('no_phone')}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedOrder.customer?.address || t('no_address')}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="700">{t('shipping_info')}</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, borderRadius: 2, bgcolor: 'action.hover', borderStyle: 'dashed' }}>
                    <Typography variant="body1" fontWeight="700">{selectedOrder.warehouse?.name || t('unassigned')}</Typography>
                    <Typography variant="body2" color="text.secondary">{selectedOrder.warehouse?.location || t('no_location')}</Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" color="text.secondary" fontWeight="700" sx={{ mb: 1 }}>{t('order_items')}</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: '700' }}>{t('product')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: '700' }}>{t('quantity')}</TableCell>
                      <TableCell align="center" className="print-only" sx={{ display: 'none', displayPrint: 'table-cell', fontWeight: '700' }}>{t('received')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(selectedOrder.details) && selectedOrder.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell>{detail.product?.name || (detail.productId || '').substring(0,8)}</TableCell>
                        <TableCell align="right" fontWeight="700">{detail.quantity}</TableCell>
                        <TableCell align="center" className="print-only" sx={{ display: 'none', displayPrint: 'table-cell' }}>[ ]</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Print Footer */}
              <Box sx={{ display: 'none', displayPrint: 'flex', justifyContent: 'space-between', mt: 8 }}>
                  <Typography variant="body2">____________________<br />{t('delivered_by')}</Typography>
                  <Typography variant="body2">____________________<br />{t('recipient_signature')}</Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }} className="no-print">
              <Button onClick={() => setSelectedOrder(null)} sx={{ fontWeight: '700' }}>{t('close')}</Button>
              <Button 
                variant="contained" 
                startIcon={<PictureAsPdf />}
                onClick={() => handlePrint(selectedOrder.id)}
                sx={{ borderRadius: 2, fontWeight: '700' }}
              >
                {t('print')}
              </Button>
            </DialogActions>
          </Box>
        )}
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

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #delivery-note-print, #delivery-note-print * {
              visibility: visible;
            }
            #delivery-note-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              box-shadow: none;
            }
            .no-print {
              display: none !important;
            }
            .MuiDialog-container {
              display: block !important;
            }
            .MuiPaper-root {
               box-shadow: none !important;
               border: none !important;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default DeliveryNotes;
