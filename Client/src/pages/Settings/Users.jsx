import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Grid, 
  Chip, CircularProgress, Snackbar, Alert, Stack, Tooltip,
  Switch, FormControlLabel, FormGroup, Divider, Card, CardHeader,
  alpha, useTheme, MenuItem
} from '@mui/material';
import { Add, Edit, Delete, Person, Shield, Warehouse as WarehouseIcon, Security as SecurityIcon } from '@mui/icons-material';
import { apiClient as axios, API_URLS } from '../../api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
 
const ROLE_DEFAULTS = {
  Admin: { all: true },
  Accountant: { modules: ['Accounting', 'General'], exclude: ['إقفال الفترات المالية'] },
  FinancialManager: { modules: ['Accounting', 'General'], exclude: ['إدارة المعاملات المالية'] },
  InventoryManager: { modules: ['Inventory', 'General'] },
  SalesManager: { modules: ['Sales', 'General'] },
  ProcurementOfficer: { modules: ['Procurement', 'General'], exclude: ['اعتماد الطلبات'] },
  ProcurementManager: { modules: ['Procurement', 'General'], exclude: ['إنشاء أمر شراء'] },
  HRManager: { modules: ['HR', 'General'], exclude: ['معالجة الرواتب'] },
  PayrollManager: { modules: ['HR', 'General'], exclude: ['إدارة ملفات الموظفين'] },
  Staff: { modules: ['General'], perms: ['عرض لوحة التحكم'] }
};

const Users = () => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', password: '', role: 'Employee', assignedModules: 'Core', jobTitle: ''
  });
  
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [availableWarehouses, setAvailableWarehouses] = useState([]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchUsers();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [permRes, warehouseRes] = await Promise.all([
        axios.get(`${API_URLS.PERMISSIONS}?t=${new Date().getTime()}`),
        axios.get(`${API_URLS.WAREHOUSES}?t=${new Date().getTime()}`)
      ]);
      setAvailablePermissions(permRes.data);
      setAvailableWarehouses(warehouseRes.data);
    } catch (err) {
      console.error("Error fetching metadata:", err);
      if (err.response?.status === 403) {
        showSnackbar(t('error_insufficient_permissions_metadata'), 'warning');
      } else {
        showSnackbar(t('error_fetching_metadata') || "Error fetching metadata", 'error');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URLS.USERS);
      setUsers(res.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (user = null) => {
    // دائماً قم بجلب أحدث قائمة صلاحيات ومستودعات عند فتح النافذة
    await fetchMetadata();

    if (user) {
      setCurrentUser(user);
      setFormData({
        username: user.username,
        password: '', 
        role: user.role,
        assignedModules: user.assignedModules,
        jobTitle: user.jobTitle || ''
      });
      // Fetch user specific permissions and warehouses
      try {
        const [permRes, warehouseRes] = await Promise.all([
          axios.get(`${API_URLS.PERMISSIONS}/user/${user.id}`),
          axios.get(`${API_URLS.PERMISSIONS}/user/${user.id}/warehouses`)
        ]);
        setSelectedPermIds(permRes.data || []);
        setSelectedWarehouseIds(warehouseRes.data || []);
      } catch (err) {
        console.error("Error fetching user perms:", err);
        showSnackbar(t('error_fetching_permissions'), 'error');
        setSelectedPermIds([]);
        setSelectedWarehouseIds([]);
      }
    } else {
      setCurrentUser(null);
      setFormData({ username: '', password: '', role: 'Employee', assignedModules: 'Core', jobTitle: '' });
      setSelectedPermIds([]);
      setSelectedWarehouseIds([]);
    }
    setOpenDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Calculate assigned modules based on selected permissions
      const selectedModules = [...new Set(
        availablePermissions
          .filter(p => selectedPermIds.includes(p.id))
          .map(p => p.module)
      )].join(',');

      const updatedFormData = { ...formData, assignedModules: selectedModules };

      let userId;
      if (currentUser) {
        userId = currentUser.id;
        await axios.put(`${API_URLS.USERS}/${userId}`, updatedFormData);
      } else {
        const res = await axios.post(API_URLS.USERS, updatedFormData);
        userId = res.data.id;
      }
      
      // Save permissions and warehouses separately
      await Promise.all([
        axios.post(`${API_URLS.PERMISSIONS}/user/${userId}`, selectedPermIds),
        axios.post(`${API_URLS.PERMISSIONS}/user/${userId}/warehouses`, selectedWarehouseIds)
      ]);

      showSnackbar(t('settings_saved'));
      setOpenDialog(false);
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || t('error_saving'), 'error');
    }
  };

  const togglePermission = (id) => {
    setSelectedPermIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleWarehouse = (id) => {
    setSelectedWarehouseIds(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };
 
  const handleRoleChange = (newRole) => {
    setFormData({ ...formData, role: newRole });
    
    const defaults = ROLE_DEFAULTS[newRole];
    if (!defaults) return;

    let newPermIds = [];
    if (defaults.all) {
      newPermIds = availablePermissions.map(p => p.id);
    } else {
      newPermIds = availablePermissions
        .filter(p => {
          const inModule = defaults.modules && defaults.modules.includes(p.module);
          const isPerm = defaults.perms && defaults.perms.includes(p.name);
          const isExcluded = defaults.exclude && defaults.exclude.includes(p.name);
          return (inModule || isPerm) && !isExcluded;
        })
        .map(p => p.id);
    }
    setSelectedPermIds(newPermIds);
  };

  const translateText = (text, type = 'perm') => {
    if (!text) return text;
    const key = text.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') + (type === 'desc' ? '_desc' : '_perm');
    const translated = t(key);
    return translated !== key ? translated : text;
  };

  const translateModule = (m) => {
    const key = `module_${m.toLowerCase() === 'accounting' ? 'finance' : m.toLowerCase()}`;
    return t(key) !== key ? t(key) : m;
  };

  const modules = [...new Set(availablePermissions.map(p => p.module))];

  const handleDelete = async (id) => {
    if (await confirm({ title: t('confirm_delete_title'), message: t('confirm_delete_msg') })) {
      try {
        await axios.delete(`${API_URLS.USERS}/${id}`);
        showSnackbar(t('product_deleted'));
        fetchUsers();
      } catch (err) {
        showSnackbar(err.response?.data?.message || t('error_deleting'), 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary.main">{t('users_management')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('users_management_subtitle')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 2 }}>
          {t('add_user')}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('username')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('role')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('assigned_modules')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Person color="primary" />
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">{user.username}</Typography>
                        {user.jobTitle && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {user.jobTitle}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={t(`role_${user.role.toLowerCase()}`)} 
                      color={user.role === 'Admin' ? 'error' : user.role === 'FinancialAccountant' ? 'info' : user.role === 'HRManager' ? 'success' : 'primary'}
                      size="small"
                      icon={<Shield fontSize="small" />}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {(user.assignedModules || '').split(',').filter(m => m).map(m => (
                        <Chip key={m} label={t(`module_${m.toLowerCase()}`)} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title={t('edit')}>
                        <IconButton color="primary" onClick={() => handleOpenDialog(user)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('delete')}>
                        <IconButton color="error" onClick={() => handleDelete(user.id)}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', px: 3, pt: 3 }}>
          {currentUser ? t('edit_user') : t('add_user')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ bgcolor: 'background.default', px: 3 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 'bold' }}>{t('user_login_details')}</Typography>
                <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField 
                        fullWidth 
                        label={t('username')} 
                        value={formData.username} 
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9._\-\@]/g, '');
                          setFormData({...formData, username: val});
                        }} 
                        required 
                        size="small" 
                        helperText={t('username_requirements', 'أحرف إنجليزية صغيرة، أرقام، ورموز (._-@) فقط')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField 
                        fullWidth 
                        label={t('job_title', 'المسمى الوظيفي الحر')} 
                        value={formData.jobTitle} 
                        onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} 
                        size="small" 
                        placeholder={t('example_job_title', 'مثال: مدير فرع، محاسب أول، فني صيانة')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField 
                        select
                        fullWidth 
                        label={t('system_role', 'نوع الحساب (توزيع تلقائي للصلاحيات)')} 
                        value={formData.role} 
                        onChange={(e) => handleRoleChange(e.target.value)} 
                        size="small"
                      >
                        <MenuItem value="Admin">{t('role_admin', 'مدير نظام كامل')}</MenuItem>
                        <MenuItem value="Accountant">{t('role_accountant', 'محاسب مالي')}</MenuItem>
                        <MenuItem value="InventoryManager">{t('role_inventory_manager', 'مدير مستودعات')}</MenuItem>
                        <MenuItem value="SalesManager">{t('role_sales_manager', 'مدير مبيعات')}</MenuItem>
                        <MenuItem value="ProcurementManager">{t('role_procurement_manager', 'مدير مشتريات')}</MenuItem>
                        <MenuItem value="HRManager">{t('role_hr_manager', 'مدير موارد بشرية')}</MenuItem>
                        <MenuItem value="Staff">{t('role_staff', 'موظف (صلاحيات محدودة)')}</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField 
                        fullWidth 
                        label={t('password')} 
                        type="password" 
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        required={!currentUser} 
                        size="small"
                        helperText={currentUser ? t('leave_blank_password') : ""}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Permissions Section */}
              <Grid size={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="primary" /> {t('user_permissions_singular')}
                </Typography>
                
                {modules.map(module => (
                  <Card key={module} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                    <CardHeader 
                      title={translateModule(module)} 
                      titleTypographyProps={{ variant: 'caption', fontWeight: 900, textTransform: 'uppercase', color: 'primary.main' }}
                      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), py: 1 }}
                    />
                    <Divider />
                    <FormGroup sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {availablePermissions.filter(p => p.module === module).map(perm => (
                        <FormControlLabel
                          key={perm.id}
                          control={
                            <Switch 
                              checked={selectedPermIds.includes(perm.id)} 
                              onChange={() => togglePermission(perm.id)}
                              color="primary"
                              size="small"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{translateText(perm.name)}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{translateText(perm.description, 'desc')}</Typography>
                            </Box>
                          }
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </FormGroup>
                  </Card>
                ))}
              </Grid>

              {/* Warehouse Access */}
              <Grid size={12}>
                 <Card sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                    <CardHeader 
                      title={t('warehouse_access')} 
                      titleTypographyProps={{ variant: 'caption', fontWeight: 900, textTransform: 'uppercase', color: 'secondary.main' }}
                      sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05), py: 1 }}
                      avatar={<WarehouseIcon color="secondary" sx={{ fontSize: 18 }} />}
                    />
                    <Divider />
                    <FormGroup sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {availableWarehouses.map(warehouse => (
                        <FormControlLabel
                          key={warehouse.id}
                          control={
                            <Switch 
                              checked={selectedWarehouseIds.includes(warehouse.id)} 
                              onChange={() => toggleWarehouse(warehouse.id)}
                              color="secondary"
                              size="small"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{warehouse.name}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{warehouse.location}</Typography>
                            </Box>
                          }
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </FormGroup>
                  </Card>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>{t('cancel')}</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: 2, px: 4 }}>{t('confirm')}</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
