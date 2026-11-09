import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            <strong>Fundación AQP-SOLIDARIA</strong> · Implementación Zero Trust (NIST SP 800-207)
          </span>
        </div>
        <div className="text-center sm:text-right">
          <p>Tópicos Avanzados en Ingeniería de Software (UNSA, EPIS 2026)</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Arquitectura Serverless en AWS: API Gateway (PEP), Cognito (PA), DynamoDB + Lambdas (PDP).
          </p>
        </div>
      </div>
    </footer>
  );
};
