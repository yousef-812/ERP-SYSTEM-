import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Paper, 
  Typography, 
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Avatar,
  Alert,
  Button,
  useTheme,
  alpha,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs
} from '@mui/material';
import { 
  TrendingUp, 
  Warning, 
  People,
  AccountBalanceWallet,
  Inventory,
  ArrowUpward,
  ArrowDownward,
  ReceiptLong,
  Payment,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { API_URLS } from '../api';
import { getCurrencySymbol } from '../utils/currencyHelper';
import PageHelp from '../components/PageHelp';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const DashboardCard = ({ title, value, icon, color, subtitle, trend, isPositive }) => {
  const theme = useTheme();
  const isPrimary = color === 'primary';
  const mainColor = isPrimary ? theme.palette.primary.main : theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Card sx={{ 
      height: '100%', 
      boxShadow: '0 4px 24px 0 rgba(0,0,0,0.04)', 
      borderRadius: 4,
      background: isPrimary 
        ? `linear-gradient(135deg, ${mainColor} 0%, ${alpha(mainColor, 0.8)} 100%)` 
        : theme.palette.background.paper,
      color: isPrimary ? 'white' : 'text.primary',
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${isPrimary ? 'transparent' : theme.palette.divider}`,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-4px)' }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: isPrimary ? 'rgba(255,255,255,0.2)' : alpha(mainColor, 0.1), 
            color: isPrimary ? 'white' : mainColor,
            width: 44, height: 44,
            borderRadius: 2
          }}>
            {icon}
          </Avatar>
          {trend && (
            <Chip 
              label={trend} 
              size="small" 
              icon={isPositive ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
              sx={{ 
                bgcolor: isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1), 
                color: isPositive ? theme.palette.success.main : theme.palette.error.main, 
                fontWeight: 'bold', border: 'none',
                height: 24,
                '& .MuiChip-icon': { color: 'inherit' }
              }} 
            />
          )}
        </Box>
        <Typography variant="caption" sx={{ opacity: isPrimary ? 0.8 : 0.6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: -1, fontSize: { xs: '1.25rem', md: '1.5rem', lg: '1.75rem' } }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const CustomTooltip = ({ active, payload, label, theme }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={4} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1 }}>{label}</Typography>
        {payload.map((entry, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
            <Typography variant="body2" color="text.secondary">
              {entry.name}: <Typography component="span" variant="body2" fontWeight="700" color="text.primary">{entry.value.toLocaleString()}</Typography>
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  }
  return null;
};



const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const theme = useTheme();
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityTab, setActivityTab] = useState(0);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(API_URLS.DASHBOARD);
        setData(response.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(t('failed_load_metrics'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [t]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = data || {
    totalRevenue: 0,
    mainTrend: { labels: [], sales: [], expenses: [] },
    recentOrders: [],
    recentActivities: [],
    topSellingProducts: [],
    mostActiveEmployees: [],
    healthyStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Paper 
          sx={{ 
            p: 8, 
            textAlign: 'center', 
            borderRadius: 6, 
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px dashed ${theme.palette.primary.main}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="h3" fontWeight="900" color="primary">
            {t('welcome_back', { name: user?.username })}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
            {t('dashboard_no_stats_msg') || 'You have successfully logged in. Please use the sidebar to navigate to your authorized modules.'}
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
             <Typography variant="body2" fontWeight="bold">
               {t('active_role', { role: t('role_' + user?.role?.toLowerCase()) })}
             </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  const chartData = (Array.isArray(stats.mainTrend?.labels) ? stats.mainTrend.labels : []).map((label, index) => ({
    name: label,
    sales: (Array.isArray(stats.mainTrend?.sales) ? stats.mainTrend.sales[index] : 0) || 0,
    expenses: (Array.isArray(stats.mainTrend?.expenses) ? stats.mainTrend.expenses[index] : 0) || 0
  }));

  const COLORS = [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main];
  const pieData = [
    { name: t('healthy'), value: stats.healthyStockCount || 0 },
    { name: t('low_stock'), value: stats.lowStockCount || 0 },
    { name: t('out_of_stock'), value: stats.outOfStockCount || 0 }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: -1.5, mb: 0.5 }}>
              {t('welcome')}, {settings.CompanyName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard_subtitle')}
            </Typography>
          </Box>
          <PageHelp helpKey="dashboard" />
        </Box>
        {hasPermission('عرض دفتر اليومية') && (
          <Button variant="contained" startIcon={<ReceiptLong />} onClick={() => navigate('/finance/ledger')}>
              {t('accounting')}
          </Button>
        )}
      </Box>

      {/* Instant Inventory Alerts */}
      {(stats.lowStockCount > 0 || stats.outOfStockCount > 0) && hasPermission('عرض مستويات المخزون') && (
        <Alert 
          severity={stats.outOfStockCount > 0 ? "error" : "warning"} 
          icon={<Warning />}
          sx={{ mb: 4, borderRadius: 3, fontWeight: 'bold', border: '1px solid', borderColor: stats.outOfStockCount > 0 ? 'error.light' : 'warning.light' }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/products')} sx={{ fontWeight: '900' }}>
              {t('view_inventory')}
            </Button>
          }
        >
          {stats.outOfStockCount > 0 ? t('critical_out_of_stock', { count: stats.outOfStockCount }) : ''}
          {stats.outOfStockCount > 0 && stats.lowStockCount > 0 ? ' | ' : ''}
          {stats.lowStockCount > 0 ? t('attention_low_stock', { count: stats.lowStockCount }) : ''}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {(hasPermission('عرض دفتر اليومية') || hasPermission('عرض مؤشرات المبيعات')) && (
          <>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <DashboardCard 
                title={t('total_revenue')} 
                value={`${(stats.totalRevenue || 0).toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`} 
                icon={<TrendingUp />} 
                color="primary"
              />
            </Grid>
            {hasPermission('عرض دفتر اليومية') && (
              <>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <DashboardCard 
                    title={t('total_expenses')} 
                    value={`${(stats.totalExpenses || 0).toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`} 
                    icon={<AccountBalanceWallet />} 
                    color="error"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                  <DashboardCard 
                    title={t('net_profit')} 
                    value={`${(stats.netProfit || 0).toLocaleString()} ${getCurrencySymbol(settings.Currency, i18n.language)}`} 
                    icon={<Payment />} 
                    color="success"
                    subtitle={`${t('current_month')}`}
                  />
                </Grid>
              </>
            )}
          </>
        )}
        
        {hasPermission('عرض مستويات المخزون') && (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <DashboardCard 
              title={t('products')} 
              value={(stats.healthyStockCount + stats.lowStockCount + stats.outOfStockCount || 0).toString()} 
              icon={<Inventory />} 
              color="warning"
              subtitle={`${(stats.lowStockCount || 0) + (stats.outOfStockCount || 0)} ${t('low_stock_items')}`}
            />
          </Grid>
        )}
      </Grid>



      <Grid container spacing={3}>
        {hasPermission('عرض مؤشرات المبيعات') && (
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h6" fontWeight="700">{t('revenue_vs_expenses')}</Typography>
                <Chip label={t('last_6_months')} size="small" sx={{ fontWeight: 'bold' }} />
              </Box>
              <Box sx={{ height: 350, width: '100%', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.05}/>
                        <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }} 
                    />
                    <RechartsTooltip content={<CustomTooltip theme={theme} />} />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      name={t('revenue')}
                      stroke={theme.palette.primary.main} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      name={t('expenses')}
                      stroke={theme.palette.error.main} 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fillOpacity={1} 
                      fill="url(#colorExpenses)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Inventory Distribution */}
        {hasPermission('عرض مستويات المخزون') && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight="700" sx={{ mb: 4 }}>{t('inventory_health')}</Typography>
              <Box sx={{ height: 300, position: 'relative', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="800">{(stats.healthyStockCount + stats.lowStockCount + stats.outOfStockCount) || 0}</Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight="700">{t('total_sku')}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Recent Activity Feed */}
        {hasPermission('عرض نشاطات العمل') && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="700">{t('business_activity_feed', 'سجل النشاط التجاري')}</Typography>
                <Tabs value={activityTab} onChange={(e, v) => setActivityTab(v)} size="small" sx={{ minHeight: 0 }}>
                  <Tab label={t('orders', 'الطلبات')} sx={{ py: 0.5, minHeight: 0 }} />
                  <Tab label={t('operations', 'العمليات')} sx={{ py: 0.5, minHeight: 0 }} />
                </Tabs>
              </Box>

              {activityTab === 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `2px solid ${theme.palette.divider}` }}>{t('reference')}</TableCell>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `2px solid ${theme.palette.divider}` }}>{t('status')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `2px solid ${theme.palette.divider}` }}>{t('total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.isArray(stats.recentOrders) && stats.recentOrders.length > 0 ? stats.recentOrders.map((order) => (
                        <TableRow key={order.id} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2" fontWeight="700">#{order.id}</Typography>
                            <Typography variant="caption" color="text.secondary">{order.customer}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={order.status} 
                              size="small" 
                              variant="soft" 
                              color={order.status === 'Paid' ? 'success' : order.status === 'Pending' ? 'warning' : 'info'} 
                              sx={{ fontWeight: '700', fontSize: 10 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: '800' }}>
                            {order.amount.toLocaleString()} {getCurrencySymbol(settings.Currency, i18n.language)}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>{t('no_orders', 'لا توجد طلبات حالياً')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <List sx={{ pt: 0 }}>
                  {Array.isArray(stats.recentActivities) && stats.recentActivities.length > 0 ? stats.recentActivities.map((act) => (
                    <ListItem key={act.id} alignItems="flex-start" sx={{ px: 0, py: 1.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                          {act.action === 'Create' ? <AddIcon sx={{ fontSize: 18 }} /> : <EditIcon sx={{ fontSize: 18 }} />}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight="700">
                              {act.username} {t(act.action.toLowerCase())} {t(act.entity.toLowerCase())}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(act.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {act.details}
                          </Typography>
                        }
                      />
                    </ListItem>
                  )) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>{t('no_activities', 'لا توجد نشاطات مسجلة')}</Box>
                  )}
                </List>
              )}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                 <Button size="small" variant="text" onClick={() => navigate(activityTab === 0 ? '/orders' : '/settings/audit-logs')}>{t('view_all')}</Button>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Top Performing Products */}
        {hasPermission('عرض مؤشرات المبيعات') && (
          <Grid size={{ xs: 12, lg: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight="700" sx={{ mb: 4 }}>{t('top_performing_products')}</Typography>
              <Box sx={{ height: 300, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.topSellingProducts} layout="vertical" margin={{ left: -20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={theme.palette.divider} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={80}
                      tick={{ fill: theme.palette.text.primary, fontSize: 11, fontWeight: 700 }}
                    />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip theme={theme} />} />
                    <Bar 
                      dataKey="value" 
                      fill={theme.palette.primary.main} 
                      radius={[0, 4, 4, 0]} 
                      barSize={15}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Most Active Employees */}
        {hasPermission('إدارة ملفات الموظفين') && (
          <Grid size={{ xs: 12, lg: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight="700" sx={{ mb: 3 }}>{t('most_active_employees')}</Typography>
              <List disablePadding>
                {Array.isArray(stats.mostActiveEmployees) && stats.mostActiveEmployees.length > 0 ? (
                  stats.mostActiveEmployees.map((emp, idx) => (
                    <ListItem key={idx} sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', fontWeight: 'bold' }}>
                          {emp.name?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={<Typography variant="body2" fontWeight="700">{emp.name}</Typography>}
                        secondary={t('check_ins', { count: emp.value })}
                      />
                      <Box sx={{ textAlign: 'right' }}>
                         <Typography variant="caption" fontWeight="800" color="success.main">+{emp.value}</Typography>
                      </Box>
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
                    {t('no_activity_found')}
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>
        )}

      </Grid>
    </Box>
  );
};

export default Dashboard;
