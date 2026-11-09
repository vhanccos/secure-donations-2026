import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById, getProjectStats } from '../services/projects.service';
import { Project, ProjectStats } from '../types/project';
import { ProjectProgressBar } from '../components/projects/ProjectProgressBar';
import { ProjectStatusBadge } from '../components/projects/ProjectStatusBadge';
import {
  Heart,
  ArrowLeft,
  Calendar,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  FileText,
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setNotFound(false);
      setErrorMessage(null);
      try {
        const [projData, statsData] = await Promise.all([
          getProjectById(projectId),
          getProjectStats(projectId).catch(() => null),
        ]);

        if (!projData || projData.status !== 'PUBLICADO') {
          setNotFound(true);
        } else {
          setProject(projData);
          setStats(statsData);
        }
      } catch (err: any) {
        if (err.status === 404 || err.code === 'NOT_FOUND') {
          setNotFound(true);
        } else {
          setErrorMessage(err.message || 'Error al cargar los detalles del proyecto');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Cargando detalles del proyecto...</p>
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider">
          HTTP 404 Not Found
        </span>
        <h2 className="text-2xl font-bold text-slate-900">Proyecto no encontrado</h2>
        <p className="text-sm text-slate-600">
          El proyecto solicitado no existe o no se encuentra disponible públicamente en este momento.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-rose-50 border border-rose-200 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-rose-900">Error al cargar el proyecto</h2>
        <p className="text-sm text-rose-700">{errorMessage}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const goalCents = stats?.goalAmountCents ?? project.goalAmountCents;
  const confirmedCents = stats?.confirmedAmountCents ?? project.confirmedAmountCents ?? 0;
  const percentCompleted = stats?.percentageCompleted ?? project.percentageCompleted ?? 0;

  const formattedCreated = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Reciente';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a todos los proyectos
        </Link>
      </div>

      {/* Main Detail Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProjectStatusBadge status={project.status} />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Publicado: {formattedCreated}</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {project.title}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">ID: {project.projectId}</p>
        </div>

        {/* Progress Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Progreso de Recaudación Solidaria</span>
          </div>
          <ProjectProgressBar
            goalAmountCents={goalCents}
            confirmedAmountCents={confirmedCents}
            percentageCompleted={percentCompleted}
          />
        </div>

        {/* Description */}
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Descripción de la Causa Social
          </h2>
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            {project.description}
          </div>
        </div>

        {/* Action Call to Action */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Protección Zero Trust: La suma acumulada excluye donaciones pendientes o rechazadas.</span>
          </div>

          <Link
            to={`/donate/${project.projectId}`}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
          >
            <Heart className="w-4 h-4" />
            Donar a este Proyecto
          </Link>
        </div>
      </div>
    </div>
  );
};
