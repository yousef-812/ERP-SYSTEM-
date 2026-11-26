import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, CircularProgress, 
  IconButton, Tooltip, TextField, InputAdornment
} from '@mui/material';
import { 
  History, Search, FilterList, InfoOutlined, 
  Person, Category, Event, Language
} from '@mui/icons-material';
import axios from 'axios';
import { API_URLS } from '../api';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import PageHelp from '../components/PageHelp';

const AuditLogs = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get(API_URLS.AUDIT_LOGS);
        setLogs(response.data);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = Array.isArray(logs) ? logs.filter(log => 
    (log.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entityName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getActionColor = (action) => {
    switch ((action || '').toLowerCase()) {
      case 'create': return 'success';
      case 'update': return 'info';
      case 'delete': return 'error';
      case 'login': return 'warning';
      case 'backgroundjobs': return 'secondary';
      default: return 'default';
    }
  };

  const getTranslatedAction = (action) => {
    const key = `${(action || '').toLowerCase()}_action`;
    return t(key) !== key ? t(key) : action;
  };

  const getTranslatedEntity = (entity) => {
    const key = `${(entity || '').toLowerCase()}_entity`;
    return t(key) !== key ? t(key) : entity;
  };

  const getTranslatedDetails = (details) => {
    if (!details) return details;
    
    // Pattern: "Updated setting [Key] to [Value]"
    if (details.startsWith('Updated setting')) {
      return details.replace('Updated setting', t('updated_setting') || 'تم تحديث الإعداد')
                    .replace(' to ', ` ${t('to') || 'إلى'} `);
    }

    // Pattern: "User logged into the system successfully"
    if (details === 'User logged into the system successfully') {
      return t('user_logged_in_success') || 'تم تسجيل دخول المستخدم بنجاح';
    }

    // Pattern: "Successfully processed maintenance tasks"
    if (details === 'Successfully processed maintenance tasks') {
      return t('maintenance_tasks_processed') || 'تمت معالجة مهام الصيانة بنجاح';
    }

    return details;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" gutterBottom>
              <History sx={{ mr: 1, verticalAlign: 'bottom' }} /> 
              {t('audit_logs')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('audit_logs_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="audit_logs" />
        </Box>
      </Box>

      <Paper sx={{ p: 0, borderRadius: 4, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder={t('search_logs')}
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <IconButton>
            <FilterList />
          </IconButton>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell><Typography variant="subtitle2" fontWeight="bold"><Event sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> {t('timestamp')}</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold"><Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> {t('user')}</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">{t('action')}</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold"><Category sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> {t('object')}</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" fontWeight="bold">{t('details')}</Typography></TableCell>
                <TableCell align="right"><Typography variant="subtitle2" fontWeight="bold"><Language sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} /> IP</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500">
                      {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={log.username} size="small" variant="outlined" />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTranslatedAction(log.action)} 
                      size="small" 
                      color={getActionColor(log.action)}
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.primary">
                      {getTranslatedEntity(log.entityName)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {log.entityId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getTranslatedDetails(log.details)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">
                      {log.ipAddress || t('internal')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">{t('no_logs_found')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AuditLogs;
