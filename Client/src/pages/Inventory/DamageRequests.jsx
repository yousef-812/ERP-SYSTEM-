import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Tooltip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  DeleteOutlined as Delete, 
  CheckCircleOutlined as CheckCircle,
  ErrorOutline as ErrorOutline,
  VisibilityOutlined as Visibility,
  CameraAlt as CameraIcon,
  RemoveCircleOutline as RemoveIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import axios from 'axios';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';
import { useConfirm } from '../../context/ConfirmContext';

const BarcodeScanner = React.lazy(() => import('../../components/BarcodeScanner'));

const DamageRequests = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const theme = useTheme();
  const confirm = useConfirm();

  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [noteMode, setNoteMode] = useState('none');
  const [globalNote, setGlobalNote] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqs, prods, whs] = await Promise.all([
        axios.get(API_URLS.STOCK.DAMAGE_REQUESTS),
        axios.get(API_URLS.PRODUCTS),
        axios.get(API_URLS.WAREHOUSES)
      ]);
      setRequests(reqs.data);
      setProducts(prods.data);
      setWarehouses(whs.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (open && e.altKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            e.stopPropagation();
            setScannerOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpen = () => {
    setCart([]);
    setNoteMode('none');
    setGlobalNote('');
    setSelectedWarehouseId('');
    setOpen(true);
  };

  const addProductToCart = (productId) => {
    if (!selectedWarehouseId) {
      showSnackbar(t('please_select_warehouse_first'), 'warning');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check specific warehouse stock
    const stockLevel = product.stockLevels?.find(sl => sl.warehouseId === selectedWarehouseId);
    const availableQty = stockLevel ? stockLevel.quantity : 0;

    if (availableQty < 1) {
      showSnackbar(t('product_not_available_in_warehouse'), 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing) {
        if (existing.quantity + 1 > availableQty) {
          showSnackbar(t('insufficient_stock_available', { stock: availableQty }), 'error');
          return prev;
        }
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      
      return [...prev, { product, quantity: 1, reason: '', warehouseId: selectedWarehouseId, availableInWarehouse: availableQty }];
    });
  };

  const handleScan = (text) => {
    if (!selectedWarehouseId) {
        showSnackbar(t('please_select_warehouse_first'), 'warning');
        setScannerOpen(false);
        return;
    }

    const foundProduct = products.find(p => p.barcode === text || p.sku === text);
    if (foundProduct) {
      // Check if product exists in the selected warehouse
      const stockLevel = foundProduct.stockLevels?.find(sl => sl.warehouseId === selectedWarehouseId);
      if (!stockLevel || stockLevel.quantity <= 0) {
        showSnackbar(t('product_not_available_in_warehouse'), 'error');
        setScannerOpen(false);
        return;
      }

      addProductToCart(foundProduct.id);
      showSnackbar(t('added_via_scanner'));
      setScannerOpen(false); 
    } else {
      showSnackbar(t('product_not_found'), 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      await Promise.all(cart.map(item => {
        let finalReason = "N/A";
        if (noteMode === 'global' && globalNote) finalReason = globalNote;
        else if (noteMode === 'individual' && item.reason) finalReason = item.reason;

        return axios.post(API_URLS.STOCK.DAMAGE_REQUESTS, {
          requestNumber: 'TBD', // Placeholder
          productId: item.product.id,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          reason: finalReason,
          status: 'Pending'
        });
      }));
      setOpen(false);
      showSnackbar(t('damage_reported_success'));
      fetchData();
    } catch (err) {
      showSnackbar(t('error_reporting_damage'), 'error');
    }
  };

  const handleAction = async (id, action) => {
    if (await confirm({ 
      title: t('confirm_action'), 
      message: t('confirm_action_msg', { action: t(action) }) 
    })) {
      try {
        if (action === 'delete') {
          await axios.delete(`${API_URLS.STOCK.DAMAGE_REQUESTS}/${id}`);
        } else {
          await axios.put(`${API_URLS.STOCK.DAMAGE_REQUESTS}/${id}/${action}`);
        }
        showSnackbar(t(`request_${action}_success`));
        fetchData();
      } catch (err) {
        showSnackbar(t('error_performing_action'), 'error');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'warning';
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (r.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || r.warehouseId === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -1 }}>
              {t('inventory_damage_reports')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('manage_damage_desc')}
            </Typography>
          </Box>
          <PageHelp helpKey="inventory_damage" />
        </Box>
        {hasPermission('تسجيل التلفيات') && (
          <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={handleOpen}>
            {t('report_damage')}
          </Button>
        )}
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          borderRadius: 4, 
          border: `1px solid ${theme.palette.divider}`,
          mb: 4
        }}
      >
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField 
            fullWidth 
            placeholder={t('search_products')} 
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label={t('warehouse')}
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">{t('all_warehouses')}</MenuItem>
            {warehouses.map(w => (
              <MenuItem key={w.id} value={w.id}>
                {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Typography fontWeight="700">{t('reference')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('product_name')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('warehouse')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('quantity')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('reason')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('date')}</Typography></TableCell>
                <TableCell><Typography fontWeight="700">{t('status')}</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight="700">{t('actions')}</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={7} align="center"><Typography color="text.secondary">{t('no_damage_requests_found')}</Typography></TableCell>
                </TableRow>
              ) : (Array.isArray(filteredRequests) ? filteredRequests : []).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell><Typography variant="body2" color="primary" fontWeight="600">{row.requestNumber}</Typography></TableCell>
                  <TableCell><Typography fontWeight="600">
                    {i18n.language === 'en' ? (row.product?.nameEn || row.product?.name || 'Unknown') : (row.product?.name || 'Unknown')}
                  </Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">
                    {i18n.language === 'en' ? (row.warehouse?.nameEn || row.warehouse?.name || 'N/A') : (row.warehouse?.name || 'N/A')}
                  </Typography></TableCell>
                  <TableCell><Typography fontWeight="700">{row.quantity}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{row.reason}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{new Date(row.dateReported).toLocaleDateString()}</Typography></TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small" 
                      color={getStatusColor(row.status)}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {hasPermission('اعتماد الطلبات') && (
                        <>
                          <IconButton size="small" color="success" disabled={row.status !== 'Pending'} onClick={() => handleAction(row.id, 'approve')}><CheckCircle /></IconButton>
                          <IconButton size="small" color="error" disabled={row.status !== 'Pending'} onClick={() => handleAction(row.id, 'reject')}><ErrorOutline /></IconButton>
                        </>
                      )}
                      <IconButton size="small" color="default" onClick={() => handleAction(row.id, 'delete')}><Delete /></IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('report_damaged_item')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                select
                fullWidth
                label={t('select_warehouse')}
                value={selectedWarehouseId}
                onChange={(e) => {
                    setSelectedWarehouseId(e.target.value);
                    setCart([]); // Clear cart if warehouse changes to prevent inconsistencies
                }}
                sx={{ mb: 2 }}
              >
                <MenuItem value="" disabled><em>{t('none')}</em></MenuItem>
                {warehouses.map(w => (
                  <MenuItem key={w.id} value={w.id}>
                    {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField 
                  select 
                  fullWidth 
                  label={t('product')} 
                  value=""
                  disabled={!selectedWarehouseId}
                  onChange={(e) => addProductToCart(e.target.value)}
                  helperText={!selectedWarehouseId ? t('please_select_warehouse_first') : (cart.length === 0 ? t('cart_empty') : '')}
                >
                   <MenuItem value="" disabled><em>{t('select_product')}</em></MenuItem>
                   {Array.isArray(products) && products
                     .filter(p => p.stockLevels?.some(sl => sl.warehouseId === selectedWarehouseId && sl.quantity > 0))
                     .map(p => (
                       <MenuItem key={p.id} value={p.id}>
                         {i18n.language === 'en' ? (p.nameEn || p.name) : p.name} ({p.stockLevels.find(sl => sl.warehouseId === selectedWarehouseId)?.quantity})
                       </MenuItem>
                     ))}
                </TextField>
                
                <Tooltip title={t('scan_barcode')}>
                  <IconButton 
                    color="secondary" 
                    disabled={!selectedWarehouseId}
                    sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 2, height: 56, width: 56 }}
                    onClick={() => setScannerOpen(true)}
                  >
                    <CameraIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            {/* Note Mode Selector */}
            <Grid size={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>{t('note_mode_label')}</FormLabel>
                <RadioGroup 
                  row
                  value={noteMode} 
                  onChange={e => setNoteMode(e.target.value)}
                >
                  <FormControlLabel value="none" control={<Radio color="primary" />} label={t('note_mode_none')} />
                  <FormControlLabel value="global" control={<Radio color="primary" />} label={t('note_mode_global')} />
                  <FormControlLabel value="individual" control={<Radio color="primary" />} label={t('note_mode_individual')} />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid size={12}>
               <Typography variant="h6" fontWeight="bold" gutterBottom>{t('damage_cart')}</Typography>
               <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                 <List disablePadding>
                   {cart.length === 0 && (
                     <ListItem>
                       <ListItemText primary={t('cart_empty')} sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }} />
                     </ListItem>
                   )}
                   {cart.map((item, index) => (
                     <React.Fragment key={item.product.id}>
                       <ListItem sx={{ py: 2 }}>
                         <Box sx={{ display: 'flex', width: '100%', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                           <Box sx={{ minWidth: 120, flex: noteMode === 'individual' ? '1 1 30%' : '1 1 auto' }}>
                             <Typography fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
                               {i18n.language === 'en' ? (item.product?.nameEn || item.product?.name) : item.product?.name}
                             </Typography>
                             <Typography variant="caption" color="text.secondary">{item.product.barcode || item.product.sku}</Typography>
                           </Box>
                           
                           {noteMode === 'individual' && (
                             <TextField 
                                size="small" 
                                label={t('reason_description')}
                                value={item.reason}
                                onChange={e => {
                                    const newR = e.target.value;
                                    setCart(prev => prev.map((c, i) => i === index ? { ...c, reason: newR } : c));
                                }}
                                sx={{ flex: '1 1 40%', minWidth: 150 }}
                             />
                           )}

                           <TextField 
                              size="small"
                              label={t('warehouse')}
                              value={i18n.language === 'en' ? (warehouses.find(w => w.id === item.warehouseId)?.nameEn || warehouses.find(w => w.id === item.warehouseId)?.name || '') : (warehouses.find(w => w.id === item.warehouseId)?.name || '')}
                              disabled
                              sx={{ flex: '1 1 20%', minWidth: 120 }}
                           />

                           <TextField 
                              type="number" 
                              size="small" 
                              label={t('quantity')}
                              InputProps={{ inputProps: { min: 1, max: item.availableInWarehouse } }}
                              value={item.quantity} 
                              onChange={e => {
                                  const newQ = parseInt(e.target.value) || 1;
                                  if (newQ > item.availableInWarehouse) {
                                      showSnackbar(t('insufficient_stock_available', { stock: item.availableInWarehouse }), 'error');
                                      return;
                                  }
                                  setCart(prev => prev.map((c, i) => i === index ? { ...c, quantity: newQ } : c));
                              }} 
                              sx={{ width: 80, flexShrink: 0 }}
                           />
                           
                           <IconButton color="error" onClick={() => setCart(prev => prev.filter((_, i) => i !== index))} sx={{ flexShrink: 0 }}>
                               <RemoveIcon />
                           </IconButton>
                         </Box>
                       </ListItem>
                       {index < cart.length - 1 && <Divider />}
                     </React.Fragment>
                   ))}
                 </List>
               </Paper>
            </Grid>

            {noteMode === 'global' && cart.length > 0 && (
              <Grid size={12}>
                <TextField 
                  fullWidth 
                  multiline 
                  rows={2} 
                  label={t('note_mode_global')} 
                  value={globalNote} 
                  onChange={(e) => setGlobalNote(e.target.value)} 
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={cart.length === 0}>{t('report_damage')}</Button>
        </DialogActions>
      </Dialog>
      
      <React.Suspense fallback={null}>
        <BarcodeScanner 
          open={scannerOpen} 
          onClose={() => setScannerOpen(false)} 
          onScan={handleScan}
        />
      </React.Suspense>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DamageRequests;
