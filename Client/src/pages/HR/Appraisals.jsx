import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Avatar, 
  Rating, 
  LinearProgress, 
  Chip, 
  useTheme, 
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid as MuiGrid,
  Snackbar,
  Alert,
  Grid,
  Stack
} from '@mui/material';
import { 
  AssignmentIndOutlined as AssignmentInd, 
  TrendingUpOutlined as TrendingUp, 
  StarRateOutlined as Star, 
  ScheduleOutlined as Schedule,
  MessageOutlined as Message,
  Add as AddIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiClient, API_URLS } from '../../api';
import PageHelp from '../../components/PageHelp';

const Appraisals = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null, employeeId: '', status: 'Pending', rating: 0, score: 0, comments: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      const [appraisalsRes, employeesRes] = await Promise.all([
        apiClient.get(API_URLS.HR.APPRAISALS),
        apiClient.get(API_URLS.EMPLOYEES)
      ]);
      setReviews(appraisalsRes.data);
      setEmployees(employeesRes.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpen = () => {
    setFormData({ id: null, employeeId: '', status: 'Pending', rating: 0, score: 0, comments: '' });
    setOpen(true);
  };

  const handleReview = (rev) => {
    setFormData({
      id: rev.id,
      employeeId: rev.employeeId,
      status: rev.status,
      rating: rev.rating,
      score: rev.score,
      comments: rev.comments || ''
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (formData.id) {
        await apiClient.put(`${API_URLS.HR.APPRAISALS}/${formData.id}`, formData);
        showSnackbar(t('appraisal_updated_success'));
      } else {
        await apiClient.post(API_URLS.HR.APPRAISALS, formData);
        showSnackbar(t('appraisal_started_success'));
      }
      setOpen(false);
      fetchData();
    } catch (err) {
      showSnackbar(t('appraisal_save_error'), 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const avgScore = reviews.length ? (reviews.reduce((acc, r) => acc + r.score, 0) / reviews.length).toFixed(1) : 0;
  const pendingCount = reviews.filter(r => r.status === 'Pending').length;
  const completedCount = reviews.filter(r => r.status === 'Completed').length;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('appraisals')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('performance_track_desc')}
            </Typography>
          </Box>
          <PageHelp helpKey="appraisals" />
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen}>
          {t('start_appraisal')}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: t('team_avg_score'), value: `${avgScore}/100`, icon: <TrendingUp />, color: theme.palette.success.main },
          { label: t('pending_reviews'), value: pendingCount.toString(), icon: <Schedule />, color: theme.palette.warning.main },
          { label: t('completed'), value: completedCount.toString(), icon: <AssignmentInd />, color: theme.palette.info.main },
        ].map((item, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={index}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: alpha(item.color, 0.1), color: item.color, display: 'flex' }}>
                {item.icon}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="700">{item.label}</Typography>
                <Typography variant="h5" fontWeight="800">{item.value}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="700">{t('performance_overview')}</Typography>
        </Box>
        {Array.isArray(reviews) && reviews.length === 0 ? (
           <Box sx={{ p: 4, textAlign: 'center' }}>
             <Typography color="text.secondary">{t('no_appraisals_found')}</Typography>
           </Box>
        ) : (
          <List>
            {Array.isArray(reviews) && reviews.map((rev, index) => (
              <React.Fragment key={index}>
                <ListItem sx={{ py: 3, px: 3, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>{rev.employee?.name?.charAt(0) || 'U'}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={<Typography variant="body1" fontWeight="700">{rev.employee?.name || t('unknown_employee')}</Typography>} 
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                        <Rating value={rev.rating || 0} readOnly size="small" precision={0.5} />
                        <Typography variant="caption" color="text.secondary">• {t('last_review')}: {new Date(rev.reviewDate).toLocaleDateString()}</Typography>
                      </Box>
                    } 
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  <Box sx={{ width: 150, mr: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" fontWeight="700">{t('score')}</Typography>
                      <Typography variant="caption" fontWeight="800" color="primary">{rev.score}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={rev.score || 0} 
                      sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) }} 
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={t(rev.status?.toLowerCase().replace(' ', '_')) || rev.status} 
                      size="small" 
                      color={rev.status === 'Completed' ? 'success' : rev.status === 'In Progress' ? 'warning' : 'default'}
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<Message />}
                      onClick={() => handleReview(rev)}
                    >
                      {t('review')}
                    </Button>
                  </Box>
                </ListItem>
                {index < reviews.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Start Appraisal Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: '800', p: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          {t('start_appraisal')}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField 
              select 
              fullWidth 
              label={t('select_employee')} 
              value={formData.employeeId} 
              onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
            >
              {Array.isArray(employees) && employees.map(emp => (
                <MenuItem key={emp?.id} value={emp?.id}>{emp?.name}</MenuItem>
              ))}
            </TextField>

            <Divider />

            <TextField 
              select 
              fullWidth 
              label={t('status')} 
              value={formData.status} 
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <MenuItem value="Pending">{t('pending')}</MenuItem>
              <MenuItem value="In Progress">{t('in_progress')}</MenuItem>
              <MenuItem value="Completed">{t('completed')}</MenuItem>
            </TextField>

            <TextField 
              type="number" 
              fullWidth 
              label={t('rating_1_5')} 
              InputProps={{ inputProps: { min: 1, max: 5, step: 0.5 } }}
              value={formData.rating} 
              onChange={(e) => {
                let val = parseFloat(e.target.value) || 0;
                if (val > 5) val = 5;
                if (val < 0) val = 0;
                setFormData({...formData, rating: val});
              }} 
            />

            <TextField 
              type="number" 
              fullWidth 
              label={t('performance_score_0_100')} 
              InputProps={{ inputProps: { min: 0, max: 100 } }}
              value={formData.score} 
              onChange={(e) => {
                let val = parseInt(e.target.value) || 0;
                if (val > 100) val = 100;
                if (val < 0) val = 0;
                setFormData({...formData, score: val});
              }} 
            />

            <TextField 
              fullWidth 
              multiline 
              rows={3} 
              label={t('comments_initial_review')} 
              value={formData.comments} 
              onChange={(e) => setFormData({...formData, comments: e.target.value})} 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit" sx={{ fontWeight: 'bold' }}>{t('cancel')}</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.employeeId} sx={{ fontWeight: 'bold', px: 4 }}>{t('start_appraisal_btn')}</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Appraisals;
