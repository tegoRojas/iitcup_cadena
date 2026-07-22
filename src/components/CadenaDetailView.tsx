import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Paperclip, 
  Users, 
  Activity, 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Plus,
  Eye,
  FileCode,
  MapPin,
  Calendar,
  Save,
  FileSpreadsheet,
  ShieldAlert,
  X
} from 'lucide-react';
import { CadenaCustodia, Evidencia, Documento, Historial, User, EstadoCadena, Rol, Especialidad } from '../types';
import { api, isOnline, generateChainPDF, exportToExcel } from '../lib/api';

interface CadenaDetailViewProps {
  codigo: string;
  user: User;
  onBack: () => void;
}

export default function CadenaDetailView({ codigo, user, onBack }: CadenaDetailViewProps) {
  const [cadena, setCadena] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Peritos lists for assignment dropdown
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [specialtiesList, setSpecialtiesList] = useState<Especialidad[]>([]);
  const [selectedPeritos, setSelectedPeritos] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(true);

  // Status transition states
  const [newState, setNewState] = useState<EstadoCadena>('RECIBIDA');
  const [obsTecnicas, setObsTecnicas] = useState('');

  // Document upload state
  const [uploadDesc, setUploadDesc] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load complete details
  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getCadenaByCodigo(codigo);
      setCadena(data);
      setNewState(data.estadoActual);
      
      // Pre-populate assigned peritos
      if (data.peritosAsignados) {
        setSelectedPeritos(data.peritosAsignados.map((p: any) => p.peritoId));
      }

      // Fetch peritos and specialties list if online
      if (isOnline()) {
        const [usersList, specs] = await Promise.all([
          api.getUsers(),
          api.getEspecialidades()
        ]);
        setAllUsers(usersList.filter(u => u.rol === 'PERITO' && u.estado === 'ACTIVO'));
        setSpecialtiesList(specs);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al cargar detalles de la cadena.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [codigo]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newState) return;

    try {
      await api.updateCadenaStatus(codigo, {
        estadoActual: newState,
        observacionesTecnicas: obsTecnicas
      });

      setSuccessMsg('Estado de cadena de custodia actualizado correctamente.');
      setObsTecnicas('');
      loadDetails();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar el estado.');
    }
  };

  const handleAssignPeritos = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.assignPeritos(codigo, selectedPeritos);
      setSuccessMsg('Peritos forenses asignados y notificados.');
      setShowAssignModal(false);
      loadDetails();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al asignar peritos.');
    }
  };

  // Drag and drop / Manual upload handlers
  const handleFileUpload = async (file: File) => {
    if (!uploadDesc) {
      setErrorMsg('Por favor ingrese una breve descripción para el archivo antes de subirlo.');
      return;
    }

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Simulated Base64 conversion
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        await api.uploadDocument(codigo, {
          nombreArchivo: file.name,
          tipoArchivo: extension,
          descripcion: uploadDesc,
          tamano: file.size,
          base64Data
        });

        setSuccessMsg(`Archivo "${file.name}" cargado exitosamente.`);
        setUploadDesc('');
        loadDetails();
        setTimeout(() => setSuccessMsg(''), 4000);
      };
    } catch (e: any) {
      setErrorMsg('Error al cargar el documento.');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // PDF & Excel Downloads
  const handleDownloadPDF = () => {
    generateChainPDF(cadena);
  };

  const handleDownloadExcel = () => {
    const cleanData = cadena.evidencias.map((ev: any) => ({
      'Código de Evidencia': ev.codigo,
      'Tipo de Elemento': ev.tipo,
      'Descripción': ev.descripcion,
      'Cantidad': ev.cantidad,
      'Embalaje': ev.embalaje,
      'Estado Físico': ev.estado,
      'Observaciones Iniciales': ev.observaciones || ''
    }));
    exportToExcel(`Evidencias_${codigo}`, cleanData);
  };

  if (loading || !cadena) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-olivo-800" />
        <p className="text-xs mt-3 font-medium">Cargando expediente forense...</p>
      </div>
    );
  }

  const getStatusBadgeColor = (st: EstadoCadena) => {
    switch (st) {
      case 'RECIBIDA': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'EN_ANALISIS': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'EN_PROCESO': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'FINALIZADA': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'ENTREGADA': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'ARCHIVADA': return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Detail header top bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition"
            title="Volver al Listado"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="title-font font-bold text-base md:text-lg text-slate-800">
                Expediente Forense: {cadena.codigoUnico}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeColor(cadena.estadoActual)}`}>
                {cadena.estadoActual.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Custodia inalterable y cadena de trazabilidad procesal</p>
          </div>
        </div>

        {/* Action downloads */}
        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <button 
            onClick={handleDownloadExcel}
            className="flex-1 sm:flex-none border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Descargar Evidencias (Excel)
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none bg-olivo-800 hover:bg-olivo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
          >
            <Download className="w-4 h-4" />
            Imprimir Acta PDF
          </button>
        </div>
      </div>

      {/* Main detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Details, Evidences, Documents (Col-8) */}
        <div className="space-y-6 lg:col-span-8">
          
          {/* General Information Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">1. Datos Fiscales y Judiciales</span>
              <span className="text-[10px] text-slate-400 font-semibold mono-font">NRO: {cadena.nroCadena}</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">RUP:</span>
                  <span className="text-olivo-800 font-bold">{cadena.rup || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Unidad Requeridora:</span>
                  <span className="text-slate-700 font-bold">{cadena.unidad || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Número de Caso:</span>
                  <span className="text-slate-700">{cadena.caso}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Fiscalía Requeridora:</span>
                  <span className="text-slate-700 text-right max-w-[200px] truncate" title={cadena.fiscalia}>{cadena.fiscalia}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Fiscal de Materia:</span>
                  <span className="text-slate-700">{cadena.fiscal}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Investigador Colector:</span>
                  <span className="text-slate-700">{cadena.investigador}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Fecha y Hora de Colecta:</span>
                  <span className="text-slate-700">{cadena.fecha} a las {cadena.hora}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Lugar del Hallazgo:</span>
                  <span className="text-slate-700 text-right max-w-[200px] truncate" title={cadena.lugar}>{cadena.lugar}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400">Regional IITCUP:</span>
                  <span className="text-slate-700 font-bold">{cadena.regionalId === 'reg-lp' ? 'La Paz' : cadena.regionalId === 'reg-ea' ? 'El Alto' : cadena.regionalId === 'reg-or' ? 'Oruro' : cadena.regionalId === 'reg-pt' ? 'Potosí' : cadena.regionalId === 'reg-cb' ? 'Cochabamba' : cadena.regionalId === 'reg-ch' ? 'Chuquisaca' : cadena.regionalId === 'reg-tj' ? 'Tarija' : cadena.regionalId === 'reg-sc' ? 'Santa Cruz' : cadena.regionalId === 'reg-be' ? 'Beni' : cadena.regionalId === 'reg-pa' ? 'Pando' : cadena.regionalId || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Requested specialties section */}
            {cadena.especialidadesRequeridas && cadena.especialidadesRequeridas.length > 0 && (
              <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">Áreas Periciales Solicitadas:</span>
                {cadena.especialidadesRequeridas.map((espId: string) => {
                  const spec = specialtiesList.find(s => s.id === espId);
                  return (
                    <span key={espId} className="bg-olivo-100 text-olivo-900 border border-olivo-200 text-[10px] px-2.5 py-0.5 rounded-lg font-bold">
                      {spec ? spec.nombre : 'Especialidad'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evidence Elements list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">2. Elementos de Prueba Resguardados</span>
              <span className="bg-olivo-100 text-olivo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {cadena.evidencias?.length || 0} ítems
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {cadena.evidencias?.map((ev: Evidencia) => (
                <div key={ev.id} className="p-4 flex gap-4 items-start hover:bg-slate-50/40 transition">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{ev.tipo}</span>
                        <span className="mono-font text-[9px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded font-bold">{ev.codigo}</span>
                      </div>
                      <p className="text-slate-500 font-medium leading-relaxed">{ev.descripcion}</p>
                    </div>

                    <div className="space-y-1 text-slate-500">
                      <div><span className="font-bold text-slate-400">Cantidad:</span> <span className="text-slate-700">{ev.cantidad} pzs</span></div>
                    </div>

                    <div className="space-y-1 text-slate-500">
                      <div><span className="font-bold text-slate-400">Embalaje:</span> <span className="text-slate-700 truncate block max-w-[140px]">{ev.embalaje}</span></div>
                      <div><span className="font-bold text-slate-400">Estado Físico:</span> <span className="text-slate-700">{ev.estado}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documental management (PDF reports & Photos upload) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5">
              <span className="font-bold text-xs text-slate-800">3. Documentación Oficial y Evidencia Gráfica</span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File Dropzone drag and drop */}
              {user.rol === 'SUPERVISOR' ? (
                <div className="space-y-4 bg-slate-50 border border-slate-200/60 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                  <Paperclip className="w-8 h-8 text-slate-300" />
                  <h4 className="font-bold text-slate-700 text-xs">Acceso de Solo Lectura</h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-xs">
                    Como Supervisor Nacional, su cuenta tiene restricciones de escritura. No puede subir archivos ni dictámenes técnicos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cargar Dictamen / Fotografía</span>
                  
                  {/* Description of file */}
                  <input 
                    type="text" 
                    placeholder="Descripción del documento (ej. Requerimiento Fiscal, Fotografía de arma)"
                    value={uploadDesc}
                    onChange={e => setUploadDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none transition"
                  />

                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                      isDragging 
                        ? 'border-olivo-700 bg-olivo-100/20' 
                        : 'border-slate-200 hover:border-olivo-500 hover:bg-slate-50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-slate-400" />
                    <div className="text-xs">
                      <span className="font-bold text-olivo-800">Arrastra archivos aquí</span> o haz clic para subir
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Formatos permitidos: PDF, DOCX, JPG, PNG (Max 15MB)</span>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={onFileSelected}
                      className="hidden" 
                      accept=".pdf,.docx,.jpg,.png"
                    />
                  </div>
                </div>
              )}

              {/* Uploaded Documents List */}
              <div className="space-y-4 border-l border-slate-100 pl-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archivos Adjuntos</span>
                {cadena.documentos?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium">
                    No hay archivos adjuntos en esta cadena.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {cadena.documentos?.map((doc: Documento) => (
                      <div 
                        key={doc.id} 
                        className="p-3 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="overflow-hidden">
                            <span className="font-bold text-slate-700 truncate block">{doc.nombreArchivo}</span>
                            <span className="text-[9px] text-slate-400 font-semibold block">{doc.descripcion}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0 uppercase">
                          {doc.tipoArchivo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Status controllers, assigned peritos, Timeline (Col-4) */}
        <div className="space-y-6 lg:col-span-4">
          
          {/* Active status controller */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              Progreso y Control del Peritaje
            </h3>

            {user.rol === 'SUPERVISOR' ? (
              <div className="text-center py-6 text-slate-400">
                <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700 text-xs">Monitoreo Nacional</h4>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 max-w-xs mx-auto">
                  El rol Supervisor tiene privilegios exclusivos de auditoría de solo lectura y no puede modificar el estado de la cadena.
                </p>
              </div>
            ) : (
              <form onSubmit={handleStatusChange} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Actualizar Estado</label>
                  <select
                    value={newState}
                    onChange={e => setNewState(e.target.value as EstadoCadena)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    {/* Conditional options based on user role */}
                    {user.rol === 'PERITO' ? (
                      <>
                        <option value="EN_ANALISIS">EN ANÁLISIS</option>
                        <option value="EN_PROCESO">EN PROCESO</option>
                        <option value="FINALIZADA">FINALIZADA (Informe Listo)</option>
                      </>
                    ) : (
                      <>
                        <option value="RECIBIDA">RECIBIDA (En Custodia)</option>
                        <option value="EN_ANALISIS">EN ANÁLISIS</option>
                        <option value="EN_PROCESO">EN PROCESO</option>
                        <option value="FINALIZADA">FINALIZADA</option>
                        <option value="ENTREGADA">ENTREGADA (Cerrada)</option>
                        <option value="ARCHIVADA">ARCHIVADA</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {user.rol === 'PERITO' ? 'Dictamen Técnico / Observaciones *' : 'Observación de Custodia'}
                  </label>
                  <textarea 
                    rows={3}
                    placeholder={user.rol === 'PERITO' ? 'Ingrese detalles del peritaje, resultados técnicos o del dictamen forense...' : 'Detalles de la transferencia, actas o justificaciones...'}
                    value={obsTecnicas}
                    onChange={e => setObsTecnicas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-olivo-500 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                    required={user.rol === 'PERITO'}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-olivo-800 hover:bg-olivo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  Registrar Movimiento
                </button>
              </form>
            )}
          </div>

          {/* Assigned peritos list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                Peritos Científicos Asignados
              </h3>
              {(user.rol === 'ENCARGADO' || user.rol === 'ADMINISTRADOR') && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="text-[10px] text-olivo-800 hover:text-olivo-700 font-extrabold flex items-center gap-0.5 focus:outline-none"
                >
                  <Plus className="w-3 h-3" />
                  Asignar
                </button>
              )}
            </div>

            {cadena.peritosAsignados?.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No hay peritos asignados para realizar análisis en esta cadena.
              </div>
            ) : (
              <div className="space-y-3">
                {cadena.peritosAsignados?.map((pa: any) => {
                  const peritoUser = allUsers.find(u => u.id === pa.peritoId);
                  return (
                    <div key={pa.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 font-bold text-slate-600 flex items-center justify-center shrink-0">
                          {pa.nombre[0]}
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-bold text-slate-700 block truncate text-xs">{pa.nombre}</span>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">{pa.cargo}</span>
                        </div>
                      </div>
                      
                      {peritoUser && peritoUser.especialidades && peritoUser.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-9.5">
                          {peritoUser.especialidades.map((espId: string) => {
                            const spec = specialtiesList.find(s => s.id === espId);
                            if (!spec) return null;
                            return (
                              <span key={espId} className="bg-white text-slate-500 border border-slate-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                                {spec.nombre}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trazabilidad Linea de Tiempo */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              Trazabilidad de Custodia (Línea de Tiempo)
            </h3>

            <div className="relative pl-6 space-y-5 timeline-dashed text-xs">
              {cadena.historiales?.map((h: Historial) => (
                <div key={h.id} className="relative">
                  {/* Point */}
                  <span className="absolute -left-[14px] top-1.5 w-2 h-2 rounded-full bg-oro-600 border border-white ring-4 ring-oro-600/10"></span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>{h.fecha} • {h.hora}</span>
                      <span className="text-olivo-800 truncate max-w-[100px]" title={h.usuarioNombre}>{h.usuarioNombre.split(' ').pop()}</span>
                    </div>
                    <h5 className="font-bold text-slate-800">{h.accion}</h5>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{h.observaciones}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Assignment peritos Modal (Only for Custodias/Admins) */}
      {showAssignModal && (() => {
        // Helper to check match
        const peritoMatchesChain = (perito: User) => {
          if (!cadena.especialidadesRequeridas || cadena.especialidadesRequeridas.length === 0) return true;
          if (!perito.especialidades || perito.especialidades.length === 0) return false;
          return perito.especialidades.some(espId => cadena.especialidadesRequeridas.includes(espId));
        };

        // Filter and sort
        const hasRequirements = cadena.especialidadesRequeridas && cadena.especialidadesRequeridas.length > 0;
        const filteredPeritos = allUsers.filter(perito => {
          if (showOnlyRecommended && hasRequirements) {
            return peritoMatchesChain(perito);
          }
          return true;
        });

        const sortedPeritos = [...filteredPeritos].sort((a, b) => {
          const aMatches = peritoMatchesChain(a);
          const bMatches = peritoMatchesChain(b);
          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
          return 0;
        });

        return (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="title-font font-bold text-sm text-slate-800">Asignación de Peritos Forenses</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Asignación inteligente por especialidad requerida</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Case requirement overview */}
                {hasRequirements && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Especialidades requeridas para este caso:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cadena.especialidadesRequeridas.map((espId: string) => {
                        const spec = specialtiesList.find(s => s.id === espId);
                        return (
                          <span key={espId} className="bg-olivo-100 text-olivo-900 border border-olivo-200 text-[10px] px-2.5 py-0.5 rounded-lg font-bold">
                            {spec ? spec.nombre : 'Especialidad'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Intelligent filtering toggle */}
                {hasRequirements && (
                  <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <div className="leading-tight">
                      <span className="text-xs font-bold text-emerald-900 block">Filtro Inteligente Activo</span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">Mostrar solo peritos que coinciden con las pericias solicitadas</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={showOnlyRecommended}
                        onChange={(e) => setShowOnlyRecommended(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-olivo-800"></div>
                    </label>
                  </div>
                )}

                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Seleccione uno o varios especialistas ({sortedPeritos.length} disponibles):
                </span>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {sortedPeritos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      No hay peritos que coincidan con los filtros seleccionados.
                    </div>
                  ) : (
                    sortedPeritos.map(perito => {
                      const isChecked = selectedPeritos.includes(perito.id);
                      const isSpecialist = peritoMatchesChain(perito);
                      return (
                        <label 
                          key={perito.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-slate-50 transition text-xs font-semibold ${
                            isChecked ? 'border-olivo-500 bg-olivo-100/10' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedPeritos(selectedPeritos.filter(id => id !== perito.id));
                              } else {
                                setSelectedPeritos([...selectedPeritos, perito.id]);
                              }
                            }}
                            className="mt-0.5 rounded text-olivo-800 focus:ring-olivo-500 h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-700 font-bold">{perito.nombre} {perito.apellidos}</span>
                              {hasRequirements && isSpecialist && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                  Especialista Coincidente
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{perito.cargo}</span>
                            {/* Specialties tags */}
                            {perito.especialidades && perito.especialidades.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {perito.especialidades.map(espId => {
                                  const spec = specialtiesList.find(s => s.id === espId);
                                  if (!spec) return null;
                                  const matches = cadena.especialidadesRequeridas?.includes(espId);
                                  return (
                                    <span key={espId} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                      matches 
                                        ? 'bg-olivo-100 text-olivo-900 border border-olivo-200' 
                                        : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                                    }`}>
                                      {spec.nombre}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignPeritos}
                    className="px-5 py-2 bg-olivo-800 hover:bg-olivo-700 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    Asignar y Notificar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
