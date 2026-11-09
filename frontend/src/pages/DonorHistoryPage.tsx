import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyDonations, simulateDonation } from '../services/donations.service';
import { Donation } from '../types/donation';
import { DonationSimulationModal } from '../components/donations/DonationSimulationModal';
import {
  History,
  Heart,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';

export const DonorHistoryPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resume simulation state
  const [activeSimulationDonation, setActiveSimulationDonation] = useState<Donation | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyDonations(accessToken);
      setDonations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener historial de donaciones';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSimulateAction = async (action: 'CONFIRMAR' | 'RECHAZAR') => {
    if (!accessToken || !activeSimulationDonation) return;
    setIsProcessing(true);
    try {
      const updated = await simulateDonation(
        activeSimulationDonation.donationId,
        { action },
        accessToken
      );
      // Update in local list
      setDonations((prev) =>
        prev.map((d) => (d.donationId === updated.donationId ? updated : d))
      );
      setActiveSimulationDonation(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la simulación';
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            CONFIRMADA
          </span>
        );
      case 'RECHAZADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            RECHAZADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDIENTE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            Mi Historial de Donaciones
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Protección BOLA (NIST SP 800-207): Mostrando exclusivamente donaciones asociadas a su identidad criptográfica (
            <span className="font-mono text-slate-700">{user?.sub}</span>)
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar Historial
        </button>
      </div>

      {/* Main List / Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Consultando registros privados en DynamoDB...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Error al consultar el historial</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Aún no tiene intenciones de donación registradas</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Explore los proyectos solidarios y simule su primera donación académica.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Heart className="w-4 h-4" />
            Explorar Proyectos
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID Donación</th>
                  <th className="px-6 py-4">Proyecto</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Importe Simulado</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((d) => {
                  const soles = (d.amountCents / 100).toLocaleString('es-PE', {
                    style: 'currency',
                    currency: 'PEN',
                  });
                  const dateStr = d.createdAt
                    ? new Date(d.createdAt).toLocaleString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A';

                  return (
                    <tr key={d.donationId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-700 font-semibold">
                        {d.donationId.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/projects/${d.projectId}`}
                          className="font-medium text-slate-900 hover:text-emerald-700 transition"
                        >
                          {d.projectTitle || `Proyecto ${d.projectId.slice(0, 8)}...`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{dateStr}</td>
                      <td className="px-6 py-4 font-bold text-emerald-700">{soles}</td>
                      <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {d.status === 'PENDIENTE_SIMULACION' ? (
                          <button
                            onClick={() => setActiveSimulationDonation(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Completar Simulación
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">Completada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resume Simulation Modal */}
      <DonationSimulationModal
        donation={activeSimulationDonation}
        isOpen={!!activeSimulationDonation}
        onConfirm={() => handleSimulateAction('CONFIRMAR')}
        onReject={() => handleSimulateAction('RECHAZAR')}
        onClose={() => setActiveSimulationDonation(null)}
        isProcessing={isProcessing}
      />
    </div>
  );
};
