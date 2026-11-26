import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  Button,
  Paper,
  alpha,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid
} from '@mui/material';
import { 
  EventAvailableOutlined as EventAvailable, 
  Add as AddIcon, 
  CheckCircleOutlined as CheckCircle, 
  CancelOutlined as Cancel,
  InfoOutlined as Info,
  BeachAccessOutlined as BeachAccess,
  MedicalServicesOutlined as MedicalServices,
  FlightTakeoffOutlined as FlightTakeoff
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiClient, API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';
import { usePermissions } from '../../hooks/usePermissions';
import { AppPermissions } from '../../utils/AppPermissions';

const TimeOff = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openRequest, setOpenRequest] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(AppPermissions.HR_ManageTimeOff);
  const canCreate = hasPermission(AppPermissions.HR_CreateTimeOff);
  const canView = hasPermission(AppPermissions.HR_ViewTimeOff) || canManage || canCreate;
  
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: 'Vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, empRes] = await Promise.all([
        apiClient.get(`${API_URLS.HR.BASE}/time-off`),
        apiClient.get(API_URLS.EMPLOYEES)
      ]);
      setRequests(reqRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      setError(t('error_fetching'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await apiClient.put(`${API_URLS.HR.BASE}/time-off/${id}/${action}`);
      setSnackbar({ open: true, message: t('request_action_success'), severity: 'success' });
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: t('request_action_error'), severity: 'error' });
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`${API_URLS.HR.BASE}/time-off`, newRequest);
      setOpenRequest(false);
      setSnackbar({ open: true, message: t('request_submitted_success'), severity: 'success' });
      fetchData();
      setNewRequest({ employeeId: '', type: 'Vacation', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setSnackbar({ open: true, message: t('request_action_error'), severity: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      default: return 'warning';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Vacation': return <BeachAccess />;
      case 'Sick Leave': return <MedicalServices />;
      case 'Business Trip': return <FlightTakeoff />;
      default: return <EventAvailable />;
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('time_off')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('time_off_track_desc')}
            </Typography>
          </Box>
          <PageHelp helpKey="time_off" />
        </Box>
        {canCreate && (
          <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => setOpenRequest(true)}
          >
            {t('request_time_off')}
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Leave Balances Summary - Dynamic calculations if needed but using indicators for now */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { type: 'Vacation', key: 'vacation', icon: <BeachAccess />, color: theme.palette.primary.main },
          { type: 'Sick', key: 'sick_leave', icon: <MedicalServices />, color: theme.palette.error.main },
          { type: 'Business', key: 'business_trip', icon: <FlightTakeoff />, color: theme.palette.info.main },
        ].map((item, index) => {
          const count = Array.isArray(requests) ? requests.filter(r => 
            r.type?.toLowerCase().includes(item.type.toLowerCase()) || 
            item.type.toLowerCase().includes(r.type?.toLowerCase())
          ).length : 0;
          return (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(item.color, 0.1), color: item.color, display: 'flex' }}>
                  {item.icon || <EventAvailable />}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">{t(item.key)}</Typography>
                  <Typography variant="h6" fontWeight="800">{count} {t('total')}</Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="700">{t('leave_history')}</Typography>
          <Chip label={`${requests.length} ${t('total')}`} size="small" variant="outlined" />
        </Box>
        <List sx={{ p: 0 }}>
          {Array.isArray(requests) && requests.map((req, index) => (
            <React.Fragment key={req.id}>
              <ListItem 
                sx={{ 
                  py: 2.5, 
                  px: 3, 
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } 
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>{getIcon(req.type)}</Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={<Typography variant="body1" fontWeight="700">{req.employee?.name || t('unknown')}</Typography>} 
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>{t(req.type?.toLowerCase().replace(' ', '_')) || req.type}</Typography>
                      <Typography variant="caption" color="text.secondary">•</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(req.startDate).toLocaleDateString()} {t('to')} {new Date(req.endDate).toLocaleDateString()} ({req.totalDays} {t('days')})
                      </Typography>
                      {req.reason && (
                          <>
                            <Typography variant="caption" color="text.secondary">•</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>"{req.reason}"</Typography>
                          </>
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label={t(req.status === 'Approved' ? 'approved' : req.status === 'Rejected' ? 'rejected' : 'pending')} 
                    size="small" 
                    color={getStatusColor(req.status)}
                    sx={{ fontWeight: 'bold', width: 90 }}
                  />
                  {canManage && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('approve')}>
                        <span>
                          <IconButton 
                              size="small" 
                              color="success" 
                              disabled={req.status !== 'Pending'}
                              onClick={() => handleAction(req.id, 'approve')}
                          >
                              <CheckCircle />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t('reject')}>
                        <span>
                          <IconButton 
                              size="small" 
                              color="error" 
                              disabled={req.status !== 'Pending'}
                              onClick={() => handleAction(req.id, 'reject')}
                          >
                              <Cancel />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </ListItem>
              {index < requests.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          {requests.length === 0 && (
              <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">{t('no_leaves_found')}</Typography>
              </Box>
          )}
        </List>
      </Paper>

      {/* New Request Dialog */}
      <Dialog open={openRequest} onClose={() => setOpenRequest(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <form onSubmit={handleSubmitRequest}>
              <DialogTitle sx={{ fontWeight: '800', p: 3 }}>{t('submit_leave_request')}</DialogTitle>
              <DialogContent dividers sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                      <Grid container spacing={3}>
                          <Grid size={{ xs: 12 }}>
                            <TextField 
                                select 
                                fullWidth 
                                label={t('select_employee')} 
                                required
                                value={newRequest.employeeId}
                                onChange={(e) => setNewRequest({...newRequest, employeeId: e.target.value})}
                            >
                                {Array.isArray(employees) && employees.map(emp => (
                                    <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                                ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                              <TextField 
                                select 
                                fullWidth 
                                label={t('leave_type')} 
                                required
                                value={newRequest.type}
                                onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}
                              >
                                  <MenuItem value="Vacation">{t('vacation')}</MenuItem>
                                  <MenuItem value="Sick Leave">{t('sick_leave')}</MenuItem>
                                  <MenuItem value="Business Trip">{t('business_trip')}</MenuItem>
                              </TextField>
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                              <TextField 
                                fullWidth label={t('total_days_auto')} type="number" disabled
                                value={(newRequest.startDate && newRequest.endDate) ? 
                                    Math.ceil((new Date(newRequest.endDate) - new Date(newRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 0}
                              />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                              <TextField 
                                fullWidth label={t('start_date')} type="date" required
                                InputLabelProps={{ shrink: true }}
                                value={newRequest.startDate}
                                onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                              />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                              <TextField 
                                fullWidth label={t('end_date')} type="date" required
                                InputLabelProps={{ shrink: true }}
                                value={newRequest.endDate}
                                onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                              />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                              <TextField 
                                fullWidth label={t('reason')} multiline rows={3}
                                value={newRequest.reason}
                                onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                              />
                          </Grid>
                      </Grid>
                  </Box>
              </DialogContent>
              <DialogActions sx={{ p: 3, gap: 1 }}>
                  <Button onClick={() => setOpenRequest(false)} sx={{ fontWeight: 'bold' }}>{t('cancel')}</Button>
                  <Button type="submit" variant="contained" sx={{ fontWeight: 'bold', px: 4 }}>{t('submit_request')}</Button>
              </DialogActions>
          </form>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TimeOff;
