import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, KeyRound, AlertTriangle, CheckCircle, ArrowRight, X, UserCheck } from 'lucide-react';
import { Role } from '../../types/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    startDirectLogin,
    confirmMfaTotp,
    loginWithCognitoOAuth,
    loginAsDemoUser,
    isLoading,
    authError,
    clearError,
  } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaSession, setMfaSession] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setPassword('');
      setTotpCode('');
      setMfaSession('');
      setLocalError(null);
      clearError();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      const res = await startDirectLogin(email, password);
      if (res.step === 'MFA_CHALLENGE' && res.session) {
        setMfaSession(res.session);
        setStep(2);
      } else {
        onClose();
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
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código TOTP incorrecto';
      setLocalError(msg);
    }
  };

  const handleDemoClick = async (role: Role) => {
    setLocalError(null);
    try {
      await loginAsDemoUser(role);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en inicio de sesión demo';
      setLocalError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 id="login-modal-title" className="text-lg font-bold">
                Autenticación Segura Zero Trust
              </h3>
              <p className="text-xs text-slate-300">Amazon Cognito + NIST SP 800-207</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {(localError || authError) && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Credentials */
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                >
                  Correo Electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@aqp-solidaria.org"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                >
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Verificando...' : 'Paso 1: Validar Credenciales'}
              </button>

              <div className="relative my-3 text-center">
                <span className="bg-white px-2 text-xs text-slate-400">O use SSO con Scopes API</span>
              </div>

              <button
                type="button"
                onClick={loginWithCognitoOAuth}
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                Iniciar Sesión vía Cognito OAuth (SSO)
              </button>

              {/* Quick Demo Switcher */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acceso Rápido para Demostración Académica:</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoClick('DONANTE')}
                    disabled={isLoading}
                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg text-center transition cursor-pointer"
                  >
                    Donante
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('GESTOR')}
                    disabled={isLoading}
                    className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg text-center transition cursor-pointer"
                  >
                    Gestor (MFA)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('AUDITOR')}
                    disabled={isLoading}
                    className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg text-center transition cursor-pointer"
                  >
                    Auditor (MFA)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: TOTP Code */
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Desafío Multi-Factor Requerido (MFA TOTP)</p>
                  <p className="mt-0.5">
                    Este rol administrativo (GESTOR/AUDITOR) requiere verificación TOTP (RFC 6238) bajo el modelo Zero Trust.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="totp-code-input"
                  className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                >
                  Código TOTP de 6 Dígitos
                </label>
                <input
                  id="totp-code-input"
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
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
