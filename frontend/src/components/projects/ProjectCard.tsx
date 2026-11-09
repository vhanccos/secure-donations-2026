import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../../types/project';
import { ProjectProgressBar } from './ProjectProgressBar';
import { ArrowRight, Heart } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 line-clamp-1">
            {project.title}
          </h3>
          <p className="text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
            {project.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <ProjectProgressBar
            goalAmountCents={project.goalAmountCents}
            confirmedAmountCents={project.confirmedAmountCents || 0}
            percentageCompleted={project.percentageCompleted}
          />
        </div>
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          to={`/projects/${project.projectId}`}
          className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1 transition"
        >
          <span>Ver detalles</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to={`/donate/${project.projectId}`}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Donar</span>
        </Link>
      </div>
    </article>
  );
};
