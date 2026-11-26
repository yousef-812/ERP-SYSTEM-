import { createSlice } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

const parseToken = (token) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }

    const permissionsClaim = decoded.Permissions || '';
    const permissionsList = permissionsClaim ? permissionsClaim.split(',').filter(Boolean) : [];

    const warehouseClaim = decoded.AssignedWarehouses || '';
    const warehouseList = warehouseClaim ? warehouseClaim.split(',').filter(Boolean) : [];

    return {
      id: decoded.nameid || decoded.sub,
      username: decoded.unique_name || decoded.name,
      role: decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      permissions: permissionsList,
      assignedWarehouses: warehouseList,
      securityStamp: decoded.SecurityStamp || '',
    };
  } catch {
    localStorage.removeItem('token');
    return null;
  }
};

const token = localStorage.getItem('token');
const savedUser = localStorage.getItem('user');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token,
    isAuthenticated: !!token,
    user: savedUser ? JSON.parse(savedUser) : null,
  },
  reducers: {
    loginSuccess: (state, action) => {
      const { token, user } = action.payload;
      localStorage.setItem('token', token);
      
      const userData = {
        id: user.Id || user.id,
        username: user.Username || user.username,
        role: user.Role || user.role,
        permissions: user.Permissions || user.permissions || [],
        assignedWarehouses: user.AssignedWarehouses || user.assignedWarehouses || user.AssignedWarehouseIds || user.assignedWarehouseIds || [],
        securityStamp: user.securityStamp || '',
      };

      localStorage.setItem('user', JSON.stringify(userData));
      state.token = token;
      state.isAuthenticated = true;
      state.user = userData;
    },
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
    },
    // يُستدعى عند رفض الـ Backend للـ Token (401 بسبب SecurityStamp قديم)
    sessionInvalidated: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

export const { loginSuccess, logout, sessionInvalidated } = authSlice.actions;
export default authSlice.reducer;

