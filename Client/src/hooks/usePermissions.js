import { useSelector } from 'react-redux';

/**
 * usePermissions Hook
 *
 * قواعد:
 * 1. Admin: يملك صلاحية مطلقة (Global Bypass) لكل شيء في النظام.
 * 2. باقي المستخدمين: يتم التحقق من قائمة الصلاحيات المسندة إليهم صراحة.
 * 3. المقارنة تتم بدون حساسبة لحالة الأحرف (Case Insensitivity).
 */

export const usePermissions = () => {
  const { user } = useSelector((state) => state.auth);

  const hasPermission = (permissionName) => {
    if (!user || !permissionName) return false;

    // ── Admin: تجاوز مطلق لكل الصلاحيات ───────────────────────────────────
    if (user.role === 'Admin') return true;

    const normalize = (str) => {
      if (!str) return '';
      // Remove all non-alphanumeric characters except Arabic letters and spaces
      return str.toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
    };

    const namesToCheck = Array.isArray(permissionName) ? permissionName : [permissionName];
    const normalizedRequiredNames = namesToCheck.map(normalize);
    
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    return normalizedRequiredNames.some(requiredName => {
      return user.permissions.some(p => {
        const normP = normalize(p);
        return normP === requiredName || normP.includes(requiredName) || requiredName.includes(normP);
      });
    });
  };

  const hasAnyPermission = (...permissionNames) =>
    permissionNames.some((p) => hasPermission(p));

  const hasAllPermissions = (...permissionNames) =>
    permissionNames.every((p) => hasPermission(p));

  const isAdmin = user?.role === 'Admin';

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    userPermissions: user?.permissions || [],
    assignedWarehouses: user?.assignedWarehouses || [],
  };
};

