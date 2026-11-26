import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Grid, 
  CircularProgress, Snackbar, Alert, Avatar, useTheme, useMediaQuery,
  Card, CardContent, Divider
} from '@mui/material';
import { Add, Edit, Delete, Person, Email, Phone, Map } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../context/ConfirmContext';
import { usePermissions } from '../hooks/usePermissions';
import { API_URLS } from '../api';
import PageHelp from '../components/PageHelp';

const API_URL = API_URLS.CUSTOMERS;

const Customers = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameEn: '', email: '', phone: '', address: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setCustomers(res.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setCurrentCustomer(customer);
      setFormData({
        name: customer.name,
        nameEn: customer.nameEn || '',
        email: customer.email,
        phone: customer.phone,
        address: customer.address
      });
    } else {
      setCurrentCustomer(null);
      setFormData({ name: '', nameEn: '', email: '', phone: '', address: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentCustomer) {
        const payload = { ...formData, id: currentCustomer.id };
        await axios.put(`${API_URL}/${currentCustomer.id}`, payload);
        showSnackbar(t('customer_updated'));
      } else {
        await axios.post(API_URL, formData);
        showSnackbar(t('customer_added'));
      }
      handleCloseDialog();
      fetchCustomers();
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
        await axios.delete(`${API_URL}/${id}`);
        showSnackbar(t('customer_deleted'));
        fetchCustomers();
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
              {t('customers')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('customers_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="customers" />
        </Box>
        {hasPermission('إدارة العملاء') && (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2, py: 1, px: 3, boxShadow: 4 }}
          >
            {t('add_customer')}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Desktop Table */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0 }}>
              <Table stickyHeader>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('customer_name')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('email')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('phone')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('address')}</TableCell>
                    {hasPermission('إدارة العملاء') && <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(customers) && customers.map((row) => (
                    <TableRow hover key={row.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main', fontWeight: 'bold' }}>
                            {row.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">{row.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{row.nameEn}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.address}</TableCell>
                      {hasPermission('إدارة العملاء') && (
                        <TableCell align="center">
                          <IconButton color="primary" onClick={() => handleOpenDialog(row)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton color="error" onClick={() => handleDelete(row.id)}>
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
              {Array.isArray(customers) && customers.map((customer) => (
                <Grid size={12} key={customer.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 45, height: 45 }}>
                            <Person />
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold">{customer.name}</Typography>
                        </Box>
                      {hasPermission('إدارة العملاء') && (
                        <Box>
                          <IconButton size="small" color="primary" onClick={() => handleOpenDialog(customer)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(customer.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                      </Box>
                      
                      <Divider sx={{ mb: 2, opacity: 0.5 }} />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{customer.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{customer.phone}</Typography>
                        </Box>
                        {customer.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Map fontSize="small" color="action" />
                            <Typography variant="body2">{customer.address}</Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {customers.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h6" color="text.secondary">{t('no_customers')}</Typography>
            </Box>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{currentCustomer ? t('edit_customer') : t('add_customer')}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('customer_name')} name="name" value={formData.name} onChange={handleInputChange} required sx={{ bgcolor: 'background.paper' }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('name_en')} name="nameEn" value={formData.nameEn} onChange={handleInputChange} sx={{ bgcolor: 'background.paper' }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('email')} name="email" type="email" value={formData.email} onChange={handleInputChange} required sx={{ bgcolor: 'background.paper' }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('phone')} name="phone" value={formData.phone} onChange={handleInputChange} required sx={{ bgcolor: 'background.paper' }} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label={t('address')} name="address" value={formData.address} onChange={handleInputChange} multiline rows={2} sx={{ bgcolor: 'background.paper' }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">{t('cancel')}</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4 }}>
              {currentCustomer ? t('save_changes') : t('add_customer')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Customers;
