import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Button, 
  useTheme, 
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  WarningAmberOutlined as Warning, 
  Inventory2Outlined as InventoryIcon, 
  History as HistoryIcon,
  TrendingDownOutlined as TrendingDown,
  WarehouseOutlined as Warehouse
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_URLS } from '../../api';

import { Link } from 'react-router-dom';
import PageHelp from '../../components/PageHelp';

import { usePermissions } from '../../hooks/usePermissions';

const InventoryDashboard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { hasPermission } = usePermissions();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(API_URLS.STOCK.DASHBOARD);
        setStats(response.data);
      } catch (err) {
        setSnackbar({ open: true, message: t('inventory_dashboard_stats_error'), severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const metrics = [
    { label: t('total_items'), value: stats.totalItems.toString(), icon: <InventoryIcon />, color: theme.palette.primary.main, pct: stats.totalItems > 0 ? 100 : 0, permission: ['إدارة المنتجات', 'عرض مستويات المخزون'] },
    { label: t('low_stock'), value: stats.lowStockCount.toString(), icon: <Warning />, color: theme.palette.warning.main, pct: stats.totalItems > 0 ? (stats.lowStockCount / stats.totalItems) * 100 : 0, permission: ['إدارة المنتجات', 'عرض مستويات المخزون'] },
    { label: t('warehouse_management'), value: stats.warehousesCount.toString(), icon: <Warehouse />, color: theme.palette.info.main, pct: stats.warehousesCount > 0 ? 100 : 0, permission: 'إدارة المستودعات' },
    { label: t('inventory_damage'), value: stats.damageRequestsCount.toString(), icon: <TrendingDown />, color: theme.palette.error.main, pct: stats.totalItems > 0 ? (stats.damageRequestsCount / stats.totalItems) * 100 : 0, permission: 'تسجيل التلفيات' },
  ].filter(m => !m.permission || hasPermission(m.permission));

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ letterSpacing: -1.5 }}>
              {t('inventory_dashboard')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('inventory_dashboard_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="inventory_dashboard" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<HistoryIcon />} component={Link} to="/inventory/adjustments">{t('view_history')}</Button>
          <Button variant="contained" color="primary" startIcon={<InventoryIcon />} component={Link} to="/products">{t('add_product')}</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(metric.color, 0.02),
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 3, 
                bgcolor: alpha(metric.color, 0.1), 
                color: metric.color,
                alignSelf: 'flex-start',
                display: 'flex'
              }}>
                {metric.icon}
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="800">{metric.value}</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="600">
                  {metric.label}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={metric.pct} 
                sx={{ height: 6, borderRadius: 3, bgcolor: alpha(metric.color, 0.1), '& .MuiLinearProgress-bar': { bgcolor: metric.color } }} 
              />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="700">{t('attention_low_stock').replace('{{count}}', stats.lowStockCount)}</Typography>
              <Button variant="text" size="small" component={Link} to="/inventory">{t('view_all')}</Button>
            </Box>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <TableRow>
                  <TableCell><Typography variant="subtitle2" fontWeight="700">{t('item')}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="700">{t('sku')}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="700">{t('stock')}</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="700">{t('status')}</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.lowStockProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" mt={2} mb={2}>{t('all_stocked_msg')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : stats.lowStockProducts.map((row, index) => (
                  <TableRow key={index} hover>
                    <TableCell><Typography fontWeight="600">{row.name}</Typography></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{row.sku}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight="700" color="error.main">{row.stock}</Typography>
                        <Typography variant="caption" color="text.secondary">/ {row.threshold}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={row.status} 
                        size="small" 
                        color={row.status === 'Critical' ? 'error' : 'warning'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 4, 
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              height: '100%'
            }}
          >
            <Typography variant="h6" fontWeight="700">{t('warehouse_management')}</Typography>
            {Array.isArray(stats.warehouses) && stats.warehouses.length > 0 ? (
              stats.warehouses.map((warehouse, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="700">{warehouse.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{warehouse.city}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{warehouse.load}</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={parseInt(warehouse.load)} 
                    sx={{ height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) }} 
                  />
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
                {t('no_warehouses_msg')}
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryDashboard;
