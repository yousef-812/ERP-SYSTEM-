import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Avatar, Chip, 
  Divider, Card, CardContent, CircularProgress, 
  IconButton, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, List, ListItem, 
  ListItemText, ListItemIcon, Tab, Tabs
} from '@mui/material';
import { 
  ArrowBack, Email, Phone, Map, 
  CalendarMonth, Badge, Work, Payments, 
  CheckCircle, Cancel, FactCheck 
} from '@mui/icons-material';
import { apiClient, API_URLS } from '../api';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { getCurrencySymbol } from '../utils/currencyHelper';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchEmployee360();
  }, [id]);

  const fetchEmployee360 = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`${API_URLS.EMPLOYEES}/${id}/360`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching employee 360 view:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || !data.employee) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">{t('employee_not_found')}</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/employees')} sx={{ mt: 2 }}>
          {t('back_to_list')}
        </Button>
      </Box>
    );
  }

  const { employee, attendance, payroll } = data;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      {/* Header / Back Navigation */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/employees')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">{t('employee_profile')}</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Basic Info Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Avatar 
                src={employee.photoUrl} 
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '3rem' }}
              >
                {employee.name[0]}
              </Avatar>
              <Typography variant="h5" fontWeight="bold">{employee.name}</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>{employee.position}</Typography>
              <Chip 
                label={t(employee.status.toLowerCase())} 
                color={employee.status === 'Active' ? 'success' : 'default'} 
                size="small" 
                sx={{ mt: 1, fontWeight: 'bold' }}
              />

              <Divider sx={{ my: 3 }} />

              <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><Email color="action" /></ListItemIcon>
                  <ListItemText primary={t('email')} secondary={employee.email || t('n_a')} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><Phone color="action" /></ListItemIcon>
                  <ListItemText primary={t('phone')} secondary={employee.phone || t('n_a')} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><Map color="action" /></ListItemIcon>
                  <ListItemText primary={t('address')} secondary={employee.address || t('n_a')} />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon><CalendarMonth color="action" /></ListItemIcon>
                  <ListItemText primary={t('joined')} secondary={new Date(employee.joiningDate).toLocaleDateString()} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Detailed Tabs */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
            >
              <Tab icon={<FactCheck />} label={t('attendance')} iconPosition="start" />
              <Tab icon={<Payments />} label={t('payroll_history')} iconPosition="start" />
            </Tabs>

            <Box sx={{ p: { xs: 2, sm: 4 } }}>
              {/* Attendance Tab */}
              {tabValue === 0 && (
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">{(employee.basicSalary || 0).toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}</Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>{t('recent_attendance_title')}</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('date')}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('notes')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendance.length > 0 ? (
                          attendance.map((att) => (
                            <TableRow key={att.id}>
                              <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={t(att.status.toLowerCase())} 
                                  size="small" 
                                  color={att.status === 'Present' ? 'success' : att.status === 'Absent' ? 'error' : 'warning'} 
                                  icon={att.status === 'Present' ? <CheckCircle /> : att.status === 'Absent' ? <Cancel /> : <CalendarMonth />}
                                />
                              </TableCell>
                              <TableCell variant="body2" color="text.secondary">{att.notes || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">{t('no_attendance_records')}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Payroll History Tab */}
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>{t('salary_history')}</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('period')}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('net_salary')}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payroll.length > 0 ? (
                          payroll.map((pay) => (
                            <TableRow key={pay.id}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{pay.month}/{pay.year}</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {pay.netSalary.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                              </TableCell>
                              <TableCell>
                                <Chip label={t(pay.status.toLowerCase())} size="small" variant="filled" color={pay.status === 'Paid' ? 'success' : 'warning'} />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">{t('no_payroll_records')}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeDetail;
