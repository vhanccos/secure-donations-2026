import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjectById } from '../services/projects.service';
import { createDonation, simulateDonation, generateIdempotencyKey } from '../services/donations.service';
import { Project } from '../types/project';
import { Donation } from '../types/donation';
import { DonationForm } from '../components/donations/DonationForm';
import { DonationSimulationModal } from '../components/donations/DonationSimulationModal';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Heart,
  History,
  ShieldCheck,
} from 'lucide-react';

export const DonationFlowPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, accessToken, isAuthenticated, loginAsDemoUser } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Active donation intention created
  const [createdDonation, setCreatedDonation] = useState<Donation | null>(null);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [completedStatus, setCompletedStatus] = useState<'CONFIRMADA' | 'RECHAZADA' | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProjectError('Identificador de proyecto no especificado');
      setIsLoadingProject(false);
      return;
    }

    const fetchProject = async () => {
      setIsLoadingProject(true);
      try {
        const data = await getProjectById(projectId);
        setProject(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar el proyecto';
        setProjectError(msg);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleCreateDonation = async (amountCents: number) => {
    if (!accessToken || !projectId) {
      setSubmissionError('Debe iniciar sesión para realizar una simulación de donación.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      // Attach mandatory RFC 4122 v4 Idempotency-Key
      const idempotencyKey = generateIdempotencyKey();
      const newDonation = await createDonation(
        {
          projectId,
          amountCents,
        },
        accessToken,
        idempotencyKey
      );

      setCreatedDonation(newDonation);
      setIsSimulationModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la intención de donación';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateAction = async (action: 'CONFIRMAR' | 'RECHAZAR') => {
    if (!accessToken || !createdDonation) return;

    setIsSimulating(true);
    try {
      const updated = await simulateDonation(
        createdDonation.donationId,
        { action },
        accessToken
      );
      setCreatedDonation(updated);
      setCompletedStatus(action === 'CONFIRMAR' ? 'CONFIRMADA' : 'RECHAZADA');
      setIsSimulationModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al simular la donación';
      alert(msg);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Preparando flujo de donación...</p>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Proyecto no disponible</h2>
        <p className="text-sm text-slate-600">{projectError || 'No se pudo encontrar el proyecto para donar.'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation Back */}
      <div>
        <Link
          to={`/projects/${project.projectId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al detalle del proyecto
        </Link>
      </div>

      {/* Completion View if finished */}
      {completedStatus && createdDonation ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              completedStatus === 'CONFIRMADA'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-rose-100 text-rose-600'
            }`}
          >
            {completedStatus === 'CONFIRMADA' ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <AlertCircle className="w-10 h-10" />
            )}
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                completedStatus === 'CONFIRMADA'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              Simulación {completedStatus}
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              {completedStatus === 'CONFIRMADA'
                ? '¡Simulación de Donación Confirmada con Éxito!'
                : 'Simulación de Donación Rechazada'}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {completedStatus === 'CONFIRMADA'
                ? 'El balance del proyecto ha sido incrementado atómicamente en DynamoDB.'
                : 'La intención de donación quedó registrada como rechazada en DynamoDB.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">ID de Donación:</span>
              <span className="font-mono text-slate-800 font-bold">{createdDonation.donationId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Proyecto:</span>
              <span className="font-semibold text-slate-800">{project.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Monto Simulado:</span>
              <span className="font-bold text-emerald-700">
                {(createdDonation.amountCents / 100).toLocaleString('es-PE', {
                  style: 'currency',
                  currency: 'PEN',
                })}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Simulación pedagógica: no se ha realizado ningún cobro bancario real.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/my-donations"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <History className="w-4 h-4" />
              Ver mi Historial de Donaciones
            </Link>
            <Link
              to={`/projects/${project.projectId}`}
              className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Heart className="w-4 h-4" />
              Volver al Proyecto
            </Link>
          </div>
        </div>
      ) : (
        /* Donation Form Section */
        <div className="space-y-6">
          {/* Auth Guard Banner if not logged in */}
          {!isAuthenticated && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-xs text-amber-950 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Autenticación Requerida para Generar Intención</span>
              </div>
              <p className="text-amber-800">
                Para registrar una donación vinculada a su identidad criptográfica (sub), inicie sesión como Donante.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => loginAsDemoUser('DONANTE')}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  Acceso Rápido como Donante Demo
                </button>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold transition"
                >
                  Ir al Login
                </Link>
              </div>
            </div>
          )}

          {submissionError && (
            <div
              role="alert"
              className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-700"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{submissionError}</span>
            </div>
          )}

          <DonationForm
            projectId={project.projectId}
            projectTitle={project.title}
            onSubmit={handleCreateDonation}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Interactive Simulation Modal */}
      <DonationSimulationModal
        donation={createdDonation}
        isOpen={isSimulationModalOpen}
        onConfirm={() => handleSimulateAction('CONFIRMAR')}
        onReject={() => handleSimulateAction('RECHAZAR')}
        onClose={() => setIsSimulationModalOpen(false)}
        isProcessing={isSimulating}
      />
    </div>
  );
};
