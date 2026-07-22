import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Lock,
  LogOut,
  FolderOpen
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, collapsed, setCollapsed, onLogout }: SidebarProps) {
  // Navigation tabs based on User Role
  const menuItems = [
    { id: 'dashboard', label: user.rol === 'SUPERVISOR' ? 'Dashboard Nacional' : 'Dashboard', icon: LayoutDashboard, roles: ['ADMINISTRADOR', 'ENCARGADO', 'PERITO', 'SUPERVISOR'] },
    { id: 'cadenas', label: 'Cadenas de Custodia', icon: FolderOpen, roles: ['ADMINISTRADOR', 'ENCARGADO', 'PERITO', 'SUPERVISOR'] },
    { id: 'usuarios', label: 'Gestión de Usuarios', icon: Users, roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { id: 'especialidades', label: 'Áreas Periciales', icon: FileText, roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { id: 'auditoria', label: 'Auditoría del Sistema', icon: Activity, roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.rol));

  return (
    <aside 
      className={`bg-white text-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-slate-200 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-olivo-100 p-2 rounded-xl text-olivo-900 shadow-sm border border-slate-100 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col select-none">
                <span className="title-font font-extrabold text-sm tracking-tight text-olivo-900 leading-none">IITCUP</span>
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider mt-0.5">{user.rol === 'SUPERVISOR' ? 'NIVEL NACIONAL' : 'SANTA CRUZ'}</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Info Capsule */}
        {!collapsed && (
          <div className="p-4 mx-3 my-4 bg-[#F7F9FC] rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-olivo-100 text-olivo-900 flex items-center justify-center font-extrabold text-sm border border-slate-200/50">
                {user.nombre[0]}{user.apellidos[0]}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs text-slate-800 truncate">{user.nombre} {user.apellidos}</h4>
                <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">{user.cargo}</p>
                <span className={`inline-block mt-1.5 text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                  user.rol === 'ADMINISTRADOR' ? 'bg-red-50 text-red-700 border border-red-200/50' :
                  user.rol === 'ENCARGADO' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {user.rol}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menus */}
        <nav className="px-3 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive 
                    ? 'bg-olivo-100 text-olivo-900 shadow-sm border border-olivo-100/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-olivo-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-rose-600" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
