import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Briefcase
} from 'lucide-react';
import { Especialidad, EstadoUsuario, User } from '../types';
import { api } from '../lib/api';

export default function SpecialtiesView({ currentUser }: { currentUser?: User }) {
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Especialidad | null>(null);

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<EstadoUsuario>('ACTIVO');

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.getEspecialidades();
      setSpecialties(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar el catálogo de áreas periciales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const openCreateModal = () => {
    setEditingSpecialty(null);
    setNombre('');
    setDescripcion('');
    setEstado('ACTIVO');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (s: Especialidad) => {
    setEditingSpecialty(s);
    setNombre(s.nombre);
    setDescripcion(s.descripcion);
    setEstado(s.estado);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombre.trim() || !descripcion.trim()) {
      setErrorMsg('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      if (editingSpecialty) {
        await api.updateEspecialidad(editingSpecialty.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          estado
        });
        setSuccessMsg('Área pericial actualizada con éxito.');
      } else {
        await api.createEspecialidad({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          estado
        });
        setSuccessMsg('Área pericial registrada con éxito.');
      }

      setShowModal(false);
      fetchSpecialties();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al guardar los cambios.');
    }
  };

  const handleDelete = async (s: Especialidad) => {
    if (!window.confirm(`¿Está completamente seguro de eliminar el área pericial "${s.nombre}"?`)) {
      return;
    }

    try {
      setErrorMsg('');
      await api.deleteEspecialidad(s.id);
      setSuccessMsg('Área pericial eliminada exitosamente.');
      fetchSpecialties();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo eliminar la especialidad.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredSpecialties = specialties.filter(s => {
    const matchesSearch = 
      s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || s.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Alert banner for success */}
      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Alert banner for error */}
      {errorMsg && (
        <div className="bg-rose-100 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="title-font font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-olivo-800" />
            Catálogo de Áreas Periciales
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Administración inalterable de especialidades científicas y tipos de pericias forenses requeridas por el IITCUP
          </p>
        </div>

        {currentUser?.rol !== 'SUPERVISOR' && (
          <button 
            onClick={openCreateModal}
            className="bg-olivo-800 hover:bg-olivo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            Nueva Área Pericial
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o descripción..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-olivo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="ACTIVO">Activas</option>
          <option value="INACTIVO">Inactivas</option>
        </select>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-olivo-800" />
            <p className="text-xs mt-3">Cargando catálogo de especialidades científicas...</p>
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No se encontraron áreas periciales registradas en el catálogo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6" style={{ width: '30%' }}>Área / Especialidad</th>
                  <th className="py-4 px-4" style={{ width: '45%' }}>Descripción Detallada</th>
                  <th className="py-4 px-4" style={{ width: '13%' }}>Estado</th>
                  {currentUser?.rol !== 'SUPERVISOR' && <th className="py-4 px-6 text-right" style={{ width: '12%' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSpecialties.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-olivo-50 text-olivo-800 flex items-center justify-center font-bold text-xs shrink-0">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-bold">{s.nombre}</span>
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-300" /> Reg: {new Date(s.createdAt).toLocaleDateString('es-BO')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium leading-relaxed">
                      {s.descripcion}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        s.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {s.estado === 'ACTIVO' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>ACTIVO</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>INACTIVO</span>
                          </>
                        )}
                      </span>
                    </td>
                    {currentUser?.rol !== 'SUPERVISOR' && (
                      <td className="py-4 px-6 text-right space-x-1.5">
                        <button 
                          onClick={() => openEditModal(s)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-olivo-800 rounded transition"
                          title="Editar Especialidad"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(s)}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded transition"
                          title="Eliminar Especialidad"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="title-font font-bold text-sm text-slate-800">
                {editingSpecialty ? 'Editar Área Pericial' : 'Registrar Nueva Área Pericial'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre de Especialidad / Área *</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)}
                  placeholder="e.g. Documentología"
                  className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-olivo-500 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none transition"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción de Alcance Técnico *</label>
                <textarea 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Detalle el tipo de análisis científicos forenses que se realizan en esta especialidad..."
                  rows={4}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-olivo-500 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none transition resize-none"
                  required
                />
              </div>

              {/* Estado */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado de Especialidad *</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value as EstadoUsuario)}
                  className="w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-olivo-500 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-olivo-800 hover:bg-olivo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  {editingSpecialty ? 'Guardar Cambios' : 'Registrar Especialidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
