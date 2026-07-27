import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  ArrowRight,
  Code,
  Terminal,
  AlertTriangle,
  X
} from 'lucide-react';
import { api } from '../lib/api';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseModal({ isOpen, onClose }: SupabaseModalProps) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string; details?: any } | null>(null);
  
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; summary?: any; errors?: string[] } | null>(null);

  const [sqlScript, setSqlScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'sync'>('status');

  const supabaseUrl = 'https://lhbgqiemzwqzvpwcgnkr.supabase.co';

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      loadSQL();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setTesting(true);
    try {
      const res = await api.getSupabaseStatus();
      setStatus(res);
    } catch (err: any) {
      setStatus({ success: false, message: err.message || 'Error al conectar con la API del servidor.' });
    } finally {
      setTesting(false);
    }
  };

  const loadSQL = async () => {
    try {
      const sql = await api.getSupabaseSQL();
      setSqlScript(sql);
    } catch (err) {
      console.error('Error al cargar el script SQL:', err);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncData = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncSupabaseData();
      setSyncResult(res);
      // Re-check status after sync
      checkStatus();
    } catch (err: any) {
      setSyncResult({ success: false, errors: [err.message || 'Error al sincronizar datos con Supabase.'] });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-olivo-900 text-white p-5 flex items-center justify-between border-b border-olivo-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="title-font font-bold text-lg">Integración con Supabase Database</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/30">
                  PostgreSQL Activo
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">
                URL: <span className="font-mono text-emerald-300">{supabaseUrl}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex gap-4 text-xs font-bold text-slate-500">
          <button 
            onClick={() => setActiveTab('status')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'status' 
                ? 'border-olivo-800 text-olivo-900 font-extrabold' 
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            1. Estado de Conexión
          </button>

          <button 
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'sql' 
                ? 'border-olivo-800 text-olivo-900 font-extrabold' 
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            2. Script SQL de Tablas
          </button>

          <button 
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'sync' 
                ? 'border-olivo-800 text-olivo-900 font-extrabold' 
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            3. Sincronizar Datos
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-olivo-800" />
                    <h4 className="font-bold text-sm text-slate-800">Prueba de Conexión en Tiempo Real</h4>
                  </div>
                  <button 
                    onClick={checkStatus}
                    disabled={testing}
                    className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    {testing ? 'Probando...' : 'Re-probar Conexión'}
                  </button>
                </div>

                {status ? (
                  <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    status.success 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {status.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-2 flex-1">
                      <p className="font-bold text-sm leading-snug">{status.message}</p>

                      {status.details?.isPasswordNotKey && (
                        <div className="bg-amber-100/90 text-amber-950 p-3 rounded-lg border border-amber-300 space-y-2 font-medium">
                          <p className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-700" />
                            Solución requerida:
                          </p>
                          <ol className="list-decimal pl-4 space-y-1 text-xs">
                            <li>Ingresa a tu consola de Supabase: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline text-amber-900">supabase.com/dashboard</a></li>
                            <li>Selecciona tu proyecto y ve a <strong>Project Settings</strong> (icono de engranaje) &rarr; <strong>API</strong>.</li>
                            <li>En la sección <strong>Project API keys</strong>, copia la clave <strong><code className="bg-amber-200 px-1 py-0.5 rounded font-mono">service_role</code></strong> (o la <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">anon / public</code> key). Esta clave es un texto largo que comienza con <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">eyJhbGci...</code></li>
                            <li>Pégala en tu archivo <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">.env.example</code> en el campo <code className="bg-amber-200 px-1 py-0.5 rounded font-mono">SUPABASE_SERVICE_ROLE_KEY</code>.</li>
                          </ol>
                        </div>
                      )}

                      {status.details?.tablesExist ? (
                        <p className="text-emerald-700 font-medium">
                          ✓ Las tablas de la base de datos están creadas y respondiendo en el proyecto de Supabase.
                        </p>
                      ) : status.success ? (
                        <div className="text-emerald-800 font-medium space-y-1 pt-1">
                          <p>✓ Las credenciales son válidas y la conexión con el servidor Supabase fue exitosa.</p>
                          <p className="text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
                            Nota: Si aún no has ejecutado el script de migración, ve a la pestaña "2. Script SQL" y ejecútalo en Supabase SQL Editor.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs flex items-center justify-center py-6 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verificando parámetros de conexión con Supabase...
                  </div>
                )}
              </div>

              {/* Step-by-step linkage guide */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Pasos Completados de Vinculación
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="font-bold text-slate-800">Variables de Entorno Configuradas</p>
                      <p className="text-slate-500">
                        <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">SUPABASE_URL</code> y <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">SUPABASE_SERVICE_ROLE_KEY</code> han sido asociadas al backend del sistema.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="font-bold text-slate-800">Cliente SDK Instalado</p>
                      <p className="text-slate-500">
                        El paquete oficial <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">@supabase/supabase-js</code> está instalado en el servidor Node.js/Express.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="font-bold text-slate-800">Estructura Relacional DDL Generada</p>
                      <p className="text-slate-500">
                        Las 10 tablas requeridas por IITCUP (cadenas, evidencias, peritos, auditorías) están listas para migrarse a Supabase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCRIPT */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Terminal className="w-4 h-4 text-amber-700" />
                  Instrucciones para Crear las Tablas en Supabase:
                </div>
                <ol className="list-decimal pl-5 space-y-1 font-medium">
                  <li>Copia el script SQL que se muestra a continuación haciendo clic en <strong>"Copiar Código SQL"</strong>.</li>
                  <li>Abre la consola de tu proyecto Supabase: <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="font-bold underline text-amber-900 hover:text-amber-950">supabase.com/dashboard</a></li>
                  <li>Ve a la sección <strong>SQL Editor</strong> en el menú lateral izquierdo.</li>
                  <li>Pega este código en el editor y presiona el botón <strong>"RUN"</strong> (Ejecutar).</li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Script PostgreSQL (DDL Completo - 10 Tablas IITCUP)
                </span>
                <button 
                  onClick={handleCopySQL}
                  className="bg-olivo-800 hover:bg-olivo-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? '¡Copiado al Portapapeles!' : 'Copiar Código SQL'}
                </button>
              </div>

              <div className="relative bg-slate-900 text-emerald-400 font-mono text-[11px] p-4 rounded-xl max-h-80 overflow-y-auto border border-slate-800 leading-relaxed">
                <pre>{sqlScript}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: DATA SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-sm text-slate-800">Sincronización de Datos Iniciales a Supabase</h4>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Esta acción tomará todos los registros actuales almacenados en el sistema IITCUP (Sedes regionales, usuarios peritos, actas de cadena de custodia, evidencias físicas, asignaciones y bitácora de auditoría) y los insertará/actualizará directamente en las tablas correspondientes de tu base de datos de Supabase.
                </p>

                <div className="pt-2">
                  <button 
                    onClick={handleSyncData}
                    disabled={syncing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando Registros...' : 'Sincronizar Todos los Datos a Supabase'}
                  </button>
                </div>
              </div>

              {/* Sync Output Result */}
              {syncResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-3 ${
                  syncResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {syncResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    )}
                    {syncResult.success ? '¡Sincronización Completada con Éxito!' : 'Resultado de Sincronización'}
                  </div>

                  {syncResult.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="bg-white/80 p-2 rounded border border-emerald-200">
                        <span className="text-[10px] font-bold text-slate-500 block">REGIONALES</span>
                        <span className="font-extrabold text-sm text-slate-800">{syncResult.summary.regionales || 0}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded border border-emerald-200">
                        <span className="text-[10px] font-bold text-slate-500 block">USUARIOS</span>
                        <span className="font-extrabold text-sm text-slate-800">{syncResult.summary.users || 0}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded border border-emerald-200">
                        <span className="text-[10px] font-bold text-slate-500 block">CADENAS</span>
                        <span className="font-extrabold text-sm text-slate-800">{syncResult.summary.cadenas || 0}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded border border-emerald-200">
                        <span className="text-[10px] font-bold text-slate-500 block">EVIDENCIAS</span>
                        <span className="font-extrabold text-sm text-slate-800">{syncResult.summary.evidencias || 0}</span>
                      </div>
                    </div>
                  )}

                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="space-y-1 bg-rose-100/60 p-3 rounded border border-rose-200 text-rose-900 font-mono text-[11px]">
                      <p className="font-bold">Avisos/Errores detectados:</p>
                      {syncResult.errors.map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center text-xs">
          <div className="text-slate-500 font-medium">
            Supabase Project ID: <span className="font-mono font-bold text-slate-700">lhbgqiemzwqzvpwcgnkr</span>
          </div>

          <button 
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-xl transition"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
