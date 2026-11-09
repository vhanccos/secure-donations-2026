import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AcademicSimulationBanner } from '../components/layout/AcademicSimulationBanner';

describe('Persistent Academic Simulation Banner', () => {
  it('renders the banner as an accessible role="alert" landmark', () => {
    render(<AcademicSimulationBanner />);
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
  });

  it('contains the verbatim academic simulation warning text', () => {
    render(<AcademicSimulationBanner />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('ENTORNO DE SIMULACIÓN ACADÉMICA');
    expect(banner).toHaveTextContent(
      'Las donaciones son estrictamente simuladas para fines pedagógicos (UNSA). No se transfieren fondos reales, no ingrese datos de tarjetas ni información bancaria.'
    );
  });

  it('contains the NIST SP 800-207 and STAGE badges', () => {
    render(<AcademicSimulationBanner />);
    expect(screen.getByText('NIST SP 800-207')).toBeInTheDocument();
    expect(screen.getByText('STAGE: ACADEMIC')).toBeInTheDocument();
  });
});
