import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createProject, publishProject } from '../services/projects.service';
import { Project } from '../types/project';
import {
  FolderPlus,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ProjectManagementPage: React.FC = () => {
  const { accessToken } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalSoles, setGoalSoles] = useState<number>(5000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Keep track of created draft in this session to allow immediate one-click publishing
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setErrorMsg('Debe iniciar sesión como Gestor para registrar proyectos.');
      return;
    }

    if (title.trim().length < 3 || title.trim().length > 120) {
      setErrorMsg('El título debe tener entre 3 y 120 caracteres.');
      return;
    }

    if (description.trim().length < 10 || description.trim().length > 2000) {
      setErrorMsg('La descripción debe tener entre 10 y 2000 caracteres.');
      return;
    }

    if (goalSoles < 100 || goalSoles > 1000000) {
      setErrorMsg('La meta debe encontrarse entre S/ 100.00 y S/ 1,000,000.00.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const goalAmountCents = Math.round(goalSoles * 100);
      const newProj = await createProject(
        {
          title: title.trim(),
          description: description.trim(),
          goalAmountCents,
        },
        accessToken
      );

      setCreatedProjects((prev) => [newProj, ...prev]);
      setSuccessMsg(`Borrador "${newProj.title}" creado exitosamente (ID: ${newProj.projectId}). Ahora puede publicarlo.`);
      setTitle('');
      setDescription('');
      setGoalSoles(5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear borrador';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (projectId: string) => {
    if (!accessToken) return;
    setPublishingId(projectId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const published = await publishProject(projectId, accessToken);
      setCreatedProjects((prev) =>
        prev.map((p) => (p.projectId === projectId ? published : p))
      );
      setSuccessMsg(`Proyecto "${published.title}" publicado con éxito en el catálogo público.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al publicar el proyecto';
      setErrorMsg(msg);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderPlus className="w-6 h-6 text-indigo-600" />
          Panel de Gestión de Proyectos Solidarios
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Exclusivo para el rol <span className="font-semibold text-indigo-700">GESTOR</span> (HU-08). Creación de borradores y publicación atómica.
        </p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form: Create Draft */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">Registrar Nuevo Proyecto (Borrador)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            El proyecto se creará inicialmente en estado <span className="font-semibold text-slate-700">BORRADOR</span> y no será visible en el catálogo público hasta su publicación.
          </p>
        </div>

        <form onSubmit={handleCreateDraft} className="space-y-5">
          <div>
            <label
              htmlFor="project-title"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Título del Proyecto (3-120 caracteres)
            </label>
            <input
              id="project-title"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Albergue Infantil San Juan de Dios - Campaña de Invierno"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Descripción de la Causa (10-2000 caracteres)
            </label>
            <textarea
              id="project-description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa el objetivo social, la población beneficiaria y el destino de los fondos..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 leading-relaxed"
            />
          </div>

          <div>
            <label
              htmlFor="project-goal"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Meta de Recaudación en Soles (PEN)
            </label>
            <div className="relative rounded-xl shadow-sm max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-semibold text-sm">
                S/
              </div>
              <input
                id="project-goal"
                type="number"
                min={100}
                max={1000000}
                step={1}
                required
                value={goalSoles || ''}
                onChange={(e) => setGoalSoles(parseInt(e.target.value, 10) || 0)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-semibold"
                placeholder="5000"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Rango válido: S/ 100.00 a S/ 1,000,000.00
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-xl text-sm shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Guardando borrador en DynamoDB...' : 'Crear Proyecto en Borrador'}
          </button>
        </form>
      </div>

      {/* Projects Created in Current Session */}
      {createdProjects.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Proyectos Gestionados en Esta Sesión</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {createdProjects.map((p) => (
              <div key={p.projectId} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        p.status === 'PUBLICADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">ID: {p.projectId}</p>
                  <p className="text-xs text-emerald-700 font-semibold">
                    Meta:{' '}
                    {(p.goalAmountCents / 100).toLocaleString('es-PE', {
                      style: 'currency',
                      currency: 'PEN',
                    })}
                  </p>
                </div>

                <div>
                  {p.status === 'BORRADOR' ? (
                    <button
                      onClick={() => handlePublish(p.projectId)}
                      disabled={publishingId === p.projectId}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      {publishingId === p.projectId ? 'Publicando...' : 'Publicar Ahora'}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Publicado en Catálogo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
