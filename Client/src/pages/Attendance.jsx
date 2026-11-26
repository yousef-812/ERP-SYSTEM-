import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Grid, 
  TextField, Chip, Avatar, CircularProgress, Alert, useTheme, 
  useMediaQuery, Card, CardContent, Divider, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { 
  CheckCircle, Cancel, EventBusy, Save, ChevronLeft, ChevronRight, 
  Today, ContactEmergency, Person, EventNote
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../context/ConfirmContext';
import { apiClient, API_URLS } from '../api';
import { format, addDays, subDays } from 'date-fns';
import PageHelp from '../components/PageHelp';

const Attendance = () => {
  const { t, i18n } = useTranslation();
  const confirm = useConfirm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [date, setDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await apiClient.get(`${API_URLS.ATTENDANCE}?date=${formattedDate}`);
      setEmployees(response.data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const handleStatusChange = (empId, newStatus) => {
    if (!newStatus) return; // Prevent empty selection
    setEmployees(employees.map(emp => 
      emp.id === empId ? { ...emp, status: newStatus } : emp
    ));
  };

  const handleNotesChange = (empId, newNotes) => {
    setEmployees(employees.map(emp => 
      emp.id === empId ? { ...emp, notes: newNotes } : emp
    ));
  };

  const saveAttendance = async () => {
    if (!(await confirm({ 
      title: t('confirm_save_title'), 
      message: t('confirm_save_msg') 
    }))) return;
    
    setSaving(true);
    try {
      const logs = employees.map(emp => ({
        employeeId: emp.id,
        date: format(date, 'yyyy-MM-dd'),
        status: (emp.status === 'Not Logged' || !emp.status) ? 'Present' : emp.status,
        notes: emp.notes
      }));

      await apiClient.post(`${API_URLS.ATTENDANCE}/bulk`, logs);
      fetchAttendance();
    } catch (err) {
      console.error("Error saving attendance:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDateLabel = (d) => {
    return d.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isFutureDate = format(date, 'yyyy-MM-dd') > format(new Date(), 'yyyy-MM-dd');

  const StatusControls = ({ emp, disabled }) => (
    <ToggleButtonGroup
      disabled={disabled}
      value={emp.status === 'Not Logged' ? '' : emp.status}
      exclusive
      onChange={(_, next) => handleStatusChange(emp.id, next)}
      size="small"
      color="primary"
      sx={{ 
        '& .MuiToggleButton-root': { px: 2, py: 0.5 },
        bgcolor: 'background.paper',
        '&.Mui-disabled': { opacity: 0.5 }
      }}
    >
      <ToggleButton value="Present" color="success">
        <CheckCircle sx={{ mr: 1, fontSize: 18 }} />
        {t('mark_present')}
      </ToggleButton>
      <ToggleButton value="Absent" color="error">
        <Cancel sx={{ mr: 1, fontSize: 18 }} />
        {t('mark_absent')}
      </ToggleButton>
      <ToggleButton value="Leave" color="warning">
        <EventBusy sx={{ mr: 1, fontSize: 18 }} />
        {t('mark_leave')}
      </ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 0, sm: 2 } }}>
      {/* Future Date Alert */}
      {isFutureDate && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 3, borderRadius: 3, fontWeight: 'bold' }}>
          {t('attendance_future_error')}
        </Alert>
      )}

      {/* Premium Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 4, 
        gap: 3 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" gutterBottom>
              {t('attendance')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('attendance_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="attendance" />
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5,
          minWidth: isMobile ? '100%' : 400
        }}>
          <Paper elevation={0} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 1, 
            p: 1, 
            borderRadius: 3, 
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}>
            <IconButton onClick={() => setDate(subDays(date, 1))} size="small">
              {i18n.language === 'ar' ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
            
            <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {formatDateLabel(date)}
              </Typography>
            </Box>

            <IconButton onClick={() => setDate(addDays(date, 1))} size="small">
              {i18n.language === 'ar' ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Paper>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              fullWidth
              variant="outlined" 
              startIcon={<Today />} 
              onClick={() => setDate(new Date())}
              sx={{ borderRadius: 2 }}
            >
              {t('today')}
            </Button>
            <Button 
              fullWidth
              variant="contained" 
              startIcon={<Save />} 
              onClick={saveAttendance}
              disabled={saving || loading || isFutureDate}
              sx={{ borderRadius: 2, boxShadow: 4 }}
            >
              {saving ? '...' : t('save_changes')}
            </Button>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={60} thickness={4} />
        </Box>
      ) : (
        <>
          {/* Desktop Table View */}
          {!isMobile && (
            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', elevation: 0 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('employee')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{t('status')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t('notes')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(employees) && employees.map((emp) => {
                    const isLocked = (emp?.status === 'Present' || emp?.status === 'Absent' || emp?.status === 'Leave') || isFutureDate;
                    return (
                    <TableRow key={emp?.id} hover>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: isLocked ? 'action.hover' : 'primary.light', width: 45, height: 45 }}>
                            {isLocked ? <EventNote sx={{ color: 'text.secondary' }} /> : <Person />}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                               <Typography variant="subtitle2" fontWeight="900" sx={{ color: isLocked ? 'text.secondary' : 'inherit' }}>{emp?.name || '---'}</Typography>
                               {isLocked && !isFutureDate && <Chip label={t('locked')} size="small" sx={{ height: 16, fontSize: 8, fontWeight: 'bold' }} />}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">{emp?.position || '---'}</Typography>
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>• {emp?.warehouseName}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ pointerEvents: isLocked ? 'none' : 'auto', opacity: isLocked ? 0.7 : 1 }}>
                          <StatusControls emp={emp} disabled={isLocked} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <TextField 
                          size="small" 
                          variant="standard"
                          fullWidth 
                          disabled={isLocked}
                          placeholder={isLocked ? '' : t('notes')}
                          value={emp?.notes || ''}
                          onChange={(e) => handleNotesChange(emp?.id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Mobile Card View */}
          {isMobile && (
            <Grid container spacing={2}>
              {Array.isArray(employees) && employees.map((emp) => {
                const isLocked = (emp?.status === 'Present' || emp?.status === 'Absent' || emp?.status === 'Leave') || isFutureDate;
                return (
                <Grid size={12} key={emp?.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 1, opacity: isLocked ? 0.9 : 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: isLocked ? 'action.hover' : 'primary.soft', color: isLocked ? 'text.secondary' : 'primary.main', width: 40, height: 40 }}>
                          {isLocked ? <EventNote /> : <Person />}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: isLocked ? 'text.secondary' : 'inherit' }}>{emp?.name || '---'}</Typography>
                            {isLocked && !isFutureDate && <Chip label={t('locked')} size="small" sx={{ height: 16, fontSize: 8, fontWeight: 'bold' }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary">{emp?.position || '---'}</Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ pointerEvents: isLocked ? 'none' : 'auto', opacity: isLocked ? 0.7 : 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t('status')}</Typography>
                          <StatusControls emp={emp} disabled={isLocked} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: isLocked ? 'action.disabledBackground' : 'action.hover', p: 1, borderRadius: 2 }}>
                          <EventNote fontSize="small" color="action" />
                          <TextField 
                            fullWidth
                            variant="standard"
                            disabled={isLocked}
                            placeholder={isLocked ? '' : t('notes')}
                            value={emp?.notes || ''}
                            onChange={(e) => handleNotesChange(emp?.id, e.target.value)}
                            InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem' } }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                );
              })}
            </Grid>
          )}

          {employees.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Paper sx={{ p: 5, borderRadius: 4, display: 'inline-block', bgcolor: 'background.default' }}>
                <Typography variant="h6" color="text.secondary">
                  {t('no_employees')}
                </Typography>
              </Paper>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Attendance;
