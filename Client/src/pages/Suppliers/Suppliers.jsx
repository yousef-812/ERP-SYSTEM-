import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Grid, 
  CircularProgress, Snackbar, Alert, Avatar, useTheme, useMediaQuery,
  Card, CardContent, Divider
} from '@mui/material';
import { Add, Edit, Delete, Business, Email, Phone, Map } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { usePermissions } from '../../hooks/usePermissions';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';

const Suppliers = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState({ 
    name: '', nameEn: '', contactPerson: '', phone: '', email: '', address: '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URLS.SUPPLIERS);
      setSuppliers(res.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpen = (supplier = null) => {
    if (supplier) {
      setCurrentSupplier(supplier);
      setEditMode(true);
    } else {
      setCurrentSupplier({ name: '', nameEn: '', contactPerson: '', phone: '', email: '', address: '' });
      setEditMode(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentSupplier({ name: '', nameEn: '', contactPerson: '', phone: '', email: '', address: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API_URLS.SUPPLIERS}/${currentSupplier.id}`, currentSupplier);
        showSnackbar(t('product_updated'));
      } else {
        await axios.post(API_URLS.SUPPLIERS, currentSupplier);
        showSnackbar(t('product_added'));
      }
      handleClose();
      fetchSuppliers();
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ 
      title: t('confirm_delete_title'), 
      message: t('confirm_delete_msg') 
    })) {
      try {
        await axios.delete(`${API_URLS.SUPPLIERS}/${id}`);
        showSnackbar(t('product_deleted'));
        fetchSuppliers();
      } catch (err) {
        showSnackbar(t('error_deleting'), 'error');
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
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
            <Typography variant="h4" fontWeight="900" color="primary.main">
              {t('suppliers')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('suppliers_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="suppliers" />
        </Box>
        {hasPermission('إدارة الموردين') && (
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{ borderRadius: 2, py: 1, px: 3, boxShadow: 4 }}
          >
            {t('add_supplier')}
          </Button>
        )}
      </Box>

      {loading && suppliers.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Desktop View */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0 }}>
              <Table stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('name')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('contact_person')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('phone')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('email')}</TableCell>
                    {hasPermission('إدارة الموردين') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(suppliers) && suppliers?.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main' }}>
                            <Business />
                          </Avatar>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {i18n.language === 'en' ? (s.nameEn || s.name) : s.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{s.contactPerson}</TableCell>
                      <TableCell>{s.phone}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      {hasPermission('إدارة الموردين') && (
                        <TableCell align="center">
                          <IconButton color="primary" onClick={() => handleOpen(s)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton color="error" onClick={() => handleDelete(s.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
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
              {Array.isArray(suppliers) && suppliers?.map((supplier) => (
                <Grid size={12} key={supplier.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 45, height: 45 }}>
                            <Business />
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold">
                            {i18n.language === 'en' ? (supplier.nameEn || supplier.name) : supplier.name}
                          </Typography>
                        </Box>
                        <Box>
                          {hasPermission('إدارة الموردين') && (
                            <IconButton size="small" color="primary" onClick={() => handleOpen(supplier)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          )}
                          {hasPermission('إدارة الموردين') && (
                            <IconButton size="small" color="error" onClick={() => handleDelete(supplier.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      
                      <Divider sx={{ mb: 2, opacity: 0.5 }} />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{supplier.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{supplier.phone}</Typography>
                        </Box>
                        {supplier.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Map fontSize="small" color="action" />
                            <Typography variant="body2">{supplier.address}</Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">{t('contact')}</Typography>
                          <Typography variant="caption" color="text.primary">{supplier.contactPerson}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>{editMode ? t('edit_supplier') : t('add_supplier')}</DialogTitle>
          <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
            <Grid container spacing={3} sx={{ mt: 0.5 }} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Grid size={6}>
                <TextField fullWidth label={t('supplier_name')} value={currentSupplier.name} onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })} required />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label={t('name_en')} value={currentSupplier.nameEn || ''} onChange={(e) => setCurrentSupplier({ ...currentSupplier, nameEn: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label={t('contact_person')} value={currentSupplier.contactPerson} onChange={(e) => setCurrentSupplier({ ...currentSupplier, contactPerson: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label={t('phone')} value={currentSupplier.phone} onChange={(e) => setCurrentSupplier({ ...currentSupplier, phone: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label={t('email')} type="email" value={currentSupplier.email} onChange={(e) => setCurrentSupplier({ ...currentSupplier, email: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth multiline rows={2} label={t('address')} value={currentSupplier.address} onChange={(e) => setCurrentSupplier({ ...currentSupplier, address: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleClose}>{t('cancel')}</Button>
            <Button type="submit" variant="contained" sx={{ px: 4 }}>{t('save_changes')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Suppliers;
