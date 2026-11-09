import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AcademicSimulationBanner } from '../components/layout/AcademicSimulationBanner';

describe('Persistent Academic Simulation Banner', () => {
  it('renders nothing when banner is disabled', () => {
    const { container } = render(<AcademicSimulationBanner />);
    expect(container.firstChild).toBeNull();
  });
});
