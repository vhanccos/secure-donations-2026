import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AuthContextType,
  UserClaims,
  Role,
  DirectAuthStep1Result,
  InMemTokens,
} from '../types/auth';
import {
  loginStep1Credentials,
  loginStep2VerifyMfa,
} from '../services/cognitoAuth';
import {
  generatePkcePair,
  buildCognitoAuthorizeUrl,
  exchangeOAuthCode,
  refreshAccessToken,
} from '../services/oauthPkce';
import { AUTHENTIC_DEMO_TOKENS } from '../services/demoTokens';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractUserClaims(accessToken: string, idToken?: string | null): UserClaims {
  const accessPayload = (parseJwt(accessToken) || {}) as Record<string, unknown>;
  const idPayload = (idToken ? parseJwt(idToken) : null) || {};

  const rawGroups =
    (accessPayload['cognito:groups'] as unknown) ||
    (idPayload['cognito:groups'] as unknown) ||
    [];

  const groupsList = (Array.isArray(rawGroups) ? rawGroups : [rawGroups])
    .map((g) => String(g).toUpperCase())
    .filter((g): g is Role => ['DONANTE', 'GESTOR', 'AUDITOR'].includes(g as Role));

  let primaryRole: Role | 'INVITADO' = 'INVITADO';
  if (groupsList.includes('GESTOR')) primaryRole = 'GESTOR';
  else if (groupsList.includes('AUDITOR')) primaryRole = 'AUDITOR';
  else if (groupsList.includes('DONANTE')) primaryRole = 'DONANTE';

  const scopeStr = (accessPayload.scope as string) || '';
  const scopes = scopeStr ? scopeStr.split(' ') : [];

  const sub =
    (accessPayload.sub as string) ||
    (idPayload.sub as string) ||
    (accessPayload.username as string) ||
    'anon';

  const email =
    (idPayload.email as string) ||
    (accessPayload.email as string) ||
    (accessPayload.username as string) ||
    undefined;

  const amr = ((idPayload.amr || accessPayload.amr) as string[]) || undefined;
  const exp = ((accessPayload.exp || idPayload.exp || 0) as number);

  return {
    sub,
    email,
    groups: groupsList,
    primaryRole,
    scopes,
    amr,
    exp,
  };
}

// In-memory verifier storage (held in JS closure during redirect, ZERO localStorage)
let inMemoryPkceVerifier: string | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserClaims | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Volatile memory ref for immediate synchronous access and silent refresh
  const tokensRef = useRef<(InMemTokens & { refreshToken?: string }) | null>(null);

  // STORAGE PURGE GUARD (NIST SP 800-207 Zero Trust)
  // Ensures absolutely no tokens enter localStorage or sessionStorage
  useEffect(() => {
    const purgeStorage = () => {
      const sensitiveKeys = [
        'accessToken',
        'idToken',
        'refreshToken',
        'token',
        'jwt',
        'auth',
        'authorization',
        'user',
      ];
      try {
        const localStore = typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage;
        const sessionStore = typeof window !== 'undefined' ? window.sessionStorage : (globalThis as any).sessionStorage;

        for (const k of sensitiveKeys) {
          if (localStore && typeof localStore.getItem === 'function' && localStore.getItem(k) !== null) {
            console.warn(`[Zero Trust Guard] Purged token from localStorage: ${k}`);
            localStore.removeItem(k);
          }
          if (sessionStore && typeof sessionStore.getItem === 'function' && sessionStore.getItem(k) !== null) {
            console.warn(`[Zero Trust Guard] Purged token from sessionStorage: ${k}`);
            sessionStore.removeItem(k);
          }
        }
      } catch {
        // Storage access disallowed in restricted sandbox
      }
    };
    purgeStorage();
  }, []);

  const setAuthenticatedSession = useCallback((access: string, id: string | null, refresh?: string) => {
    tokensRef.current = {
      accessToken: access,
      idToken: id || access,
      expiresAt: Date.now() + 15 * 60 * 1000,
      refreshToken: refresh,
    };
    setAccessToken(access);
    setIdToken(id);
    const claims = extractUserClaims(access, id);
    setUser(claims);
    setAuthError(null);
  }, []);

  // Handle OAuth 2.0 PKCE redirect callback (?code=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setIsLoading(true);
      const verifier = inMemoryPkceVerifier || sessionStorage.getItem('temp_pkce_verifier');
      // Clean up transient nonce immediately
      sessionStorage.removeItem('temp_pkce_verifier');

      if (verifier) {
        exchangeOAuthCode(code, verifier)
          .then((tokens) => {
            setAuthenticatedSession(tokens.accessToken, tokens.idToken, tokens.refreshToken);
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Error en autenticación OAuth';
            setAuthError(msg);
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, [setAuthenticatedSession]);

  const startDirectLogin = useCallback(async (email: string, pass: string): Promise<DirectAuthStep1Result> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await loginStep1Credentials(email, pass);
      if (result.step === 'COMPLETED' && result.accessToken && result.idToken) {
        setAuthenticatedSession(result.accessToken, result.idToken);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar credenciales';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthenticatedSession]);

  const confirmMfaTotp = useCallback(async (email: string, session: string, code: string): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const tokens = await loginStep2VerifyMfa(email, session, code);
      setAuthenticatedSession(tokens.accessToken, tokens.idToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código TOTP incorrecto o expirado';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthenticatedSession]);

  const loginWithCognitoOAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { verifier, challenge } = await generatePkcePair();
      inMemoryPkceVerifier = verifier;
      sessionStorage.setItem('temp_pkce_verifier', verifier);
      const authUrl = buildCognitoAuthorizeUrl(challenge, `state_${Date.now()}`);
      window.location.href = authUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar flujo OAuth';
      setAuthError(msg);
      setIsLoading(false);
    }
  }, []);

  const loginAsDemoUser = useCallback(async (role: Role): Promise<void> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const demoPrincipal = AUTHENTIC_DEMO_TOKENS[role];
      if (demoPrincipal && demoPrincipal.accessToken) {
        // Check if demo token is close to expiry or expired, and refresh if refreshToken is available
        const currentExp = extractUserClaims(demoPrincipal.accessToken).exp;
        const now = Math.floor(Date.now() / 1000);

        if (currentExp && currentExp - now < 120 && demoPrincipal.refreshToken) {
          try {
            console.info(`[AuthContext] Refreshing token for demo role ${role}...`);
            const refreshed = await refreshAccessToken(demoPrincipal.refreshToken);
            demoPrincipal.accessToken = refreshed.accessToken;
            if (refreshed.idToken) {
              demoPrincipal.idToken = refreshed.idToken;
            }
          } catch (refreshErr) {
            console.warn('[AuthContext] Silent refresh failed, falling back to cached token', refreshErr);
          }
        }

        setAuthenticatedSession(demoPrincipal.accessToken, demoPrincipal.idToken, demoPrincipal.refreshToken);
      } else {
        throw new Error(`Credenciales demo no disponibles para el rol ${role}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en login demo';
      setAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [setAuthenticatedSession]);

  const logout = useCallback(() => {
    tokensRef.current = null;
    setAccessToken(null);
    setIdToken(null);
    setUser(null);
    inMemoryPkceVerifier = null;
    setAuthError(null);
    try {
      const localStore = typeof window !== 'undefined' ? window.localStorage : (globalThis as any).localStorage;
      const sessionStore = typeof window !== 'undefined' ? window.sessionStorage : (globalThis as any).sessionStorage;
      if (sessionStore && typeof sessionStore.clear === 'function') {
        sessionStore.clear();
      }
      if (localStore && typeof localStore.clear === 'function') {
        localStore.clear();
      }
    } catch {
      // Storage access disallowed in restricted sandbox
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      idToken,
      isAuthenticated: !!accessToken && !!user,
      isLoading,
      authError,
      startDirectLogin,
      confirmMfaTotp,
      loginWithCognitoOAuth,
      loginAsDemoUser,
      logout,
      clearError,
    }),
    [
      user,
      accessToken,
      idToken,
      isLoading,
      authError,
      startDirectLogin,
      confirmMfaTotp,
      loginWithCognitoOAuth,
      loginAsDemoUser,
      logout,
      clearError,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
