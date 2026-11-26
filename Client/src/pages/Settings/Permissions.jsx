import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup,
  Divider, Select, MenuItem, InputLabel, FormControl, Button,
  CircularProgress, alpha, useTheme, Card, CardHeader, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, List, ListItem, ListItemIcon, ListItemText, IconButton
} from '@mui/material';
import {
  Save as SaveIcon, Shield as ShieldIcon, Security as SecurityIcon,
  Business as WarehouseIcon, Warning as WarningIcon,
  AddCircleOutline as AddIcon, RemoveCircleOutline as RemoveIcon, Info as InfoIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiClient as axios, API_URLS } from '../../api';

const Permissions = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [userPermIds, setUserPermIds] = useState([]);
  const [originalUserPermIds, setOriginalUserPermIds] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [assignedWarehouseIds, setAssignedWarehouseIds] = useState([]);
  const [originalWarehouseIds, setOriginalWarehouseIds] = useState([]);
  const [sodConflicts, setSodConflicts] = useState([]);
  const [activeConflicts, setActiveConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, permRes, warehouseRes, sodRes] = await Promise.all([
        axios.get(API_URLS.USERS),
        axios.get(API_URLS.PERMISSIONS),
        axios.get(API_URLS.WAREHOUSES),
        axios.get(`${API_URLS.PERMISSIONS}/sod-conflicts`)
      ]);
      setUsers(usersRes.data);
      setPermissions(permRes.data);
      setWarehouses(warehouseRes.data);
      setSodConflicts(sodRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // التحقق من التعارضات كلما تغيرت الصلاحيات المختارة
  useEffect(() => {
    if (!Array.isArray(sodConflicts) || !Array.isArray(permissions) || !sodConflicts.length || !permissions.length) return;
    const selectedNames = permissions
      .filter(p => userPermIds.includes(p.id))
      .map(p => p.name);

    const found = sodConflicts.filter(
      r => selectedNames.includes(r.permissionA) && selectedNames.includes(r.permissionB)
    );
    setActiveConflicts(found);
  }, [userPermIds, permissions, sodConflicts]);

  const handleUserChange = async (userId) => {
    setSelectedUserId(userId);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const [permRes, warehouseRes] = await Promise.all([
        axios.get(`${API_URLS.PERMISSIONS}/user/${userId}`),
        axios.get(`${API_URLS.PERMISSIONS}/user/${userId}/warehouses`)
      ]);
      setUserPermIds(permRes.data);
      setOriginalUserPermIds(permRes.data);
      setAssignedWarehouseIds(warehouseRes.data);
      setOriginalWarehouseIds(warehouseRes.data);
    } catch (error) {
      console.error('Error fetching user context', error);
    }
  };

  const togglePermission = (permId) => {
    setUserPermIds(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
    setSaveError('');
    setSaveSuccess(false);
  };

  const toggleWarehouse = (warehouseId) => {
    setAssignedWarehouseIds(prev =>
      prev.includes(warehouseId) ? prev.filter(id => id !== warehouseId) : [...prev, warehouseId]
    );
  };

  const selectAllWarehouses = () => setAssignedWarehouseIds(warehouses.map(w => w.id));
  const clearAllWarehouses  = () => setAssignedWarehouseIds([]);
  const handleSaveClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await Promise.all([
        axios.post(`${API_URLS.PERMISSIONS}/user/${selectedUserId}`, userPermIds),
        axios.post(`${API_URLS.PERMISSIONS}/user/${selectedUserId}/warehouses`, assignedWarehouseIds)
      ]);
      setOriginalUserPermIds(userPermIds);
      setOriginalWarehouseIds(assignedWarehouseIds);
      setSaveSuccess(true);
    } catch (error) {
      const msg = error.response?.data?.message
        || (error.response?.data?.conflicts ? error.response.data.conflicts.join(' | ') : null)
        || t('error_saving');
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const modules = [...new Set((Array.isArray(permissions) ? permissions : []).map(p => p.module))];

  const isConflictingPerm = (permName) =>
    activeConflicts.some(c => c.permissionA === permName || c.permissionB === permName);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" gutterBottom>
              {t('employee_permissions')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('granular_access')}
            </Typography>
          </Box>
          <IconButton onClick={() => setHelpOpen(true)} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
            <InfoIcon />
          </IconButton>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{ borderRadius: 2, px: 4 }}
          disabled={!selectedUserId || saving}
          onClick={handleSaveClick}
        >
          {t('save_changes')}
        </Button>
      </Box>

      {/* تنبيهات الحفظ */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(false)}>
          {t('permissions_saved_relogin')}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>
          {saveError}
        </Alert>
      )}

      {/* تحذيرات SoD النشطة */}
      {Array.isArray(activeConflicts) && activeConflicts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          <Typography fontWeight="bold" gutterBottom>{t('sod_conflict_detected')}</Typography>
          {activeConflicts.map((c, i) => (
            <Typography key={i} variant="body2">• {t(c.reason)}</Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* اختيار المستخدم */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight="800" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldIcon color="primary" /> {t('select_user')}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <FormControl fullWidth>
              <InputLabel>{t('user')}</InputLabel>
              <Select
                value={selectedUserId}
                label={t('user')}
                onChange={(e) => handleUserChange(e.target.value)}
              >
                {Array.isArray(users) && users.map(u => (
                  <MenuItem key={u?.id} value={u?.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight="bold">{u?.username}</Typography>
                      <Typography variant="caption" color="text.secondary">{u?.role}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* SoD Rules Reference */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" fontWeight="bold" color="warning.main" gutterBottom display="block">
                {t('applied_sod_rules')}
              </Typography>
              {Array.isArray(sodConflicts) && sodConflicts.map((rule, i) => (
                <Box key={i} sx={{ mb: 1, p: 1, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">{t(rule.reason)}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* الصلاحيات */}
        <Grid size={{ xs: 12, md: 8 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : (
            <Box>
              {modules.map(module => (
                <Card key={module} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <CardHeader
                    title={t(module)}
                    titleTypographyProps={{ variant: 'subtitle2', fontWeight: 900, textTransform: 'uppercase' }}
                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                  />
                  <Divider />
                  <FormGroup sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                    {permissions.filter(p => p?.module === module).map(perm => {
                      const hasConflict = isConflictingPerm(perm.name);
                      return (
                        <FormControlLabel
                          key={perm?.id}
                          control={
                            <Switch
                              checked={userPermIds.includes(perm?.id)}
                              onChange={() => togglePermission(perm?.id)}
                              color={hasConflict ? 'warning' : 'primary'}
                              disabled={!selectedUserId}
                            />
                          }
                          label={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" fontWeight="600">{t(perm?.name)}</Typography>
                                {hasConflict && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                              </Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {t(perm?.description)}
                              </Typography>
                            </Box>
                          }
                          sx={{ m: 1, ...(hasConflict && { bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1 }) }}
                        />
                      );
                    })}
                  </FormGroup>
                </Card>
              ))}

              {/* المخازن */}
              <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <CardHeader
                  title={t('warehouse_access')}
                  titleTypographyProps={{ variant: 'subtitle2', fontWeight: 900, textTransform: 'uppercase' }}
                  sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.05) }}
                  avatar={<WarehouseIcon color="secondary" fontSize="small" />}
                  action={
                    <Box sx={{ pr: 2 }}>
                      <Button size="small" onClick={selectAllWarehouses} sx={{ mr: 1 }}>{t('select_all')}</Button>
                      <Button size="small" color="inherit" onClick={clearAllWarehouses}>{t('clear_all')}</Button>
                    </Box>
                  }
                />
                <Divider />
                <FormGroup sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                  {warehouses.map(warehouse => (
                    <FormControlLabel
                      key={warehouse?.id}
                      control={
                        <Switch
                          checked={assignedWarehouseIds.includes(warehouse?.id)}
                          onChange={() => toggleWarehouse(warehouse?.id)}
                          color="secondary"
                          disabled={!selectedUserId}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="600">{warehouse?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{warehouse?.location}</Typography>
                        </Box>
                      }
                      sx={{ m: 1 }}
                    />
                  ))}
                </FormGroup>
              </Card>

              {!selectedUserId && (
                <Paper sx={{ p: 5, textAlign: 'center', bgcolor: alpha(theme.palette.action.disabledBackground, 0.1), border: '2px dashed', borderColor: 'divider' }}>
                  <SecurityIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">{t('select_user_to_manage')}</Typography>
                </Paper>
              )}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <InfoIcon color="primary" /> {t('confirm_permissions_changes', 'تأكيد تغييرات الصلاحيات')}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2 }}>
            {t('review_changes_before_saving', 'يرجى مراجعة التغييرات التالية قبل الحفظ للتأكد من عدم منح أو سحب صلاحيات بالخطأ:')}
          </DialogContentText>
          
          {userPermIds.filter(id => !originalUserPermIds.includes(id)).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="success.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon fontSize="small" /> {t('permissions_added', 'صلاحيات تمت إضافتها')}
              </Typography>
              <List dense>
                {userPermIds.filter(id => !originalUserPermIds.includes(id)).map(id => {
                  const p = permissions.find(x => x.id === id);
                  return p ? <ListItem key={id}><ListItemText primary={t(p.name)} secondary={t(p.description)} /></ListItem> : null;
                })}
              </List>
            </Box>
          )}

          {originalUserPermIds.filter(id => !userPermIds.includes(id)).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="error.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RemoveIcon fontSize="small" /> {t('permissions_removed', 'صلاحيات تمت إزالتها')}
              </Typography>
              <List dense>
                {originalUserPermIds.filter(id => !userPermIds.includes(id)).map(id => {
                  const p = permissions.find(x => x.id === id);
                  return p ? <ListItem key={id}><ListItemText primary={t(p.name)} secondary={t(p.description)} /></ListItem> : null;
                })}
              </List>
            </Box>
          )}

          {userPermIds.filter(id => !originalUserPermIds.includes(id)).length === 0 && originalUserPermIds.filter(id => !userPermIds.includes(id)).length === 0 && (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              {t('no_permission_changes', 'لم يتم تغيير أي صلاحيات.')}
            </Typography>
          )}
          {activeConflicts.length > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}>
              <Typography variant="subtitle2" color="warning.main" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningIcon fontSize="small" /> {t('sod_conflict_detected')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('sod_warning_notice', 'لقد تم اكتشاف تضارب في المهام. يمكنك الاستمرار في الحفظ، ولكن يرجى العلم أن هذا قد يشكل مخاطر أمنية:')}
              </Typography>
              {activeConflicts.map((c, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', color: 'warning.dark' }}>• {t(c.reason)}</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">{t('cancel', 'إلغاء')}</Button>
          <Button onClick={handleConfirmSave} variant="contained" color="primary">{t('confirm_and_save', 'تأكيد وحفظ')}</Button>
        </DialogActions>
      </Dialog>
      {/* Help Dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <InfoIcon color="primary" /> {t('permissions_guide', 'دليل الصلاحيات')}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2 }}>
            {t('permissions_guide_desc', 'يعرض هذا الدليل شرحاً تفصيلياً لكل صلاحية متاحة في النظام لتسهيل فهم تأثيرها على المستخدمين.')}
          </DialogContentText>
          <Box>
            {modules.map(module => (
              <Box key={module} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mb: 1, textTransform: 'uppercase' }}>
                  {t(module)}
                </Typography>
                <List disablePadding>
                  {permissions.filter(p => p?.module === module).map(perm => (
                    <ListItem key={perm.id} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.5), mb: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <ListItemIcon>
                        <ShieldIcon color="secondary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={<Typography variant="body2" fontWeight="bold">{t(perm?.name)}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{t(perm?.description)}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)} variant="contained" color="primary">
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Permissions;
