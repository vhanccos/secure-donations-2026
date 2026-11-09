export type Role = 'DONANTE' | 'GESTOR' | 'AUDITOR';

export interface UserClaims {
  sub: string;
  email?: string;
  groups: Role[];
  primaryRole: Role | 'INVITADO';
  scopes: string[];
  amr?: string[];
  exp: number;
}

export type AuthUser = UserClaims;

export interface InMemTokens {
  accessToken: string;
  idToken: string;
  expiresAt: number;
}

export interface DirectAuthStep1Result {
  step: 'COMPLETED' | 'MFA_CHALLENGE';
  session?: string;
  challengeName?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}

export interface AuthContextType {
  user: UserClaims | null;
  accessToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  startDirectLogin: (email: string, pass: string) => Promise<DirectAuthStep1Result>;
  confirmMfaTotp: (email: string, session: string, code: string) => Promise<void>;
  loginWithCognitoOAuth: () => Promise<void>;
  loginAsDemoUser: (role: Role) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
