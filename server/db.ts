import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// -------------------------------------------------------------
// Database Types conforming to schema.prisma
// -------------------------------------------------------------
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

export interface User {
  id: string;
  nombre: string;
  apellidos: string;
  ci: string;
  cargo: string;
  correo: string;
  telefono: string;
  usuario: string;
  contrasenaHash: string; // Plain-text verified or SHA256 hashed
  rol: Rol;
  estado: EstadoUsuario;
  especialidades?: string[]; // array of specialty IDs (Many-to-Many bridge)
  regionalId?: string; // Optional for compatibility but logically mandatory
  regional_id?: string; // For compatibility
  createdAt: string;
  updatedAt: string;
}

export interface Especialidad {
  id: string;
  nombre: string;
  descripcion: string;
  estado: EstadoUsuario;
  createdAt: string;
}

export interface CadenaCustodia {
  codigoUnico: string; // Format: IITCUP-SC-YYYY-XXXXX
  nroCadena: string;   // Format: CC-YYYY-XXXXX
  rup?: string;
  unidad?: string;
  regionalId?: string;
  caso: string;        // e.g. FELCC-SC-10293/2026
  fiscalia: string;    // e.g. Fiscalía Departamental de Santa Cruz
  fiscal: string;      // e.g. Dr. Roger Mariaca
  investigador: string; // e.g. Sgto. 1ro. Juan Choque
  fecha: string;       // YYYY-MM-DD
  hora: string;        // HH:MM
  lugar: string;       // e.g. Plan Tres Mil, Calle 5
  estadoActual: EstadoCadena;
  especialidadesRequeridas?: string[]; // array of specialty IDs (Many-to-Many bridge)
  createdAt: string;
  updatedAt: string;
}

export interface Evidencia {
  id: string;
  cadenaCodigo: string;
  codigo: string;       // Format: EVID-XXXXX
  tipo: string;         // e.g. Arma de fuego, Sustancia controlada
  descripcion: string;
  cantidad: number;
  embalaje: string;     // e.g. Bolsa de polietileno sellada, Caja de cartón
  estado: string;       // e.g. Cerrado, Abierto en Laboratorio, Lacrado
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeritoAsignado {
  id: string;
  cadenaCodigo: string;
  peritoId: string;
  especialidadId?: string; // added relation to specialty
  fechaAsignacion: string;
  asignadoPor: string;
  estadoAsignacion: string; // PENDIENTE, ACEPTADA, RECHAZADA, EN_PROCESO, FINALIZADA
}

export interface Documento {
  id: string;
  cadenaCodigo: string;
  nombreArchivo: string;
  tipoArchivo: string; // pdf, docx, png, jpg
  fechaCarga: string;
  cargadoPorId: string;
  descripcion: string;
  tamano: number; // in bytes
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

export interface DbSchema {
  regionales: Regional[];
  users: User[];
  especialidades: Especialidad[];
  cadenas: CadenaCustodia[];
  evidencias: Evidencia[];
  peritosAsignados: PeritoAsignado[];
  documentos: Documento[];
  historiales: Historial[];
  auditorias: Auditoria[];
  notificaciones: Notificacion[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Helper to hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// -------------------------------------------------------------
// Seeding & Initialization
// -------------------------------------------------------------
const INITIAL_ESPECIALIDADES: Especialidad[] = [
  {
    id: 'esp-1',
    nombre: 'Informática Forense',
    descripcion: 'Análisis y extracción de evidencias de dispositivos digitales, redes y sistemas informáticos.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-2',
    nombre: 'Balística Forense',
    descripcion: 'Estudio de armas de fuego, proyectiles, vainas, trayectorias y efectos de disparos.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-3',
    nombre: 'Documentología',
    descripcion: 'Análisis grafotécnico y documentológico de firmas, escrituras, alteración de documentos y papel moneda.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-4',
    nombre: 'Psicología Forense',
    descripcion: 'Evaluación psicológica de víctimas, imputados y testigos en procesos de investigación legal.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-5',
    nombre: 'Toxicología',
    descripcion: 'Identificación y cuantificación de toxinas, drogas, precursores químicos y venenos.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-6',
    nombre: 'Criminalística',
    descripcion: 'Procesamiento de escenas, levantamiento de indicios, dactiloscopia y análisis forense general.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'esp-7',
    nombre: 'Accidentología Vial',
    descripcion: 'Reconstrucción de siniestros de tránsito, velocidad de impacto, fallas mecánicas y responsabilidades.',
    estado: 'ACTIVO',
    createdAt: '2026-01-10T08:00:00Z'
  }
];

export const INITIAL_REGIONALES: Regional[] = [
  { id: 'reg-lp', nombre: 'La Paz', codigo: '1', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-ea', nombre: 'El Alto', codigo: '2', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-or', nombre: 'Oruro', codigo: '3', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-pt', nombre: 'Potosí', codigo: '4', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-cb', nombre: 'Cochabamba', codigo: '5', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-ch', nombre: 'Chuquisaca', codigo: '6', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-tj', nombre: 'Tarija', codigo: '7', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-sc', nombre: 'Santa Cruz', codigo: '8', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-bn', nombre: 'Beni', codigo: '9', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' },
  { id: 'reg-pa', nombre: 'Pando', codigo: '0', activo: true, fecha_creacion: '2026-01-10T08:00:00Z' }
];

const INITIAL_USERS: User[] = [
  // 1 Administrador
  {
    id: 'u-admin-01',
    nombre: 'Wilmer',
    apellidos: 'Condori Mamani',
    ci: '5489102-SC',
    cargo: 'Administrador de Plataforma y Seguridad IITCUP',
    correo: 'admin@iitcup.bo',
    telefono: '76045812',
    usuario: 'admin',
    contrasenaHash: hashPassword('admin123'),
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
    regionalId: 'reg-sc',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  // 1 Supervisor Nacional (Nuevo Rol)
  {
    id: 'u-sup-01',
    nombre: 'Juan Carlos',
    apellidos: 'Torres Perez',
    ci: '1234567-LP',
    cargo: 'Supervisor Nacional de Custodia IITCUP',
    correo: 'supervisor@iitcup.bo',
    telefono: '77788899',
    usuario: 'supervisor',
    contrasenaHash: hashPassword('supervisor123'),
    rol: 'SUPERVISOR',
    estado: 'ACTIVO',
    regionalId: 'reg-lp',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z'
  },
  // 2 Encargados
  {
    id: 'u-enc-01',
    nombre: 'Tte. Ramiro',
    apellidos: 'Villca Choque',
    ci: '6320594-SC',
    cargo: 'Encargado de Custodia y Recepción de Evidencias',
    correo: 'rvillca@iitcup.bo',
    telefono: '78512345',
    usuario: 'encargado1',
    contrasenaHash: hashPassword('password123'),
    rol: 'ENCARGADO',
    estado: 'ACTIVO',
    regionalId: 'reg-sc',
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-01-12T09:00:00Z'
  },
  {
    id: 'u-enc-02',
    nombre: 'Subtte. Sofía',
    apellidos: 'Zabala Ortiz',
    ci: '7481029-SC',
    cargo: 'Encargada de Custodia - Turno B',
    correo: 'szabala@iitcup.bo',
    telefono: '71049281',
    usuario: 'encargado2',
    contrasenaHash: hashPassword('password123'),
    rol: 'ENCARGADO',
    estado: 'ACTIVO',
    regionalId: 'reg-sc',
    createdAt: '2026-01-15T14:30:00Z',
    updatedAt: '2026-01-15T14:30:00Z'
  },
  // 5 Peritos with multiple specialties support
  {
    id: 'u-per-01',
    nombre: 'Cap. Dr. Hugo',
    apellidos: 'Serrano Vargas',
    ci: '5910283-SC',
    cargo: 'Perito Especialista en Balística Forense',
    correo: 'hserrano@iitcup.bo',
    telefono: '76891023',
    usuario: 'perito1',
    contrasenaHash: hashPassword('password123'),
    rol: 'PERITO',
    estado: 'ACTIVO',
    especialidades: ['esp-2'], // Balística Forense
    regionalId: 'reg-sc',
    createdAt: '2026-01-11T10:00:00Z',
    updatedAt: '2026-01-11T10:00:00Z'
  },
  {
    id: 'u-per-02',
    nombre: 'Sgto. My. Lucía',
    apellidos: 'Pinto Mendoza',
    ci: '4920193-LP',
    cargo: 'Perito en Dactiloscopia y Huellografía Forense',
    correo: 'lpinto@iitcup.bo',
    telefono: '72183940',
    usuario: 'perito2',
    contrasenaHash: hashPassword('password123'),
    rol: 'PERITO',
    estado: 'ACTIVO',
    especialidades: ['esp-6'], // Criminalística
    regionalId: 'reg-sc',
    createdAt: '2026-01-11T11:00:00Z',
    updatedAt: '2026-01-11T11:00:00Z'
  },
  {
    id: 'u-per-03',
    nombre: 'Dra. Patricia',
    apellidos: 'Arancibia Arce',
    ci: '3948102-CH',
    cargo: 'Perito de Laboratorio de Química y Toxicología Forense',
    correo: 'parancibia@iitcup.bo',
    telefono: '73481029',
    usuario: 'perito3',
    contrasenaHash: hashPassword('password123'),
    rol: 'PERITO',
    estado: 'ACTIVO',
    especialidades: ['esp-5'], // Toxicología
    regionalId: 'reg-sc',
    createdAt: '2026-01-12T08:30:00Z',
    updatedAt: '2026-01-12T08:30:00Z'
  },
  {
    id: 'u-per-04',
    nombre: 'Ing. Carlos',
    apellidos: 'Villanueva Prado',
    ci: '8392019-SC',
    cargo: 'Perito en Informática Forense y Análisis Digital',
    correo: 'cvillanueva@iitcup.bo',
    telefono: '71524310',
    usuario: 'perito4',
    contrasenaHash: hashPassword('password123'),
    rol: 'PERITO',
    estado: 'ACTIVO',
    especialidades: ['esp-1'], // Informática Forense
    regionalId: 'reg-sc',
    createdAt: '2026-01-12T14:00:00Z',
    updatedAt: '2026-01-12T14:00:00Z'
  },
  {
    id: 'u-per-05',
    nombre: 'Dra. Miriam',
    apellidos: 'Vargas Alarcón',
    ci: '4820193-OR',
    cargo: 'Perito en Grafotecnia y Documentología Forense',
    correo: 'mvargas@iitcup.bo',
    telefono: '75019283',
    usuario: 'perito5',
    contrasenaHash: hashPassword('password123'),
    rol: 'PERITO',
    estado: 'ACTIVO',
    especialidades: ['esp-3'], // Documentología
    regionalId: 'reg-sc',
    createdAt: '2026-01-14T09:15:00Z',
    updatedAt: '2026-01-14T09:15:00Z'
  }
];

// Seed 10 Cadenas de Custodia
const INITIAL_CADENAS: CadenaCustodia[] = [
  {
    codigoUnico: 'IITCUP-SC-2026-00001',
    nroCadena: 'CC-2026-1029',
    caso: 'FELCC-SC-10293/2026',
    fiscalia: 'Fiscalía Departamental - Unidad de Delitos Contra la Vida',
    fiscal: 'Dr. Roger Mariaca',
    investigador: 'Sgto. 1ro. Juan de Dios Choque',
    fecha: '2026-07-10',
    hora: '09:30',
    lugar: 'Av. San Aurelio, 3er Anillo Interno',
    estadoActual: 'EN_ANALISIS',
    especialidadesRequeridas: ['esp-2', 'esp-6'], // Balística Forense, Criminalística
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-11T14:30:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00002',
    nroCadena: 'CC-2026-1030',
    caso: 'FELCN-SC-08472/2026',
    fiscalia: 'Fiscalía de Sustancias Controladas',
    fiscal: 'Dra. Janet Salguero',
    investigador: 'Cbo. Andrés Mamani Soliz',
    fecha: '2026-07-11',
    hora: '14:20',
    lugar: 'Barrio Los Olivos, Zona Plan Tres Mil',
    estadoActual: 'RECIBIDA',
    especialidadesRequeridas: ['esp-5'], // Toxicología
    createdAt: '2026-07-11T15:00:00Z',
    updatedAt: '2026-07-11T15:00:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00003',
    nroCadena: 'CC-2026-1031',
    caso: 'FELCC-SC-03829/2026',
    fiscalia: 'Fiscalía de Delitos Patrimoniales',
    fiscal: 'Dr. Daniel Lobos',
    investigador: 'Sof. 2do. Marcelo Quispe',
    fecha: '2026-07-12',
    hora: '11:05',
    lugar: 'Av. Beni, entre 4to y 5to Anillo',
    estadoActual: 'EN_PROCESO',
    especialidadesRequeridas: ['esp-1'], // Informática Forense
    createdAt: '2026-07-12T11:45:00Z',
    updatedAt: '2026-07-13T09:00:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00004',
    nroCadena: 'CC-2026-1032',
    caso: 'FELCC-SC-11400/2026',
    fiscalia: 'Fiscalía de Corrupción Pública',
    fiscal: 'Dra. Claudia Justiniano',
    investigador: 'My. Gustavo Arteaga Flores',
    fecha: '2026-07-13',
    hora: '16:45',
    lugar: 'Oficinas Administrativas, Zona Equipetrol',
    estadoActual: 'FINALIZADA',
    especialidadesRequeridas: ['esp-3'], // Documentología
    createdAt: '2026-07-13T17:30:00Z',
    updatedAt: '2026-07-15T16:00:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00005',
    nroCadena: 'CC-2026-1033',
    caso: 'FELCV-SC-02941/2026',
    fiscalia: 'Fiscalía de Delitos en Razón de Género',
    fiscal: 'Dr. Álvaro Escalante',
    investigador: 'Sgto. 2do. Carmen Rosa Silva',
    fecha: '2026-07-14',
    hora: '08:15',
    lugar: 'Barrio Urbari, Calle Almirante Brown',
    estadoActual: 'ENTREGADA',
    especialidadesRequeridas: ['esp-6'], // Criminalística
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-16T11:30:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00006',
    nroCadena: 'CC-2026-1034',
    caso: 'FELCC-SC-12019/2026',
    fiscalia: 'Fiscalía de Delitos Económicos',
    fiscal: 'Dr. Roberto Méndez',
    investigador: 'Cbo. Jorge Toro',
    fecha: '2026-07-15',
    hora: '10:00',
    lugar: 'Mutualista 3er Anillo Externo',
    estadoActual: 'ARCHIVADA',
    especialidadesRequeridas: ['esp-3'], // Documentología
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00007',
    nroCadena: 'CC-2026-1035',
    caso: 'FELCN-SC-08920/2026',
    fiscalia: 'Fiscalía de Sustancias Controladas',
    fiscal: 'Dra. Janet Salguero',
    investigador: 'Sgto. 1ro. Juan de Dios Choque',
    fecha: '2026-07-15',
    hora: '22:15',
    lugar: 'Carretera al Norte, Km 12',
    estadoActual: 'EN_PROCESO',
    especialidadesRequeridas: ['esp-5'], // Toxicología
    createdAt: '2026-07-16T08:30:00Z',
    updatedAt: '2026-07-16T09:45:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00008',
    nroCadena: 'CC-2026-1036',
    caso: 'FELCC-SC-12501/2026',
    fiscalia: 'Fiscalía Unidad de Homicidios',
    fiscal: 'Dr. Roger Mariaca',
    investigador: 'Sof. 1ro. Alberto Vargas',
    fecha: '2026-07-16',
    hora: '11:30',
    lugar: 'Barrio La Colorada, 5to Anillo',
    estadoActual: 'EN_ANALISIS',
    especialidadesRequeridas: ['esp-6'], // Criminalística (Huellas)
    createdAt: '2026-07-16T12:00:00Z',
    updatedAt: '2026-07-17T08:30:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00009',
    nroCadena: 'CC-2026-1037',
    caso: 'FELCC-SC-13010/2026',
    fiscalia: 'Fiscalía de Delitos Patrimoniales',
    fiscal: 'Dr. Daniel Lobos',
    investigador: 'Sgto. 2do. Marcelo Quispe',
    fecha: '2026-07-17',
    hora: '15:20',
    lugar: 'Av. El Trompillo, Frente al Aeropuerto',
    estadoActual: 'RECIBIDA',
    especialidadesRequeridas: ['esp-1'], // Informática Forense
    createdAt: '2026-07-17T16:00:00Z',
    updatedAt: '2026-07-17T16:00:00Z'
  },
  {
    codigoUnico: 'IITCUP-SC-2026-00010',
    nroCadena: 'CC-2026-1038',
    caso: 'FELCC-SC-13115/2026',
    fiscalia: 'Fiscalía de Corrupción Pública',
    fiscal: 'Dra. Claudia Justiniano',
    investigador: 'Sof. Mayor Marcos Quispe',
    fecha: '2026-07-18',
    hora: '09:00',
    lugar: 'Av. Busch y 2do Anillo',
    estadoActual: 'RECIBIDA',
    especialidadesRequeridas: ['esp-3', 'esp-6'], // Documentología, Criminalística
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z'
  }
];

const INITIAL_EVIDENCIAS: Evidencia[] = [
  // Cadenas de Custodia con sus Evidencias
  {
    id: 'e-01',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    codigo: 'EVID-2026-09210',
    tipo: 'Arma de Fuego',
    descripcion: 'Pistola 9mm, marca Taurus, modelo PT92, color negro con número de serie limado, un cargador metálico y 5 cartuchos sin percutir.',
    cantidad: 1,
    embalaje: 'Bolsa de polietileno transparente sellada con precinto de seguridad.',
    estado: 'Lacrado',
    observaciones: 'Presenta manchas pardo rojizas (presumible sangre) en la empuñadura.',
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-10T10:00:00Z'
  },
  {
    id: 'e-02',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    codigo: 'EVID-2026-09211',
    tipo: 'Vainas Servidas',
    descripcion: 'Tres vainas de latón percutidas calibre 9mm, recolectadas en la escena del crimen.',
    cantidad: 3,
    embalaje: 'Sobre de papel manila sellado con firma del recolector.',
    estado: 'Lacrado',
    observaciones: 'Marcas de percusión visibles en la base.',
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-10T10:00:00Z'
  },
  {
    id: 'e-03',
    cadenaCodigo: 'IITCUP-SC-2026-00002',
    codigo: 'EVID-2026-09212',
    tipo: 'Sustancias Controladas',
    descripcion: 'Paquete en forma de ladrillo envuelto en cinta adhesiva color beige, conteniendo una sustancia blanquecina pastosa, presumiblemente cocaína.',
    cantidad: 1,
    embalaje: 'Bolsa de polietileno de alta densidad sellada con calor.',
    estado: 'Lacrado',
    observaciones: 'Marcado con un logo de un delfín sobre el envoltorio de cinta.',
    createdAt: '2026-07-11T15:00:00Z',
    updatedAt: '2026-07-11T15:00:00Z'
  },
  {
    id: 'e-04',
    cadenaCodigo: 'IITCUP-SC-2026-00003',
    codigo: 'EVID-2026-09213',
    tipo: 'Dispositivo Móvil',
    descripcion: 'Teléfono celular smartphone Samsung Galaxy S21 Ultra, color gris, pantalla trizada, con chip de Entel y tarjeta de memoria MicroSD de 64GB.',
    cantidad: 1,
    embalaje: 'Caja de cartón pequeña, envuelta en papel madera y sellada con precinto IITCUP.',
    estado: 'Lacrado',
    observaciones: 'Apagado al momento del secuestro. No se cuenta con patrón de desbloqueo.',
    createdAt: '2026-07-12T11:45:00Z',
    updatedAt: '2026-07-12T11:45:00Z'
  },
  {
    id: 'e-05',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    codigo: 'EVID-2026-09214',
    tipo: 'Documentos',
    descripcion: 'Contrato de Adjudicación de obras públicas, folios del 1 al 45, con firmas de personeros municipales de Santa Cruz.',
    cantidad: 45,
    embalaje: 'Carpeta plástica hermética sellada con cinta adhesiva de seguridad.',
    estado: 'Lacrado',
    observaciones: 'Se requiere pericia caligráfica para verificar autenticidad de firmas en página 45.',
    createdAt: '2026-07-13T17:30:00Z',
    updatedAt: '2026-07-13T17:30:00Z'
  },
  {
    id: 'e-06',
    cadenaCodigo: 'IITCUP-SC-2026-00005',
    codigo: 'EVID-2026-09215',
    tipo: 'Prenda de Vestir',
    descripcion: 'Camisa manga larga color blanco con manchas pardo rojizas abundantes en la región pectoral y manga derecha.',
    cantidad: 1,
    embalaje: 'Bolsa de papel craft kraft transpirable para evitar putrefacción de muestras biológicas.',
    estado: 'Lacrado',
    observaciones: 'Húmeda al momento de embalar. Se secó previamente en ambiente controlado.',
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-14T09:00:00Z'
  },
  {
    id: 'e-07',
    cadenaCodigo: 'IITCUP-SC-2026-00006',
    codigo: 'EVID-2026-09216',
    tipo: 'Moneda / Efectivo',
    descripcion: 'Fajos de dinero en efectivo que totalizan la suma de 50,000 Bolivianos en cortes de 200 y 100 Bolivianos.',
    cantidad: 250,
    embalaje: 'Bolsa de seguridad bancaria con código de barras de control y precintado inviolable.',
    estado: 'Lacrado',
    observaciones: 'Secuestrado en operativo por sospecha de enriquecimiento ilícito.',
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-15T11:00:00Z'
  },
  {
    id: 'e-08',
    cadenaCodigo: 'IITCUP-SC-2026-00007',
    codigo: 'EVID-2026-09217',
    tipo: 'Sustancias Químicas',
    descripcion: 'Frasco de vidrio de color ámbar conteniendo aproximadamente 500 ml de una sustancia líquida transparente con fuerte olor químico, sospechoso de ser precursor químico (Ácido Sulfúrico).',
    cantidad: 1,
    embalaje: 'Contenedor plástico antigoteo con material absorbente de amortiguación.',
    estado: 'Lacrado',
    observaciones: 'Altamente corrosivo e inflamable. Manipular con guantes de nitrilo gruesos.',
    createdAt: '2026-07-16T08:30:00Z',
    updatedAt: '2026-07-16T08:30:00Z'
  },
  {
    id: 'e-09',
    cadenaCodigo: 'IITCUP-SC-2026-00008',
    codigo: 'EVID-2026-09218',
    tipo: 'Muestras Biológicas',
    descripcion: 'Hisopos esterilizados que contienen fluidos biológicos tomados de la víctima para pericia de ADN.',
    cantidad: 2,
    embalaje: 'Tubos de ensayo plásticos estériles guardados en sobre térmico.',
    estado: 'Lacrado',
    observaciones: 'Mantener en refrigeración constante a 4 grados Celsius.',
    createdAt: '2026-07-16T12:00:00Z',
    updatedAt: '2026-07-16T12:00:00Z'
  },
  {
    id: 'e-10',
    cadenaCodigo: 'IITCUP-SC-2026-00009',
    codigo: 'EVID-2026-09219',
    tipo: 'Computadora Portátil',
    descripcion: 'Laptop marca Lenovo ThinkPad, color negro, con cargador de energía original, usada presumiblemente para transacciones de estafa digital.',
    cantidad: 1,
    embalaje: 'Caja metálica protectora para evitar alteración por campos electromagnéticos externos.',
    estado: 'Lacrado',
    observaciones: 'Se requiere preservación e imagen forense del disco de almacenamiento SSD.',
    createdAt: '2026-07-17T16:00:00Z',
    updatedAt: '2026-07-17T16:00:00Z'
  }
];

// Seed 3 initial perito asignaciones to simulate active workload
const INITIAL_ASIGNACIONES: PeritoAsignado[] = [
  {
    id: 'pa-01',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    peritoId: 'u-per-01', // Hugo Serrano - Balistica
    especialidadId: 'esp-2', // Balística Forense
    fechaAsignacion: '2026-07-10T11:00:00Z',
    asignadoPor: 'Tte. Ramiro Villca Choque',
    estadoAsignacion: 'PENDIENTE'
  },
  {
    id: 'pa-02',
    cadenaCodigo: 'IITCUP-SC-2026-00003',
    peritoId: 'u-per-04', // Carlos Villanueva - Informática
    especialidadId: 'esp-1', // Informática Forense
    fechaAsignacion: '2026-07-12T14:30:00Z',
    asignadoPor: 'Tte. Ramiro Villca Choque',
    estadoAsignacion: 'PENDIENTE'
  },
  {
    id: 'pa-03',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    peritoId: 'u-per-05', // Miriam Vargas - Documentologia
    especialidadId: 'esp-3', // Documentología
    fechaAsignacion: '2026-07-13T18:00:00Z',
    asignadoPor: 'Subtte. Sofía Zabala Ortiz',
    estadoAsignacion: 'FINALIZADA'
  },
  {
    id: 'pa-04',
    cadenaCodigo: 'IITCUP-SC-2026-00007',
    peritoId: 'u-per-03', // Patricia Arancibia - Química
    especialidadId: 'esp-5', // Toxicología
    fechaAsignacion: '2026-07-16T09:00:00Z',
    asignadoPor: 'Subtte. Sofía Zabala Ortiz',
    estadoAsignacion: 'PENDIENTE'
  },
  {
    id: 'pa-05',
    cadenaCodigo: 'IITCUP-SC-2026-00008',
    peritoId: 'u-per-02', // Lucía Pinto - Dactiloscopia
    especialidadId: 'esp-6', // Criminalística
    fechaAsignacion: '2026-07-16T14:00:00Z',
    asignadoPor: 'Tte. Ramiro Villca Choque',
    estadoAsignacion: 'PENDIENTE'
  }
];

const INITIAL_HISTORIALES: Historial[] = [
  {
    id: 'h-01',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    fecha: '2026-07-10',
    hora: '10:00',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    accion: 'CREACIÓN Y APERTURA DE CADENA',
    observaciones: 'Se crea la cadena de custodia con código único IITCUP-SC-2026-00001 correspondiente al caso FELCC-SC-10293/2026. Evidencias lacradas ingresadas en el depósito de custodia.',
    createdAt: '2026-07-10T10:00:00Z'
  },
  {
    id: 'h-02',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    fecha: '2026-07-10',
    hora: '11:00',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    accion: 'ASIGNACIÓN DE PERITO ESPECIALISTA',
    observaciones: 'Se asigna la cadena de custodia al Cap. Dr. Hugo Serrano Vargas de la sección Balística Forense para análisis comparativo y de funcionamiento.',
    createdAt: '2026-07-10T11:00:00Z'
  },
  {
    id: 'h-03',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    fecha: '2026-07-11',
    hora: '08:30',
    usuarioId: 'u-per-01',
    usuarioNombre: 'Cap. Dr. Hugo Serrano Vargas',
    accion: 'RECEPCIÓN FÍSICA EN LABORATORIO',
    observaciones: 'Se recepciona físicamente el arma de fuego y vainas en laboratorio de balística para realizar pruebas de disparo en el tanque de recuperación.',
    createdAt: '2026-07-11T08:30:00Z'
  },
  {
    id: 'h-04',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    fecha: '2026-07-11',
    hora: '14:30',
    usuarioId: 'u-per-01',
    usuarioNombre: 'Cap. Dr. Hugo Serrano Vargas',
    accion: 'ACTUALIZACIÓN DE OBSERVACIONES TÉCNICAS',
    observaciones: 'Se procedió al desarmado parcial del arma. Se detectó huellas de reactivos químicos dactilares y muestras biológicas. En espera de coordinación con Huellografía.',
    createdAt: '2026-07-11T14:30:00Z'
  },
  {
    id: 'h-05',
    cadenaCodigo: 'IITCUP-SC-2026-00002',
    fecha: '2026-07-11',
    hora: '15:00',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    accion: 'CREACIÓN Y APERTURA DE CADENA',
    observaciones: 'Ingreso de paquete suspecho de cocaína (1015 gramos) secuestrado en Plan Tres Mil. Queda en bóveda hermética.',
    createdAt: '2026-07-11T15:00:00Z'
  },
  {
    id: 'h-06',
    cadenaCodigo: 'IITCUP-SC-2026-00003',
    fecha: '2026-07-12',
    hora: '11:45',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    accion: 'CREACIÓN Y APERTURA DE CADENA',
    observaciones: 'Ingreso de teléfono móvil Samsung S21 Ultra secuestrado en escena de robo agravado.',
    createdAt: '2026-07-12T11:45:00Z'
  },
  {
    id: 'h-07',
    cadenaCodigo: 'IITCUP-SC-2026-00003',
    fecha: '2026-07-12',
    hora: '14:30',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    accion: 'ASIGNACIÓN DE PERITO ESPECIALISTA',
    observaciones: 'Se asigna al Ing. Carlos Villanueva Prado para la extracción de mensajería de texto y llamadas del dispositivo.',
    createdAt: '2026-07-12T14:30:00Z'
  },
  {
    id: 'h-08',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    fecha: '2026-07-13',
    hora: '17:30',
    usuarioId: 'u-enc-02',
    usuarioNombre: 'Subtte. Sofía Zabala Ortiz',
    accion: 'CREACIÓN Y APERTURA DE CADENA',
    observaciones: 'Ingreso de folder de 45 folios conteniendo documentos del caso de licitación.',
    createdAt: '2026-07-13T17:30:00Z'
  },
  {
    id: 'h-09',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    fecha: '2026-07-13',
    hora: '18:00',
    usuarioId: 'u-enc-02',
    usuarioNombre: 'Subtte. Sofía Zabala Ortiz',
    accion: 'ASIGNACIÓN DE PERITO ESPECIALISTA',
    observaciones: 'Se asigna a la Dra. Miriam Vargas Alarcón para el estudio comparativo de firmas y caligrafía.',
    createdAt: '2026-07-13T18:00:00Z'
  },
  {
    id: 'h-10',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    fecha: '2026-07-15',
    hora: '16:00',
    usuarioId: 'u-per-05',
    usuarioNombre: 'Dra. Miriam Vargas Alarcón',
    accion: 'INFORME PERICIAL EMITIDO Y CONCLUIDO',
    observaciones: 'Se emite el dictamen pericial IITCUP-GRAFO-083/2026 concluyendo que las firmas estudiadas corresponden indubitablemente al imputado. Documentos devueltos a custodia.',
    createdAt: '2026-07-15T16:00:00Z'
  }
];

const INITIAL_AUDITORIAS: Auditoria[] = [
  {
    id: 'aud-01',
    usuarioId: 'u-admin-01',
    usuarioNombre: 'Wilmer Condori Mamani',
    fecha: '2026-07-18',
    hora: '08:00',
    accion: 'INICIO DE SESIÓN EXITOSO (ADMINISTRADOR)',
    ip: '192.168.10.150',
    navegador: 'Chrome 122.0 / Windows 11',
    createdAt: '2026-07-18T08:00:00Z'
  },
  {
    id: 'aud-02',
    usuarioId: 'u-enc-01',
    usuarioNombre: 'Tte. Ramiro Villca Choque',
    fecha: '2026-07-18',
    hora: '09:15',
    accion: 'CREACIÓN DE NUEVA CADENA DE CUSTODIA (IITCUP-SC-2026-00010)',
    ip: '192.168.10.155',
    navegador: 'Firefox 124.0 / Ubuntu Linux',
    createdAt: '2026-07-18T09:15:00Z'
  },
  {
    id: 'aud-03',
    usuarioId: 'u-per-01',
    usuarioNombre: 'Cap. Dr. Hugo Serrano Vargas',
    fecha: '2026-07-18',
    hora: '10:45',
    accion: 'REGISTRO DE OBSERVACIONES TÉCNICAS (IITCUP-SC-2026-00001)',
    ip: '192.168.10.160',
    navegador: 'Edge 121.0 / Windows 11',
    createdAt: '2026-07-18T10:45:00Z'
  }
];

const INITIAL_NOTIFICACIONES: Notificacion[] = [
  {
    id: 'not-01',
    usuarioId: 'u-per-01',
    titulo: 'Nueva Asignación Pericial',
    mensaje: 'Se le ha asignado la cadena de custodia IITCUP-SC-2026-00001 del caso FELCC-SC-10293/2026 para pericia balística.',
    fecha: '2026-07-10T11:00:00Z',
    leida: false
  },
  {
    id: 'not-02',
    usuarioId: 'u-per-04',
    titulo: 'Nueva Asignación Pericial',
    mensaje: 'Se le ha asignado la cadena de custodia IITCUP-SC-2026-00003 del caso FELCC-SC-03829/2026 para extracción de datos digitales.',
    fecha: '2026-07-12T14:30:00Z',
    leida: true
  }
];

// Seed 3 dummy document entries
const INITIAL_DOCUMENTOS: Documento[] = [
  {
    id: 'doc-01',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    nombreArchivo: 'Requerimiento_Fiscal_Arma_10293.pdf',
    tipoArchivo: 'pdf',
    fechaCarga: '2026-07-10T10:00:00Z',
    cargadoPorId: 'u-enc-01',
    descripcion: 'Orden Fiscal emitida por el Dr. Roger Mariaca instruyendo el análisis microcomparativo del proyectil.',
    tamano: 2450000 // ~2.4 MB
  },
  {
    id: 'doc-02',
    cadenaCodigo: 'IITCUP-SC-2026-00001',
    nombreArchivo: 'fotografia_empunadura_serie.jpg',
    tipoArchivo: 'jpg',
    fechaCarga: '2026-07-10T10:15:00Z',
    cargadoPorId: 'u-enc-01',
    descripcion: 'Fotografía en plano macro del número de serie limado del arma Taurus.',
    tamano: 1530000 // ~1.5 MB
  },
  {
    id: 'doc-03',
    cadenaCodigo: 'IITCUP-SC-2026-00004',
    nombreArchivo: 'Dictamen_Caligrafico_GRAFO_083.pdf',
    tipoArchivo: 'pdf',
    fechaCarga: '2026-07-15T16:00:00Z',
    cargadoPorId: 'u-per-05',
    descripcion: 'Dictamen Pericial de grafotecnia escaneado y firmado físicamente por la perito asignada.',
    tamano: 4800000 // ~4.8 MB
  }
];

// -------------------------------------------------------------
// Database Operations Helper Class
// -------------------------------------------------------------
export class Database {
  private data: DbSchema;

  constructor() {
    this.data = {
      regionales: [],
      users: [],
      especialidades: [],
      cadenas: [],
      evidencias: [],
      peritosAsignados: [],
      documentos: [],
      historiales: [],
      auditorias: [],
      notificaciones: []
    };
    this.load();
  }

  private migrate() {
    let changed = false;

    // 1. Regionales
    if (!this.data.regionales || this.data.regionales.length === 0) {
      this.data.regionales = INITIAL_REGIONALES;
      changed = true;
    }

    // 2. Users regionalId and Supervisor user
    if (!this.data.users) this.data.users = [];
    this.data.users.forEach(u => {
      if (!u.regionalId) {
        u.regionalId = 'reg-sc';
        changed = true;
      }
    });

    // Check if supervisor user exists, otherwise add him
    const supervisorExists = this.data.users.some(u => u.rol === 'SUPERVISOR');
    if (!supervisorExists) {
      const supervisor = INITIAL_USERS.find(u => u.rol === 'SUPERVISOR');
      if (supervisor) {
        this.data.users.push(supervisor);
        changed = true;
      }
    }

    // 3. Cadenas de custodia migration (rup, unidad, regionalId)
    if (!this.data.cadenas) this.data.cadenas = [];
    
    // Maintain a counter per regional to generate unique RUPs
    const regionalCounters: { [regId: string]: number } = {};
    
    this.data.cadenas.forEach((c) => {
      let chainChanged = false;
      if (!c.regionalId) {
        c.regionalId = 'reg-sc';
        chainChanged = true;
      }
      
      const regId = c.regionalId;
      if (!regionalCounters[regId]) {
        regionalCounters[regId] = 0;
      }
      regionalCounters[regId]++;
      
      if (!c.rup) {
        const regionalObj = this.data.regionales.find(r => r.id === regId);
        const prefix = regionalObj ? regionalObj.codigo : '1';
        c.rup = prefix + String(regionalCounters[regId]).padStart(7 - prefix.length, '0');
        chainChanged = true;
      }
      
      if (!c.unidad) {
        c.unidad = 'FELCC';
        chainChanged = true;
      }
      
      if (chainChanged) {
        changed = true;
      }
    });

    // 4. Evidencias - remove 'peso' attribute from object
    if (!this.data.evidencias) this.data.evidencias = [];
    this.data.evidencias.forEach(ev => {
      if ('peso' in ev) {
        delete (ev as any).peso;
        changed = true;
      }
    });

    if (changed) {
      this.save();
    }
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Migration safeguard for new specialties catalog
        if (!this.data.especialidades) {
          this.data.especialidades = INITIAL_ESPECIALIDADES;
          this.save();
        }
        this.migrate();
      } else {
        // First initialization, write initial dataset (Seed)
        this.data = {
          regionales: INITIAL_REGIONALES,
          users: INITIAL_USERS,
          especialidades: INITIAL_ESPECIALIDADES,
          cadenas: INITIAL_CADENAS,
          evidencias: INITIAL_EVIDENCIAS,
          peritosAsignados: INITIAL_ASIGNACIONES,
          documentos: INITIAL_DOCUMENTOS,
          historiales: INITIAL_HISTORIALES,
          auditorias: INITIAL_AUDITORIAS,
          notificaciones: INITIAL_NOTIFICACIONES
        };
        this.migrate();
      }
    } catch (error) {
      console.error('Error loading database, initializing with seeds:', error);
      this.data = {
        regionales: INITIAL_REGIONALES,
        users: INITIAL_USERS,
        especialidades: INITIAL_ESPECIALIDADES,
        cadenas: INITIAL_CADENAS,
        evidencias: INITIAL_EVIDENCIAS,
        peritosAsignados: INITIAL_ASIGNACIONES,
        documentos: INITIAL_DOCUMENTOS,
        historiales: INITIAL_HISTORIALES,
        auditorias: INITIAL_AUDITORIAS,
        notificaciones: INITIAL_NOTIFICACIONES
      };
      this.migrate();
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database to file:', error);
    }
  }

  // -------------------------------------------------------------
  // Regional Operations
  // -------------------------------------------------------------
  getRegionales(): Regional[] {
    return this.data.regionales || [];
  }

  getRegionalById(id: string): Regional | undefined {
    return (this.data.regionales || []).find(r => r.id === id);
  }

  // -------------------------------------------------------------
  // User Operations
  // -------------------------------------------------------------
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.usuario === username);
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      ...user,
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): User | undefined {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) return undefined;

    const updatedUser = {
      ...this.data.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.users[userIndex] = updatedUser;
    this.save();
    return updatedUser;
  }

  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Cadena de Custodia Operations
  // -------------------------------------------------------------
  getCadenas(): CadenaCustodia[] {
    return this.data.cadenas;
  }

  getCadenaByCodigo(codigo: string): CadenaCustodia | undefined {
    return this.data.cadenas.find(c => c.codigoUnico === codigo);
  }

  createCadena(cadena: Omit<CadenaCustodia, 'codigoUnico' | 'createdAt' | 'updatedAt' | 'estadoActual' | 'nroCadena' | 'rup'> & { regionalId: string }): CadenaCustodia {
    // Generate consecutive auto IDs
    const currentCount = this.data.cadenas.length + 1;
    const padding = String(currentCount).padStart(5, '0');
    
    const regional = this.getRegionalById(cadena.regionalId);
    const regCode = regional ? regional.nombre.toUpperCase().replace(' ', '').substring(0, 2) : 'SC';
    const codigoUnico = `IITCUP-${regCode}-2026-${padding}`;
    const nroCadena = `CC-2026-${1028 + currentCount}`;

    // Generate atomic, independent RUP for this regional
    const prefix = regional ? regional.codigo : '1';
    const regionalCadenas = this.data.cadenas.filter(c => c.regionalId === cadena.regionalId);
    let nextCorrelative = 1;
    if (regionalCadenas.length > 0) {
      const RUPPrefixLength = prefix.length;
      const correlatives = regionalCadenas.map(c => {
        if (c.rup && c.rup.startsWith(prefix)) {
          const numPart = parseInt(c.rup.substring(RUPPrefixLength), 10);
          return isNaN(numPart) ? 0 : numPart;
        }
        return 0;
      });
      nextCorrelative = Math.max(...correlatives, 0) + 1;
    }
    const rup = prefix + String(nextCorrelative).padStart(7 - prefix.length, '0');

    const newCadena: CadenaCustodia = {
      ...cadena,
      codigoUnico,
      nroCadena,
      rup,
      estadoActual: 'RECIBIDA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.cadenas.push(newCadena);
    this.save();
    return newCadena;
  }

  updateCadena(codigo: string, updates: Partial<Omit<CadenaCustodia, 'codigoUnico' | 'createdAt'>>): CadenaCustodia | undefined {
    const index = this.data.cadenas.findIndex(c => c.codigoUnico === codigo);
    if (index === -1) return undefined;

    const updated = {
      ...this.data.cadenas[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.cadenas[index] = updated;
    this.save();
    return updated;
  }

  // -------------------------------------------------------------
  // Evidencia Operations
  // -------------------------------------------------------------
  getEvidenciasByCadena(cadenaCodigo: string): Evidencia[] {
    return this.data.evidencias.filter(e => e.cadenaCodigo === cadenaCodigo);
  }

  getAllEvidencias(): Evidencia[] {
    return this.data.evidencias;
  }

  createEvidencia(evidencia: Omit<Evidencia, 'id' | 'codigo' | 'createdAt' | 'updatedAt'>): Evidencia {
    const count = this.data.evidencias.length + 1;
    const codigo = `EVID-2026-${String(9210 + count).padStart(5, '0')}`;

    const newEvidencia: Evidencia = {
      ...evidencia,
      id: 'e-' + Math.random().toString(36).substr(2, 9),
      codigo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.evidencias.push(newEvidencia);
    this.save();
    return newEvidencia;
  }

  updateEvidencia(id: string, updates: Partial<Evidencia>): Evidencia | undefined {
    const idx = this.data.evidencias.findIndex(e => e.id === id);
    if (idx === -1) return undefined;

    const updated = {
      ...this.data.evidencias[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.evidencias[idx] = updated;
    this.save();
    return updated;
  }

  // -------------------------------------------------------------
  // Perito Asignaciones Operations
  // -------------------------------------------------------------
  getAsignacionesByCadena(cadenaCodigo: string): PeritoAsignado[] {
    return this.data.peritosAsignados.filter(pa => pa.cadenaCodigo === cadenaCodigo);
  }

  getAsignacionesByPerito(peritoId: string): PeritoAsignado[] {
    return this.data.peritosAsignados.filter(pa => pa.peritoId === peritoId);
  }

  getAllAsignaciones(): PeritoAsignado[] {
    return this.data.peritosAsignados;
  }

  assignPerito(cadenaCodigo: string, peritoId: string, asignadoPor: string): PeritoAsignado {
    // Check if assignment already exists
    const existing = this.data.peritosAsignados.find(pa => pa.cadenaCodigo === cadenaCodigo && pa.peritoId === peritoId);
    if (existing) return existing;

    const newAsignacion: PeritoAsignado = {
      id: 'pa-' + Math.random().toString(36).substr(2, 9),
      cadenaCodigo,
      peritoId,
      fechaAsignacion: new Date().toISOString(),
      asignadoPor,
      estadoAsignacion: 'EN_REVISION'
    };
    this.data.peritosAsignados.push(newAsignacion);
    this.save();
    return newAsignacion;
  }

  clearAsignaciones(cadenaCodigo: string) {
    this.data.peritosAsignados = this.data.peritosAsignados.filter(pa => pa.cadenaCodigo !== cadenaCodigo);
    this.save();
  }

  assignPeritoWithSpecialty(cadenaCodigo: string, peritoId: string, especialidadId: string, asignadoPor: string): PeritoAsignado {
    const existing = this.data.peritosAsignados.find(pa => 
      pa.cadenaCodigo === cadenaCodigo && 
      pa.peritoId === peritoId && 
      pa.especialidadId === especialidadId
    );
    if (existing) return existing;

    const newAsignacion: PeritoAsignado = {
      id: 'pa-' + Math.random().toString(36).substr(2, 9),
      cadenaCodigo,
      peritoId,
      especialidadId,
      fechaAsignacion: new Date().toISOString(),
      asignadoPor,
      estadoAsignacion: 'PENDIENTE'
    };
    this.data.peritosAsignados.push(newAsignacion);
    this.save();
    return newAsignacion;
  }

  updateAsignacionEstado(id: string, nuevoEstado: string): PeritoAsignado | undefined {
    const idx = this.data.peritosAsignados.findIndex(pa => pa.id === id);
    if (idx === -1) return undefined;

    this.data.peritosAsignados[idx].estadoAsignacion = nuevoEstado;
    this.save();
    return this.data.peritosAsignados[idx];
  }

  // -------------------------------------------------------------
  // Especialidad Operations
  // -------------------------------------------------------------
  getEspecialidades(): Especialidad[] {
    return this.data.especialidades || [];
  }

  createEspecialidad(e: Omit<Especialidad, 'id' | 'createdAt'>): Especialidad {
    const newEsp: Especialidad = {
      ...e,
      id: 'esp-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    if (!this.data.especialidades) {
      this.data.especialidades = [];
    }
    this.data.especialidades.push(newEsp);
    this.save();
    return newEsp;
  }

  updateEspecialidad(id: string, e: Partial<Especialidad>): Especialidad {
    if (!this.data.especialidades) this.data.especialidades = [];
    const idx = this.data.especialidades.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error('Especialidad no encontrada');
    }
    const updated = {
      ...this.data.especialidades[idx],
      ...e
    };
    this.data.especialidades[idx] = updated;
    this.save();
    return updated;
  }

  deleteEspecialidad(id: string): void {
    if (!this.data.especialidades) this.data.especialidades = [];
    
    // Check if any perito is currently using this specialty
    const peritoInSpecialty = this.data.users.some(u => u.rol === 'PERITO' && u.especialidades?.includes(id));
    if (peritoInSpecialty) {
      throw new Error('No se puede eliminar la especialidad porque hay peritos asociados a ella.');
    }

    // Check if any custody chain requires this specialty
    const chainInSpecialty = this.data.cadenas.some(c => c.especialidadesRequeridas?.includes(id));
    if (chainInSpecialty) {
      throw new Error('No se puede eliminar la especialidad porque hay cadenas de custodia que la requieren.');
    }

    this.data.especialidades = this.data.especialidades.filter(item => item.id !== id);
    this.save();
  }

  // -------------------------------------------------------------
  // Document Operations
  // -------------------------------------------------------------
  getDocumentosByCadena(cadenaCodigo: string): Documento[] {
    return this.data.documentos.filter(d => d.cadenaCodigo === cadenaCodigo);
  }

  createDocumento(doc: Omit<Documento, 'id' | 'fechaCarga'>): Documento {
    const newDoc: Documento = {
      ...doc,
      id: 'doc-' + Math.random().toString(36).substr(2, 9),
      fechaCarga: new Date().toISOString()
    };
    this.data.documentos.push(newDoc);
    this.save();
    return newDoc;
  }

  // -------------------------------------------------------------
  // Historial (Timeline) Operations
  // -------------------------------------------------------------
  getHistorialByCadena(cadenaCodigo: string): Historial[] {
    return this.data.historiales
      .filter(h => h.cadenaCodigo === cadenaCodigo)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addHistorial(cadenaCodigo: string, usuarioId: string, usuarioNombre: string, accion: string, observaciones?: string): Historial {
    const date = new Date();
    const fecha = date.toISOString().split('T')[0];
    const hora = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    const newHistorial: Historial = {
      id: 'h-' + Math.random().toString(36).substr(2, 9),
      cadenaCodigo,
      fecha,
      hora,
      usuarioId,
      usuarioNombre,
      accion,
      observaciones,
      createdAt: date.toISOString()
    };
    this.data.historiales.push(newHistorial);
    this.save();
    return newHistorial;
  }

  // -------------------------------------------------------------
  // Auditoria (Security Log) Operations
  // -------------------------------------------------------------
  getAuditorias(): Auditoria[] {
    return [...this.data.auditorias].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addAuditoria(usuarioId: string, usuarioNombre: string, accion: string, ip: string, navegador: string): Auditoria {
    const date = new Date();
    const fecha = date.toISOString().split('T')[0];
    const hora = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    const newAuditoria: Auditoria = {
      id: 'aud-' + Math.random().toString(36).substr(2, 9),
      usuarioId,
      usuarioNombre,
      fecha,
      hora,
      accion,
      ip,
      navegador,
      createdAt: date.toISOString()
    };
    this.data.auditorias.push(newAuditoria);
    this.save();
    return newAuditoria;
  }

  // -------------------------------------------------------------
  // Notificacion Operations
  // -------------------------------------------------------------
  getNotificacionesByUser(usuarioId: string): Notificacion[] {
    return this.data.notificaciones
      .filter(n => n.usuarioId === usuarioId)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  addNotificacion(usuarioId: string, titulo: string, mensaje: string): Notificacion {
    const newNotif: Notificacion = {
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      usuarioId,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leida: false
    };
    this.data.notificaciones.push(newNotif);
    this.save();
    return newNotif;
  }

  markNotificacionesAsRead(usuarioId: string) {
    this.data.notificaciones = this.data.notificaciones.map(n => {
      if (n.usuarioId === usuarioId) {
        return { ...n, leida: true };
      }
      return n;
    });
    this.save();
  }
}

export const db = new Database();
