import React, { useState, useEffect } from 'react';
import { Bell, User, Menu, Wifi, WifiOff, Check, AlertCircle } from 'lucide-react';
import { User as UserType, Notificacion } from '../types';
import { api, isOnline } from '../lib/api';

interface HeaderProps {
  user: UserType;
  setSidebarCollapsed: (col: boolean) => void;
  sidebarCollapsed: boolean;
}

export default function Header({ user, setSidebarCollapsed, sidebarCollapsed }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [online, setOnline] = useState(isOnline());

  const fetchNotifications = async () => {
    try {
      if (isOnline()) {
        const data = await api.getNotificaciones();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    const handleConn = () => setOnline(isOnline());
    window.addEventListener('online', handleConn);
    window.addEventListener('offline', handleConn);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleConn);
      window.removeEventListener('offline', handleConn);
    };
  }, []);

  const handleMarkAsRead = async () => {
    try {
      if (isOnline()) {
        await api.markNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.leida).length;

  return (
    <header className="bg-olivo-900 text-white h-16 flex items-center justify-between px-6 shadow-md shrink-0 relative z-10">
      {/* Mobile Menu trigger & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="text-slate-300 hover:text-white focus:outline-none transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="title-font font-extrabold text-base md:text-lg text-white leading-tight tracking-tight">
            IITCUP Santa Cruz
          </h1>
          <span className="text-[9px] uppercase tracking-widest text-oro-600 font-extrabold mt-0.5">
            Gestión de Cadena de Custodia
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Connection Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${
          online 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {online ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>SISTEMA EN LÍNEA</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              <span>TRABAJANDO SIN CONEXIÓN</span>
            </>
          )}
        </div>

        {/* Notifications Icon with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full relative transition focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-olivo-900 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-slate-800 animate-fade-in">
              <div className="bg-[#F7F9FC] border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800">Notificaciones Recientes</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAsRead}
                    className="text-[10px] text-olivo-900 hover:text-olivo-800 font-extrabold flex items-center gap-1 focus:outline-none"
                  >
                    <Check className="w-3 h-3" />
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                    No tienes notificaciones pendientes.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3.5 transition-colors ${n.leida ? 'bg-white' : 'bg-olivo-100/30'}`}
                    >
                      <div className="flex gap-2.5 items-start">
                        <div className={`p-1.5 rounded-full shrink-0 ${n.leida ? 'bg-slate-100 text-slate-400' : 'bg-olivo-100 text-olivo-900'}`}>
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-xs text-slate-800 truncate">{n.titulo}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block font-medium">
                            {new Date(n.fecha).toLocaleString('es-BO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Quick Info */}
        <div className="flex items-center gap-2.5 border-l border-white/10 pl-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="font-bold text-xs text-white leading-none">
              {user.nombre} {user.apellidos.split(' ')[0]}
            </span>
            <span className="text-[9px] font-extrabold text-oro-600 mt-1 uppercase tracking-wider">
              {user.rol}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center font-extrabold text-xs border border-oro-600/40 shadow-inner">
            <User className="w-4 h-4 text-slate-200" />
          </div>
        </div>
      </div>
    </header>
  );
}
