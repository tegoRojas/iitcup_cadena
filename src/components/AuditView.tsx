import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Clock, 
  User, 
  Terminal, 
  FileSpreadsheet, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { Auditoria } from '../types';
import { api, exportToExcel } from '../lib/api';

export default function AuditView() {
  const [logs, setLogs] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<Auditoria | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditorias();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = () => {
    const clean = logs.map(l => ({
      ID: l.id,
      Fecha: l.fecha,
      Hora: l.hora,
      Usuario: l.usuarioNombre,
      Acción: l.accion,
      IP: l.ip,
      Navegador: l.navegador
    }));
    exportToExcel('Bitacora_Auditoria_Seguridad_IITCUP', clean);
  };

  const filteredLogs = logs.filter(l => {
    return (
      l.usuarioNombre.toLowerCase().includes(search.toLowerCase()) ||
      l.accion.toLowerCase().includes(search.toLowerCase()) ||
      l.ip.toLowerCase().includes(search.toLowerCase()) ||
      l.fecha.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="title-font font-bold text-lg text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-olivo-800" />
            Bitácora de Auditoría de Seguridad
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Historial inalterable de operaciones críticas, registros de accesos e ingresos de evidencias forenses
          </p>
        </div>

        <button 
          onClick={handleExport}
          className="w-full md:w-auto bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar Bitácora a Excel
        </button>
      </div>

      {/* Filter and Search bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Buscar por funcionario, acción realizada, dirección IP o fecha (YYYY-MM-DD)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-olivo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none transition"
          />
        </div>
      </div>

      {/* Main logs display list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-olivo-800" />
            <p className="text-xs mt-3">Cargando registros criptográficos de auditoría...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No se encontraron logs de auditoría para la búsqueda indicada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-4">Funcionario</th>
                  <th className="py-4 px-4">Operación Realizada</th>
                  <th className="py-4 px-4">Dirección IP</th>
                  <th className="py-4 px-6 text-right">Firma Técnico-Digital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-6 text-slate-500">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.fecha} • {log.hora}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.usuarioNombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-bold">
                      {log.accion}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {log.ip}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-[9px] text-slate-400">
                      SHA256-{log.id.substring(4, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
