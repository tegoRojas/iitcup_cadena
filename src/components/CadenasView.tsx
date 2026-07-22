import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Clock, 
  User, 
  CheckCircle, 
  ArrowRight, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw,
  SlidersHorizontal,
  PlusCircle,
  X,
  FileText,
  XCircle
} from 'lucide-react';
import { CadenaCustodia, Rol, EstadoCadena, Especialidad } from '../types';
import { api, isOnline, exportToExcel } from '../lib/api';

interface CadenasViewProps {
  userRol: Rol;
  userId: string;
  userNombreCompleto: string;
  onSelectChain: (codigo: string) => void;
}

export default function CadenasView({ userRol, userId, userNombreCompleto, onSelectChain }: CadenasViewProps) {
  const [cadenas, setCadenas] = useState<CadenaCustodia[]>([]);
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [regionalFilter, setRegionalFilter] = useState<string>('ALL');
  const [regionales, setRegionales] = useState<any[]>([]);
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modal creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [caso, setCaso] = useState('');
  const [fiscalia, setFiscalia] = useState('');
  const [fiscal, setFiscal] = useState('');
  const [investigador, setInvestigador] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [lugar, setLugar] = useState('');
  const [unidad, setUnidad] = useState('FELCC');
  
  // Embedded evidences creator
  const [evidencias, setEvidencias] = useState<any[]>([
    { tipo: '', descripcion: '', cantidad: 1, embalaje: '', estado: 'Lacrado', observaciones: '' }
  ]);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCadenas = async () => {
    try {
      setLoading(true);
      const data = await api.getCadenas();
      setCadenas(data);
    } catch (e) {
      console.error('Error fetching chains', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const data = await api.getEspecialidades();
      setSpecialties(data.filter(s => s.estado === 'ACTIVO'));
    } catch (e) {
      console.error('Error fetching specialties', e);
    }
  };

  useEffect(() => {
    fetchCadenas();
    fetchSpecialties();
    if (userRol === 'SUPERVISOR') {
      api.getRegionales()
        .then(data => setRegionales(data))
        .catch(err => console.error('Error fetching regionales', err));
    }
  }, []);

  const handleAddEvidenceRow = () => {
    setEvidencias([
      ...evidencias,
      { tipo: '', descripcion: '', cantidad: 1, embalaje: '', estado: 'Lacrado', observaciones: '' }
    ]);
  };

  const handleRemoveEvidenceRow = (idx: number) => {
    if (evidencias.length === 1) return;
    setEvidencias(evidencias.filter((_, i) => i !== idx));
  };

  const handleEvidenceChange = (idx: number, field: string, val: any) => {
    const updated = [...evidencias];
    updated[idx][field] = val;
    setEvidencias(updated);
  };

  const handleCreateChain = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!caso || !fiscalia || !fiscal || !investigador || !fecha || !hora || !lugar || !unidad) {
      setErrorMsg('Por favor complete todos los datos generales de la cadena.');
      return;
    }

    if (selectedSpecialties.length === 0) {
      setErrorMsg('Debe seleccionar al menos un área pericial / especialidad requerida para la cadena.');
      return;
    }

    // Validate evidences
    const invalidEv = evidencias.some(ev => !ev.tipo || !ev.descripcion || !ev.embalaje);
    if (invalidEv) {
      setErrorMsg('Por favor complete los datos mínimos de cada evidencia registrada (Tipo, Descripción, Embalaje).');
      return;
    }

    try {
      const payload = {
        caso,
        fiscalia,
        fiscal,
        investigador,
        fecha,
        hora,
        lugar,
        unidad,
        evidencias,
        especialidadesRequeridas: selectedSpecialties
      };

      await api.createCadena(payload);
      setSuccessMsg('Cadena de custodia registrada con éxito' + (!isOnline() ? ' (Guardado Local Offline)' : '') + '.');
      setShowCreateModal(false);
      
      // Reset
      setCaso('');
      setFiscalia('');
      setFiscal('');
      setInvestigador('');
      setLugar('');
      setUnidad('FELCC');
      setSelectedSpecialties([]);
      setEvidencias([{ tipo: '', descripcion: '', cantidad: 1, embalaje: '', estado: 'Lacrado', observaciones: '' }]);

      fetchCadenas();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la cadena.');
    }
  };

  const handleExport = () => {
    const clean = cadenas.map(c => ({
      'Código Único': c.codigoUnico,
      'Nro. de Cadena': c.nroCadena,
      'Caso Judicial': c.caso,
      'Fiscalía': c.fiscalia,
      'Fiscal Asignado': c.fiscal,
      'Investigador Colector': c.investigador,
      'Fecha Ingreso': c.fecha,
      'Hora Ingreso': c.hora,
      'Lugar de Colecta': c.lugar,
      'Estado del Peritaje': c.estadoActual
    }));
    exportToExcel('Listado_Cadenas_Custodia_IITCUP', clean);
  };

  // Extensive filters mapping
  const filteredCadenas = cadenas.filter(c => {
    const matchesSearch = 
      c.codigoUnico.toLowerCase().includes(search.toLowerCase()) ||
      c.nroCadena.toLowerCase().includes(search.toLowerCase()) ||
      c.caso.toLowerCase().includes(search.toLowerCase()) ||
      c.fiscal.toLowerCase().includes(search.toLowerCase()) ||
      c.investigador.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.estadoActual === statusFilter;
    const matchesRegional = regionalFilter === 'ALL' || c.regionalId === regionalFilter;

    // Advanced filters
    const matchesEvidence = !evidenceTypeFilter || (c as any).evidencias?.some((e: any) => e.tipo.toLowerCase().includes(evidenceTypeFilter.toLowerCase()));
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && c.fecha >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && c.fecha <= endDate;
    }

    return matchesSearch && matchesStatus && matchesRegional && matchesEvidence && matchesDate;
  });

  const getStatusColor = (st: EstadoCadena) => {
    switch (st) {
      case 'RECIBIDA': return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'EN_ANALISIS': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'EN_PROCESO': return 'bg-orange-50 text-orange-700 border border-orange-100';
      case 'FINALIZADA': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'ENTREGADA': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'ARCHIVADA': return 'bg-slate-50 text-slate-700 border border-slate-100';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages Alerts */}
      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="title-font font-bold text-lg text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-olivo-800" />
            Cadenas de Custodia de Evidencias
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">Registro, seguimiento integral, asignación pericial y trazabilidad de pruebas legales</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 md:flex-none border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
          
          {(userRol === 'ENCARGADO' || userRol === 'ADMINISTRADOR') && (
            <button 
              onClick={() => {
                setErrorMsg('');
                setShowCreateModal(true);
              }}
              className="flex-1 md:flex-none bg-olivo-800 hover:bg-olivo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              Nueva Cadena
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Filtering bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
        <div className={`grid grid-cols-1 ${userRol === 'SUPERVISOR' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
          {/* Main search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Buscar por código, caso, fiscal o investigador colector..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-olivo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none transition"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none w-full"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="RECIBIDA">RECIBIDAS</option>
            <option value="EN_ANALISIS">EN ANÁLISIS</option>
            <option value="EN_PROCESO">EN PROCESO</option>
            <option value="FINALIZADA">FINALIZADAS</option>
            <option value="ENTREGADA">ENTREGADAS</option>
            <option value="ARCHIVADA">ARCHIVADAS</option>
          </select>

          {/* Regional Filter for SUPERVISOR */}
          {userRol === 'SUPERVISOR' && (
            <select
              value={regionalFilter}
              onChange={e => setRegionalFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none w-full"
            >
              <option value="ALL">Todas las Regionales</option>
              {regionales.map(reg => (
                <option key={reg.id} value={reg.id}>{reg.nombre}</option>
              ))}
            </select>
          )}

          {/* Advanced filter toggle button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-center gap-1.5 border px-3 py-2 text-xs font-bold rounded-xl transition ${
              showAdvanced ? 'bg-olivo-100/30 text-olivo-800 border-olivo-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros Avanzados
          </button>
        </div>

        {/* Advanced Filters expander */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 animate-fade-in">
            {/* Filter by evidence type */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tipo de Evidencia</label>
              <input 
                type="text" 
                placeholder="Ej. Arma, Celular, Cocaína" 
                value={evidenceTypeFilter}
                onChange={e => setEvidenceTypeFilter(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none transition"
              />
            </div>
            {/* Start Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Colecta Desde</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none transition"
              />
            </div>
            {/* End Date */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Colecta Hasta</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none transition"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid of Cadenas de Custodia */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-olivo-800" />
          <p className="text-xs mt-3">Cargando actas de cadena de custodia del IITCUP...</p>
        </div>
      ) : filteredCadenas.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 border border-slate-200/80 rounded-2xl text-xs font-medium">
          No se encontraron actas de cadena de custodia registradas con los filtros indicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCadenas.map((cad) => (
            <div 
              key={cad.codigoUnico}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Highlight bar depending on status */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-olivo-800"></div>

              <div className="space-y-4">
                {/* ID & Status */}
                <div className="flex items-center justify-between">
                  <span className="mono-font text-xs font-bold text-olivo-800">
                    {cad.codigoUnico}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor(cad.estadoActual)}`}>
                    {cad.estadoActual.replace('_', ' ')}
                  </span>
                </div>

                {/* Case & general data */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-olivo-800 transition truncate">
                    Caso: {cad.caso}
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-500">
                    <div className="font-semibold text-slate-400">Reg. Cadena:</div>
                    <div className="font-medium text-slate-600 truncate">{cad.nroCadena}</div>
                    
                    <div className="font-semibold text-slate-400">Fiscalía:</div>
                    <div className="font-medium text-slate-600 truncate" title={cad.fiscalia}>{cad.fiscalia.split(' - ')[0]}</div>

                    <div className="font-semibold text-slate-400">Colector:</div>
                    <div className="font-medium text-slate-600 truncate" title={cad.investigador}>{cad.investigador}</div>
                    
                    <div className="font-semibold text-slate-400">Fecha/Hora:</div>
                    <div className="font-medium text-slate-600">{cad.fecha} • {cad.hora}</div>
                  </div>
                </div>

                {/* Place capsule */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-[10px] text-slate-400 font-semibold truncate">
                  Lugar: <span className="text-slate-600">{cad.lugar}</span>
                </div>
              </div>

              {/* Action trigger to drill-down */}
              <button
                onClick={() => onSelectChain(cad.codigoUnico)}
                className="w-full mt-4 bg-slate-50 hover:bg-olivo-100/40 text-slate-600 hover:text-olivo-800 font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center justify-center gap-1 group/btn border border-slate-100 focus:outline-none"
              >
                Ver Trazabilidad y Detalles
                <ArrowRight className="w-3.5 h-3.5 transition group-hover/btn:translate-x-1" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal (Elegant Full-Screen Multi-Step form) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-olivo-800" />
                <h3 className="title-font font-bold text-sm text-slate-800">
                  Apertura y Registro de Acta de Cadena de Custodia
                </h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChain} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* SECTION 1: DATOS GENERALES DEL REQUERIMIENTO */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-olivo-800 border-b border-slate-100 pb-1 uppercase tracking-wide">
                  1. Información General Judicial
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Numero caso */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Número de Caso / Cuaderno *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. FELCC-SC-10293/2026"
                      value={caso}
                      onChange={e => setCaso(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Fiscalia */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fiscalía Departamental / Asignada *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Unidad de Delitos Contra la Vida"
                      value={fiscalia}
                      onChange={e => setFiscalia(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Fiscal */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fiscal Requeridor Asignado *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Dr. Roger Mariaca"
                      value={fiscal}
                      onChange={e => setFiscal(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Investigador */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Investigador Técnico Colector *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Sgto. 1ro. Juan Choque"
                      value={investigador}
                      onChange={e => setInvestigador(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none transition"
                      required
                    />
                  </div>

                  {/* Unidad */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Unidad Requeridora *</label>
                    <select
                      value={unidad}
                      onChange={e => setUnidad(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none"
                      required
                    >
                      <option value="FELCC">FELCC</option>
                      <option value="FELCV">FELCV</option>
                      <option value="FELCN">FELCN</option>
                      <option value="DIPROVE">DIPROVE</option>
                      <option value="INTERPOL">INTERPOL</option>
                      <option value="DIDIPI">DIDIPI</option>
                      <option value="PARTICULAR">PARTICULAR</option>
                    </select>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha Colecta en Escena *</label>
                    <input 
                      type="date" 
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none"
                      required
                    />
                  </div>

                  {/* Hora */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hora Colecta *</label>
                    <input 
                      type="time" 
                      value={hora}
                      onChange={e => setHora(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Lugar */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lugar de Colecta / Escena del Crimen *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Barrio Plan Tres Mil, Av. Piraí entre 3er y 4to anillo"
                    value={lugar}
                    onChange={e => setLugar(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* SECTION 2: EVIDENCIAS ASOCIADAS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-olivo-800 uppercase tracking-wide">
                    2. Elementos de Evidencia Colectados
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEvidenceRow}
                    className="text-[10px] bg-olivo-100/50 hover:bg-olivo-100 text-olivo-800 font-extrabold px-3 py-1.5 rounded-lg transition flex items-center gap-1 focus:outline-none"
                  >
                    <Plus className="w-3 h-3" />
                    Añadir Evidencia
                  </button>
                </div>

                {/* Evidence items form list */}
                <div className="space-y-4">
                  {evidencias.map((ev, index) => (
                    <div 
                      key={index} 
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 relative space-y-3"
                    >
                      {/* Delete index badge */}
                      <div className="flex items-center justify-between">
                        <span className="bg-olivo-800 text-white text-[9px] font-extrabold px-2 py-0.5 rounded">
                          Elemento #{index + 1}
                        </span>
                        {evidencias.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidenceRow(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200/50 transition focus:outline-none"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Tipo de Evidencia */}
                        <div className="md:col-span-1">
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Tipo de Evidencia *</label>
                          <input 
                            type="text" 
                            placeholder="Ej. Arma de Fuego, Celular"
                            value={ev.tipo}
                            onChange={e => handleEvidenceChange(index, 'tipo', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        {/* Descripción */}
                        <div className="md:col-span-3">
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Descripción Detallada *</label>
                          <input 
                            type="text" 
                            placeholder="Características, modelo, marca, nro. de serie..."
                            value={ev.descripcion}
                            onChange={e => handleEvidenceChange(index, 'descripcion', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        {/* Cantidad */}
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Cantidad *</label>
                          <input 
                            type="number" 
                            min="1"
                            value={ev.cantidad}
                            onChange={e => handleEvidenceChange(index, 'cantidad', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        {/* Embalaje */}
                        <div className="md:col-span-2">
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Tipo de Embalaje *</label>
                          <input 
                            type="text" 
                            placeholder="Ej. Bolsa hermética lacrada, sobre de papel Kraft"
                            value={ev.embalaje}
                            onChange={e => handleEvidenceChange(index, 'embalaje', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                            required
                          />
                        </div>

                        {/* Estado */}
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-1">Estado Físico Inicial</label>
                          <select
                            value={ev.estado}
                            onChange={e => handleEvidenceChange(index, 'estado', e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                          >
                            <option value="Lacrado">Lacrado / Precintado</option>
                            <option value="Cerrado">Cerrado sin precinto</option>
                            <option value="Abierto">Abierto</option>
                            <option value="Dañado">Dañado / Alterado</option>
                          </select>
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">Observaciones Iniciales</label>
                        <input 
                          type="text" 
                          placeholder="Manchas de sangre, óxido, daños visibles..."
                          value={ev.observaciones}
                          onChange={e => handleEvidenceChange(index, 'observaciones', e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: ESPECIALIDADES REQUERIDAS */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-olivo-800 uppercase tracking-wide">
                  3. Áreas Periciales / Especialidades Requeridas *
                </h4>
                <p className="text-[11px] text-slate-400 font-medium leading-tight">
                  Seleccione uno o más tipos de análisis periciales forenses solicitados para la investigación de estas evidencias
                </p>
                {specialties.length === 0 ? (
                  <p className="text-xs text-slate-400">Cargando áreas periciales disponibles...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {specialties.map((spec) => (
                      <label 
                        key={spec.id} 
                        className={`flex items-start gap-2.5 bg-white p-3 rounded-xl border cursor-pointer transition select-none ${
                          selectedSpecialties.includes(spec.id)
                            ? 'border-olivo-600 bg-olivo-50/10 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedSpecialties.includes(spec.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSpecialties(prev => [...prev, spec.id]);
                            } else {
                              setSelectedSpecialties(prev => prev.filter(id => id !== spec.id));
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-olivo-800 focus:ring-olivo-500"
                        />
                        <div className="leading-tight">
                          <span className="text-xs font-bold text-slate-700 block">{spec.nombre}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">{spec.descripcion}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-olivo-800 hover:bg-olivo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <CheckCircle className="w-4 h-4" />
                  Abrir Cadena de Custodia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
