import React from 'react';
import { ProjectStatus } from '../../types/project';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status }) => {
  if (status === 'PUBLICADO') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        PUBLICADO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
      BORRADOR
    </span>
  );
};
