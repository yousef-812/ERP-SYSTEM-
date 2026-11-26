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
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputBase,
  TextField,
  Stack,
  alpha,
  useTheme,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Visibility as VisibilityIcon, 
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  History as HistoryIcon,
  CameraAlt as CameraIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import ListIcon from '@mui/icons-material/ListAlt';
import PendingIcon from '@mui/icons-material/PendingActions';
import CheckIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useConfirm } from '../../context/ConfirmContext';
import axios from 'axios';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';
import { useSettings } from '../../context/SettingsContext';
import { getCurrencySymbol } from '../../utils/currencyHelper';

const BarcodeScanner = React.lazy(() => import('../../components/BarcodeScanner'));

const PurchaseOrders = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const theme = useTheme();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [newPO, setNewPO] = useState({ supplierId: '', productId: '', quantity: 1, unitPrice: 0, warehouseId: '' });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URLS.PURCHASE_ORDERS);
      setPos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching POs', error);
      setPos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
    
    const fetchMetadata = async () => {
      try {
        const [supRes, prodRes, warehouseRes] = await Promise.all([
          axios.get(API_URLS.SUPPLIERS),
          axios.get(API_URLS.PRODUCTS),
          axios.get(API_URLS.WAREHOUSES)
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setAllWarehouses(Array.isArray(warehouseRes.data) ? warehouseRes.data : []);
      } catch (err) { console.error(err); }
    };
    fetchMetadata();

    const handleKeyDown = (e) => {
        if (e.altKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            e.stopPropagation();
            setScannerOpen(true);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewPO = (po) => {
    setSelectedPO(po);
    setDetailsDialogOpen(true);
  };

  const handleEditPO = (po) => {
    if (po.status === 'Received') {
      showSnackbar(t('cannot_edit_received_po', 'Cannot edit a received order'), 'warning');
      return;
    }
    setNewPO({
      id: po.id,
      supplierId: po.supplierId,
      productId: po.details[0]?.productId || '',
      quantity: po.details[0]?.quantity || 1,
      unitPrice: po.details[0]?.unitPrice || 0,
      warehouseId: po.warehouseId || ''
    });
    setAddDialogOpen(true);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `PurchaseOrder_${selectedPO?.id?.substring(0,8) || 'Doc'}`;
    window.print();
    document.title = originalTitle;
  };

  const handleReceive = async (id) => {
    const isConfirmed = await confirm({
      title: t('confirm_receive_stock_title', 'Confirm Reception'),
      message: t('confirm_receive_stock_msg', 'Are you sure you want to receive this order? Stock will be updated immediately.'),
      confirmText: t('confirm'),
      cancelText: t('cancel')
    });

    if (!isConfirmed) return;

    try {
      await axios.post(`${API_URLS.PURCHASE_ORDERS}/${id}/receive`);
      showSnackbar(t('stock_received_success'));
      fetchPOs();
    } catch (error) {
      showSnackbar(t('error_saving'), 'error');
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'draft': return 'default';
      case 'sent': return 'warning';
      case 'received': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'draft': return t('pending');
      case 'sent': return t('pending');
      case 'received': return t('completed');
      case 'cancelled': return t('cancelled');
      default: return status || t('unknown');
    }
  };

  if (loading && pos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 1, md: 3 } }}>
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .MuiDialog-container { display: block !important; }
            .MuiPaper-root { box-shadow: none !important; border: none !important; }
          }
        `}
      </style>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" gutterBottom>
              {t('purchase_orders')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('manage_procurement_cycle')}
            </Typography>
          </Box>
          <PageHelp helpKey="purchase_orders" />
        </Box>
        {hasPermission('إنشاء أمر شراء') && (
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            {t('add_new_po')}
          </Button>
        )}
      </Box>

        <Grid container spacing={3} sx={{ mb: 4 }} className="no-print">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2.5, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1), bgcolor: alpha(theme.palette.primary.main, 0.02), height: '100%' }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 3, color: 'primary.main', display: 'flex' }}>
                <ListIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>{t('total_pos')}</Typography>
                <Typography variant="h5" fontWeight="900">{pos.length}</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2.5, border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.1), bgcolor: alpha(theme.palette.warning.main, 0.02), height: '100%' }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 3, color: 'warning.main', display: 'flex' }}>
                 <PendingIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>{t('pending_pos')}</Typography>
                <Typography variant="h5" fontWeight="900" color="warning.main">{(Array.isArray(pos) ? pos : []).filter(p => String(p.status).toLowerCase() !== 'received' && String(p.status).toLowerCase() !== 'cancelled').length}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2.5, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.1), bgcolor: alpha(theme.palette.success.main, 0.02), height: '100%' }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 3, color: 'success.main', display: 'flex' }}>
                 <CheckIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>{t('received_pos')}</Typography>
                <Typography variant="h5" fontWeight="900" color="success.main">{(Array.isArray(pos) ? pos : []).filter(p => String(p.status).toLowerCase() === 'received').length}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2.5, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1), bgcolor: alpha(theme.palette.info.main, 0.02), height: '100%' }}>
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 3, color: 'info.main', display: 'flex' }}>
                 <ReceiptIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>{t('total_received_value')}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="h5" fontWeight="900" color="info.main">{(Array.isArray(pos) ? pos : []).filter(p => String(p.status).toLowerCase() === 'received').reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString(i18n.language)} </Typography>
                  <Typography variant="caption" sx={{ fontWeight: '900', color: 'text.secondary' }}>{getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('invoice_number')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('supplier')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('warehouse')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('date')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('total_amount')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>{t('status')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!Array.isArray(pos) || pos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                    <Box sx={{ opacity: 0.5 }}>
                       <ListIcon sx={{ fontSize: 48, mb: 1 }} />
                       <Typography>{t('no_pos_found')}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                pos.map((po) => (
                  <TableRow key={po?.id} hover>
                    <TableCell sx={{ fontWeight: '600', color: 'primary.main' }}>PO-{po?.id?.substring(0,8)?.toUpperCase() || '---'}</TableCell>
                    <TableCell>
                        {i18n.language === 'en' ? (po?.supplier?.nameEn || po?.supplier?.name || t('unknown')) : (po?.supplier?.name || t('unknown'))}
                    </TableCell>
                    <TableCell>
                        {i18n.language === 'en' ? (po?.warehouse?.nameEn || po?.warehouse?.name || t('unassigned')) : (po?.warehouse?.name || t('unassigned'))}
                    </TableCell>
                    <TableCell>{po?.orderDate ? new Date(po.orderDate).toLocaleDateString() : '---'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {(po?.totalAmount || 0).toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(po?.status)} 
                        color={getStatusColor(po?.status)}
                        size="small"
                        sx={{ fontWeight: 'bold', borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title={t('view_po')}>
                          <IconButton color="primary" onClick={() => handleViewPO(po)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('print_po')}>
                          <IconButton color="secondary" onClick={() => { handleViewPO(po); setTimeout(() => handlePrint(), 500); }}>
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {String(po?.status).toLowerCase() !== 'received' && (
                          <Tooltip title={t('edit_po')}>
                            <IconButton color="warning" onClick={() => handleEditPO(po)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {String(po?.status).toLowerCase() !== 'received' && hasPermission('اعتماد الطلبات') && (
                          <Tooltip title={t('receive_stock')}>
                            <IconButton onClick={() => handleReceive(po.id)} color="success">
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {selectedPO && (
          <>
            <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h5" fontWeight="900" color="primary.main" sx={{ mb: 0.5, letterSpacing: -1 }}>
                  {settings.CompanyName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {t('purchase_order')} #PO-{selectedPO?.id?.substring(0,8)?.toUpperCase() || '---'}
                  <Chip label={getStatusLabel(selectedPO?.status)} color={getStatusColor(selectedPO?.status)} size="small" />
                </Box>
              </Box>
              <Box className="no-print">
                <Button 
                  variant="outlined" 
                  startIcon={<PrintIcon />} 
                  onClick={handlePrint}
                  sx={{ borderRadius: 2 }}
                >
                  {t('print')}
                </Button>
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }} id="po-details-content">
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" display="block">{t('supplier')}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {i18n.language === 'en' ? (selectedPO?.supplier?.nameEn || selectedPO?.supplier?.name || '---') : (selectedPO?.supplier?.name || '---')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary" display="block">{t('warehouse')}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {i18n.language === 'en' ? (selectedPO?.warehouse?.nameEn || selectedPO?.warehouse?.name || t('unassigned')) : (selectedPO?.warehouse?.name || t('unassigned'))}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary" display="block">{t('date')}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">{selectedPO?.orderDate ? new Date(selectedPO.orderDate).toLocaleString() : '---'}</Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('order_items')}</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('product')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('quantity')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('unit_price')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{t('subtotal')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(selectedPO?.details) && selectedPO.details.map((detail) => (
                      <TableRow key={detail?.id}>
                        <TableCell>
                            {i18n.language === 'en' ? (detail?.product?.nameEn || detail?.product?.name || t('unknown')) : (detail?.product?.name || t('unknown'))}
                        </TableCell>
                        <TableCell>{detail?.quantity || 0}</TableCell>
                        <TableCell>{(detail?.unitPrice || 0).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{((detail?.quantity || 0) * (detail?.unitPrice || 0)).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>{t('total_amount')}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                        {(selectedPO?.totalAmount || 0).toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Add/Edit PO Dialog */}
      <Dialog open={addDialogOpen} onClose={() => { setAddDialogOpen(false); setNewPO({ supplierId: '', productId: '', quantity: 1, unitPrice: 0, warehouseId: '' }); }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{newPO.id ? t('edit_po') : t('add_new_po')}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="supplier-select-label">{t('select_supplier')}</InputLabel>
              <Select 
                labelId="supplier-select-label"
                id="supplier-select"
                value={newPO.supplierId || ''} 
                onChange={(e) => setNewPO({...newPO, supplierId: e.target.value})}
                label={t('select_supplier')}
              >
                 <MenuItem value="" disabled><em>{t('select_supplier')}</em></MenuItem>
                 {Array.isArray(suppliers) && suppliers.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                        {i18n.language === 'en' ? (s.nameEn || s.name) : s.name}
                    </MenuItem>
                 ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="warehouse-select-label">{t('select_warehouse')}</InputLabel>
              <Select 
                labelId="warehouse-select-label"
                id="warehouse-select"
                value={newPO.warehouseId || ''} 
                onChange={(e) => setNewPO({...newPO, warehouseId: e.target.value})}
                label={t('select_warehouse')}
              >
                 <MenuItem value="" disabled><em>{t('select_warehouse')}</em></MenuItem>
                 {Array.isArray(allWarehouses) && allWarehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                    </MenuItem>
                 ))}
              </Select>
            </FormControl>
           
           <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl fullWidth>
                  <InputLabel id="product-select-label">{t('select_product')}</InputLabel>
                  <Select 
                    labelId="product-select-label"
                    id="product-select"
                    value={newPO.productId || ''} 
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      setNewPO({...newPO, productId: e.target.value, unitPrice: prod?.price || 0});
                    }}
                    label={t('select_product')}
                  >
                    <MenuItem value="" disabled><em>{t('select_product')}</em></MenuItem>
                    {Array.isArray(products) && products.map(p => (
                        <MenuItem key={p.id} value={p.id}>
                            {i18n.language === 'en' ? (p.nameEn || p.name) : p.name}
                        </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Tooltip title={t('scan_barcode')}>
                  <IconButton 
                    color="secondary" 
                    sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 2, height: 56, width: 56 }}
                    onClick={() => setScannerOpen(true)}
                  >
                    <CameraIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <TextField 
                fullWidth
                type="number" 
                label={t('quantity')}
                value={newPO.quantity} 
                onChange={(e) => setNewPO({...newPO, quantity: e.target.value})} 
              />

              <TextField 
                fullWidth
                type="number" 
                label={t('price')}
                value={newPO.unitPrice} 
                onChange={(e) => setNewPO({...newPO, unitPrice: e.target.value})} 
              />
           </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
           <Button onClick={() => { setAddDialogOpen(false); setNewPO({ supplierId: '', productId: '', quantity: 1, unitPrice: 0, warehouseId: '' }); }} color="inherit">{t('cancel')}</Button>
           <Button 
              variant="contained" 
              onClick={async () => {
                try {
                  const payload = {
                    supplierId: newPO.supplierId,
                    warehouseId: newPO.warehouseId,
                    orderDate: new Date().toISOString(),
                    details: [{ productId: newPO.productId, quantity: parseInt(newPO.quantity), unitPrice: parseFloat(newPO.unitPrice) }]
                  };

                  if (newPO.id) {
                    await axios.put(`${API_URLS.PURCHASE_ORDERS}/${newPO.id}`, payload);
                    showSnackbar(t('po_updated_success', 'Purchase Order updated successfully'));
                  } else {
                    await axios.post(API_URLS.PURCHASE_ORDERS, payload);
                    showSnackbar(t('po_created_success', 'Purchase Order created successfully'));
                  }
                  setAddDialogOpen(false);
                  setNewPO({ supplierId: '', productId: '', quantity: 1, unitPrice: 0, warehouseId: '' });
                  fetchPOs();
                } catch (err) { showSnackbar(t('error_saving'), 'error'); }
              }}
            >
              {newPO.id ? t('save_changes') : t('confirm')}
            </Button>
        </DialogActions>
       </Dialog>

      <React.Suspense fallback={null}>
        <BarcodeScanner 
          open={scannerOpen} 
          onClose={() => setScannerOpen(false)} 
          onScan={(text) => {
            const foundProduct = products.find(p => p.barcode === text || p.sku === text);
            if (foundProduct) {
              setNewPO(prev => ({ ...prev, productId: foundProduct.id }));
              showSnackbar(t('added_via_scanner'));
              setScannerOpen(false); // Close on success for single item selection
            } else {
              showSnackbar(t('product_not_found'), 'error');
            }
          }}
        />
      </React.Suspense>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .MuiDialog-root, .MuiDialog-root * {
              visibility: visible;
            }
            .MuiDialog-root {
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
            .MuiDialog-paper {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default PurchaseOrders;
