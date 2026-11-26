import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';

// Common Components
import MainLayout from './components/MainLayout';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfirmProvider } from './context/ConfirmContext';

// Lazy Loaded Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Customers = lazy(() => import('./pages/Customers'));
const Invoices = lazy(() => import('./pages/Invoices/Invoices'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const CreateOrder = lazy(() => import('./pages/Orders/CreateOrder'));
const Inventory = lazy(() => import('./pages/Inventory/Inventory'));
const Suppliers = lazy(() => import('./pages/Suppliers/Suppliers'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const Login = lazy(() => import('./pages/Login/Login'));
const Landing = lazy(() => import('./pages/Landing/Landing'));
const Employees = lazy(() => import('./pages/Employees'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Expenses = lazy(() => import('./pages/Expenses'));
const FinancialReport = lazy(() => import('./pages/FinancialReport'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Users = lazy(() => import('./pages/Settings/Users'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
// Removed Product Suite lazy loads

// Enterprise Pages
const ProfitLoss = lazy(() => import('./pages/Accounting/ProfitLoss'));
const Ledger = lazy(() => import('./pages/Accounting/Ledger'));
const PurchaseOrders = lazy(() => import('./pages/Procurement/PurchaseOrders'));
const PurchaseRequests = lazy(() => import('./pages/Procurement/PurchaseRequests'));
const DeliveryNotes = lazy(() => import('./pages/Invoices/DeliveryNotes'));
const Permissions = lazy(() => import('./pages/Settings/Permissions'));

// New Enterprise Modules
const BISpreadsheet = lazy(() => import('./pages/Accounting/BISpreadsheet'));
const Documents = lazy(() => import('./pages/Accounting/Documents'));
const ChartOfAccounts = lazy(() => import('./pages/Accounting/ChartOfAccounts'));
const AnnualReport = lazy(() => import('./pages/Accounting/AnnualReport'));
const YearEndClosing = lazy(() => import('./pages/Accounting/YearEndClosing'));
const HRDashboard = lazy(() => import('./pages/HR/HRDashboard'));
const Recruitment = lazy(() => import('./pages/HR/Recruitment'));
const TimeOff = lazy(() => import('./pages/HR/TimeOff'));
const Appraisals = lazy(() => import('./pages/HR/Appraisals'));
const InventoryDashboard = lazy(() => import('./pages/Inventory/InventoryDashboard'));
const DamageRequests = lazy(() => import('./pages/Inventory/DamageRequests'));
const StockAdjustments = lazy(() => import('./pages/Inventory/StockAdjustments'));
const Warehouses = lazy(() => import('./pages/Inventory/Warehouses'));
const WarehouseTransfers = lazy(() => import('./pages/Inventory/WarehouseTransfers'));

const LoadingFallback = () => (
  <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
    <LinearProgress color="primary" />
  </Box>
);


function App() {
  return (
    <ConfirmProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Marketing Routes */}
            <Route element={<PublicLayout><Landing /></PublicLayout>} path="/" />

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            
            {/* Unified Authenticated Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* General Access with Granular Permissions */}
                <Route path="/dashboard" element={<ProtectedRoute requiredPermission={["عرض لوحة التحكم", "عرض نشاطات العمل", "إصدار أذونات التسليم"]} />}>
                  <Route index element={<Dashboard />} />
                </Route>
                <Route path="/products" element={<ProtectedRoute requiredPermission={["عرض مستويات المخزون", "إدارة المنتجات"]} />}>
                  <Route index element={<Products />} />
                </Route>
                <Route path="/customers" element={<ProtectedRoute requiredPermission={["عرض العملاء", "إدارة العملاء"]} />}>
                  <Route index element={<Customers />} />
                </Route>
                <Route path="/invoices" element={<ProtectedRoute requiredPermission={["عرض الفواتير", "إصدار الفواتير"]} />}>
                  <Route index element={<Invoices />} />
                </Route>
                <Route path="/inventory" element={<ProtectedRoute requiredPermission={["عرض مستويات المخزون", "إدارة المنتجات"]} />}>
                  <Route index element={<Inventory />} />
                </Route>
                <Route path="/suppliers" element={<ProtectedRoute requiredPermission={["عرض الموردين", "إدارة الموردين"]} />}>
                  <Route index element={<Suppliers />} />
                </Route>
                <Route path="/orders" element={<ProtectedRoute requiredPermission={["عرض المبيعات", "إصدار الفواتير"]} />}>
                  <Route index element={<Orders />} />
                </Route>
                <Route path="/orders/new" element={<ProtectedRoute requiredPermission="إصدار الفواتير" />}>
                  <Route index element={<CreateOrder />} />
                </Route>
                <Route path="/delivery-notes" element={<ProtectedRoute requiredPermission="إصدار أذونات التسليم" />}>
                  <Route index element={<DeliveryNotes />} />
                </Route>
                <Route path="/purchase-orders" element={<ProtectedRoute requiredPermission={["إنشاء أمر شراء", "عرض أوامر الشراء", "اعتماد الطلبات"]} />}>
                  <Route index element={<PurchaseOrders />} />
                </Route>
                <Route path="/purchase-requests" element={<ProtectedRoute requiredPermission={["عرض طلبات الشراء", "إنشاء طلب شراء"]} />}>
                  <Route index element={<PurchaseRequests />} />
                </Route>
                <Route path="/expenses" element={<ProtectedRoute requiredPermission="عرض المصاريف" />}>
                  <Route index element={<Expenses />} />
                </Route>
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Role-Specific Modules */}
                {/* HR Modules */}
                <Route path="/hr/dashboard" element={<ProtectedRoute requiredPermission={["عرض لوحة تحكم الموارد البشرية", "إدارة ملفات الموظفين", "عرض الموظفين", "عرض سجلات الحضور", "تسجيل الحضور", "عرض تقييم الأداء", "إدارة تقييم الأداء", "عرض طلبات الإجازات", "إدارة طلبات الإجازات", "عرض الرواتب", "معالجة الرواتب", "إدارة التوظيف"]} />}>
                  <Route index element={<HRDashboard />} />
                </Route>
                <Route path="/employees" element={<ProtectedRoute requiredPermission={["إدارة ملفات الموظفين", "عرض الموظفين"]} />}>
                  <Route index element={<Employees />} />
                </Route>
                <Route path="/employees/:id" element={<ProtectedRoute requiredPermission={["إدارة ملفات الموظفين", "عرض الموظفين"]} />}>
                  <Route index element={<EmployeeDetail />} />
                </Route>
                <Route path="/attendance" element={<ProtectedRoute requiredPermission={["تسجيل الحضور", "عرض سجلات الحضور"]} />}>
                  <Route index element={<Attendance />} />
                </Route>
                <Route path="/payroll" element={<ProtectedRoute requiredPermission={["معالجة الرواتب", "عرض الرواتب"]} />}>
                  <Route index element={<Payroll />} />
                </Route>
                <Route path="/hr/recruitment" element={<ProtectedRoute requiredPermission="إدارة التوظيف" />}>
                  <Route index element={<Recruitment />} />
                </Route>
                <Route path="/hr/time-off" element={<ProtectedRoute requiredPermission={["إدارة طلبات الإجازات", "عرض طلبات الإجازات", "إنشاء طلب إجازة"]} />}>
                  <Route index element={<TimeOff />} />
                </Route>
                <Route path="/hr/appraisals" element={<ProtectedRoute requiredPermission={["إدارة تقييم الأداء", "عرض تقييم الأداء"]} />}>
                  <Route index element={<Appraisals />} />
                </Route>

                {/* Finance Modules */}
                <Route path="/finance/ledger" element={<ProtectedRoute requiredPermission="عرض دفتر اليومية" />}>
                  <Route index element={<Ledger />} />
                </Route>
                <Route path="/finance/bi" element={<ProtectedRoute requiredPermission="التقارير المالية وذكاء الأعمال" />}>
                  <Route index element={<BISpreadsheet />} />
                </Route>
                <Route path="/finance/documents" element={<ProtectedRoute requiredPermission="إدارة المستندات" />}>
                  <Route index element={<Documents />} />
                </Route>
                <Route path="/finance/coa" element={<ProtectedRoute requiredPermission="إدارة شجرة الحسابات" />}>
                  <Route index element={<ChartOfAccounts />} />
                </Route>
                <Route path="/finance/annual-report" element={<ProtectedRoute requiredPermission="التقارير المالية وذكاء الأعمال" />}>
                  <Route index element={<AnnualReport />} />
                </Route>
                <Route path="/finance/year-end" element={<ProtectedRoute requiredPermission="إقفال الفترات المالية" />}>
                  <Route index element={<YearEndClosing />} />
                </Route>
                <Route path="/finance/reports" element={<ProtectedRoute requiredPermission="التقارير المالية وذكاء الأعمال" />}>
                  <Route index element={<FinancialReport />} />
                </Route>

                {/* Inventory Management */}
                <Route path="/inventory/dashboard" element={<ProtectedRoute requiredPermission="عرض مستويات المخزون" />}>
                  <Route index element={<InventoryDashboard />} />
                </Route>
                <Route path="/inventory/damage" element={<ProtectedRoute requiredPermission="تسجيل التلفيات" />}>
                  <Route index element={<DamageRequests />} />
                </Route>
                <Route path="/inventory/adjustments" element={<ProtectedRoute requiredPermission="تسويات مخزنية" />}>
                  <Route index element={<StockAdjustments />} />
                </Route>
                <Route path="/inventory/transfers" element={<ProtectedRoute requiredPermission="عرض مستويات المخزون" />}>
                  <Route index element={<WarehouseTransfers />} />
                </Route>
                <Route path="/inventory/warehouses" element={<ProtectedRoute requiredPermission="إدارة المستودعات" />}>
                  <Route index element={<Warehouses />} />
                </Route>

                {/* Admin Exclusive Settings */}
                <Route path="/audit-logs" element={<ProtectedRoute requiredPermission="عرض سجلات التدقيق" />}>
                  <Route index element={<AuditLogs />} />
                </Route>
                <Route path="/settings" element={<ProtectedRoute requiredPermission="إدارة إعدادات النظام" />}>
                  <Route index element={<Settings />} />
                </Route>
                <Route path="/settings/users" element={<ProtectedRoute requiredPermission="إدارة المستخدمين" />}>
                  <Route index element={<Users />} />
                </Route>
                <Route path="/settings/permissions" element={<ProtectedRoute requiredPermission="إدارة المستخدمين" />}>
                  <Route index element={<Permissions />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ConfirmProvider>
  );
}

export default App;
