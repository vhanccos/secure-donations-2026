import React, { useState } from 'react';
import { ShieldCheck, Heart, AlertCircle } from 'lucide-react';

interface DonationFormProps {
  projectId: string;
  projectTitle: string;
  onSubmit: (amountCents: number) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_AMOUNTS = [10, 20, 50, 100, 200];

export const DonationForm: React.FC<DonationFormProps> = ({
  projectTitle,
  onSubmit,
  isSubmitting,
}) => {
  const [amountSoles, setAmountSoles] = useState<number>(20);
  const [customError, setCustomError] = useState<string | null>(null);

  const handlePreset = (amount: number) => {
    setAmountSoles(amount);
    setCustomError(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setAmountSoles(0);
      setCustomError(null);
      return;
    }
    const val = parseInt(rawVal, 10);
    if (isNaN(val)) {
      setAmountSoles(0);
    } else {
      setAmountSoles(val);
    }
    setCustomError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountSoles < 1) {
      setCustomError('El monto mínimo de donación es S/ 1.00');
      return;
    }
    if (amountSoles > 1000) {
      setCustomError('El monto máximo de donación simulada es S/ 1,000.00');
      return;
    }
    const amountCents = Math.round(amountSoles * 100);
    await onSubmit(amountCents);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-900">Registrar Intención de Donación</h3>
        <p className="text-sm text-slate-600 mt-1">
          Campaña: <span className="font-semibold text-slate-900">{projectTitle}</span>
        </p>
      </div>

      {/* Preset Amounts */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Seleccione un monto predeterminado (PEN)
        </label>
        <div className="grid grid-cols-5 gap-2">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handlePreset(amt)}
              className={`py-2 px-3 text-sm font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                amountSoles === amt
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              S/ {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label
          htmlFor="custom-amount-input"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
        >
          O ingrese un monto personalizado (Entero S/)
        </label>
        <div className="relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-semibold text-sm">
            S/
          </div>
          <input
            id="custom-amount-input"
            type="number"
            min={1}
            max={1000}
            step={1}
            value={amountSoles || ''}
            onChange={handleCustomChange}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 font-semibold text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="50"
            required
          />
        </div>
        {customError && (
          <p className="text-xs text-rose-600 flex items-center gap-1 mt-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {customError}
          </p>
        )}
        <p className="text-[11px] text-slate-500 mt-1">
          Límites permitidos: mínimo S/ 1.00 - máximo S/ 1,000.00
        </p>
      </div>

      {/* STRICT ZERO TRUST DATA MINIMIZATION NOTICE */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold text-emerald-900">Principio de Minimización de Datos (NIST SP 800-207)</p>
          <p className="text-emerald-800 mt-1 leading-relaxed">
            Solo solicitamos el monto que desea simular donar. Por diseño y seguridad estricta, 
            <strong> esta plataforma nunca le solicitará números de tarjeta (PAN), CVV, fecha de vencimiento ni datos bancarios</strong>.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || amountSoles < 1 || amountSoles > 1000}
        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-base cursor-pointer"
      >
        <Heart className="w-5 h-5" />
        {isSubmitting
          ? 'Registrando intención en DynamoDB...'
          : `Generar Intención de Donación por S/ ${amountSoles || 0}.00`}
      </button>
    </form>
  );
};
