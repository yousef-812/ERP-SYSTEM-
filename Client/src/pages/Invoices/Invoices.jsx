import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, CircularProgress, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Alert, TextField, MenuItem, Divider, Tooltip, Grid
} from '@mui/material';
import { Payments, Visibility, Edit, Add, Delete, Save, Close, PictureAsPdf } from '@mui/icons-material';
import { jsPDF } from "jspdf";
import { QRCodeCanvas } from 'qrcode.react';
import axios from 'axios';

import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { API_URLS } from '../../api';
import { getCurrencySymbol } from '../../utils/currencyHelper';
import PageHelp from '../../components/PageHelp';

const mapPaymentStatus = (status, t) => {
  switch (status) {
    case 0: return { label: t('unpaid'), color: 'error' };
    case 1: return { label: t('paid'), color: 'success' };
    case 2: return { label: t('partially_paid'), color: 'warning' };
    default: return { label: t('unknown'), color: 'default' };
  }
};

const Invoices = () => {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { hasPermission } = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedFullInvoice, setSelectedFullInvoice] = useState(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    items: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URLS.INVOICES);
      setInvoices(res.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(API_URLS.PRODUCTS);
      setProducts(res.data);
    } catch (err) {}
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Payment Logic
  const handlePayClick = (invoice) => {
    setSelectedInvoice(invoice);
    setPayDialogOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedInvoice) return;
    try {
      await axios.post(`${API_URLS.INVOICES}/${selectedInvoice.id}/pay`);
      showSnackbar(t('payment_success'), 'success');
      setPayDialogOpen(false);
      fetchInvoices();
    } catch (err) {
      showSnackbar(t('payment_error'), 'error');
    }
  };

  // Edit Logic
  const handleEditClick = async (invoice) => {
    if (invoice.paymentStatus === 1) {
      showSnackbar(t('paid_status_error'), 'warning');
      return;
    }

    try {
      const res = await axios.get(`${API_URLS.INVOICES}/${invoice.id}`);
      const fullInvoice = res.data;
      
      setEditForm({
        invoiceNumber: fullInvoice.invoiceNumber || '',
        invoiceDate: fullInvoice.invoiceDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        items: (fullInvoice.items || fullInvoice.invoice_items || []).map(d => ({
          productId: d.productId || '',
          quantity: d.quantity || 1,
          unitPrice: d.unitPrice || 0
        }))
      });
      setSelectedInvoice(fullInvoice);
      setEditDialogOpen(true);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    }
  };

  const handleViewClick = async (invoice) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URLS.INVOICES}/${invoice.id}`);
      setSelectedFullInvoice(res.data);
      setViewDialogOpen(true);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${selectedFullInvoice?.isCreditNote ? 'CreditNote' : 'Invoice'}_${selectedFullInvoice?.invoiceNumber || 'Doc'}`;
    window.print();
    document.title = originalTitle;
  };

  const handleAddItem = () => {
    setEditForm({
      ...editForm,
      items: [...editForm.items, { productId: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...editForm.items];
    newItems.splice(index, 1);
    setEditForm({ ...editForm, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editForm.items];
    newItems[index][field] = value;
    
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) newItems[index].unitPrice = prod.price;
    }
    
    setEditForm({ ...editForm, items: newItems });
  };

  const calculateTotal = () => {
    return editForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleUpdateInvoice = async () => {
    if (editForm.items.some(i => !i.productId || i.quantity <= 0)) {
        showSnackbar(t('order_validation_error'), 'warning');
        return;
    }

    try {
      setIsSaving(true);
      await axios.put(`${API_URLS.INVOICES}/${selectedInvoice.id}`, editForm);
      showSnackbar(t('invoice_updated'), 'success');
      setEditDialogOpen(false);
      fetchInvoices();
      fetchProducts(); // Refresh stock levels in dropdowns
    } catch (err) {
      showSnackbar(err.response?.data || t('error_saving'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const downloadPDF = async (invoice) => {
    try {
      setIsExporting(true);
      // We must show the dialog first so the element is in DOM
      if (!viewDialogOpen || selectedFullInvoice?.id !== invoice.id) {
        const res = await axios.get(`${API_URLS.INVOICES}/${invoice.id}`);
        setSelectedFullInvoice(res.data);
        setViewDialogOpen(true);
        // Wait for rendering
        setTimeout(() => {
          exportElementToPDF('invoice-capture', `Invoice_${invoice.invoiceNumber}.pdf`);
        }, 500);
      } else {
        exportElementToPDF('invoice-capture', `Invoice_${invoice.invoiceNumber}.pdf`);
      }
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    } finally {
      setIsExporting(false);
    }
  };


  if (loading && invoices.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
        {t('invoices')}
      </Typography>

      <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, boxShadow: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }}>
            <TableHead sx={{ bgcolor: 'background.paper' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('invoice_number')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('customer')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('warehouse')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('invoice_date')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('total_amount')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('payment_status')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(invoices) && invoices.map((row) => {
                const statusInfo = mapPaymentStatus(row.paymentStatus, t);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {row.order?.status === 4 && ( // 4 = Returned
                           <Chip label={t('credit_note_return')} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem', height: '18px' }} />
                        )}
                        {row.invoiceNumber}
                      </Box>
                    </TableCell>
                    <TableCell>
                        {i18n.language === 'en' ? (row.order?.customer?.nameEn || row.order?.customer?.name || t('unknown')) : (row.order?.customer?.name || t('unknown'))}
                    </TableCell>
                    <TableCell>
                        {i18n.language === 'en' ? (row.order?.warehouse?.nameEn || row.order?.warehouse?.name || t('unassigned')) : (row.order?.warehouse?.name || t('unassigned'))}
                    </TableCell>
                    <TableCell>{new Date(row.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {row.totalAmountInclTax.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={statusInfo.label} 
                        color={statusInfo.color} 
                        size="small" 
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        {(hasPermission('عرض الفواتير') || hasPermission('إصدار الفواتير')) && (
                          <>
                            <Tooltip title={t('view')}>
                              <IconButton color="default" onClick={() => handleViewClick(row)}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('print')}>
                              <IconButton color="primary" onClick={() => { handleViewClick(row); setTimeout(() => window.print(), 500); }}>
                                <PictureAsPdf fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        
                        {hasPermission('إصدار الفواتير') && row.paymentStatus !== 1 && (
                          <>
                            <Button 
                              startIcon={<Payments />} 
                              color="success" 
                              variant="contained" 
                              size="small"
                              onClick={() => handlePayClick(row)}
                            >
                              {t('pay_now')}
                            </Button>
                            <IconButton color="primary" onClick={() => handleEditClick(row)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        
                        {row.paymentStatus === 1 && (
                          <Chip label={t('paid')} size="small" variant="outlined" color="success" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Invoice Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>{t('edit_invoice')} - {selectedInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label={t('invoice_number')} 
                fullWidth 
                value={editForm.invoiceNumber}
                onChange={(e) => setEditForm({...editForm, invoiceNumber: e.target.value})}
              />
              <TextField 
                label={t('invoice_date')} 
                type="date" 
                fullWidth 
                InputLabelProps={{ shrink: true }}
                value={editForm.invoiceDate}
                onChange={(e) => setEditForm({...editForm, invoiceDate: e.target.value})}
              />
            </Box>

            <Divider>
              <Chip label={t('items')} size="small" />
            </Divider>

            {Array.isArray(editForm.items) && editForm.items.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <Box sx={{ flex: '1 0 300px' }}>
                  <TextField
                    select
                    fullWidth
                    label={t('item')}
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  >
                    <MenuItem value="" disabled>{t('none')}</MenuItem>
                    {Array.isArray(products) && products.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {i18n.language === 'en' ? (p.nameEn || p.name) : p.name} ({p.stockQuantity} {t('in_stock_count')})
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box sx={{ flex: '1 0 100px' }}>
                  <TextField
                    label={t('qty')}
                    type="number"
                    fullWidth
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  />
                </Box>
                <Box sx={{ flex: '1 0 120px' }}>
                  <TextField
                    label={t('unit_price')}
                    type="number"
                    fullWidth
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                  />
                </Box>
                <IconButton color="error" onClick={() => handleRemoveItem(index)} disabled={editForm.items.length === 1}>
                  <Delete />
                </IconButton>
              </Box>
            ))}

            <Button startIcon={<Add />} onClick={handleAddItem} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
              {t('add_item')}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {t('total_amount')}: {calculateTotal().toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
              </Typography>
            </Box>
            
            <Alert severity="info" sx={{ mt: 1 }}>
              {t('adjustment_helper')}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>{t('cancel')}</Button>
          <Button 
            onClick={handleUpdateInvoice} 
            variant="contained" 
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            disabled={isSaving}
          >
            {isSaving ? t('saving') : t('save_changes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)}>
        <DialogTitle>{t('confirm_invoice_payment_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            {t('confirm_invoice_payment')}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2"><strong>{t('invoice_number')}:</strong> {selectedInvoice?.invoiceNumber}</Typography>
              <Typography variant="body2"><strong>{t('total_amount')}:</strong> {selectedInvoice?.totalAmountInclTax?.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPayDialogOpen(false)} color="inherit">{t('cancel')}</Button>
          <Button onClick={handleConfirmPay} variant="contained" color="success" autoFocus>
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* View/Print Invoice Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>{selectedFullInvoice?.isCreditNote ? t('view_credit_note') : t('view_invoice')}</Box>
          <Box className="no-print">
            <Button startIcon={<Payments />} sx={{ mr: 1 }} color="inherit" onClick={handlePrint}>{t('print')}</Button>
            <IconButton onClick={() => setViewDialogOpen(false)}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers id="invoice-capture">
          {selectedFullInvoice && (
            <Box sx={{ p: { xs: 1, sm: 4 }, bgcolor: 'white', color: 'black' }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              {/* Invisible QR Canvas for PDF generation fallback */}
              <Box sx={{ display: 'none' }}>
                <QRCodeCanvas 
                   id={`qr-gen-${selectedFullInvoice.id}`}
                   value={`${window.location.origin}/verify/invoice/${selectedFullInvoice.invoiceNumber}`}
                />
              </Box>

              {/* Invoice Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 6, alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" fontWeight="900" color={selectedFullInvoice.isCreditNote ? "error" : "primary"} sx={{ mb: 1 }}>
                    {settings.CompanyName || t('erp_system_name')}
                  </Typography>
                  <Typography variant="body2">{settings.Address || t('company_address_placeholder')}</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ mt: 2, color: selectedFullInvoice.isCreditNote ? "error.main" : "text.primary" }}>
                    {selectedFullInvoice.isCreditNote ? t('credit_note_return') : t('tax_invoice')}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <QRCodeCanvas 
                      value={`${window.location.origin}/verify/invoice/${selectedFullInvoice.invoiceNumber}`}
                      size={80}
                      style={{ marginBottom: '10px' }}
                   />
                  <Typography variant="h6" fontWeight="bold">#{selectedFullInvoice.invoiceNumber}</Typography>
                  <Typography variant="body2">{t('date')}: {new Date(selectedFullInvoice.invoiceDate).toLocaleDateString()}</Typography>

                  <Chip 
                    label={mapPaymentStatus(selectedFullInvoice.paymentStatus, t).label} 
                    color={mapPaymentStatus(selectedFullInvoice.paymentStatus, t).color} 
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 4 }} />

              {/* Billing Info */}
              <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid size={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('bill_from')}</Typography>
                  <Typography variant="body1" fontWeight="bold">{settings.CompanyName}</Typography>
                  <Typography variant="body2">{settings.Address}</Typography>
                  <Typography variant="body2">{t('vat_label')}: {settings.TaxNumber || 'N/A'}</Typography>
                </Grid>
                <Grid size={6} sx={{ textAlign: i18n.language === 'ar' ? 'left' : 'right' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('bill_to')}</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {i18n.language === 'en' ? (selectedFullInvoice.customer?.nameEn || selectedFullInvoice.customer?.name) : selectedFullInvoice.customer?.name}
                  </Typography>
                  <Typography variant="body2">{selectedFullInvoice.customer?.address}</Typography>
                  <Typography variant="body2">{selectedFullInvoice.customer?.phone}</Typography>
                </Grid>
              </Grid>

              {/* Items Table */}
              <TableContainer component={Box} sx={{ mb: 4 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>{t('item')}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', color: 'black' }}>{t('qty')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'black' }}>{t('unit_price')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'black' }}>{t('subtotal')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedFullInvoice.items || selectedFullInvoice.invoice_items || []).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: 'black' }}>
                            {i18n.language === 'en' ? (item.product?.nameEn || item.productNameEn || item.product?.name || item.productName) : (item.productName || item.product?.name)}
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'black' }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ color: 'black' }}>{item.unitPrice?.toLocaleString() || '0'} {getCurrencySymbol(settings.Currency, i18n.language)}</TableCell>
                        <TableCell align="right" sx={{ color: 'black' }}>{(item.quantity * item.unitPrice)?.toLocaleString() || '0'} {getCurrencySymbol(settings.Currency, i18n.language)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Summary Calculations */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ width: '100%', maxWidth: 300 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="black">{t('subtotal')}</Typography>
                    <Typography variant="body2" color="black">{selectedFullInvoice.amount?.toLocaleString() || '0'} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="black">{t('vat_tax')} ({selectedFullInvoice.taxPercentage || settings.VatPercentage || 0}%)</Typography>
                    <Typography variant="body2" color="black">
                        {selectedFullInvoice.totalTax?.toLocaleString() || '0'} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight="bold" color={selectedFullInvoice.isCreditNote ? "error.main" : "black"}>{selectedFullInvoice.isCreditNote ? t('credit_note_return') : t('grand_total')}</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                      {selectedFullInvoice.totalAmount?.toLocaleString() || '0'} {getCurrencySymbol(settings.Currency, i18n.language)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 10, textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="caption">{t('adjustment_helper')}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="no-print">
            <Button onClick={() => setViewDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handlePrint} variant="contained" startIcon={<Payments />}>{t('print')}</Button>
        </DialogActions>
      </Dialog>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-capture, #invoice-capture * {
              visibility: visible;
            }
            #invoice-capture {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>


      {/* Exporting Overlay */}
      {isExporting && (
        <Box sx={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          bgcolor: 'rgba(255,255,255,0.7)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>{t('downloading') || 'Generating PDF...'}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Invoices;
