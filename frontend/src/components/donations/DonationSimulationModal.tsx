import React from 'react';
import { Donation } from '../../types/donation';
import { AlertTriangle, CheckCircle2, XCircle, X, ShieldAlert, Sparkles } from 'lucide-react';

interface DonationSimulationModalProps {
  donation: Donation | null;
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onReject: () => Promise<void>;
  onClose: () => void;
  isProcessing: boolean;
}

export const DonationSimulationModal: React.FC<DonationSimulationModalProps> = ({
  donation,
  isOpen,
  onConfirm,
  onReject,
  onClose,
  isProcessing,
}) => {
  if (!isOpen || !donation) return null;

  const solesFormatted = (donation.amountCents / 100).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
  });

  const isPending = donation.status === 'PENDIENTE_SIMULACION';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Cerrar ventana"
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 id="simulation-modal-title" className="text-lg font-bold">
                Simulación de Donación Académica
              </h3>
              <p className="text-xs text-slate-300">
                Stage: <span className="text-amber-400 font-mono">academic</span> · TransactWriteItems
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Simulation Disclaimer Callout */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Aviso Pedagógico Estricto</p>
              <p className="mt-1 leading-relaxed text-amber-800">
                Esta acción ejecutará una simulación en el backend serverless. 
                <strong> No se realizará ningún cargo ni débito bancario real</strong>. 
                El balance del proyecto se actualizará de forma atómica en DynamoDB.
              </p>
            </div>
          </div>

          {/* Donation Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 text-xs font-semibold uppercase">ID Donación:</span>
              <span className="font-mono text-xs text-slate-800 font-bold">{donation.donationId}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 text-xs font-semibold uppercase">Importe Simulado:</span>
              <span className="text-lg font-bold text-emerald-700">{solesFormatted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-semibold uppercase">Estado Actual:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  donation.status === 'CONFIRMADA'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : donation.status === 'RECHAZADA'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {donation.status}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          {isPending ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center text-slate-600">
                Elija el resultado que desea simular para esta intención:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isProcessing}
                  className="py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Rechazar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-3">
              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-medium">
                Esta donación ya se encuentra en estado terminal: <strong>{donation.status}</strong>.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
