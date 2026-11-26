import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const { hasPermission } = usePermissions();

  // ── غير مسجل دخول → صفحة Login ─────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location, reason: 'unauthenticated' }} replace />;
  }

  // ── فحص Permission محدد ──────────────────────────────────────────────────
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const userHasAccess = permissions.some(p => hasPermission(p));

    if (!userHasAccess) {
      // محاولة إيجاد أقرب صفحة مناسبة
      if (location.pathname === '/dashboard' || location.pathname === '/') {
        if (hasPermission('عرض دفتر اليومية') || hasPermission('إدارة شجرة الحسابات')) return <Navigate to="/finance/ledger" replace />;
        if (hasPermission('عرض المبيعات') || hasPermission('إصدار الفواتير')) return <Navigate to="/orders" replace />;
        if (hasPermission('عرض مستويات المخزون') || hasPermission('إدارة المنتجات')) return <Navigate to="/inventory/dashboard" replace />;
        if (hasPermission('إدارة ملفات الموظفين') || hasPermission('عرض الموظفين')) return <Navigate to="/hr/dashboard" replace />;
        if (hasPermission('عرض الموردين') || hasPermission('إدارة الموردين')) return <Navigate to="/suppliers" replace />;
        if (hasPermission('عرض أوامر الشراء') || hasPermission('إنشاء أمر شراء')) return <Navigate to="/purchase-orders" replace />;
        if (hasPermission('عرض نشاطات العمل')) return <Navigate to="/dashboard" replace />;
        if (hasPermission('التقارير المالية وذكاء الأعمال')) return <Navigate to="/finance/bi" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }
  // ── فحص Role (fallback للـ routes القديمة) ──────────────────────────────
  else if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
