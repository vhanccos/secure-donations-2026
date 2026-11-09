import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { queryAuditEvents } from '../services/audit.service';
import { AuditEvent } from '../types/audit';
import {
  FileSearch,
  Filter,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const EVENT_TYPES = [
  { label: 'Todos los eventos', value: '' },
  { label: 'PROJECT_CREATED', value: 'PROJECT_CREATED' },
  { label: 'PROJECT_PUBLISHED', value: 'PROJECT_PUBLISHED' },
  { label: 'DONATION_INTENTION_CREATED', value: 'DONATION_INTENTION_CREATED' },
  { label: 'DONATION_SIMULATION_CONFIRMED', value: 'DONATION_SIMULATION_CONFIRMED' },
  { label: 'DONATION_SIMULATION_REJECTED', value: 'DONATION_SIMULATION_REJECTED' },
  { label: 'AUTH_LOGIN_SUCCESS', value: 'AUTH_LOGIN_SUCCESS' },
  { label: 'AUTH_MFA_CHALLENGE', value: 'AUTH_MFA_CHALLENGE' },
];

export const AuditEventsPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [limit, setLimit] = useState<number>(25);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await queryAuditEvents(
        {
          eventType: eventTypeFilter || undefined,
          limit,
        },
        accessToken
      );
      setEvents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar logs de auditoría';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, eventTypeFilter, limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-amber-600" />
            Visor de Eventos de Auditoría Zero Trust
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Exclusivo para el rol <span className="font-semibold text-amber-700">AUDITOR</span> (HU-10). Trazabilidad inmutable de eventos con sanitización de secretos.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refrescar Auditoría
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700 uppercase">Filtros:</span>
        </div>

        <div className="flex-1 min-w-[200px]">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="limit-select" className="text-xs text-slate-600">Límite:</label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Consultando tabla DynamoDB de Auditoría...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Error al consultar auditoría</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <FileSearch className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron eventos de auditoría</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No existen registros que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Tipo de Evento</th>
                  <th className="px-4 py-3">Actor Ref</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {events.map((evt, idx) => {
                  const dateStr = evt.timestamp
                    ? new Date(evt.timestamp).toLocaleString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'N/A';

                  return (
                    <tr key={evt.timestamp_id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{evt.eventType}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate" title={evt.actorRef}>
                        {evt.actorRef || 'anon'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={evt.resourceRef}>
                        {evt.resourceRef || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{evt.action || '-'}</td>
                      <td className="px-4 py-3">
                        {evt.outcome === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            FAILURE
                          </span>
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
    </div>
  );
};
