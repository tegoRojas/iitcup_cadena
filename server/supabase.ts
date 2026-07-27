import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { DbSchema } from './db';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || 'https://lhbgqiemzwqzvpwcgnkr.supabase.com').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'S0l0R0j4s0509*').trim();

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const { data, error } = await supabase.from('regionales').select('count', { count: 'exact', head: true });
    if (error) {
      if (
        error.code === 'PGRST301' || 
        error.message.includes('relation "public.regionales" does not exist') || 
        error.message.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: true,
          message: 'Conectado exitosamente a Supabase. Las tablas aún no han sido creadas en la base de datos de Supabase.',
          details: { tablesExist: false }
        };
      }
      return { success: false, message: `Error de respuesta Supabase: ${error.message}`, details: error };
    }
    return {
      success: true,
      message: 'Conexión a Supabase establecida correctamente y tablas encontradas.',
      details: { tablesExist: true, data }
    };
  } catch (err: any) {
    return { success: false, message: `Error de red o configuración con Supabase: ${err.message}` };
  }
}

/**
 * Generates full PostgreSQL SQL migration script for Supabase SQL Editor
 */
export function getSupabaseSQLScript(): string {
  return `-- ============================================================
-- SCRIPT DE MIGRACIÓN Y TABLAS DE SUPABASE PARA IITCUP
-- Proyecto: Sistema de Cadena de Custodia Forense IITCUP
-- ============================================================

-- 1. Tabla de Sedes Regionales
CREATE TABLE IF NOT EXISTS public.regionales (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Especialidades Periciales
CREATE TABLE IF NOT EXISTS public.especialidades (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    estado TEXT DEFAULT 'ACTIVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    ci TEXT UNIQUE NOT NULL,
    cargo TEXT,
    correo TEXT UNIQUE,
    telefono TEXT,
    usuario TEXT UNIQUE NOT NULL,
    contrasena_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'ENCARGADO', 'PERITO', 'SUPERVISOR')),
    estado TEXT DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    especialidades TEXT[],
    regional_id TEXT REFERENCES public.regionales(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Cadenas de Custodia
CREATE TABLE IF NOT EXISTS public.cadenas (
    codigo_unico TEXT PRIMARY KEY,
    nro_cadena TEXT NOT NULL,
    rup TEXT,
    unidad TEXT,
    regional_id TEXT REFERENCES public.regionales(id),
    caso TEXT NOT NULL,
    fiscalia TEXT NOT NULL,
    fiscal TEXT NOT NULL,
    investigador TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    lugar TEXT NOT NULL,
    estado_actual TEXT NOT NULL DEFAULT 'RECIBIDA',
    especialidades_requeridas TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Evidencias Físicas
CREATE TABLE IF NOT EXISTS public.evidencias (
    id TEXT PRIMARY KEY,
    cadena_codigo TEXT REFERENCES public.cadenas(codigo_unico) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad INTEGER DEFAULT 1,
    embalaje TEXT,
    estado TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Asignaciones Periciales
CREATE TABLE IF NOT EXISTS public.peritos_asignados (
    id TEXT PRIMARY KEY,
    cadena_codigo TEXT REFERENCES public.cadenas(codigo_unico) ON DELETE CASCADE,
    perito_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    especialidad_id TEXT REFERENCES public.especialidades(id),
    fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    asignado_por TEXT REFERENCES public.users(id),
    estado_asignacion TEXT DEFAULT 'PENDIENTE'
);

-- 7. Tabla de Documentos y Dictámenes
CREATE TABLE IF NOT EXISTS public.documentos (
    id TEXT PRIMARY KEY,
    cadena_codigo TEXT REFERENCES public.cadenas(codigo_unico) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    tipo_archivo TEXT,
    fecha_carga TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cargado_por_id TEXT REFERENCES public.users(id),
    descripcion TEXT,
    tamano INTEGER
);

-- 8. Tabla de Historial y Trazabilidad de Movimientos
CREATE TABLE IF NOT EXISTS public.historiales (
    id TEXT PRIMARY KEY,
    cadena_codigo TEXT REFERENCES public.cadenas(codigo_unico) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    usuario_id TEXT REFERENCES public.users(id),
    usuario_nombre TEXT,
    accion TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla de Bitácora de Auditoría Forense
CREATE TABLE IF NOT EXISTS public.auditorias (
    id TEXT PRIMARY KEY,
    usuario_id TEXT REFERENCES public.users(id),
    usuario_nombre TEXT NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE,
    hora TIME DEFAULT CURRENT_TIME,
    accion TEXT NOT NULL,
    ip TEXT,
    navegador TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabla de Notificaciones del Sistema
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id TEXT PRIMARY KEY,
    usuario_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leida BOOLEAN DEFAULT FALSE
);

-- Habilitar permisos de lectura y escritura para la clave de servicio
ALTER TABLE public.regionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peritos_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público/servicio
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.regionales FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.especialidades FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.users FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.cadenas FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.evidencias FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.peritos_asignados FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.documentos FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.historiales FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.auditorias FOR ALL USING (true);
CREATE POLICY "Acceso de lectura y escritura para el servidor IITCUP" ON public.notificaciones FOR ALL USING (true);
`;
}

/**
 * Syncs local DB data to Supabase
 */
export async function syncLocalDataToSupabase(dbData: DbSchema): Promise<{ success: boolean; summary: any; errors: string[] }> {
  const summary: any = {};
  const errors: string[] = [];

  try {
    // 1. Regionales
    if (dbData.regionales && dbData.regionales.length > 0) {
      const rows = dbData.regionales.map(r => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        activo: r.activo,
        fecha_creacion: r.fecha_creacion
      }));
      const { error } = await supabase.from('regionales').upsert(rows);
      if (error) errors.push(`Regionales: ${error.message}`);
      else summary.regionales = rows.length;
    }

    // 2. Especialidades
    if (dbData.especialidades && dbData.especialidades.length > 0) {
      const rows = dbData.especialidades.map(e => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        estado: e.estado,
        created_at: e.createdAt
      }));
      const { error } = await supabase.from('especialidades').upsert(rows);
      if (error) errors.push(`Especialidades: ${error.message}`);
      else summary.especialidades = rows.length;
    }

    // 3. Users
    if (dbData.users && dbData.users.length > 0) {
      const rows = dbData.users.map(u => ({
        id: u.id,
        nombre: u.nombre,
        apellidos: u.apellidos,
        ci: u.ci,
        cargo: u.cargo,
        correo: u.correo,
        telefono: u.telefono,
        usuario: u.usuario,
        contrasena_hash: u.contrasenaHash,
        rol: u.rol,
        estado: u.estado,
        especialidades: u.especialidades || [],
        regional_id: u.regionalId || u.regional_id,
        created_at: u.createdAt,
        updated_at: u.updatedAt
      }));
      const { error } = await supabase.from('users').upsert(rows);
      if (error) errors.push(`Usuarios: ${error.message}`);
      else summary.users = rows.length;
    }

    // 4. Cadenas
    if (dbData.cadenas && dbData.cadenas.length > 0) {
      const rows = dbData.cadenas.map(c => ({
        codigo_unico: c.codigoUnico,
        nro_cadena: c.nroCadena,
        rup: c.rup,
        unidad: c.unidad,
        regional_id: c.regionalId,
        caso: c.caso,
        fiscalia: c.fiscalia,
        fiscal: c.fiscal,
        investigador: c.investigador,
        fecha: c.fecha,
        hora: c.hora,
        lugar: c.lugar,
        estado_actual: c.estadoActual,
        especialidades_requeridas: c.especialidadesRequeridas || [],
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));
      const { error } = await supabase.from('cadenas').upsert(rows);
      if (error) errors.push(`Cadenas: ${error.message}`);
      else summary.cadenas = rows.length;
    }

    // 5. Evidencias
    if (dbData.evidencias && dbData.evidencias.length > 0) {
      const rows = dbData.evidencias.map(ev => ({
        id: ev.id,
        cadena_codigo: ev.cadenaCodigo,
        codigo: ev.codigo,
        tipo: ev.tipo,
        descripcion: ev.descripcion,
        cantidad: ev.cantidad,
        embalaje: ev.embalaje,
        estado: ev.estado,
        observaciones: ev.observaciones,
        created_at: ev.createdAt,
        updated_at: ev.updatedAt
      }));
      const { error } = await supabase.from('evidencias').upsert(rows);
      if (error) errors.push(`Evidencias: ${error.message}`);
      else summary.evidencias = rows.length;
    }

    // 6. Peritos Asignados
    if (dbData.peritosAsignados && dbData.peritosAsignados.length > 0) {
      const rows = dbData.peritosAsignados.map(pa => ({
        id: pa.id,
        cadena_codigo: pa.cadenaCodigo,
        perito_id: pa.peritoId,
        especialidad_id: pa.especialidadId,
        fecha_asignacion: pa.fechaAsignacion,
        asignado_por: pa.asignadoPor,
        estado_asignacion: pa.estadoAsignacion
      }));
      const { error } = await supabase.from('peritos_asignados').upsert(rows);
      if (error) errors.push(`Peritos Asignados: ${error.message}`);
      else summary.peritosAsignados = rows.length;
    }

    // 7. Auditorias
    if (dbData.auditorias && dbData.auditorias.length > 0) {
      const rows = dbData.auditorias.map(a => ({
        id: a.id,
        usuario_id: a.usuarioId,
        usuario_nombre: a.usuarioNombre,
        fecha: a.fecha,
        hora: a.hora,
        accion: a.accion,
        ip: a.ip,
        navegador: a.navegador,
        created_at: a.createdAt
      }));
      const { error } = await supabase.from('auditorias').upsert(rows);
      if (error) errors.push(`Auditorías: ${error.message}`);
      else summary.auditorias = rows.length;
    }

    return {
      success: errors.length === 0,
      summary,
      errors
    };
  } catch (err: any) {
    return {
      success: false,
      summary,
      errors: [err.message]
    };
  }
}
