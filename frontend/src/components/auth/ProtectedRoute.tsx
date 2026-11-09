import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/auth';
import { ShieldAlert, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verificando autorización Zero Trust...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Autenticación Requerida</h2>
        <p className="text-sm text-slate-600 mb-6">
          Esta ruta está protegida por políticas Zero Trust (NIST SP 800-207). Por favor inicie sesión para continuar.
        </p>
        <Navigate to="/login" replace />
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((role) => user.groups.includes(role));
    if (!hasRole) {
      return (
        <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
            HTTP 403 Forbidden
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso No Autorizado</h2>
          <p className="text-sm text-slate-600 mb-4">
            Su cuenta actual (<span className="font-semibold text-slate-800">{user.email || user.sub}</span>) tiene el rol de{' '}
            <span className="font-semibold text-emerald-700">{user.primaryRole}</span>, el cual no cuenta con los privilegios requeridos para acceder a este recurso.
          </p>
          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 border border-slate-200 mb-6 text-left">
            <p className="font-semibold text-slate-800 mb-1">Roles permitidos:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {allowedRoles.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
