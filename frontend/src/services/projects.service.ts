import { apiRequest } from './apiClient';
import { Project, ProjectStats, CreateProjectInput } from '../types/project';
import { ApiResponse } from '../types/api';

export async function getPublicProjects(): Promise<Project[]> {
  const res = await apiRequest<ApiResponse<Project[]>>('/v1/projects', {
    method: 'GET',
  });
  return res.data || [];
}

export async function getProjectById(projectId: string): Promise<Project> {
  const res = await apiRequest<ApiResponse<Project>>(`/v1/projects/${projectId}`, {
    method: 'GET',
  });
  return res.data;
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const res = await apiRequest<ApiResponse<ProjectStats>>(`/v1/projects/${projectId}/stats`, {
    method: 'GET',
  });
  return res.data;
}

export async function createProject(
  input: CreateProjectInput,
  accessToken: string
): Promise<Project> {
  const res = await apiRequest<ApiResponse<Project>>('/v1/projects', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function publishProject(
  projectId: string,
  accessToken: string
): Promise<Project> {
  const res = await apiRequest<ApiResponse<Project>>(`/v1/projects/${projectId}/publish`, {
    method: 'PATCH',
    accessToken,
  });
  return res.data;
}
