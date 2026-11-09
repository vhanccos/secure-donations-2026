import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/auth/LoginModal';
import { LoginPage } from '../pages/LoginPage';
import * as cognitoAuth from '../services/cognitoAuth';

vi.mock('../services/cognitoAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof cognitoAuth>();
  return {
    ...actual,
    loginStep1Credentials: vi.fn(),
    loginStep2VerifyMfa: vi.fn(),
  };
});

describe('M3 Empirical Challenge: 2-Step TOTP MFA and Storage Purge Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe('Storage Purge Guard & Zero Web Storage Persistence', () => {
    it('purges all illicit keys (accessToken, idToken, refreshToken, jwt, etc.) from localStorage and sessionStorage on mount', () => {
      const illicitKeys = [
        'accessToken',
        'idToken',
        'refreshToken',
        'token',
        'jwt',
        'auth',
        'authorization',
        'user',
      ];

      for (const k of illicitKeys) {
        window.localStorage.setItem(k, `illicit_local_${k}`);
        window.sessionStorage.setItem(k, `illicit_session_${k}`);
      }

      // Also set a non-token benign key to verify selective purge
      window.localStorage.setItem('unrelated_theme', 'dark');

      render(
        <AuthProvider>
          <div>DUMMY_CHILD</div>
        </AuthProvider>
      );

      // Verify all sensitive keys are purged
      for (const k of illicitKeys) {
        expect(window.localStorage.getItem(k)).toBeNull();
        expect(window.sessionStorage.getItem(k)).toBeNull();
      }

      // Non-sensitive key should remain
      expect(window.localStorage.getItem('unrelated_theme')).toBe('dark');
    });
  });

  describe('Two-Step LoginModal Interactive Flow', () => {
    it('presents Step 1 (credentials) initially and hides Step 2 (TOTP)', () => {
      render(
        <AuthProvider>
          <LoginModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      // Step 1 elements visible
      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /paso 1: validar credenciales/i })).toBeInTheDocument();

      // Step 2 elements NOT visible
      expect(screen.queryByLabelText(/código totp/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /completar acceso/i })).toBeNull();
    });

    it('transitions to Step 2 on SOFTWARE_TOKEN_MFA challenge and validates 6-digit TOTP input', async () => {
      const mockClose = vi.fn();

      vi.mocked(cognitoAuth.loginStep1Credentials).mockResolvedValueOnce({
        step: 'MFA_CHALLENGE',
        session: 'mock_mfa_session_token_xyz',
        challengeName: 'SOFTWARE_TOKEN_MFA',
      });

      const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const fakePayload = btoa(
        JSON.stringify({
          sub: 'gestor-uuid-1234',
          'cognito:groups': ['GESTOR'],
          scope: 'api/projects.write',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      );
      const fakeToken = `${fakeHeader}.${fakePayload}.sig`;

      vi.mocked(cognitoAuth.loginStep2VerifyMfa).mockResolvedValueOnce({
        accessToken: fakeToken,
        idToken: fakeToken,
      });

      render(
        <AuthProvider>
          <LoginModal isOpen={true} onClose={mockClose} />
        </AuthProvider>
      );

      // Fill in Step 1 credentials
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'gestor@aqp-solidaria.org' },
      });
      fireEvent.change(screen.getByLabelText(/contraseña/i), {
        target: { value: 'GestorPass#2026' },
      });

      // Submit Step 1
      fireEvent.click(screen.getByRole('button', { name: /paso 1: validar credenciales/i }));

      // Wait for Step 2 to appear
      await waitFor(() => {
        expect(screen.getByText(/desafío multi-factor requerido \(mfa totp\)/i)).toBeInTheDocument();
      });

      const totpInput = screen.getByLabelText(/código totp de 6 dígitos/i);
      expect(totpInput).toBeInTheDocument();

      const completeButton = screen.getByRole('button', { name: /completar acceso/i });
      // Button must be disabled until 6 digits entered
      expect(completeButton).toBeDisabled();

      // Entering non-numeric characters should be filtered out
      fireEvent.change(totpInput, { target: { value: '12abc3' } });
      expect(totpInput).toHaveValue('123');
      expect(completeButton).toBeDisabled();

      // Entering 6 digits
      fireEvent.change(totpInput, { target: { value: '123456' } });
      expect(totpInput).toHaveValue('123456');
      expect(completeButton).toBeEnabled();

      // Submit Step 2
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(cognitoAuth.loginStep2VerifyMfa).toHaveBeenCalledWith(
          'gestor@aqp-solidaria.org',
          'mock_mfa_session_token_xyz',
          '123456'
        );
        expect(mockClose).toHaveBeenCalled();
      });

      // Verify zero tokens leaked to localStorage or sessionStorage after MFA login
      expect(window.localStorage.getItem('accessToken')).toBeNull();
      expect(window.sessionStorage.getItem('accessToken')).toBeNull();
      expect(window.localStorage.getItem('idToken')).toBeNull();
      expect(window.sessionStorage.getItem('idToken')).toBeNull();
    });

    it('maintains Step 2 across parent re-renders and resets back to Step 1 when closed and reopened', async () => {
      vi.mocked(cognitoAuth.loginStep1Credentials).mockResolvedValueOnce({
        step: 'MFA_CHALLENGE',
        session: 'session_keep_step2',
        challengeName: 'SOFTWARE_TOKEN_MFA',
      });

      const { rerender } = render(
        <AuthProvider>
          <LoginModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'gestor@aqp-solidaria.org' },
      });
      fireEvent.change(screen.getByLabelText(/contraseña/i), {
        target: { value: 'GestorPass#2026' },
      });
      fireEvent.click(screen.getByRole('button', { name: /paso 1: validar credenciales/i }));

      await waitFor(() => {
        expect(screen.getByText(/desafío multi-factor requerido \(mfa totp\)/i)).toBeInTheDocument();
      });

      // Re-render modal while still open (e.g. parent state change)
      rerender(
        <AuthProvider>
          <LoginModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      // Step 2 must persist!
      expect(screen.getByLabelText(/código totp de 6 dígitos/i)).toBeInTheDocument();

      // Close modal (isOpen: false)
      rerender(
        <AuthProvider>
          <LoginModal isOpen={false} onClose={() => {}} />
        </AuthProvider>
      );

      // Reopen modal (isOpen: true) -> resets back to Step 1
      rerender(
        <AuthProvider>
          <LoginModal isOpen={true} onClose={() => {}} />
        </AuthProvider>
      );

      expect(screen.getByRole('button', { name: /paso 1: validar credenciales/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/código totp de 6 dígitos/i)).toBeNull();
    });
  });

  describe('Two-Step LoginPage Flow', () => {
    it('properly transitions from Step 1 to Step 2 on SOFTWARE_TOKEN_MFA challenge in full-page mode', async () => {
      vi.mocked(cognitoAuth.loginStep1Credentials).mockResolvedValueOnce({
        step: 'MFA_CHALLENGE',
        session: 'page_session_456',
        challengeName: 'SOFTWARE_TOKEN_MFA',
      });

      render(
        <AuthProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/código totp/i)).toBeNull();

      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'auditor@aqp-solidaria.org' },
      });
      fireEvent.change(screen.getByLabelText(/contraseña/i), {
        target: { value: 'AuditorPass#2026' },
      });

      fireEvent.click(screen.getByRole('button', { name: /paso 1: validar credenciales/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/código totp de 6 dígitos/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/los roles privilegiados \(gestor \/ auditor\) tienen mfa obligatorio/i)).toBeInTheDocument();
    });
  });
});
