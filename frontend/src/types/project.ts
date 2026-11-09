export type ProjectStatus = 'BORRADOR' | 'PUBLICADO';

export interface Project {
  projectId: string;
  title: string;
  description: string;
  goalAmountCents: number;
  goalAmountFormatted?: string;
  status: ProjectStatus;
  confirmedAmountCents?: number;
  confirmedAmountFormatted?: string;
  percentageCompleted?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectStats {
  projectId: string;
  currency: string;
  goalAmountCents: number;
  confirmedAmountCents: number;
  percentageCompleted: number;
  goalAmountFormatted: string;
  confirmedAmountFormatted: string;
  status: string;
}

export interface CreateProjectInput {
  title: string;
  description: string;
  goalAmountCents: number;
}
