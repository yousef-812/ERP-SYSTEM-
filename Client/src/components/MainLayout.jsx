import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  InputBase,
  alpha,
  Paper
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft,
  DashboardOutlined as Dashboard,
  GroupsOutlined as People,
  Inventory2Outlined as Inventory,
  ReceiptLongOutlined as Receipt,
  SettingsOutlined as Settings,
  NotificationsNoneOutlined as Notifications,
  LanguageOutlined as Language,
  AccountCircleOutlined as AccountCircle,
  Brightness4Outlined as Brightness4,
  Brightness7Outlined as Brightness7,
  AttachMoneyOutlined as AttachMoney,
  AssignmentIndOutlined as AssignmentInd,
  EventAvailableOutlined as EventAvailable,
  ShoppingCartOutlined as ShoppingCart,
  Search as SearchIcon,
  LogoutOutlined,
  PersonOutline,
  TrendingDownOutlined as TrendingDown,
  History,
  LocalShippingOutlined as LocalShipping,
  RequestQuoteOutlined as RequestQuote,
  VpnKeyOutlined as VpnKey,
  AssessmentOutlined as Assessment,
  Logout,
  ExpandLess,
  ExpandMore,
  HelpOutline
} from '@mui/icons-material';
import { useThemeContext } from '../theme/ThemeContext';
import OCRScanner from './OCR/OCRScanner';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';
import { useSettings } from '../context/SettingsContext';
import { useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';

const drawerWidth = 280;

const MainLayout = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { toggleColorMode, mode } = useThemeContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);
  const [anchorEl, setAnchorEl] = useState(null);
  const { settings } = useSettings();
  const [ocrOpen, setOcrOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        console.log("- Alt+O: Trigger OCR Mode");
        setOcrOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  
  const handleLogout = () => {
    handleProfileMenuClose();
    dispatch(logout());
    navigate('/login');
  };

  const handleLanguageChange = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const { hasPermission } = usePermissions();

  const allModules = {
    "Core": {
      title: t('module_core'),
      items: [
        { text: t('dashboard'), icon: <Dashboard />, path: '/dashboard', permission: ['عرض لوحة التحكم', 'عرض نشاطات العمل'] },
      ]
    },
    "Sales": {
      title: t('module_sales'),
      items: [
        { text: t('orders'), icon: <ShoppingCart />, path: '/orders', permission: ['عرض المبيعات', 'إصدار الفواتير'] },
        { text: t('invoices'), icon: <Receipt />, path: '/invoices', permission: ['إصدار الفواتير', 'عرض الفواتير'] },
        { text: t('delivery_notes'), icon: <LocalShipping />, path: '/delivery-notes', permission: 'إصدار أذونات التسليم' },
        { text: t('customers'), icon: <People />, path: '/customers', permission: ['إدارة العملاء', 'عرض العملاء'] },
      ]
    },
    "Procurement": {
      title: t('module_procurement'),
      items: [
        { text: t('purchase_requests'), icon: <Receipt />, path: '/purchase-requests', permission: ['عرض طلبات الشراء', 'إنشاء طلب شراء'] },
        { text: t('purchase_orders'), icon: <RequestQuote />, path: '/purchase-orders', permission: ['إنشاء أمر شراء', 'عرض أوامر الشراء', 'اعتماد الطلبات'] },
        { text: t('suppliers'), icon: <People />, path: '/suppliers', permission: ['عرض الموردين', 'إدارة الموردين'] },
      ]
    },
    "Inventory": {
      title: t('module_inventory'),
      items: [
        { text: t('inventory_dashboard'), icon: <Dashboard />, path: '/inventory/dashboard', permission: 'عرض مستويات المخزون' },
        { text: t('products'), icon: <Inventory />, path: '/products', permission: ['إدارة المنتجات', 'عرض مستويات المخزون'] },
        { text: t('inventory_levels'), icon: <Inventory />, path: '/inventory', permission: ['عرض مستويات المخزون', 'إدارة المنتجات'] },
        { text: t('warehouses'), icon: <LocalShipping />, path: '/inventory/warehouses', permission: 'إدارة المستودعات' },
        { text: t('inventory_damage'), icon: <TrendingDown />, path: '/inventory/damage', permission: 'تسجيل التلفيات' },
        { text: t('stock_adjustment'), icon: <History />, path: '/inventory/adjustments', permission: 'تسويات مخزنية' },
        { text: t('internal_transfer'), icon: <LocalShipping />, path: '/inventory/transfers', permission: 'إدارة تحويلات المستودعات' },
      ]
    },
    "Finance": {
      title: t('menu_financials'),
      items: [
        { text: t('general_ledger'), icon: <Receipt />, path: '/finance/ledger', permission: 'عرض دفتر اليومية' },
        { text: t('chart_of_accounts'), icon: <LocalShipping />, path: '/finance/coa', permission: 'إدارة شجرة الحسابات' },
        { text: t('expenses'), icon: <TrendingDown />, path: '/expenses', permission: 'عرض المصاريف' },
        { text: t('bi_spreadsheet'), icon: <Assessment />, path: '/finance/bi', permission: 'التقارير المالية وذكاء الأعمال' },
        { text: t('documents'), icon: <History />, path: '/finance/documents', permission: 'إدارة المستندات' },
        { text: t('annual_report'), icon: <Assessment />, path: '/finance/annual-report', permission: 'التقارير المالية وذكاء الأعمال' },
        { text: t('year_end_closing'), icon: <VpnKey />, path: '/finance/year-end', permission: 'إقفال الفترات المالية' },
      ]
    },
    "HR": {
      title: t('menu_hr_management'),
      items: [
        { 
          text: t('hr_dashboard'), 
          icon: <Dashboard />, 
          path: '/hr/dashboard', 
          permission: [
            "عرض لوحة تحكم الموارد البشرية", 
            "عرض الموظفين", 
            "إدارة ملفات الموظفين", 
            "عرض سجلات الحضور", 
            "تسجيل الحضور", 
            "عرض تقييم الأداء", 
            "إدارة تقييم الأداء", 
            "عرض طلبات الإجازات", 
            "إدارة طلبات الإجازات", 
            "عرض الرواتب", 
            "معالجة الرواتب", 
            "إدارة التوظيف"
          ] 
        },
        { text: t('employees'), icon: <AssignmentInd />, path: '/employees', permission: ["إدارة ملفات الموظفين", "عرض الموظفين"] },
        { text: t('attendance'), icon: <EventAvailable />, path: '/attendance', permission: ["تسجيل الحضور", "عرض سجلات الحضور"] },
        { text: t('payroll'), icon: <AttachMoney />, path: '/payroll', permission: ["معالجة الرواتب", "عرض الرواتب"] },
        { text: t('recruitment'), icon: <People />, path: '/hr/recruitment', permission: "إدارة التوظيف" },
        { text: t('time_off'), icon: <EventAvailable />, path: '/hr/time-off', permission: ["إدارة طلبات الإجازات", "عرض طلبات الإجازات", "إنشاء طلب إجازة"] },
        { text: t('appraisals'), icon: <Assessment />, path: '/hr/appraisals', permission: ["إدارة تقييم الأداء", "عرض تقييم الأداء"] },
      ]
    },
    "System": {
      title: t('module_system'),
      items: [
        { text: t('audit_logs'), icon: <History />, path: '/audit-logs', permission: 'عرض سجلات التدقيق' },
        { text: t('users_management'), icon: <People />, path: '/settings/users', permission: 'إدارة المستخدمين' },
        { text: t('employee_permissions'), icon: <VpnKey />, path: '/settings/permissions', permission: 'إدارة المستخدمين' },
        { text: t('settings'), icon: <Settings />, path: '/settings', permission: 'إدارة إعدادات النظام' },
      ]
    }
  };

  const userModules = user?.modules || ["Core"];
  
  // 1. Filter items within modules based on SPECIFIC granular permissions
  const filteredModules = {};
  Object.keys(allModules).forEach(key => {
    const items = allModules[key].items.filter(item => {
        // If it's a core/dashboard item, always allow
        if (!item.permission) return true;
        // Check granular permission (handles Admin bypass inside hook)
        return hasPermission(item.permission);
    });

    // A module is shown if it has at least one visible item 
    // AND (the user has the module assigned OR we allow auto-show for specifically granted permissions)
    if (items.length > 0) {
      // Logic: Allow module if explicitly assigned OR if it's NOT a system module (allow granular to drive UI)
      const isAssigned = userModules.includes(key) || userModules.includes('All');
      const hasGranularAccess = items.some(i => i.permission && hasPermission(i.permission));
      
      if (isAssigned || hasGranularAccess || key === "Core") {
        filteredModules[key] = {
          title: allModules[key].title,
          items: items
        };
      }
    }
  });

  const activeModuleKeys = Object.keys(filteredModules);
  const location = useLocation();

  const isRtl = i18n.language === 'ar';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar 
        position="fixed" 
        elevation={0}
        className="no-print"
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
          width: { md: `calc(100% - ${open ? drawerWidth : 80}px)` },
          ml: { md: open ? `${drawerWidth}px` : '80px' },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              onClick={() => setOpen(!open)}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={i18n.language === 'en' ? t('switch_to_arabic') : t('switch_to_english')}>
              <IconButton color="inherit" onClick={handleLanguageChange}>
                <Language fontSize="small" />
                <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 'bold' }}>
                  {i18n.language === 'en' ? t('language_ar') : t('language_en')}
                </Typography>
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === 'dark' ? t('light_mode') : t('dark_mode')}>
              <IconButton color="inherit" onClick={toggleColorMode}>
                {mode === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, my: 'auto' }} />

            <Box 
              onClick={handleProfileMenuOpen}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'primary.main',
                  fontSize: 14,
                  fontWeight: 'bold'
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || (t('default_user_name')?.charAt(0) || 'U')}
              </Avatar>
              {!isMobile && (
                <Box>
                  <Typography variant="body2" fontWeight="600" sx={{ lineHeight: 1 }}>
                    {user?.username || t('default_user_name')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`role_${(user?.role || 'Admin').toLowerCase()}`)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: isRtl ? 'left' : 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: isRtl ? 'left' : 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: { width: 200, mt: 1.5, boxShadow: theme.shadows[10], borderRadius: 2 }
            }}
          >
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1.5 }}>
              <ListItemIcon><LogoutOutlined fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
              {t('logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
          disableScrollLock: true
        }}
        className="no-print"
        sx={{
          width: open ? drawerWidth : 80,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 80,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, height: 64 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            bgcolor: 'primary.main', 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
          }}>
            <Dashboard />
          </Box>
          {open && (
            <Typography variant="h6" fontWeight="800" color="primary" sx={{ letterSpacing: -0.5, textTransform: 'uppercase' }}>
              {settings.CompanyName || t('app_name')}
            </Typography>
          )}
        </Box>

        <Divider />

        <Box sx={{ overflow: 'auto', flexGrow: 1, py: 2 }}>
          {activeModuleKeys.map((key) => (
            <Box key={key} sx={{ mb: 2 }}>
              {open && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    px: 3, 
                    mb: 1, 
                    display: 'block', 
                    fontWeight: 'bold', 
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    fontSize: 11
                  }}
                >
                  {filteredModules[key].title}
                </Typography>
              )}
              <List sx={{ px: 1.5 }}>
                {filteredModules[key].items.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        component={Link}
                        to={item.path}
                        sx={{
                          borderRadius: 2,
                          py: 1.2,
                          justifyContent: open ? 'initial' : 'center',
                          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          color: active ? 'primary.main' : 'text.secondary',
                          '&:hover': {
                            bgcolor: active ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.text.primary, 0.05),
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            mr: open ? 2 : 'auto',
                            justifyContent: 'center',
                            color: active ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                        {open && (
                          <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ 
                              fontSize: 14, 
                              fontWeight: active ? 600 : 500 
                            }} 
                          />
                        )}
                        {open && active && (
                          <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 2 }} />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Need help section removed */}
      </Drawer>

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 4 }, 
          mt: 8,
          width: '100%',
          maxWidth: '100%',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Outlet />
      </Box>

      <OCRScanner 
        open={ocrOpen} 
        onClose={() => setOcrOpen(false)} 
        onScanComplete={(text) => {
          setSnackbar({ open: true, message: t('ocr_processed', 'Smart scan complete! Result copied to clipboard.'), severity: 'success' });
          navigator.clipboard.writeText(text);
        }}
      />

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MainLayout;
