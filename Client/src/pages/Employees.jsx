import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Chip,
  Avatar, Grid, MenuItem, CircularProgress, useTheme, useMediaQuery,
  Card, CardContent, Divider, Snackbar, Alert
} from '@mui/material';
import { Add, Edit, Delete, Person, Phone, Email, Business, Badge, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../context/ConfirmContext';
import { apiClient, API_URLS } from '../api';
import { useSettings } from '../context/SettingsContext';
import { getCurrencySymbol } from '../utils/currencyHelper';
import PageHelp from '../components/PageHelp';

const Employees = () => {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { settings } = useSettings();

  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [formData, setFormData] = useState({
    name: '', nameEn: '', position: '', positionEn: '', department: '', departmentEn: '', 
    basicSalary: 0, warehouseId: '', phone: '', email: '', address: '', status: 'Active'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editEmployee, setEditEmployee] = useState(null);

  const fetchEmployees = async () => {
    try {
      const [empRes, whRes] = await Promise.all([
        apiClient.get(API_URLS.EMPLOYEES),
        apiClient.get(API_URLS.WAREHOUSES)
      ]);
      setEmployees(empRes.data);
      setWarehouses(whRes.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleOpen = (emp = null) => {
    if (emp) {
      setEditEmployee(emp);
      setFormData(emp);
    } else {
      setEditEmployee(null);
      setFormData({ 
        name: '', nameEn: '', position: '', positionEn: '', 
        department: '', departmentEn: '', basicSalary: 0, 
        phone: '', email: '', address: '', status: 'Active' 
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editEmployee) {
        await apiClient.put(`${API_URLS.EMPLOYEES}/${editEmployee.id}`, formData);
      } else {
        await apiClient.post(API_URLS.EMPLOYEES, formData);
      }
      setOpen(false);
      fetchEmployees();
      showSnackbar(t('employee_updated_success'));
    } catch (err) {
      showSnackbar(t('error_saving'), 'error');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.nameEn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = warehouseFilter === 'all' || emp.warehouseId === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

  const handleDelete = async (id) => {
    if (await confirm({ 
      title: t('confirm_delete_title'), 
      message: t('confirm_delete_msg') 
    })) {
      try {
        await apiClient.delete(`${API_URLS.EMPLOYEES}/${id}`);
        showSnackbar(t('employee_deleted_success'));
        fetchEmployees();
      } catch (err) {
        showSnackbar(t('error_deleting'), 'error');
      }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

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
              {t('employees')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('employees_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="employees" />
        </Box>
      {/* Filters & Search */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField 
          size="small" placeholder={t('search_employees')} 
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250, bgcolor: 'background.paper', borderRadius: 2 }}
        />
        <TextField 
          select size="small" label={t('warehouse')}
          value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
          sx={{ minWidth: 180, bgcolor: 'background.paper', borderRadius: 2 }}
        >
          <MenuItem value="all">{t('all_warehouses')}</MenuItem>
          {warehouses.map(w => (
            <MenuItem key={w.id} value={w.id}>
                {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => handleOpen()}
          sx={{ borderRadius: 2, py: 1, px: 3, boxShadow: 4, height: 40 }}
        >
          {t('add_employee')}
        </Button>
      </Box>
      </Box>

      {/* Desktop Table View */}
      {!isMobile && (
        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0 }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('employee')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('position')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('department')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('warehouse')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('salary')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{t('action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.soft', color: 'primary.main' }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {i18n.language === 'en' ? (emp.nameEn || emp.name) : emp.name}
                        </Typography>
                        {i18n.language !== 'en' && emp.nameEn && (
                          <Typography variant="caption" color="text.secondary">{emp.nameEn}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                        {i18n.language === 'en' ? (emp.positionEn || emp.position) : emp.position}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {i18n.language === 'en' ? (emp.departmentEn || emp.department) : emp.department}
                  </TableCell>
                  <TableCell>
                    <Chip 
                        size="small" icon={<Business fontSize="small" />} 
                        label={i18n.language === 'en' ? (emp.warehouse?.nameEn || emp.warehouse?.name || t('unassigned')) : (emp.warehouse?.name || t('unassigned'))} 
                        variant="outlined" 
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {(emp.basicSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={t((emp.status || 'Active').toLowerCase())} 
                      size="small" 
                      color={emp.status === 'Active' ? 'success' : 'default'} 
                      sx={{ borderRadius: 1.5, fontWeight: 'bold' }}
                    />
                  </TableCell>
                   <TableCell align="right">
                    <IconButton onClick={() => navigate(`/employees/${emp.id}`)} color="info" title={t('view_profile')}><Visibility fontSize="small" /></IconButton>
                    <IconButton onClick={() => handleOpen(emp)} color="primary" title={t('edit')}><Edit fontSize="small" /></IconButton>
                    <IconButton onClick={() => handleDelete(emp.id)} color="error" title={t('delete')}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <Grid container spacing={2}>
          {filteredEmployees.map((emp) => (
            <Grid size={12} key={emp.id}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 45, height: 45 }}>
                        <Person />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                            {i18n.language === 'en' ? (emp.nameEn || emp.name) : emp.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {i18n.language === 'en' ? (emp.positionEn || emp.position) : emp.position}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={t((emp.status || 'Active').toLowerCase())} 
                      size="small" 
                      color={emp.status === 'Active' ? 'success' : 'default'} 
                    />
                  </Box>

                  <Divider sx={{ mb: 2, opacity: 0.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business fontSize="small" color="action" />
                      <Typography variant="body2">
                        {i18n.language === 'en' ? (emp.departmentEn || emp.department) : emp.department}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">{emp.email}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{emp.phone}</Typography>
                    </Box>
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'primary.soft', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight="bold" color="primary.main">{t('salary')}:</Typography>
                      <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                        {(emp.basicSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => navigate(`/employees/${emp.id}`)}>{t('profile')}</Button>
                      <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => handleOpen(emp)}>{t('edit')}</Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDelete(emp.id)}>{t('delete')}</Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editEmployee ? t('edit_employee') : t('add_employee')}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('name')} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('name_en')} value={formData.nameEn} onChange={(e) => setFormData({...formData, nameEn: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('position')} value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('position_en')} value={formData.positionEn} onChange={(e) => setFormData({...formData, positionEn: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('department')} value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('department_en')} value={formData.departmentEn} onChange={(e) => setFormData({...formData, departmentEn: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label={`${t('basic_salary')} (${getCurrencySymbol(settings.Currency, i18n.language)})`} type="number" value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: parseFloat(e.target.value) || 0})} required sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label={t('phone')} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth label={t('email')} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} sx={{ bgcolor: 'background.paper' }} />
            </Grid>
            <Grid size={12}>
              <TextField select fullWidth label={t('warehouse')} value={formData.warehouseId} onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} sx={{ bgcolor: 'background.paper' }} required>
                {warehouses.map(w => (
                    <MenuItem key={w.id} value={w.id}>
                        {i18n.language === 'en' ? (w.nameEn || w.name) : w.name}
                    </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField select fullWidth label={t('status')} value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} sx={{ bgcolor: 'background.paper' }} >
                <MenuItem value="Active">{t('active')}</MenuItem>
                <MenuItem value="OnLeave">{t('on_leave')}</MenuItem>
                <MenuItem value="Terminated">{t('terminated')}</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} variant="contained" sx={{ px: 4 }}>{t('save_changes')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Employees;
