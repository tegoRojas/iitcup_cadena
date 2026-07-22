export type Rol = 'ADMINISTRADOR' | 'ENCARGADO' | 'PERITO' | 'SUPERVISOR';
export type EstadoCadena = 'RECIBIDA' | 'EN_ANALISIS' | 'EN_PROCESO' | 'FINALIZADA' | 'ENTREGADA' | 'ARCHIVADA';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface Regional {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoUsuario;
  createdAt: string;
}

export interface User {
  id: string;
  nombre: string;
  apellidos: string;
  ci: string;
  cargo: string;
  correo: string;
  telefono: string;
  usuario: string;
  rol: Rol;
  estado: EstadoUsuario;
  especialidades?: string[]; // array of specialty IDs
  regionalId?: string; // Optional for compatibility but logically mandatory
  regional_id?: string; // For compatibility
  createdAt: string;
  updatedAt: string;
}

export interface CadenaCustodia {
  codigoUnico: string;
  nroCadena: string;
  rup?: string;
  unidad?: string;
  regionalId?: string;
  caso: string;
  fiscalia: string;
  fiscal: string;
  investigador: string;
  fecha: string;
  hora: string;
  lugar: string;
  estadoActual: EstadoCadena;
  especialidadesRequeridas?: string[]; // array of specialty IDs
  createdAt: string;
  updatedAt: string;
}

export interface Evidencia {
  id: string;
  cadenaCodigo: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  cantidad: number;
  embalaje: string;
  estado: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeritoAsignado {
  id: string;
  peritoId: string;
  especialidadId?: string; // added field
  nombre: string;
  cargo: string;
  fechaAsignacion: string;
  asignadoPor: string;
  estadoAsignacion: string;
}

export interface Documento {
  id: string;
  cadenaCodigo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  fechaCarga: string;
  cargadoPorId: string;
  descripcion: string;
  tamano: number;
}

export interface Historial {
  id: string;
  cadenaCodigo: string;
  fecha: string;
  hora: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: string;
  observaciones?: string;
  createdAt: string;
}

export interface Auditoria {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  fecha: string;
  hora: string;
  accion: string;
  ip: string;
  navegador: string;
  createdAt: string;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export interface DashboardStats {
  total: number;
  pendientes: number;
  enAnalisis: number;
  enProceso: number;
  finalizadas: number;
  entregadas: number;
  archivadas: number;
  evidenciasRegistradas: number;
  peritosActivos: number;
  distribucionEstados: { name: string; value: number }[];
  temporal: { mes: string; cantidad: number }[];
}
