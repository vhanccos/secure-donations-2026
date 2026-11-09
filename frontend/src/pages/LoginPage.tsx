import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import {
  Shield,
  Lock,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Cpu,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    startDirectLogin,
    confirmMfaTotp,
    loginWithCognitoOAuth,
    loginAsDemoUser,
    isLoading,
    authError,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaSession, setMfaSession] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // If already authenticated, redirect
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      const res = await startDirectLogin(email, password);
      if (res.step === 'MFA_CHALLENGE' && res.session) {
        setMfaSession(res.session);
        setStep(2);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciales inválidas';
      setLocalError(msg);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await confirmMfaTotp(email, mfaSession, totpCode);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código TOTP incorrecto';
      setLocalError(msg);
    }
  };

  const handleDemoLogin = async (role: Role) => {
    setLocalError(null);
    try {
      await loginAsDemoUser(role);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en inicio de sesión demo';
      setLocalError(msg);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Iniciar Sesión</h1>
          <p className="text-xs text-slate-300">
            Plataforma Zero Trust · Fundación AQP-SOLIDARIA
          </p>
          <div className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400">
            <Cpu className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Almacenamiento 100% en Memoria (RNF-HU-11)</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {(localError || authError) && (
            <div
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Credentials */
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label
                  htmlFor="full-login-email"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Correo Electrónico
                </label>
                <input
                  id="full-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@aqp-solidaria.org"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="full-login-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Contraseña
                </label>
                <input
                  id="full-login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Verificando credenciales...' : 'Paso 1: Validar Credenciales'}
              </button>

              <div className="relative my-4 text-center">
                <span className="bg-white px-2 text-xs text-slate-400">O use SSO con Scopes API</span>
              </div>

              <button
                type="button"
                onClick={loginWithCognitoOAuth}
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                Iniciar Sesión vía Cognito OAuth (SSO)
              </button>

              {/* Demo Switcher */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-3 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acceso Rápido para Demostración Académica:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('DONANTE')}
                    disabled={isLoading}
                    className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                  >
                    Donante
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('GESTOR')}
                    disabled={isLoading}
                    className="py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                  >
                    Gestor (MFA)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('AUDITOR')}
                    disabled={isLoading}
                    className="py-2 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl text-center transition cursor-pointer"
                  >
                    Auditor (MFA)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Step 2: TOTP */
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
                <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Desafío Multi-Factor Requerido (MFA TOTP)</p>
                  <p className="mt-1">
                    Los roles privilegiados (GESTOR / AUDITOR) tienen MFA obligatorio (RFC 6238). Ingrese el código generado por su aplicación autenticadora.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="full-totp-input"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Código TOTP de 6 Dígitos
                </label>
                <input
                  id="full-totp-input"
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-3xl font-mono py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isLoading ? 'Validando...' : 'Completar Acceso'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
