import React, { useEffect, useState } from 'react';
import { getPublicProjects } from '../services/projects.service';
import { Project } from '../types/project';
import { ProjectCard } from '../components/projects/ProjectCard';
import { Search, HeartHandshake, AlertCircle, RefreshCw } from 'lucide-react';

export const ProjectCatalogPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicProjects();
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los proyectos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-8 sm:p-12 shadow-md relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700/60 text-emerald-200 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
            <HeartHandshake className="w-3.5 h-3.5" />
            Causas Sociales de Arequipa
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Apoya Proyectos Solidarios con Transparencia Total
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Plataforma de donaciones seguras de la Fundación AQP-SOLIDARIA bajo el modelo Zero Trust.
            Todas las operaciones se auditan de forma estructurada e inmutable.
          </p>
        </div>
      </section>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Catálogo de Proyectos Activos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mostrando exclusivamente proyectos en estado <span className="font-semibold text-emerald-700">PUBLICADO</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proyectos..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>
          <button
            onClick={loadProjects}
            aria-label="Recargar proyectos"
            className="p-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition cursor-pointer"
            title="Actualizar catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* State Rendering */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-1/2 pt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">Error al consultar el catálogo</h3>
            <p className="text-sm text-rose-700 mt-1">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No hay proyectos disponibles en este momento</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Actualmente no existen campañas publicadas que coincidan con su búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.projectId} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};
