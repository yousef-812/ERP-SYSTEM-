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
  Button, 
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  CircularProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  alpha,
  useTheme,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  LocalShipping as LongHaulIcon, 
  CheckCircle as ReceivedIcon,
  Visibility as ViewIcon,
  CompareArrows as TransferIcon,
  ArrowForward as ShipIcon,
  History as HistoryIcon,
  Business as WarehouseIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';
import { usePermissions } from '../../hooks/usePermissions';

const WarehouseTransfers = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { assignedWarehouses, isAdmin } = usePermissions();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [newTransfer, setNewTransfer] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [] });
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [currentItem, setCurrentItem] = useState({ productId: '', quantity: 1 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, whRes, prodRes] = await Promise.all([
        axios.get(API_URLS.WAREHOUSE_TRANSFERS),
        axios.get(API_URLS.WAREHOUSES),
        axios.get(API_URLS.PRODUCTS)
      ]);
      setTransfers(transRes.data);
      setWarehouses(whRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (newTransfer.fromWarehouseId === newTransfer.toWarehouseId) {
      setSnackbar({ open: true, message: t('same_warehouse_error'), severity: 'error' });
      return;
    }
    if (newTransfer.items.length === 0) {
      setSnackbar({ open: true, message: t('no_items_error'), severity: 'error' });
      return;
    }

    try {
      await axios.post(API_URLS.WAREHOUSE_TRANSFERS, newTransfer);
      setOpenAdd(false);
      fetchData();
      setSnackbar({ open: true, message: t('transfer_created'), severity: 'success' });
      setNewTransfer({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [] });
    } catch (err) {
      setSnackbar({ open: true, message: parseError(err), severity: 'error' });
    }
  };

  const handleShip = async (id) => {
    try {
      await axios.post(`${API_URLS.WAREHOUSE_TRANSFERS}/${id}/ship`);
      fetchData();
      setSnackbar({ open: true, message: t('transfer_shipped'), severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: parseError(err), severity: 'error' });
    }
  };

  const handleReceive = async (id) => {
    try {
      await axios.post(`${API_URLS.WAREHOUSE_TRANSFERS}/${id}/receive`);
      fetchData();
      setSnackbar({ open: true, message: t('transfer_received'), severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: parseError(err), severity: 'error' });
    }
  };

  const handleView = (transfer) => {
    setSelectedTransfer(transfer);
    setOpenView(true);
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t('confirm_cancel_transfer'))) return;
    try {
      await axios.post(`${API_URLS.WAREHOUSE_TRANSFERS}/${id}/cancel`);
      fetchData();
      setSnackbar({ open: true, message: t('transfer_cancelled'), severity: 'info' });
    } catch (err) {
      setSnackbar({ open: true, message: parseError(err), severity: 'error' });
    }
  };

  const removeItem = (index) => {
    const updatedItems = [...newTransfer.items];
    updatedItems.splice(index, 1);
    setNewTransfer({ ...newTransfer, items: updatedItems });
  };

  const parseError = (err) => {
    const data = err.response?.data;
    if (data && typeof data === 'object' && data.errorKey) {
      return t(data.errorKey, { product: data.product, available: data.available });
    }
    return typeof data === 'string' ? data : t('error');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 0: return 'warning'; // Pending
      case 1: return 'info';    // Shipped
      case 2: return 'success'; // Received
      case 3: return 'error';   // Cancelled
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
      const labels = [t('pending'), t('shipped'), t('received'), t('cancelled')];
      return labels[status] || 'Unknown';
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TransferIcon color="primary" fontSize="large" /> {t('internal_transfers')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('manage_internal_logistics')}
            </Typography>
          </Box>
          <PageHelp helpKey="internal_transfer" />
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpenAdd(true)}
          sx={{ borderRadius: 2, px: 3, fontWeight: 'bold' }}
        >
          {t('new_transfer')}
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('transfer_number')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('from')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('to')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress sx={{ my: 3 }} /></TableCell></TableRow>
              ) : (!Array.isArray(transfers) || transfers.length === 0) ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>{t('no_transfers_found')}</TableCell></TableRow>
              ) : transfers.map((trf) => (
                <TableRow key={trf.id} hover>
                  <TableCell fontWeight="bold">{trf.transferNumber}</TableCell>
                  <TableCell>
                    <Chip size="small" icon={<WarehouseIcon fontSize="small" />} label={i18n.language === 'en' ? (trf.fromWarehouse?.nameEn || trf.fromWarehouse?.name) : trf.fromWarehouse?.name} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" icon={<WarehouseIcon fontSize="small" />} label={i18n.language === 'en' ? (trf.toWarehouse?.nameEn || trf.toWarehouse?.name) : trf.toWarehouse?.name} variant="outlined" />
                  </TableCell>
                  <TableCell>{new Date(trf.transferDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(trf.status)} 
                      color={getStatusColor(trf.status)} 
                      size="small" 
                      sx={{ fontWeight: 'bold', borderRadius: 1 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {trf.status === 0 && (isAdmin || assignedWarehouses.includes(trf.fromWarehouseId)) && (
                        <Tooltip title={t('ship_now')}>
                          <IconButton size="small" color="primary" onClick={() => handleShip(trf.id)}>
                            <ShipIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {trf.status === 1 && (isAdmin || assignedWarehouses.includes(trf.toWarehouseId)) && (
                        <Tooltip title={t('mark_received')}>
                          <IconButton size="small" color="success" onClick={() => handleReceive(trf.id)}>
                            <ReceivedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {trf.status === 0 && (isAdmin || assignedWarehouses.includes(trf.fromWarehouseId)) && (
                        <Tooltip title={t('cancel_transfer')}>
                          <IconButton size="small" color="error" onClick={() => handleCancel(trf.id)}>
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => handleView(trf)}><ViewIcon /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('create_new_transfer')}</DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={3}>
             <FormControl fullWidth>
               <InputLabel>{t('from_warehouse')}</InputLabel>
                <Select
                  value={newTransfer.fromWarehouseId || ''}
                  label={t('from_warehouse')}
                  onChange={(e) => {
                    setNewTransfer({...newTransfer, fromWarehouseId: e.target.value, items: []});
                    setCurrentItem({ productId: '', quantity: 1 });
                  }}
                >
                  {warehouses
                    .filter(w => isAdmin || assignedWarehouses.includes(w.id))
                    .map(w => (
                      <MenuItem key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                      </MenuItem>
                    ))
                  }
                </Select>
             </FormControl>

             <FormControl fullWidth>
               <InputLabel>{t('to_warehouse')}</InputLabel>
               <Select
                 value={newTransfer.toWarehouseId || ''}
                 label={t('to_warehouse')}
                 onChange={(e) => setNewTransfer({...newTransfer, toWarehouseId: e.target.value})}
               >
                 <MenuItem value="" disabled><em>{t('select_warehouse')}</em></MenuItem>
                 {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                    </MenuItem>
                 ))}
               </Select>
             </FormControl>

            <Divider />

            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.action.selected, 0.05), borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('add_items')}</Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <FormControl fullWidth size="small" disabled={!newTransfer.fromWarehouseId}>
                  <InputLabel>{t('product')}</InputLabel>
                  <Select
                    value=""
                    label={t('product')}
                    onChange={(e) => {
                      const productId = e.target.value;
                      if (productId) {
                        const product = products.find(p => p.id === productId);
                        setNewTransfer({
                          ...newTransfer, 
                          items: [...newTransfer.items, { 
                            productId, 
                            quantity: 1, 
                            productName: i18n.language === 'en' ? (product?.nameEn || product?.name) : product?.name 
                          }]
                        });
                      }
                    }}
                  >
                    {!newTransfer.fromWarehouseId && (
                      <MenuItem disabled><em>{t('please_select_warehouse_first')}</em></MenuItem>
                    )}
                    {newTransfer.fromWarehouseId && products.filter(p => p.stockLevels?.some(sl => sl.warehouseId === newTransfer.fromWarehouseId && sl.quantity > 0)).length === 0 && (
                      <MenuItem disabled><em>{t('no_products_found')}</em></MenuItem>
                    )}
                    {newTransfer.fromWarehouseId && products
                      .filter(p => {
                        const level = p.stockLevels?.find(sl => sl.warehouseId === newTransfer.fromWarehouseId);
                        return level && level.quantity > 0;
                      })
                      .map(p => {
                        const level = p.stockLevels?.find(sl => sl.warehouseId === newTransfer.fromWarehouseId);
                        return (
                          <MenuItem key={p.id} value={p.id}>
                            {i18n.language === 'en' ? (p.nameEn || p.name) : p.name} ({level.quantity} {t('in_stock')})
                          </MenuItem>
                        );
                      })
                    }
                  </Select>
                </FormControl>
              </Stack>
              
              <Stack spacing={1}>
                {newTransfer.items.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 2 }}>
                     <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{item.productName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('available')}: {products.find(p => p.id === item.productId)?.stockLevels?.find(sl => sl.warehouseId === newTransfer.fromWarehouseId)?.quantity || 0}
                      </Typography>
                     </Box>
                     <TextField 
                        size="small" 
                        type="number" 
                        label={t('qty')} 
                        sx={{ width: 80 }}
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          const available = products.find(p => p.id === item.productId)?.stockLevels?.find(sl => sl.warehouseId === newTransfer.fromWarehouseId)?.quantity || 0;
                          if (newQty > available) {
                            setSnackbar({ open: true, message: t('insufficient_stock'), severity: 'error' });
                            return;
                          }
                          const updatedItems = [...newTransfer.items];
                          updatedItems[idx].quantity = newQty;
                          setNewTransfer({ ...newTransfer, items: updatedItems });
                        }}
                     />
                     <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                        <DeleteIcon fontSize="inherit" />
                     </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>

            <TextField 
              fullWidth 
              multiline 
              rows={2} 
              label={t('notes')} 
              value={newTransfer.notes}
              onChange={(e) => setNewTransfer({...newTransfer, notes: e.target.value})}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdd(false)} color="inherit">{t('cancel')}</Button>
          <Button variant="contained" disabled={newTransfer.items.length === 0} onClick={handleCreate}>
            {t('confirm_creation')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Dialog */}
      <Dialog open={openView} onClose={() => setOpenView(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('transfer_details')}: {selectedTransfer?.transferNumber}
          <Chip 
            label={selectedTransfer ? getStatusLabel(selectedTransfer.status) : ''} 
            color={selectedTransfer ? getStatusColor(selectedTransfer.status) : 'default'}
            size="small"
          />
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{t('from_warehouse')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    {i18n.language === 'en' ? (selectedTransfer?.fromWarehouse?.nameEn || selectedTransfer?.fromWarehouse?.name) : selectedTransfer?.fromWarehouse?.name}
                </Typography>
                <Typography variant="body2">{selectedTransfer?.fromWarehouse?.location}</Typography>
              </Paper>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>{t('to_warehouse')}</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.02) }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    {i18n.language === 'en' ? (selectedTransfer?.toWarehouse?.nameEn || selectedTransfer?.toWarehouse?.name) : selectedTransfer?.toWarehouse?.name}
                </Typography>
                <Typography variant="body2">{selectedTransfer?.toWarehouse?.location}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>{t('items_list')}</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.action.selected, 0.05) }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('product')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('quantity')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedTransfer?.items?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                        {i18n.language === 'en' ? (item.product?.nameEn || item.productNameEn || item.product?.name || item.productName) : (item.productName || item.product?.name)}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedTransfer?.notes && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('notes')}</Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic', p: 1, borderLeft: '4px solid', borderColor: 'divider' }}>
                {selectedTransfer.notes}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t('created_at')}</Typography>
              <Typography variant="body2">{selectedTransfer?.transferDate && new Date(selectedTransfer.transferDate).toLocaleString()}</Typography>
            </Box>
            {selectedTransfer?.shippedAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">{t('shipped_at')}</Typography>
                <Typography variant="body2">{new Date(selectedTransfer.shippedAt).toLocaleString()}</Typography>
              </Box>
            )}
            {selectedTransfer?.receivedAt && (
              <Box>
                <Typography variant="caption" color="text.secondary">{t('received_at')}</Typography>
                <Typography variant="body2">{new Date(selectedTransfer.receivedAt).toLocaleString()}</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenView(false)} variant="outlined">{t('close')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2, boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WarehouseTransfers;
