import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Divider,
  Button,
  useTheme,
  alpha,
  CircularProgress,
  Snackbar,
  Alert,
  Grid
} from '@mui/material';
import { 
  PeopleAltOutlined as People,
  EventNoteOutlined as EventNote,
  AssignmentIndOutlined as AssignmentInd,
  TrendingUpOutlined as TrendingUp,
  CakeOutlined as Cake,
  WorkOutline as Work
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { apiClient, API_URLS } from '../../api';
import { usePermissions } from '../../hooks/usePermissions';
import PageHelp from '../../components/PageHelp';

const HRDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  const [stats, setStats] = useState({
    totalEmployees: 0,
    attendanceRate: 0,
    activeJobs: 0,
    pendingAppraisals: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const res = await apiClient.get(API_URLS.HR.DASHBOARD);
        setStats(res.data);
      } catch (err) {
        setSnackbar({ open: true, message: t('hr_dashboard_stats_error'), severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const { hasPermission } = usePermissions();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const statCards = [
    { 
      label: t('employees'), 
      value: stats.totalEmployees.toString(), 
      icon: <People />, 
      color: theme.palette.primary.main,
      permission: ["عرض الموظفين", "إدارة ملفات الموظفين"]
    },
    { 
      label: t('attendance'), 
      value: `${stats.attendanceRate}%`, 
      icon: <EventNote />, 
      color: theme.palette.success.main,
      permission: ["عرض سجلات الحضور", "تسجيل الحضور"]
    },
    { 
      label: t('active_jobs'), 
      value: stats.activeJobs.toString(), 
      icon: <Work />, 
      color: theme.palette.warning.main,
      permission: "إدارة التوظيف"
    },
    { 
      label: t('pending_appraisals'), 
      value: stats.pendingAppraisals.toString(), 
      icon: <AssignmentInd />, 
      color: theme.palette.info.main,
      permission: ["عرض تقييم الأداء", "إدارة تقييم الأداء"]
    },
  ].filter(card => !card.permission || hasPermission(card.permission));

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary" gutterBottom>
              {t('menu_hr_management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('employees_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="hr_dashboard" />
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[4] }
              }}
            >
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 3, 
                bgcolor: alpha(stat.color, 0.1), 
                color: stat.color,
                display: 'flex'
              }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="800">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="600">
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: `1px solid ${theme.palette.divider}`,
              minHeight: 400
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight="700">{t('recent_activity')}</Typography>
              <Button variant="text" size="small" onClick={() => navigate('/audit-logs')}>{t('view_all')}</Button>
            </Box>
            <List>
              {(!Array.isArray(stats.recentActivities) || stats.recentActivities.length === 0) ? (
                <Typography color="text.secondary" align="center" sx={{ mt: 5 }}>{t('no_recent_activities_found')}</Typography>
              ) : stats.recentActivities.map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>{activity.name?.charAt(0) || 'U'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={<Typography fontWeight="600">{activity.name}</Typography>} 
                      secondary={activity.action} 
                    />
                    <Typography variant="caption" color="text.secondary">{new Date(activity.date).toLocaleString()}</Typography>
                  </ListItem>
                  {index < stats.recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default HRDashboard;
