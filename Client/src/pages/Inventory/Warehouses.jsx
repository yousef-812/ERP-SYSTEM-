import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Grid, 
  CircularProgress, Snackbar, Alert, Avatar, useTheme, useMediaQuery,
  Card, CardContent, Divider, Chip
} from '@mui/material';
import { Add, Edit, Delete, Warehouse as WarehouseIcon, Place, Person, Phone } from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { usePermissions } from '../../hooks/usePermissions';
import { API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';

const API_URL = API_URLS.WAREHOUSES;

const Warehouses = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: '', nameEn: '', location: '', manager: '', phone: '', isActive: true });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);

      if (Array.isArray(res.data)) {
        setWarehouses(res.data);
      } else {

        setWarehouses([]);
      }
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setCurrentWarehouse(warehouse);
      setFormData({
        name: warehouse.name || '',
        nameEn: warehouse.nameEn || '',
        location: warehouse.location || '',
        manager: warehouse.manager || '',
        phone: warehouse.phone || '',
        isActive: warehouse.isActive
      });
    } else {
      setCurrentWarehouse(null);
      setFormData({ name: '', nameEn: '', location: '', manager: '', phone: '', isActive: true });
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
      if (currentWarehouse) {
        await axios.put(`${API_URL}/${currentWarehouse.id}`, { ...formData, id: currentWarehouse.id });
        showSnackbar(t('warehouse_updated'));
      } else {
        await axios.post(API_URL, formData);
        showSnackbar(t('warehouse_added'));
      }
      handleCloseDialog();
      fetchWarehouses();
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
        showSnackbar(t('warehouse_deleted'));
        fetchWarehouses();
      } catch (err) {
        if (err.response?.status === 400) {
            showSnackbar(t('warehouse_delete_error'), 'error');
        } else {
            showSnackbar(t('error_deleting'), 'error');
        }
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
      {/* Header */}
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
              {t('warehouses')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('manage_warehouses_desc')}
            </Typography>
          </Box>
          <PageHelp helpKey="warehouses" />
        </Box>
        {hasPermission('إدارة المستودعات') && (
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            {t('add_warehouse')}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {Array.isArray(warehouses) && warehouses.length > 0 ? (
            warehouses.map((w) => (
              <Grid size={{ xs: 12, md: 6 }} key={w.id}>
                <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', '&:hover': { boxShadow: 4, transition: '0.3s' } }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
                          <WarehouseIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                          </Typography>
                          <Chip size="small" label={w.isActive ? t('active') : t('inactive')} color={w.isActive ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                        </Box>
                      </Box>
                      <Box>
                        {hasPermission('إدارة المستودعات') && (
                          <IconButton size="small" onClick={() => handleOpenDialog(w)}>
                            <Edit fontSize="small" color="primary" />
                          </IconButton>
                        )}
                        {hasPermission('إدارة المستودعات') && (
                          <IconButton size="small" onClick={() => handleDelete(w.id)}>
                            <Delete fontSize="small" color="error" />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Place fontSize="small" color="action" />
                          <Typography variant="body2">{w.location || t('not_specified')}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2">{w.manager || t('not_specified')}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{w.phone || t('not_specified')}</Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                            <Typography variant="caption" fontWeight="bold" color="primary">Qty</Typography>
                          </Box>
                          <Typography variant="body2">
                            {w.stockLevels?.reduce((acc, curr) => acc + curr.quantity, 0) || 0} {t('items')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid size={12}>
              <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
                <WarehouseIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">{t('no_warehouses')}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{currentWarehouse ? t('edit_warehouse') : t('add_warehouse')}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('warehouse_name')} name="name" value={formData.name} onChange={handleInputChange} required />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('warehouse_name_en')} name="nameEn" value={formData.nameEn} onChange={handleInputChange} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label={t('warehouse_location')} name="location" value={formData.location} onChange={handleInputChange} multiline rows={2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('warehouse_manager')} name="manager" value={formData.manager} onChange={handleInputChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t('warehouse_phone')} name="phone" value={formData.phone} onChange={handleInputChange} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCloseDialog} color="inherit">{t('cancel')}</Button>
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4 }}>
              {currentWarehouse ? t('save_changes') : t('add_warehouse')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Warehouses;
