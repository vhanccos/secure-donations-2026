import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

const TestAuthConsumer: React.FC = () => {
  const { user, isAuthenticated, loginAsDemoUser, logout, accessToken } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      <div data-testid="user-role">{user ? user.primaryRole : 'NONE'}</div>
      <div data-testid="user-email">{user ? user.email : 'NONE'}</div>
      <div data-testid="has-token">{accessToken ? 'YES' : 'NO'}</div>
      <button onClick={() => loginAsDemoUser('DONANTE')}>Login Donante</button>
      <button onClick={() => loginAsDemoUser('GESTOR')}>Login Gestor</button>
      <button onClick={() => loginAsDemoUser('AUDITOR')}>Login Auditor</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('NIST SP 800-207 Zero Trust In-Memory Token Management', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('enforces Storage Purge Guard on mount to remove accidental storage tokens', async () => {
    // Seed illicit tokens into storage
    window.localStorage.setItem('accessToken', 'illicit_token');
    window.sessionStorage.setItem('accessToken', 'illicit_token');
    window.localStorage.setItem('idToken', 'illicit_id_token');

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Guard must actively purge illicit keys
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('idToken')).toBeNull();
  });

  it('keeps tokens exclusively in volatile memory and NEVER writes to localStorage/sessionStorage', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('ANONYMOUS');
    expect(window.localStorage.getItem('accessToken')).toBeNull();

    // Authenticate as Donante demo user
    await act(async () => {
      screen.getByText('Login Donante').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');
    expect(screen.getByTestId('user-role')).toHaveTextContent('DONANTE');
    expect(screen.getByTestId('has-token')).toHaveTextContent('YES');

    // CRITICAL ZERO TRUST ASSERTION:
    // Neither localStorage nor sessionStorage may ever hold tokens
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.sessionStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('idToken')).toBeNull();
    expect(window.sessionStorage.getItem('idToken')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
    expect(window.sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('properly clears volatile in-memory state on logout', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Login Gestor').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('AUTHENTICATED');
    expect(screen.getByTestId('user-role')).toHaveTextContent('GESTOR');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('ANONYMOUS');
    expect(screen.getByTestId('user-role')).toHaveTextContent('NONE');
    expect(screen.getByTestId('has-token')).toHaveTextContent('NO');
    expect(window.localStorage.getItem('accessToken')).toBeNull();
  });
});
