import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Cpu,
  LogIn,
  LogOut,
  Menu,
  X,
  Heart,
  FolderPlus,
  FileSearch,
  User,
} from 'lucide-react';
import { LoginModal } from '../auth/LoginModal';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="p-2 bg-emerald-600 group-hover:bg-emerald-500 rounded-xl transition shadow-md">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white block">
                    Fundación AQP-SOLIDARIA
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 block -mt-1 font-mono">
                    Zero Trust · NIST SP 800-207
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                  isActive('/')
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                Proyectos
              </Link>

              {/* Donor Link */}
              {(!user || user.groups.includes('DONANTE')) && (
                <Link
                  to="/my-donations"
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive('/my-donations')
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  Mis Donaciones
                </Link>
              )}

              {/* Gestor Link */}
              {user?.groups.includes('GESTOR') && (
                <Link
                  to="/admin/projects"
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive('/admin/projects')
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                  Gestión Proyectos
                </Link>
              )}

              {/* Auditor Link */}
              {user?.groups.includes('AUDITOR') && (
                <Link
                  to="/audit"
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5 ${
                    isActive('/audit')
                      ? 'bg-slate-800 text-amber-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                  Auditoría
                </Link>
              )}
            </nav>

            {/* In-Memory Badge & Auth Section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Zero Storage Memory Badge */}
              <div
                title="Tokens almacenados exclusivamente en memoria volátil de React (RNF-HU-11)"
                className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>In-Memory Tokens</span>
              </div>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white max-w-[150px] truncate">
                      {user.email || user.sub}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wide uppercase ${
                          user.primaryRole === 'GESTOR'
                            ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
                            : user.primaryRole === 'AUDITOR'
                            ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                            : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                        }`}
                      >
                        {user.primaryRole}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    aria-label="Cerrar sesión"
                    className="p-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-lg transition border border-slate-700"
                    title="Cerrar Sesión (Purgar memoria)"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-semibold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </button>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Abrir menú"
                className="p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 px-4 pt-3 pb-4 space-y-2 bg-slate-900">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive('/') ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
              }`}
            >
              Proyectos
            </Link>

            {(!user || user.groups.includes('DONANTE')) && (
              <Link
                to="/my-donations"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive('/my-donations') ? 'bg-slate-800 text-emerald-400' : 'text-slate-300'
                }`}
              >
                Mis Donaciones
              </Link>
            )}

            {user?.groups.includes('GESTOR') && (
              <Link
                to="/admin/projects"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive('/admin/projects') ? 'bg-slate-800 text-indigo-400' : 'text-slate-300'
                }`}
              >
                Gestión Proyectos
              </Link>
            )}

            {user?.groups.includes('AUDITOR') && (
              <Link
                to="/audit"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive('/audit') ? 'bg-slate-800 text-amber-400' : 'text-slate-300'
                }`}
              >
                Auditoría
              </Link>
            )}

            <div className="pt-3 border-t border-slate-800">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{user.email || user.sub}</p>
                    <span className="text-[10px] text-emerald-400 font-mono uppercase">
                      Rol: {user.primaryRole}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-1.5 bg-rose-900/60 text-rose-200 border border-rose-700 rounded-lg text-xs font-medium"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};
