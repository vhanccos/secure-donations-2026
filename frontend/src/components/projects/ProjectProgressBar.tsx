import React from 'react';

interface ProjectProgressBarProps {
  goalAmountCents: number;
  confirmedAmountCents: number;
  percentageCompleted?: number;
}

export const ProjectProgressBar: React.FC<ProjectProgressBarProps> = ({
  goalAmountCents,
  confirmedAmountCents,
  percentageCompleted,
}) => {
  const goalSoles = (goalAmountCents / 100).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
  });
  const confirmedSoles = (confirmedAmountCents / 100).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
  });

  const percent =
    percentageCompleted !== undefined
      ? Math.min(percentageCompleted, 100)
      : goalAmountCents > 0
      ? Math.min(Math.round((confirmedAmountCents / goalAmountCents) * 100), 100)
      : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold text-emerald-700">{confirmedSoles} recaudados</span>
        <span className="text-slate-500">Meta: {goalSoles}</span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="text-right">
        <span className="text-[11px] font-medium text-slate-500">{percent}% financiado</span>
      </div>
    </div>
  );
};
