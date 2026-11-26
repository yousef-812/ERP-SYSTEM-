import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Grid, 
  Chip, CircularProgress, Snackbar, Alert, Avatar, useTheme, useMediaQuery,
  Card, CardContent, Divider, Tooltip, Stack, alpha, InputAdornment,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel
} from '@mui/material';
import { Add, Edit, Delete, Inventory, Category, BarChart as BarChartIcon, ShoppingCart, QrCode, History, Search, ErrorOutline as ErrorIcon, Print as PrintIcon, HelpOutline } from '@mui/icons-material';
import Barcode from 'react-barcode';
import StockHistoryDialog from '../components/Inventory/StockHistoryDialog';
import OCRScanner from '../components/OCR/OCRScanner';

import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { usePermissions } from '../hooks/usePermissions';
import { API_URLS } from '../api';
import { getCurrencySymbol } from '../utils/currencyHelper';
import PageHelp from '../components/PageHelp';

const API_URL = API_URLS.PRODUCTS;
const WAREHOUSE_API = API_URLS.WAREHOUSES;

const Products = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', nameEn: '', sku: '', category: '', 
    price: '', stockQuantity: '', minStockLevel: 5, barcode: '',
    warehouseId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [barcodeChoiceOpen, setBarcodeChoiceOpen] = useState(false);

  // Print Dialog state
  const [printOpen, setPrintOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ product: null, copies: 1, layout: 'a4' });
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, WHRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(WAREHOUSE_API)
      ]);
      setProducts(prodRes.data);
      setWarehouses(WHRes.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setCurrentProduct(product);
      setFormData({
        name: product.name,
        nameEn: product.nameEn || '',
        sku: product.sku,
        category: product.category,
        price: product.price,
        stockQuantity: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        barcode: product.barcode || '',
        warehouseId: product.warehouseId || ''
      });
    } else {
      setCurrentProduct(null);
      setFormData({ 
        name: '', 
        nameEn: '',
        sku: '', 
        category: '', 
        price: '', 
        stockQuantity: '', 
        minStockLevel: settings.LowStockAlert || '10',
        barcode: '',
        warehouseId: warehouses.length > 0 ? warehouses[0].id : ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateBarcode = () => {
    if (formData.sku) {
      setBarcodeChoiceOpen(true);
    } else {
      // Direct random generation if SKU is empty
      const randomBarcode = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
      setFormData(prev => ({ ...prev, barcode: randomBarcode }));
      showSnackbar(t('barcode_generated'));
    }
  };

  const handleBarcodeChoice = (choice) => {
    let newBarcode = '';
    if (choice === 'sku') {
      newBarcode = formData.sku;
    } else {
      newBarcode = Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    }
    setFormData(prev => ({ ...prev, barcode: newBarcode }));
    setBarcodeChoiceOpen(false);
    showSnackbar(t('barcode_generated'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price || 0),
        stockQuantity: parseInt(formData.stockQuantity || 0),
        minStockLevel: parseInt(formData.minStockLevel || 0),
        warehouseId: formData.warehouseId || null // Ensure empty string becomes null for backend GUID?
      };

      if (currentProduct) {
        // Essential for Entity Framework concurrency and avoiding 400 errors
        payload.Id = currentProduct.id; 
        payload.RowVersion = currentProduct.rowVersion;
        
        await axios.put(`${API_URL}/${currentProduct.id}`, payload);
        showSnackbar(t('product_updated'));
      } else {
        await axios.post(API_URL, payload);
        showSnackbar(t('product_added'));
      }
      handleCloseDialog();
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.Message || err.response?.data?.message || t('error_saving');
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ 
      title: t('confirm_delete_title'), 
      message: t('confirm_delete_msg') 
    })) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        showSnackbar(t('product_deleted'));
        fetchData();
      } catch (err) {
        showSnackbar(t('error_deleting'), 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const filteredProducts = Array.isArray(products) ? products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  const handleOpenHistory = (product) => {
    setHistoryProduct(product);
    setHistoryOpen(true);
  };

  const handleOpenPrint = (product) => {
    setPrintConfig({ product, copies: product.stockQuantity > 0 ? product.stockQuantity : 1, layout: 'a4' });
    setPrintOpen(true);
  };

  const executePrint = () => {
    setIsPrinting(true);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    const style = printConfig.layout === 'a4' ? `
      @page { size: A4; margin: 10mm; }
      body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: space-between; font-family: sans-serif; gap: 15px; }
      .label { width: calc(33.333% - 10px); height: auto; text-align: center; box-sizing: border-box; page-break-inside: avoid; margin-bottom: 5mm; }
      .label span { display: block; font-size: 11px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: bold; }
      svg { max-width: 100%; height: auto; }
    ` : `
      @page { size: auto; margin: 0mm; }
      body { margin: 0; padding: 0; font-family: sans-serif; }
      .label { width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-after: always; box-sizing: border-box; text-align: center; padding: 2mm; overflow: hidden; }
      .label span { font-size: 14px; margin-bottom: 5px; font-weight: bold; max-width: 95%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      svg { max-width: 95%; max-height: 70%; }
    `;

    doc.write(`<html><head><style>${style}</style></head><body><div id="print-root"></div></body></html>`);
    doc.close();

    const printRoot = doc.getElementById('print-root');
    const root = createRoot(printRoot);

    const BarcodeList = () => (
      <>
        {Array.from({ length: printConfig.copies }).map((_, i) => (
          <div key={i} className="label">
            <span>{printConfig.product.name}</span>
            <Barcode value={printConfig.product.barcode} displayValue={true} width={1.8} height={50} fontSize={14} background="transparent" />
          </div>
        ))}
      </>
    );

    root.render(<BarcodeList />);

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPrinting(false);
        setPrintOpen(false);
      }, 500);
    }, 1000);
  };

const API_URL = API_URLS.PRODUCTS;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Premium Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 4, 
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ letterSpacing: -1 }}>
              {t('products_management')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('products_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="products" />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField 
            size="small" 
            placeholder={t('search_products')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ 
                bgcolor: alpha(theme.palette.text.primary, 0.05), 
                borderRadius: 2, 
                width: { xs: '100%', sm: 300 },
                '& .MuiOutlinedInput-notchedOutline': { border: '1px solid', borderColor: alpha(theme.palette.divider, 0.5) },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: '2px solid', borderColor: theme.palette.primary.main },
                boxShadow: 'none'
            }}
          />
          {hasPermission('إدارة المنتجات') && (
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2, py: 1, px: 3, boxShadow: 4, whiteSpace: 'nowrap' }}
            >
              {t('add_product')}
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0 }}>
              <Table stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('product')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('sku_barcode')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('warehouse')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('category')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('price')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('stock')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                    {hasPermission('إدارة المنتجات') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(filteredProducts) && filteredProducts.map((row) => (
                    <TableRow hover key={row.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main' }}>
                            <Inventory />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {i18n.language === 'en' ? (row.nameEn || row.name) : row.name}
                            </Typography>
                            {i18n.language !== 'en' && row.nameEn && (
                                <Typography variant="caption" color="text.secondary">{row.nameEn}</Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">{row.sku}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.barcode || t('no_barcode')}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={<Add sx={{ fontSize: '1rem !important' }} />} 
                          label={i18n.language === 'en' ? (row.warehouseNameEn || row.warehouseName || t('unassigned')) : (row.warehouseName || t('unassigned'))} 
                          size="small" 
                          variant="outlined" 
                          sx={{ borderRadius: 1.5 }}
                        />
                      </TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">{row.price.toLocaleString(i18n.language)} {getCurrencySymbol(settings.Currency, i18n.language)}</TableCell>
                      <TableCell align="right">{row.stockQuantity}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={row.stockQuantity <= row.minStockLevel ? t('low_stock') : t('in_stock')} 
                          color={row.stockQuantity <= row.minStockLevel ? 'error' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold', borderRadius: 1.5 }}
                        />
                      </TableCell>
                      {hasPermission('إدارة المنتجات') && (
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title={t('print_barcode')}>
                              <IconButton color="secondary" onClick={() => handleOpenPrint(row)}>
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('view_history')}>
                              <IconButton color="info" onClick={() => handleOpenHistory(row)}>
                                <History fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('edit_product_tooltip')}>
                              <IconButton color="primary" onClick={() => handleOpenDialog(row)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('delete_product_tooltip')}>
                              <IconButton color="error" onClick={() => handleDelete(row.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <Grid container spacing={2}>
              {Array.isArray(filteredProducts) && filteredProducts.map((product) => (
                <Grid size={12} key={product.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 45, height: 45 }}>
                            <Inventory />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                                {i18n.language === 'en' ? (product.nameEn || product.name) : product.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">{t('sku_prefix')} {product.sku}</Typography>
                              {product.barcode && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <QrCode sx={{ fontSize: 14, color: 'action.active' }} />
                                  <Typography variant="caption" color="text.secondary">{product.barcode}</Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <Chip 
                          label={product.stockQuantity <= product.minStockLevel ? t('low_stock') : t('in_stock')} 
                          color={product.stockQuantity <= product.minStockLevel ? 'error' : 'success'}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" color="primary.main" fontWeight="bold">{t('warehouse')}:</Typography>
                        <Typography variant="caption" fontWeight="medium">
                            {i18n.language === 'en' ? (product.warehouseNameEn || product.warehouseName || t('unassigned')) : (product.warehouseName || t('unassigned'))}
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ mb: 2, opacity: 0.5 }} />
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Category fontSize="small" color="action" />
                            <Typography variant="body2">{product.category}</Typography>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                            <ShoppingCart fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              {product.price.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BarChartIcon fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight="bold">{t('stock')}:</Typography>
                        </Box>
                        <Typography variant="subtitle2" fontWeight="bold" color={product.stockQuantity <= product.minStockLevel ? 'error.main' : 'text.primary'}>
                          {product.stockQuantity} / {product.minStockLevel} (Min)
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button size="small" variant="outlined" color="primary" startIcon={<PrintIcon />} onClick={() => handleOpenPrint(product)}>{t('print_barcode')}</Button>
                        <Button size="small" variant="outlined" startIcon={<History />} onClick={() => handleOpenHistory(product)}>{t('history')}</Button>
                        {hasPermission('Manage Products') && <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => handleOpenDialog(product)}>{t('edit')}</Button>}
                        {hasPermission('Manage Products') && <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDelete(product.id)}>{t('delete')}</Button>}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {filteredProducts.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h6" color="text.secondary">{t('no_products')}</Typography>
            </Box>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{currentProduct ? t('edit_product') : t('add_new_product')}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField 
                  fullWidth 
                  autoFocus 
                  label={t('product_name')} 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('name_en')} name="nameEn" value={formData.nameEn} onChange={handleInputChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField fullWidth label={t('sku')} name="sku" value={formData.sku} onChange={handleInputChange} required />
                  <Tooltip title={t('sku_help_text')}>
                    <IconButton size="small">
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField 
                    fullWidth 
                    label={t('barcode')} 
                    name="barcode" 
                    value={formData.barcode} 
                    onChange={handleInputChange} 
                    helperText={t('barcode_helper')}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title={t('generate_barcode_tooltip', 'Generate from SKU or Random')}>
                            <IconButton onClick={generateBarcode} size="small" edge="end">
                              <QrCode color="primary" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Tooltip title={t('barcode_help_text')}>
                    <IconButton size="small">
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {formData.barcode && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
                    <Barcode value={formData.barcode} height={50} width={1.5} fontSize={14} />
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label={t('select_warehouse')} name="warehouseId" value={formData.warehouseId} onChange={handleInputChange} SelectProps={{ native: true }} variant="outlined">
                  <option value="">{t('select_warehouse')}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label={t('category')} name="category" value={formData.category} onChange={handleInputChange} required />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label={`${t('price')} (${getCurrencySymbol(settings.Currency, i18n.language)})`} name="price" type="number" inputProps={{ step: "0.01" }} value={formData.price} onChange={handleInputChange} required />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Tooltip title={t('stock_locked_hint')}>
                  <span>
                    <TextField 
                      fullWidth 
                      disabled
                      label={t('stock')} 
                      name="stockQuantity" 
                      type="number" 
                      value={formData.stockQuantity} 
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end" sx={{ pointerEvents: 'none' }}>
                            <ErrorIcon color="warning" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </span>
                </Tooltip>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label={t('min_stock_level')} name="minStockLevel" type="number" value={formData.minStockLevel} onChange={handleInputChange} required />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">{t('cancel')}</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4 }}>
              {currentProduct ? t('save_changes') : t('add_product')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* History Dialog */}
      <StockHistoryDialog 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        product={historyProduct} 
      />

      <OCRScanner
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onScanComplete={(text) => {
          // Simple logic to fill name or SKU if empty
          if (!formData.name) setFormData(prev => ({ ...prev, name: text.split('\n')[0] }));
          showSnackbar(t('ocr_scan_complete', 'Scan integrated! Review fields.'));
        }}
      />

      {/* Print Dialog */}
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('print_barcode')}</DialogTitle>
        <DialogContent dividers>
          {printConfig.product && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {printConfig.product.name}
                </Typography>
                <Barcode value={printConfig.product.barcode} displayValue={true} width={1.5} height={40} fontSize={12} background="transparent" />
              </Box>

              <TextField 
                label={t('print_copies')} 
                type="number" 
                value={printConfig.copies} 
                onChange={e => setPrintConfig({...printConfig, copies: Math.max(1, parseInt(e.target.value) || 1)})} 
                fullWidth 
              />
              
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>{t('print_layout')}</FormLabel>
                <RadioGroup 
                  value={printConfig.layout} 
                  onChange={e => setPrintConfig({...printConfig, layout: e.target.value})}
                >
                  <FormControlLabel value="a4" control={<Radio color="primary" />} label={t('layout_a4')} />
                  <FormControlLabel value="thermal" control={<Radio color="primary" />} label={t('layout_thermal')} />
                </RadioGroup>
              </FormControl>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPrintOpen(false)} color="inherit">{t('cancel')}</Button>
          <Button onClick={executePrint} variant="contained" color="primary" disabled={isPrinting}>
            {isPrinting ? <CircularProgress size={24} color="inherit" /> : t('print_now')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Choice Dialog */}
      <Dialog 
        open={barcodeChoiceOpen} 
        onClose={() => setBarcodeChoiceOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>{t('barcode_choice_title')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('barcode_choice_msg')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => handleBarcodeChoice('random')}
            sx={{ borderRadius: 2, py: 1.5 }}
          >
            {t('random_barcode')}
          </Button>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => handleBarcodeChoice('sku')}
            sx={{ borderRadius: 2, py: 1.5 }}
          >
            {t('use_sku')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>

        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Products;
