import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectProgressBar } from '../components/projects/ProjectProgressBar';
import { ProjectCatalogPage } from '../pages/ProjectCatalogPage';
import * as projectsService from '../services/projects.service';
import { Project } from '../types/project';

const mockProjects: Project[] = [
  {
    projectId: 'proj-1',
    title: 'Comedor Popular San Martín',
    description: 'Apoyo nutricional para familias vulnerables del distrito de Socabaya en Arequipa.',
    goalAmountCents: 500000,
    confirmedAmountCents: 150000,
    percentageCompleted: 30,
    status: 'PUBLICADO',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    projectId: 'proj-2',
    title: 'Kits Escolares Paucarpata',
    description: 'Útiles y material educativo para estudiantes de escasos recursos.',
    goalAmountCents: 200000,
    confirmedAmountCents: 200000,
    percentageCompleted: 100,
    status: 'PUBLICADO',
    createdAt: '2026-11-02T10:00:00Z',
  },
];

describe('Public Project Catalog & Progress Components (HU-01, HU-02, HU-09)', () => {
  it('renders ProjectProgressBar with proper Soles currency formatting and progress width', () => {
    render(
      <ProjectProgressBar
        goalAmountCents={500000}
        confirmedAmountCents={250000}
        percentageCompleted={50}
      />
    );

    expect(screen.getByText(/50% financiado/i)).toBeInTheDocument();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders ProjectCard with title, description, and action buttons', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={mockProjects[0]} />
      </MemoryRouter>
    );

    expect(screen.getByText('Comedor Popular San Martín')).toBeInTheDocument();
    expect(
      screen.getByText(/Apoyo nutricional para familias vulnerables/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver detalles/i })).toHaveAttribute(
      'href',
      '/projects/proj-1'
    );
    expect(screen.getByRole('link', { name: /donar/i })).toHaveAttribute(
      'href',
      '/donate/proj-1'
    );
  });

  it('renders catalog grid with projects returned from service', async () => {
    vi.spyOn(projectsService, 'getPublicProjects').mockResolvedValue(mockProjects);

    await act(async () => {
      render(
        <MemoryRouter>
          <ProjectCatalogPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Comedor Popular San Martín')).toBeInTheDocument();
    expect(screen.getByText('Kits Escolares Paucarpata')).toBeInTheDocument();
  });

  it('renders friendly empty state when 0 published projects exist', async () => {
    vi.spyOn(projectsService, 'getPublicProjects').mockResolvedValue([]);

    await act(async () => {
      render(
        <MemoryRouter>
          <ProjectCatalogPage />
        </MemoryRouter>
      );
    });

    expect(
      screen.getByText('No hay proyectos disponibles en este momento')
    ).toBeInTheDocument();
  });
});
