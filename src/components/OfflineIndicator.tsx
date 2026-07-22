import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { isOnline, getOfflineQueue, syncOfflineData } from '../lib/api';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const updateStatus = () => {
    setOnline(isOnline());
    setQueueCount(getOfflineQueue().length);
  };

  useEffect(() => {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // Check queue periodically
    const timer = setInterval(() => {
      setQueueCount(getOfflineQueue().length);
    }, 3000);

    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(timer);
    };
  }, []);

  const handleSync = async () => {
    if (!online || queueCount === 0 || syncing) return;
    setSyncing(true);
    setSyncMessage('Iniciando sincronización...');
    try {
      await syncOfflineData((msg) => setSyncMessage(msg));
      setQueueCount(0);
      setTimeout(() => {
        setSyncMessage('');
      }, 4000);
    } catch (e) {
      setSyncMessage('Error en la sincronización. Reintentando...');
    } finally {
      setSyncing(false);
    }
  };

  if (!online) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md animate-pulse">
        <div className="flex items-center gap-2 font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Modo Sin Conexión - Las acciones se guardarán de forma local y se sincronizarán al recuperar internet.</span>
        </div>
        {queueCount > 0 && (
          <span className="bg-amber-800 text-amber-100 text-xs px-2 py-0.5 rounded-full font-bold">
            {queueCount} pendiente{queueCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  if (queueCount > 0) {
    return (
      <div className="bg-olivo-700 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md">
        <div className="flex items-center gap-2 font-medium">
          <Wifi className="w-4 h-4 text-emerald-300" />
          <span>Conexión restablecida. Hay {queueCount} cambios registrados fuera de línea esperando sincronización.</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-white text-olivo-800 hover:bg-olivo-100 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
        >
          {syncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>
    );
  }

  if (syncMessage) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-md">
        <CheckCircle className="w-4 h-4 text-white" />
        <span>{syncMessage}</span>
      </div>
    );
  }

  return null;
}
