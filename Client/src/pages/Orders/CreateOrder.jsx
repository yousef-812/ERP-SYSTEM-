import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Grid, MenuItem, Select, InputLabel, 
  FormControl, TextField, IconButton, Snackbar, Alert, Divider, CircularProgress
} from '@mui/material';
import { Add, Delete, Assessment } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import { API_URLS } from '../../api';
import { CameraAlt as CameraIcon } from '@mui/icons-material';
import BarcodeScanner from '../../components/BarcodeScanner';

const API_ORDERS = API_URLS.ORDERS;
const API_CUSTOMERS = API_URLS.CUSTOMERS;
const API_PRODUCTS = API_URLS.PRODUCTS;

const CreateOrder = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    fetchCustomersAndProducts();

    // Add Keyboard Shortcut Alt+B (Barcode) to avoid extension conflicts
    const handleKeyDown = (e) => {
        if (e.altKey && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            setScannerOpen(true);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchCustomersAndProducts = async () => {
    try {
      const [custRes, prodRes, whsRes] = await Promise.all([
        axios.get(API_CUSTOMERS),
        axios.get(API_PRODUCTS),
        axios.get(API_URLS.WAREHOUSES)
      ]);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
      setWarehouses(whsRes.data);
      
      // Auto-select if only one warehouse available
      if (whsRes.data.length === 1) {
          setWarehouseId(whsRes.data[0].id);
      }
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto populate price
    if (field === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index]['unitPrice'] = selectedProduct.price;
      }
    }
    
    setItems(newItems);
  };

  const handleBarcodeScan = (decodedText) => {
    // Search for product with this barcode
    const product = products.find(p => p.barcode === decodedText);
    
    if (product) {
      // Check if product is already in items
      const existingItemIndex = items.findIndex(i => i.productId === product.id);
      
      if (existingItemIndex !== -1) {
        const newItems = [...items];
        newItems[existingItemIndex].quantity = (parseInt(newItems[existingItemIndex].quantity) || 0) + 1;
        setItems(newItems);
      } else {
        // Add as new item
        // If the first item is empty, replace it
        if (items.length === 1 && !items[0].productId) {
          setItems([{ productId: product.id, quantity: 1, unitPrice: product.price }]);
        } else {
          setItems([...items, { productId: product.id, quantity: 1, unitPrice: product.price }]);
        }
      }
      showSnackbar(`${t('added_via_scanner')}: ${product.name}`, 'success');
    } else {
      showSnackbar(t('product_not_found_barcode'), 'warning');
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const subtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
      return total + subtotal;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!customerId) {
        showSnackbar(t('select_customer'), 'warning');
        return;
    }
    if (items.some(i => !i.productId || i.quantity <= 0)) {
        showSnackbar(t('order_validation_error'), 'warning');
        return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerId,
        warehouseId: warehouseId || null,
        items: items.map(i => ({
            productId: i.productId,
            quantity: parseInt(i.quantity),
            unitPrice: parseFloat(i.unitPrice)
        }))
      };

      await axios.post(API_ORDERS, payload);
      showSnackbar(t('order_success'), 'success');
      
      // Redirect to /orders page after 1.5 seconds
      setTimeout(() => navigate('/orders'), 1500);
      
    } catch (err) {
      setIsSubmitting(false);
      let errMessage = t('order_error');
      const data = err.response?.data;
      
      if (data?.error === 'insufficient_stock') {
          errMessage = t('insufficient_stock_error', { 
              product: data.productName, 
              available: data.available, 
              requested: data.requested 
          });
      } else if (typeof data === 'string' && data) {
          errMessage = data;
      }
      
      showSnackbar(errMessage, 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          {t('create_order')}
        </Typography>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<CameraIcon />} 
          onClick={() => setScannerOpen(true)}
          sx={{ borderRadius: 3, px: 3 }}
        >
          {t('scan_barcode')}
        </Button>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Customer Selection */}
          <TextField
              select
              fullWidth
              sx={{ mb: 2 }}
              label={t('select_customer')}
              value={customerId || ''}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <MenuItem value=""><em>{t('none')}</em></MenuItem>
              {Array.isArray(customers) && customers.map(c => (
                <MenuItem key={c?.id} value={c?.id}>
                    {i18n.language === 'en' ? (c?.nameEn || c?.name) : c?.name} ({c?.city})
                </MenuItem>
              ))}
            </TextField>

          {/* Warehouse Selection */}
            <TextField
              select
              fullWidth
              sx={{ mb: 4 }}
              label={t('select_warehouse')}
              value={warehouseId || ''}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
              helperText={warehouses.length > 1 ? t('select_warehouse_helper') : ''}
            >
              <MenuItem value=""><em>{t('none')}</em></MenuItem>
              {Array.isArray(warehouses) && warehouses.map(w => (
                <MenuItem key={w?.id} value={w?.id}>
                    {i18n.language === 'en' ? (w?.nameEn || w?.name) : w?.name}
                </MenuItem>
              ))}
            </TextField>

          {/* Line Items */}
          <Typography variant="h6" sx={{ mb: 2 }}>{t('order_items')}</Typography>
          <Divider sx={{ mb: 3 }} />

          {items.map((item, index) => (
            <Box 
              key={index} 
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'flex-start' }} 
              dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
            >
              <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 450px' } }}>
                <TextField
                  select
                  fullWidth
                  label={t('item')}
                  value={item.productId || ''}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  disabled={!warehouseId}
                  helperText={!warehouseId ? t('select_warehouse_first', 'اختر المستودع أولاً') : ''}
                >
                  <MenuItem value="">
                    <em>{t('none')}</em>
                  </MenuItem>
                  {products
                    .filter(p => {
                      if (!warehouseId) return false;
                      const stockInWh = p.stockLevels?.find(sl => sl.warehouseId === warehouseId);
                      return stockInWh && stockInWh.quantity > 0;
                    })
                    .map(p => {
                      const stockInWh = p.stockLevels?.find(sl => sl.warehouseId === warehouseId);
                      return (
                        <MenuItem key={p?.id} value={p?.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                            <Typography variant="body2" fontWeight="bold">
                                {i18n.language === 'en' ? (p?.nameEn || p?.name) : p?.name}
                            </Typography>
                            <Typography variant="caption" color="primary.main" fontWeight="900">
                              {stockInWh?.quantity} {t('in_stock_count')}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                </TextField>
              </Box>
              
              <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 100px' } }}>
                <TextField 
                  label={t('quantity')} 
                  type="number"
                  InputProps={{ inputProps: { min: 1 } }}
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 150px' } }}>
                <TextField 
                  label={t('unit_price')} 
                  type="number"
                  InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 0 100%', sm: '1 0 150px' }, display: 'flex', alignItems: 'center', height: '56px' }}>
                <Typography variant="body1" fontWeight="bold">
                  {t('subtotal')}: {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', height: '56px' }}>
                <IconButton color="error" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}

          <Button 
            variant="outlined" 
            startIcon={<Add />} 
            onClick={handleAddItem}
            sx={{ mt: 2, mb: 4 }}
          >
            {t('add_item')}
          </Button>

          <Divider sx={{ mb: 3 }} />

          {/* Totals */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mb: 4, gap: 1 }}>
            <Typography variant="body1" color="textSecondary">
              {t('subtotal')}: {calculateTotal().toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('vat_percentage')} ({settings.VatPercentage}%): {(calculateTotal() * (parseFloat(settings.VatPercentage) / 100)).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
            </Typography>
            <Divider sx={{ width: '200px', my: 1 }} />
            <Typography variant="h5" fontWeight="bold" color="primary">
              {t('total_amount')}: {(calculateTotal() * (1 + parseFloat(settings.VatPercentage) / 100)).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
            </Typography>
          </Box>

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              size="large"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Assessment />}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('processing') : t('submit_order')}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <BarcodeScanner 
        open={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleBarcodeScan}
      />
    </Box>
  );
};

export default CreateOrder;
