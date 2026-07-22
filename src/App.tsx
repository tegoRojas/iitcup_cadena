import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  LogOut,
  FolderOpen,
  Users,
  Activity,
  LayoutDashboard
} from 'lucide-react';
import { User, Rol } from './types';
import { getStoredUser, getStoredToken, isOnline, api } from './lib/api';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OfflineIndicator from './components/OfflineIndicator';

// View Modules
import DashboardView from './components/DashboardView';
import CadenasView from './components/CadenasView';
import CadenaDetailView from './components/CadenaDetailView';
import UsersView from './components/UsersView';
import SpecialtiesView from './components/SpecialtiesView';
import AuditView from './components/AuditView';

export default function App() {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [loading, setLoading] = useState(false);

  // Shell Layout State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedChainCode, setSelectedChainCode] = useState<string | null>(null);

  // Login Form State
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Verify auth on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess(false);

    if (!usuario || !contrasena) {
      setLoginError('Por favor ingrese su usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas.');
      }

      // Save to localStorage
      localStorage.setItem('iitcup_token', data.token);
      localStorage.setItem('iitcup_user', JSON.stringify(data.user));

      setLoginSuccess(true);
      
      setTimeout(() => {
        setToken(data.token);
        setUser(data.user);
        setActiveTab('dashboard');
        setLoading(false);
      }, 1000);

    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con el servidor.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('iitcup_token');
    localStorage.removeItem('iitcup_user');
    setToken(null);
    setUser(null);
    setSelectedChainCode(null);
    setUsuario('');
    setContrasena('');
    setLoginSuccess(false);
  };

  // Render main content module based on active tab and role checks
  const renderContent = () => {
    if (!user) return null;

    // Check specific selected item first (drill down detail view)
    if (selectedChainCode) {
      return (
        <CadenaDetailView 
          codigo={selectedChainCode} 
          user={user} 
          onBack={() => setSelectedChainCode(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView user={user} />;
      
      case 'cadenas':
        return (
          <CadenasView 
            userRol={user.rol} 
            userId={user.id}
            userNombreCompleto={`${user.nombre} ${user.apellidos}`}
            onSelectChain={(codigo) => setSelectedChainCode(codigo)} 
          />
        );
      
      case 'usuarios':
        if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') return <DashboardView user={user} />;
        return <UsersView currentUser={user} />;
      
      case 'especialidades':
        if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') return <DashboardView user={user} />;
        return <SpecialtiesView currentUser={user} />;
      
      case 'auditoria':
        if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') return <DashboardView user={user} />;
        return <AuditView />;
      
      default:
        return <DashboardView user={user} />;
    }
  };

  // -------------------------------------------------------------
  // RENDERING LANDING LOGIN SCREEN
  // -------------------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background decorative shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-olivo-100/40 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-oro-600/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Login container Card */}
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
          {/* Brand/Shield Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex bg-olivo-100 p-4 rounded-2xl text-olivo-900 border border-slate-200/50 shadow-sm">
              <Shield className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="title-font font-extrabold text-lg md:text-xl text-slate-800 tracking-tight leading-tight">
                SISTEMA CADENA DE CUSTODIA
              </h1>
              <p className="text-xs text-oro-600 font-extrabold tracking-widest uppercase">
                IITCUP - SANTA CRUZ
              </p>
              <p className="text-[10px] text-slate-500 font-semibold max-w-xs mx-auto">
                Instituto de Investigaciones Técnico Científicas de la Universidad Policial
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {loginSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
                <span>Autenticación exitosa. Cargando sistema...</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block pl-1">Usuario</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="text" 
                  placeholder="Ingrese su usuario"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  disabled={loading || loginSuccess}
                  className="w-full bg-[#F7F9FC] border border-slate-200 focus:border-olivo-900 focus:ring-1 focus:ring-olivo-900 text-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block pl-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  disabled={loading || loginSuccess}
                  className="w-full bg-[#F7F9FC] border border-slate-200 focus:border-olivo-900 focus:ring-1 focus:ring-olivo-900 text-slate-800 rounded-xl pl-11 pr-10 py-3 text-xs font-bold focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-3 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading || loginSuccess}
              className="w-full bg-olivo-900 hover:bg-olivo-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs tracking-wider transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </form>

          {/* Footer credentials check alert */}
          <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400 leading-relaxed font-semibold">
            <span>Acceso restringido únicamente para personal autorizado del IITCUP.</span>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-slate-500 font-normal">
              <span>Admin: <strong className="text-slate-600 font-bold">admin / admin123</strong></span>
              <span>•</span>
              <span>Encargado: <strong className="text-slate-600 font-bold">encargado1 / password123</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING MAIN APP FRAMEWORK (Desktop + Sidebar + PWA Support)
  // -------------------------------------------------------------
  return (
    <div className="app-viewport">
      {/* Offline sync alert banner */}
      <OfflineIndicator />

      <div className="flex flex-1 overflow-hidden">
        {/* Side panel navigational bar */}
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setSelectedChainCode(null);
            setActiveTab(tab);
          }} 
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onLogout={handleLogout}
        />

        {/* Main core panel */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* Top banner header */}
          <Header 
            user={user} 
            setSidebarCollapsed={setSidebarCollapsed} 
            sidebarCollapsed={sidebarCollapsed} 
          />

          {/* Core content scrolling container */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
