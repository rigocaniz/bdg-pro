import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ requiredPermission, requiredRole, children }) => {
  const { isAuthenticated, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const hasPerm = Array.isArray(requiredPermission)
      ? requiredPermission.some((p) => hasPermission(p))
      : hasPermission(requiredPermission);
    if (!hasPerm) {
      const permText = Array.isArray(requiredPermission)
        ? requiredPermission.join(' o ')
        : requiredPermission;
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-200 max-w-lg mx-auto mt-12">
          <h2 className="text-lg font-bold text-rose-700">Acceso Denegado</h2>
          <p className="text-sm text-slate-600 mt-2">
            Su cuenta no tiene los permisos suficientes ({permText}) para ver este módulo.
          </p>
        </div>
      );
    }
  }

  if (requiredRole) {
    const hasR = Array.isArray(requiredRole)
      ? requiredRole.some((r) => hasRole(r))
      : hasRole(requiredRole);
    if (!hasR) {
      const roleText = Array.isArray(requiredRole)
        ? requiredRole.join(' o ')
        : requiredRole;
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-rose-200 max-w-lg mx-auto mt-12">
          <h2 className="text-lg font-bold text-rose-700">Acceso Denegado</h2>
          <p className="text-sm text-slate-600 mt-2">
            Se requiere el rol "{roleText}" para acceder a esta pantalla.
          </p>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
};
