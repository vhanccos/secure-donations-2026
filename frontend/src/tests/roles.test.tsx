import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

const ProtectedContent: React.FC = () => <div>CONTENIDO_PROTEGIDO_GESTOR</div>;

const RoleTestBench: React.FC = () => {
  const { loginAsDemoUser } = useAuth();
  return (
    <div>
      <button onClick={() => loginAsDemoUser('DONANTE')}>Login Donante</button>
      <button onClick={() => loginAsDemoUser('GESTOR')}>Login Gestor</button>
      <div data-testid="protected-zone">
        <ProtectedRoute allowedRoles={['GESTOR']}>
          <ProtectedContent />
        </ProtectedRoute>
      </div>
    </div>
  );
};

describe('Role-Based Access Control (RBAC) & ProtectedRoute Guards', () => {
  it('redirects unauthenticated users attempting to access protected routes', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/projects']}>
          <Routes>
            <Route
              path="/admin/projects"
              element={
                <ProtectedRoute allowedRoles={['GESTOR']}>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    // Should redirect to /login
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO_PROTEGIDO_GESTOR')).toBeNull();
  });

  it('renders HTTP 403 Forbidden when authenticated user lacks the required role', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <RoleTestBench />
        </MemoryRouter>
      </AuthProvider>
    );

    // Authenticate as DONANTE
    await act(async () => {
      screen.getByText('Login Donante').click();
    });

    // DONANTE attempting to access GESTOR route must receive 403
    expect(screen.getByText('HTTP 403 Forbidden')).toBeInTheDocument();
    expect(screen.getByText('Acceso No Autorizado')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO_PROTEGIDO_GESTOR')).toBeNull();
  });

  it('allows access when authenticated user has the required role', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <RoleTestBench />
        </MemoryRouter>
      </AuthProvider>
    );

    // Authenticate as GESTOR
    await act(async () => {
      screen.getByText('Login Gestor').click();
    });

    // Content should now be visible
    expect(screen.getByText('CONTENIDO_PROTEGIDO_GESTOR')).toBeInTheDocument();
    expect(screen.queryByText('HTTP 403 Forbidden')).toBeNull();
  });
});
