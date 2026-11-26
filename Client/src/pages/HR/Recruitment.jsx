import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Avatar, 
  Chip, 
  Divider,
  useTheme, 
  alpha,
  Card,
  CardContent,
  CardActions,
  Pagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';
import { 
  WorkOutline as Work, 
  Add as AddIcon, 
  PersonAddOutlined as PersonAdd, 
  LocationOnOutlined as Location, 
  FilterListOutlined as FilterList,
  MoreVertOutlined as MoreVert,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiClient, API_URLS } from '../../api';
import { useConfirm } from '../../context/ConfirmContext';
import PageHelp from '../../components/PageHelp';

const Recruitment = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const confirm = useConfirm();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editJob, setEditJob] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', department: '', jobType: 'Full-time', description: '', requirements: '', status: 'Active', location: 'Cairo', experienceLevel: 'Entry'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchJobs = async () => {
    try {
      const response = await apiClient.get(API_URLS.HR.JOBS);
      // Backend includes applications, candidates length is Applications.length
      setJobs(response.data);
    } catch (err) {
      showSnackbar(t('error_fetching'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpen = (job = null) => {
    if (job) {
      setEditJob(job);
      setFormData(job);
    } else {
      setEditJob(null);
      setFormData({ 
        title: '', department: '', jobType: 'Full-time', description: '', requirements: '', status: 'Active', location: 'Cairo', experienceLevel: 'Entry'
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editJob) {
        await apiClient.put(`${API_URLS.HR.JOBS}/${editJob.id}`, formData);
        showSnackbar(t('job_updated_success'));
      } else {
        await apiClient.post(API_URLS.HR.JOBS, formData);
        showSnackbar(t('job_created_success'));
      }
      setOpen(false);
      fetchJobs();
    } catch (err) {
      showSnackbar(t('error_saving_job'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ 
      title: t('confirm_delete_title'), 
      message: t('confirm_delete_msg') 
    })) {
      try {
        await apiClient.delete(`${API_URLS.HR.JOBS}/${id}`);
        showSnackbar(t('job_deleted_success'));
        fetchJobs();
      } catch (err) {
        showSnackbar(t('error_deleting'), 'error');
      }
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('recruitment')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('manage_job_openings')}
            </Typography>
          </Box>
          <PageHelp helpKey="recruitment" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<FilterList />}>{t('filter')}</Button>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            {t('post_job')}
          </Button>
        </Box>
      </Box>

      {(!Array.isArray(jobs) || jobs.length === 0) && (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
            <Work sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">{t('no_jobs_found')}</Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => handleOpen()}>{t('post_job')}</Button>
          </Paper>
      )}

      <Grid container spacing={3}>
        {Array.isArray(jobs) && jobs.map((job) => (
          <Grid size={{ xs: 12, md: 6 }} key={job.id}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 4, 
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': { boxShadow: theme.shadows[4], borderColor: theme.palette.primary.main }
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                      <Work />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="700">{job.title}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight="600">{job.department}</Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={job.status} 
                    size="small" 
                    color={job.status === 'Active' ? 'success' : job.status === 'On Hold' ? 'warning' : 'default'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Location fontSize="inherit" color="action" />
                      <Typography variant="caption" fontWeight="500">{job.location}</Typography>
                    </Box>
                  </Grid>
                  <Grid size={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonAdd fontSize="inherit" color="action" />
                      <Typography variant="caption" fontWeight="500">{job.applications?.length || 0} {t('applicants')}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight="700" color="primary.main">{job.jobType}</Typography>
                <Box>
                  <Button size="small" onClick={() => navigate(`/hr/jobs/${job.id}/applications`)}>{t('applications')}</Button>
                  <IconButton size="small" onClick={() => handleOpen(job)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleDelete(job.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Post/Edit Job Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editJob ? t('edit_job') : t('post_job')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('job_title')} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('department')} value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t('job_type')} value={formData.jobType} onChange={(e) => setFormData({...formData, jobType: e.target.value})}>
                <MenuItem value="Full-time">{t('full_time')}</MenuItem>
                <MenuItem value="Part-time">{t('part_time')}</MenuItem>
                <MenuItem value="Contract">{t('contract')}</MenuItem>
                <MenuItem value="Remote">{t('remote')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t('experience_level')} value={formData.experienceLevel} onChange={(e) => setFormData({...formData, experienceLevel: e.target.value})}>
                <MenuItem value="Entry">{t('entry_level')}</MenuItem>
                <MenuItem value="Mid">{t('mid_level')}</MenuItem>
                <MenuItem value="Senior">{t('senior_level')}</MenuItem>
                <MenuItem value="Lead">{t('lead_level')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label={t('location')} value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t('status')} value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <MenuItem value="Active">{t('active')}</MenuItem>
                <MenuItem value="On Hold">{t('on_hold')}</MenuItem>
                <MenuItem value="Closed">{t('closed')}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label={t('description')} multiline rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label={t('requirements')} multiline rows={3} value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleSave} variant="contained">{t('save_job')}</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Recruitment;
