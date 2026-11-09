import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white border border-rose-200 rounded-3xl shadow-sm text-center space-y-4">
      <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full uppercase tracking-wider">
        HTTP 403 Forbidden
      </span>
      <h1 className="text-2xl font-bold text-slate-900">Acceso Prohibido</h1>
      <p className="text-sm text-slate-600">
        No cuenta con los privilegios o scopes necesarios para acceder a este recurso bajo el modelo Zero Trust.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};
