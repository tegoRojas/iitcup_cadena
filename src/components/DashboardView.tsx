import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Activity, 
  Archive, 
  Briefcase, 
  ShieldAlert, 
  TrendingUp, 
  Layers,
  Search,
  FileSpreadsheet,
  Filter,
  Calendar,
  Sparkles,
  MapPin,
  ArrowUpRight,
  ChevronRight,
  Percent,
  Download,
  AlertCircle
} from 'lucide-react';
import { User, CadenaCustodia, Especialidad, Regional } from '../types';
import { api, exportToExcel } from '../lib/api';

interface DashboardProps {
  user: User;
}

export default function DashboardView({ user }: DashboardProps) {
  // Database datasets
  const [cadenas, setCadenas] = useState<any[]>([]);
  const [regionales, setRegionales] = useState<Regional[]>([]);
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Dashboard Interactive Filters State
  const [selectedRegional, setSelectedRegional] = useState<string>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedPerito, setSelectedPerito] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active chart hovers
  const [hoveredStateSlice, setHoveredStateSlice] = useState<number | null>(null);

  // Pagination for bottom list
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load all foundational databases
  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        const [cadenasData, regionalesData, specialtiesData, usersData] = await Promise.all([
          api.getCadenas(),
          api.getRegionales(),
          api.getEspecialidades(),
          api.getUsers()
        ]);
        
        setCadenas(cadenasData);
        setRegionales(regionalesData);
        setSpecialties(specialtiesData);
        setUsers(usersData);
      } catch (err: any) {
        console.error('Error loading analytics dataset:', err);
        setErrorMsg('Error al comunicar con la base de datos central de IITCUP.');
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRegional, selectedUnit, selectedArea, selectedPerito, startDate, endDate, searchQuery]);

  // Extract list of all unique Units across database for the filter dropdown
  const uniqueUnits = React.useMemo(() => {
    const unitsSet = new Set<string>();
    cadenas.forEach(c => {
      if (c.unidad) unitsSet.add(c.unidad);
    });
    return Array.from(unitsSet).sort();
  }, [cadenas]);

  // Extract list of active peritos for the filter dropdown
  const peritosList = React.useMemo(() => {
    return users.filter(u => u.rol === 'PERITO' && u.estado === 'ACTIVO');
  }, [users]);

  // -------------------------------------------------------------
  // MULTI-DIMENSIONAL LIVE BI FILTER ENGINE
  // -------------------------------------------------------------
  const filteredCadenas = React.useMemo(() => {
    return cadenas.filter(c => {
      // 1. Regional Filter
      if (user.rol === 'SUPERVISOR') {
        if (selectedRegional !== 'ALL' && c.regionalId !== selectedRegional) return false;
      } else {
        // Non-supervisors are hard-locked to their own office
        if (c.regionalId !== user.regionalId) return false;
      }

      // 2. Unit Filter
      if (selectedUnit !== 'ALL' && c.unidad !== selectedUnit) return false;

      // 3. Area (Specialty) Filter
      if (selectedArea !== 'ALL') {
        if (!c.especialidadesRequeridas || !c.especialidadesRequeridas.includes(selectedArea)) return false;
      }

      // 4. Perito Filter
      if (selectedPerito !== 'ALL') {
        if (!c.peritosAsignados || !c.peritosAsignados.some((pa: any) => pa.peritoId === selectedPerito)) return false;
      }

      // 5. Temporal Range Filter
      if (startDate && c.fecha < startDate) return false;
      if (endDate && c.fecha > endDate) return false;

      // 6. Search Bar Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const codeMatch = c.codigoUnico?.toLowerCase().includes(query);
        const caseMatch = c.caso?.toLowerCase().includes(query);
        const rupMatch = c.rup?.toLowerCase().includes(query);
        const investigatorMatch = c.investigador?.toLowerCase().includes(query);
        const fiscalMatch = c.fiscal?.toLowerCase().includes(query);
        const placeMatch = c.lugar?.toLowerCase().includes(query);
        
        if (!codeMatch && !caseMatch && !rupMatch && !investigatorMatch && !fiscalMatch && !placeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [cadenas, selectedRegional, selectedUnit, selectedArea, selectedPerito, startDate, endDate, searchQuery, user]);

  // -------------------------------------------------------------
  // REAL-TIME ANALYTICAL CALCULATIONS (BI ENGINE)
  // -------------------------------------------------------------
  const analysis = React.useMemo(() => {
    const total = filteredCadenas.length;
    
    // KPIs
    const activos = filteredCadenas.filter(c => ['RECIBIDA', 'EN_ANALISIS', 'EN_PROCESO'].includes(c.estadoActual)).length;
    const concluidos = filteredCadenas.filter(c => ['FINALIZADA', 'ENTREGADA', 'ARCHIVADA'].includes(c.estadoActual)).length;
    
    // Evidences count
    const evidenciasCount = filteredCadenas.reduce((sum, c) => sum + (c.evidenciasCount || c.evidencias?.length || 0), 0);
    
    // Active peritos involved in the filtered subset
    const uniqueActivePeritoIds = new Set<string>();
    filteredCadenas.forEach(c => {
      c.peritosAsignados?.forEach((pa: any) => {
        uniqueActivePeritoIds.add(pa.peritoId);
      });
    });
    const peritosInvolved = uniqueActivePeritoIds.size;

    // 1. Group by Estado (State Donut)
    const stateCounts = {
      'Recibidas': 0,
      'En Análisis': 0,
      'En Proceso': 0,
      'Finalizadas': 0,
      'Entregadas': 0,
      'Archivadas': 0
    };
    filteredCadenas.forEach(c => {
      if (c.estadoActual === 'RECIBIDA') stateCounts['Recibidas']++;
      else if (c.estadoActual === 'EN_ANALISIS') stateCounts['En Análisis']++;
      else if (c.estadoActual === 'EN_PROCESO') stateCounts['En Proceso']++;
      else if (c.estadoActual === 'FINALIZADA') stateCounts['Finalizadas']++;
      else if (c.estadoActual === 'ENTREGADA') stateCounts['Entregadas']++;
      else if (c.estadoActual === 'ARCHIVADA') stateCounts['Archivadas']++;
    });
    const stateDistribution = Object.entries(stateCounts).map(([name, value]) => ({ name, value }));

    // 2. Group by Regional
    const regionalCounts: Record<string, number> = {};
    regionales.forEach(r => {
      regionalCounts[r.nombre] = 0;
    });
    filteredCadenas.forEach(c => {
      const reg = regionales.find(r => r.id === c.regionalId);
      if (reg) {
        regionalCounts[reg.nombre] = (regionalCounts[reg.nombre] || 0) + 1;
      }
    });
    const regionalDistribution = Object.entries(regionalCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. Group by Specialty / Area
    const specialtyCounts: Record<string, number> = {};
    specialties.forEach(s => {
      specialtyCounts[s.nombre] = 0;
    });
    filteredCadenas.forEach(c => {
      c.especialidadesRequeridas?.forEach((specId: string) => {
        const spec = specialties.find(s => s.id === specId);
        if (spec) {
          specialtyCounts[spec.nombre] = (specialtyCounts[spec.nombre] || 0) + 1;
        }
      });
    });
    const specialtyDistribution = Object.entries(specialtyCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 4. Temporal Trend (Monthly)
    const monthlyTrend: Record<string, number> = {};
    filteredCadenas.forEach(c => {
      const month = c.fecha?.substring(0, 7) || '2026-07'; // YYYY-MM
      monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
    });
    const temporalTrend = Object.entries(monthlyTrend)
      .map(([mes, cantidad]) => ({ mes, cantidad }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // 5. Perito Caseload / Productivity
    const peritoProductivity = peritosList.map(p => {
      // Find how many of the filtered chains are assigned to this perito
      const assignedChains = filteredCadenas.filter(c => 
        c.peritosAsignados?.some((pa: any) => pa.peritoId === p.id)
      );
      
      const activeCount = assignedChains.filter(c => ['RECIBIDA', 'EN_ANALISIS', 'EN_PROCESO'].includes(c.estadoActual)).length;
      const concludedCount = assignedChains.filter(c => ['FINALIZADA', 'ENTREGADA', 'ARCHIVADA'].includes(c.estadoActual)).length;
      
      return {
        id: p.id,
        nombreCompleto: `${p.nombre} ${p.apellidos}`,
        cargo: p.cargo,
        especialidad: p.especialidades && p.especialidades.length > 0 
          ? specialties.find(s => s.id === p.especialidades![0])?.nombre || 'General'
          : 'Científico',
        activeCount,
        concludedCount,
        totalCount: assignedChains.length
      };
    }).sort((a, b) => b.totalCount - a.totalCount);

    return {
      total,
      activos,
      concluidos,
      evidenciasCount,
      peritosInvolved,
      stateDistribution,
      regionalDistribution,
      specialtyDistribution,
      temporalTrend,
      peritoProductivity
    };
  }, [filteredCadenas, regionales, specialties, peritosList]);

  // -------------------------------------------------------------
  // SECURE EXPORT & AUDIT TRACKING
  // -------------------------------------------------------------
  const handleExportDashboard = async (format: 'Excel' | 'CSV') => {
    try {
      setSuccessMsg('');
      setErrorMsg('');

      // Call secure backend audit endpoint to track export action
      await api.logExport(
        'Dashboard Ejecutivo IITCUP - Reporte de Análisis Estadístico Nacional',
        format,
        {
          regional: selectedRegional,
          unidad: selectedUnit,
          area: selectedArea,
          perito: selectedPerito,
          fechaInicio: startDate,
          fechaFin: endDate,
          busqueda: searchQuery,
          registrosFiltrados: filteredCadenas.length
        }
      );

      // Create CSV / Excel dataset
      const reportRows = filteredCadenas.map((c, idx) => {
        const regionalName = regionales.find(r => r.id === c.regionalId)?.nombre || 'Desconocido';
        const reqSpecs = c.especialidadesRequeridas
          ?.map((id: string) => specialties.find(s => s.id === id)?.nombre || '')
          .filter(Boolean)
          .join(', ') || 'General';

        return {
          'Nro': idx + 1,
          'Código Único': c.codigoUnico,
          'RUP': c.rup || 'N/A',
          'Nro de Acta': c.nroCadena,
          'Regional': regionalName,
          'Unidad Policial': c.unidad || 'FELCC',
          'Caso / Referencia': c.caso,
          'Especialidades Requeridas': reqSpecs,
          'Lugar del Hecho': c.lugar,
          'Investigador': c.investigador,
          'Fiscal': c.fiscal,
          'Fecha Registro': c.fecha,
          'Hora Registro': c.hora,
          'Estado Actual': c.estadoActual,
          'Cant. Evidencias': c.evidenciasCount || 0
        };
      });

      exportToExcel(`IITCUP_Reporte_Estadistico_${new Date().toISOString().slice(0, 10)}`, reportRows);
      setSuccessMsg('Reporte exportado exitosamente. La acción ha sido registrada en la Bitácora de Auditoría del IITCUP.');
    } catch (err: any) {
      console.error('Error conducting auditable export:', err);
      setErrorMsg('No se pudo registrar la acción de exportación en el servidor de auditoría.');
    }
  };

  // -------------------------------------------------------------
  // RENDER GRAPHICS COMPONENT METHODS
  // -------------------------------------------------------------
  // Colors mapped to states
  const colors: Record<string, string> = {
    'Recibidas': '#3b82f6',     // blue-500
    'En Análisis': '#f59e0b',   // amber-500
    'En Proceso': '#ef4444',    // red-500
    'Finalizadas': '#10b981',   // emerald-500
    'Entregadas': '#6366f1',    // indigo-500
    'Archivadas': '#64748b'     // slate-500
  };

  // SVG coordinate helpers for donut chart
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const donutTotal = analysis.stateDistribution.reduce((sum, item) => sum + item.value, 0) || 1;
  let cumulativePercent = 0;

  // Pagination slice
  const paginatedCadenas = filteredCadenas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredCadenas.length / itemsPerPage) || 1;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-8 h-8 rounded-xl bg-slate-100"></div>
                <div className="w-16 h-3 bg-slate-100 rounded"></div>
              </div>
              <div className="w-12 h-6 bg-slate-200 rounded"></div>
              <div className="w-20 h-2 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-24 animate-pulse"></div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80 animate-pulse"></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold shadow-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modern Premium Brand Banner */}
      <div className="bg-olivo-800 text-white rounded-2xl p-6 shadow-md border border-olivo-700/50 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <Layers className="w-72 h-72 text-white" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-oro-600 text-olivo-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                IITCup • BI Monitor Nacional
              </span>
              <span className="bg-white/10 text-slate-100 text-[10px] font-bold px-2 py-1 rounded-md">
                Rol: {user.rol}
              </span>
            </div>
            <h2 className="title-font font-bold text-xl md:text-2xl mt-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-oro-400" />
              Dashboard Ejecutivo Nacional IITCUP
            </h2>
            <p className="text-slate-200 text-xs mt-1.5 max-w-2xl leading-relaxed font-medium">
              Supervisión de procesos, métricas de peritaje científico y trazabilidad procesal de evidencias físicas a nivel nacional. Monitoreo analítico inalterable.
            </p>
          </div>

          <button 
            onClick={() => handleExportDashboard('Excel')}
            className="bg-oro-600 hover:bg-oro-500 text-olivo-900 font-extrabold px-4.5 py-2.5 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel Nacional
          </button>
        </div>
      </div>

      {/* =============================================================
          1. BUSINESS INTELLIGENCE MULTI-FILTER CONTROL BAR
          ============================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-olivo-800" />
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Filtros Inteligentes Multi-Dimensionales</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Regional Dropdown (Supervisor ONLY, otherwise locked) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">1. Oficina Regional</label>
            {user.rol === 'SUPERVISOR' ? (
              <select
                value={selectedRegional}
                onChange={e => setSelectedRegional(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition"
              >
                <option value="ALL">Todas las Oficinas</option>
                {regionales.map(reg => (
                  <option key={reg.id} value={reg.id}>{reg.nombre}</option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-slate-100 border border-slate-200/60 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {regionales.find(r => r.id === user.regionalId)?.nombre || 'Regional Actual'}
              </div>
            )}
          </div>

          {/* Unit Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">2. Unidad Policial</label>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition"
            >
              <option value="ALL">Todas las Unidades</option>
              {uniqueUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          {/* Area / Specialty Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">3. Área Pericial</label>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition"
            >
              <option value="ALL">Todas las Especialidades</option>
              {specialties.map(spec => (
                <option key={spec.id} value={spec.id}>{spec.nombre}</option>
              ))}
            </select>
          </div>

          {/* Perito dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">4. Perito Asignado</label>
            <select
              value={selectedPerito}
              onChange={e => setSelectedPerito(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition"
            >
              <option value="ALL">Todos los Peritos</option>
              {peritosList.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellidos}</option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">5. Fecha Inicio</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold focus:outline-none transition"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">6. Fecha Fin</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-olivo-500 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Global Search inside filters block */}
        <div className="relative pt-1 border-t border-slate-50">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-4.5" />
          <input 
            type="text" 
            placeholder="Buscar por Código Único, Caso RUP, Fiscal, Investigador o Municipio..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white focus:ring-1 focus:ring-olivo-500 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none transition"
          />
        </div>
      </div>

      {/* =============================================================
          2. DYNAMIC METRIC KPI CARDS
          ============================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Cadenas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow transition duration-200">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Actas</span>
            <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="title-font font-extrabold text-2xl md:text-3xl text-slate-800">
              {analysis.total}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Cadenas de custodia filtradas</p>
          </div>
        </div>

        {/* KPI 2: Casos Activos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow transition duration-200">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wide">Casos Activos</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="title-font font-extrabold text-2xl md:text-3xl text-amber-600">
              {analysis.activos}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">En custodia o análisis técnico</p>
          </div>
        </div>

        {/* KPI 3: Cadenas Concluidas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow transition duration-200">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wide">Concluidas</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="title-font font-extrabold text-2xl md:text-3xl text-emerald-600">
              {analysis.concluidos}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Informes y dictámenes concluidos</p>
          </div>
        </div>

        {/* KPI 4: Evidencias */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow transition duration-200">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wide">Evidencias</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="title-font font-extrabold text-2xl md:text-3xl text-blue-600">
              {analysis.evidenciasCount}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Pruebas físicas bajo custodia</p>
          </div>
        </div>

        {/* KPI 5: Peritos Activos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow transition duration-200 col-span-2 lg:col-span-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wide">Científicos</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="title-font font-extrabold text-2xl md:text-3xl text-indigo-600">
              {analysis.peritosInvolved}
            </span>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Peritos asignados a estos casos</p>
          </div>
        </div>
      </div>

      {/* =============================================================
          3. MAIN BI ANALYTICAL CHARTS PANEL
          ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Donut and Regional Progress (Col-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Donut Chart: Distribution by Estado */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Distribución de Cadenas por Estado</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Porcentaje y conteo de estados del proceso forense</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
              {/* Custom interactive SVG Donut Chart */}
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
                  {analysis.stateDistribution.map((item, idx) => {
                    if (item.value === 0) return null;
                    const percent = item.value / donutTotal;
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += percent;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    
                    const largeArcFlag = percent > 0.5 ? 1 : 0;
                    const pathData = [
                      `M ${startX} ${startY}`,
                      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                      `L 0 0`
                    ].join(' ');

                    const color = colors[item.name] || '#94a3b8';
                    const isHovered = hoveredStateSlice === idx;

                    return (
                      <path 
                        key={idx}
                        d={pathData}
                        fill={color}
                        opacity={hoveredStateSlice === null || isHovered ? 1 : 0.6}
                        className="transition-all duration-150 cursor-pointer"
                        style={{
                          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: '0 0'
                        }}
                        onMouseEnter={() => setHoveredStateSlice(idx)}
                        onMouseLeave={() => setHoveredStateSlice(null)}
                      />
                    );
                  })}
                  {/* Center punch to make it a donut */}
                  <circle cx="0" cy="0" r="0.72" fill="#ffffff" />
                </svg>
                {/* Center KPI indicator */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="title-font font-extrabold text-2xl text-slate-800">
                    {hoveredStateSlice !== null ? analysis.stateDistribution[hoveredStateSlice].value : analysis.total}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center max-w-[85px] truncate">
                    {hoveredStateSlice !== null ? analysis.stateDistribution[hoveredStateSlice].name : 'Cadenas'}
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 w-full sm:w-auto">
                {analysis.stateDistribution.map((item, idx) => {
                  const color = colors[item.name] || '#94a3b8';
                  const isHovered = hoveredStateSlice === idx;
                  const pct = ((item.value / donutTotal) * 100).toFixed(0);
                  
                  return (
                    <div 
                      key={idx}
                      onMouseEnter={() => setHoveredStateSlice(idx)}
                      onMouseLeave={() => setHoveredStateSlice(null)}
                      className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg cursor-pointer transition ${
                        isHovered ? 'bg-slate-50 border border-slate-100' : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                        <span className="text-xs text-slate-600 font-semibold">{item.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-1.5 pl-3">
                        <span className="text-xs font-bold text-slate-700">{item.value}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Regional comparison list (Progress bars) */}
          {user.rol === 'SUPERVISOR' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div>
                <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Distribución Regional de Cadenas</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Carga de expedientes por sede regional policial</p>
              </div>

              <div className="space-y-3.5">
                {analysis.regionalDistribution.map((reg, idx) => {
                  const maxVal = Math.max(...analysis.regionalDistribution.map(r => r.value), 1);
                  const widthPercent = (reg.value / maxVal) * 100;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-olivo-800"></span>
                          {reg.name}
                        </span>
                        <span className="font-bold text-slate-800">{reg.value} actas</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-olivo-800 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Trend over time Line Chart (Col-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Tendencia Cronológica de Recepción</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Volumen mensual de actas de custodia ingresadas</p>
          </div>

          <div className="py-4 h-64 w-full relative">
            {analysis.temporalTrend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                <AlertCircle className="w-6 h-6 text-slate-300" />
                <span>No hay datos cronológicos suficientes para graficar la tendencia.</span>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-between">
                {/* Visual SVG Area Trend line */}
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="#f8fafc" strokeWidth="1" />
                  <line x1="40" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="160" x2="480" y2="160" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Ground line */}
                  <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Calculations */}
                  {(() => {
                    const maxVal = Math.max(...analysis.temporalTrend.map(t => t.cantidad), 1);
                    const count = analysis.temporalTrend.length;
                    const points = analysis.temporalTrend.map((t, idx) => {
                      const x = 40 + (idx * (440 / Math.max(count - 1, 1)));
                      // Map quantity to SVG coordinates
                      const y = 160 - (t.cantidad / maxVal * 120);
                      return { x, y, ...t };
                    });

                    // String paths
                    let pathD = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 1; i < points.length; i++) {
                      pathD += ` L ${points[i].x} ${points[i].y}`;
                    }
                    const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

                    return (
                      <>
                        {/* Area Fill */}
                        <path d={areaD} fill="url(#gradient-area-bi)" opacity="0.12" />

                        {/* Line Curve */}
                        <path d={pathD} fill="none" stroke="#1c2d37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Trend points with tooltips */}
                        {points.map((pt, idx) => (
                          <g key={idx} className="group/node">
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r="4.5" 
                              fill="#ffffff" 
                              stroke="#1c2d37" 
                              strokeWidth="2.5" 
                              className="cursor-pointer transition duration-150" 
                            />
                            {/* Simple tooltip card */}
                            <g className="opacity-0 group-hover/node:opacity-100 transition duration-150 pointer-events-none">
                              <rect x={pt.x - 35} y={pt.y - 32} width="70" height="20" rx="4" fill="#1e293b" />
                              <text x={pt.x} y={pt.y - 19} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                                {pt.cantidad} actas
                              </text>
                            </g>
                          </g>
                        ))}

                        {/* Labels under the points */}
                        {points.map((pt, idx) => (
                          <text key={idx} x={pt.x} y="178" fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">
                            {pt.mes}
                          </text>
                        ))}
                      </>
                    );
                  })()}

                  <defs>
                    <linearGradient id="gradient-area-bi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1c2d37" />
                      <stop offset="100%" stopColor="#1c2d37" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* =============================================================
          4. SECONDARY ANALYTICS (SPECIALTY DEMAND & PERITOS PRODUCTIVITY)
          ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Specialty Demand Ranking List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Demanda por Especialidad / Área Pericial</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Distribución de especialidades científicas requeridas en los casos</p>
          </div>

          <div className="space-y-4">
            {analysis.specialtyDistribution.slice(0, 6).map((spec, idx) => {
              const maxVal = Math.max(...analysis.specialtyDistribution.map(s => s.value), 1);
              const widthPercent = (spec.value / maxVal) * 100;
              const globalPercent = analysis.total > 0 ? ((spec.value / analysis.total) * 100).toFixed(0) : '0';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-extrabold w-4">#{idx+1}</span>
                      {spec.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-800 font-bold">{spec.value} actas</span>
                      <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md">
                        {globalPercent}% del total
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="bg-olivo-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${widthPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {analysis.specialtyDistribution.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No hay requerimientos periciales asignados en los registros filtrados.
              </div>
            )}
          </div>
        </div>

        {/* Perito Caseload Productivity Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Productividad y Carga de Trabajo de Peritos</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Asignación de casos activos y completados por científico</p>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Perito Científico</th>
                  <th className="py-2.5 px-2">Especialidad</th>
                  <th className="py-2.5 px-2 text-center">Activos</th>
                  <th className="py-2.5 px-2 text-center">Concluidos</th>
                  <th className="py-2.5 px-3 text-right">Casos Totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.peritoProductivity.slice(0, 5).map((per, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {per.nombreCompleto}
                    </td>
                    <td className="py-3 px-2 text-slate-500 font-semibold">
                      {per.especialidad}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px] min-w-8">
                        {per.activeCount}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px] min-w-8">
                        {per.concludedCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-slate-700">
                      {per.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {analysis.peritoProductivity.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No hay peritos científicos registrados en la base de datos.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* =============================================================
          5. DETAILED NATIONAL CUSTODY SEARCH LIST
          ============================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="title-font font-bold text-xs text-slate-800 uppercase tracking-wide">Registro de Custodia Nacional ({filteredCadenas.length} Expedientes)</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Listado completo filtrado con trazabilidad institucional inalterable</p>
          </div>
          
          <div className="flex gap-2 text-xs">
            <button 
              onClick={() => handleExportDashboard('Excel')}
              className="border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Datos (CSV)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Código Único</th>
                <th className="py-3.5 px-3">Caso RUP / Acta</th>
                <th className="py-3.5 px-3">Unidad Policial</th>
                <th className="py-3.5 px-3">Caso / Referencia</th>
                <th className="py-3.5 px-3">Fecha Registro</th>
                <th className="py-3.5 px-3">Estado Actual</th>
                <th className="py-3.5 px-4 text-center">Evidencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCadenas.map((c) => {
                // Determine regional badge color
                const regColor = c.regionalId === 'reg-1' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                 c.regionalId === 'reg-2' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                 'bg-slate-50 text-slate-600 border-slate-200';
                
                return (
                  <tr key={c.codigoUnico} className="hover:bg-slate-50/40 transition group">
                    <td className="py-3 px-5">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-olivo-800 transition"></span>
                        {c.codigoUnico}
                      </div>
                      <span className={`inline-block border text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1 ${regColor}`}>
                        {regionales.find(r => r.id === c.regionalId)?.nombre || 'Sede Regional'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-700">{c.rup || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 font-semibold block mt-0.5">Acta: {c.nroCadena}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600 uppercase">
                      {c.unidad || 'FELCC'}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-700 max-w-xs truncate" title={c.caso}>
                        {c.caso}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[200px]">
                        Fiscal: {c.fiscal}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-semibold">
                      <div>{c.fecha}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.hora}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        c.estadoActual === 'RECIBIDA' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        c.estadoActual === 'EN_ANALISIS' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        c.estadoActual === 'EN_PROCESO' ? 'bg-red-50 text-red-700 border border-red-100' :
                        c.estadoActual === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        c.estadoActual === 'ENTREGADA' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.estadoActual === 'RECIBIDA' ? 'bg-blue-500' :
                          c.estadoActual === 'EN_ANALISIS' ? 'bg-amber-500' :
                          c.estadoActual === 'EN_PROCESO' ? 'bg-red-500' :
                          c.estadoActual === 'FINALIZADA' ? 'bg-emerald-500' :
                          c.estadoActual === 'ENTREGADA' ? 'bg-indigo-500' :
                          'bg-slate-400'
                        }`}></span>
                        {c.estadoActual.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded text-[10px]">
                        {c.evidenciasCount || 0} pzs
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredCadenas.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                    No se encontraron expedientes con los criterios de búsqueda aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredCadenas.length > 0 && (
          <div className="bg-slate-50/40 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">
              Mostrando {Math.min(filteredCadenas.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredCadenas.length, currentPage * itemsPerPage)} de {filteredCadenas.length} expedientes
            </span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(num => (
                <button 
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-6 h-6 flex items-center justify-center text-[11px] font-extrabold rounded-lg transition ${
                    currentPage === num 
                      ? 'bg-olivo-800 text-white shadow-sm' 
                      : 'border border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
