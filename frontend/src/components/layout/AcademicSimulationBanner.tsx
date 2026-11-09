import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const AcademicSimulationBanner: React.FC = () => {
  return (
    <aside
      role="alert"
      aria-label="Aviso de simulación académica"
      className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2.5 shadow-md border-b border-amber-600 transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2 text-left">
          <AlertTriangle className="w-5 h-5 text-amber-950 flex-shrink-0 animate-pulse" aria-hidden="true" />
          <span>
            <strong>ENTORNO DE SIMULACIÓN ACADÉMICA — </strong>
            Las donaciones son estrictamente simuladas para fines pedagógicos (UNSA). No se transfieren fondos reales, no ingrese datos de tarjetas ni información bancaria.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1 bg-amber-600/30 text-amber-950 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            NIST SP 800-207
          </span>
          <span className="inline-flex items-center bg-amber-950 text-amber-100 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
            STAGE: ACADEMIC
          </span>
        </div>
      </div>
    </aside>
  );
};
