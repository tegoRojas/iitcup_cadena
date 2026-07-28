import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { DbSchema } from './db';

// Ensure .env.example and .env are loaded
function loadEnv() {
  dotenv.config();
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath, override: true });
  }
}

loadEnv();

function isJwtKey(key: string): boolean {
  return (key?.startsWith('ey') || key?.startsWith('sbp_') || key?.startsWith('sb_')) && key?.includes('.');
}

export function getSupabaseCredentials() {
  loadEnv();
  let url = (process.env.SUPABASE_URL || 'https://lhbgqiemzwqzvpwcgnkr.supabase.co').trim();
  if (url.endsWith('.supabase.com')) {
    url = url.replace('.supabase.com', '.supabase.co');
  }
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, key, isJwt: isJwtKey(key) };
}

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseCredentials();
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        'x-client-info': 'aitcup-forensic-system'
      }
    }
  });
}

// Export default instance for backwards compatibility
export const supabase = getSupabaseClient();

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const { url, key, isJwt } = getSupabaseCredentials();

  if (!key || !isJwt) {
    return {
      success: false,
      message: 'Clave API de Supabase requerida: La clave configurada no es un Token JWT válido.',
      details: {
        isPasswordNotKey: true,
        currentKeySample: key ? `${key.substring(0, 15)}...` : 'vacía',
        help: 'Debes copiar la "service_role" key o "anon" key desde Supabase Dashboard -> Project Settings -> API.'
      }
    };
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('regionales').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (
        error.code === 'PGRST301' || 
        error.message?.includes('relation "public.regionales" does not exist') || 
        error.message?.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: true,
          message: 'Conectado exitosamente a la API de Supabase. Las tablas aún no se han creado mediante el script SQL.',
          details: { tablesExist: false, url }
        };
      }
      return { success: false, message: `Error devuelto por Supabase: ${error.message}`, details: error };
    }

    return {
      success: true,
      message: 'Conexión a Supabase verificada correctamente y acceso a tablas confirmado.',
      details: { tablesExist: true, url, data }
    };
  } catch (err: any) {
    const causeMsg = err.cause ? ` (${err.cause.message || err.cause})` : '';
    return { 
      success: false, 
      message: `Error de red al intentar contactar con Supabase (${url}): ${err.message}${causeMsg}. Verifique que el proyecto no esté pausado en Supabase Dashboard.`,
      details: { url, error: err.message, cause: err.cause }
    };
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
    nro_rup VARCHAR(15),
    unidad TEXT,
    regional_id TEXT REFERENCES public.regionales(id),
    nro_fud VARCHAR(20) NOT NULL,
    institucion_solicitante VARCHAR(50) NOT NULL,
    autoridad_solicitante VARCHAR(100) NOT NULL,
    investigador TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    lugar TEXT NOT NULL,
    estado_actual TEXT NOT NULL DEFAULT 'RECIBIDA',
    especialidades_requeridas TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rup TEXT,
    caso TEXT,
    fiscalia TEXT,
    fiscal TEXT
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
  const { key, isJwt } = getSupabaseCredentials();

  if (!key || !isJwt) {
    return {
      success: false,
      summary,
      errors: [
        'Error de Configuración: No se ha configurado una Clave API JWT válida en SUPABASE_SERVICE_ROLE_KEY.',
        'Obtén la "service_role" key o "anon" key desde Supabase Dashboard -> Project Settings -> API (debe comenzar con "eyJhbGci...").'
      ]
    };
  }

  const client = getSupabaseClient();

  try {
    const validRegionalIds = new Set((dbData.regionales || []).map(r => r.id));
    const validEspecialidadIds = new Set((dbData.especialidades || []).map(e => e.id));
    const validUserIds = new Set((dbData.users || []).map(u => u.id));
    const validCadenaCodigos = new Set((dbData.cadenas || []).map(c => c.codigoUnico));

    // 1. Regionales
    if (dbData.regionales && dbData.regionales.length > 0) {
      try {
        const rows = dbData.regionales.map(r => ({
          id: r.id,
          nombre: r.nombre,
          codigo: r.codigo,
          activo: r.activo,
          fecha_creacion: r.fecha_creacion
        }));
        const { error } = await client.from('regionales').upsert(rows);
        if (error) errors.push(`Regionales: ${error.message}`);
        else summary.regionales = rows.length;
      } catch (err: any) {
        errors.push(`Regionales: Error de conexión (${err.message})`);
      }
    }

    // 2. Especialidades
    if (dbData.especialidades && dbData.especialidades.length > 0) {
      try {
        const rows = dbData.especialidades.map(e => ({
          id: e.id,
          nombre: e.nombre,
          descripcion: e.descripcion,
          estado: e.estado,
          created_at: e.createdAt
        }));
        const { error } = await client.from('especialidades').upsert(rows);
        if (error) errors.push(`Especialidades: ${error.message}`);
        else summary.especialidades = rows.length;
      } catch (err: any) {
        errors.push(`Especialidades: Error de conexión (${err.message})`);
      }
    }

    // 3. Users
    if (dbData.users && dbData.users.length > 0) {
      try {
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
          regional_id: u.regionalId && validRegionalIds.has(u.regionalId) ? u.regionalId : null,
          created_at: u.createdAt,
          updated_at: u.updatedAt
        }));
        const { error } = await client.from('users').upsert(rows);
        if (error) errors.push(`Usuarios: ${error.message}`);
        else summary.users = rows.length;
      } catch (err: any) {
        errors.push(`Usuarios: Error de conexión (${err.message})`);
      }
    }

    // 4. Cadenas
    if (dbData.cadenas && dbData.cadenas.length > 0) {
      try {
        const rows = dbData.cadenas.map(c => ({
          codigo_unico: c.codigoUnico,
          nro_cadena: c.nroCadena,
          nro_rup: c.nroRUP || c.rup,
          rup: c.nroRUP || c.rup,
          unidad: c.unidad,
          regional_id: c.regionalId && validRegionalIds.has(c.regionalId) ? c.regionalId : null,
          nro_fud: c.nroFUD || c.caso,
          caso: c.nroFUD || c.caso,
          institucion_solicitante: c.institucionSolicitante || c.fiscalia,
          fiscalia: c.institucionSolicitante || c.fiscalia,
          autoridad_solicitante: c.autoridadSolicitante || c.fiscal,
          fiscal: c.autoridadSolicitante || c.fiscal,
          investigador: c.investigador,
          fecha: c.fecha,
          hora: c.hora,
          lugar: c.lugar,
          estado_actual: c.estadoActual,
          especialidades_requeridas: c.especialidadesRequeridas || [],
          created_at: c.createdAt,
          updated_at: c.updatedAt
        }));
        const { error } = await client.from('cadenas').upsert(rows);
        if (error) errors.push(`Cadenas: ${error.message}`);
        else summary.cadenas = rows.length;
      } catch (err: any) {
        errors.push(`Cadenas: Error de conexión (${err.message})`);
      }
    }

    // 5. Evidencias
    if (dbData.evidencias && dbData.evidencias.length > 0) {
      try {
        const rows = dbData.evidencias
          .filter(ev => validCadenaCodigos.has(ev.cadenaCodigo))
          .map(ev => ({
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
        if (rows.length > 0) {
          const { error } = await client.from('evidencias').upsert(rows);
          if (error) errors.push(`Evidencias: ${error.message}`);
          else summary.evidencias = rows.length;
        }
      } catch (err: any) {
        errors.push(`Evidencias: Error de conexión (${err.message})`);
      }
    }

    // 6. Peritos Asignados
    if (dbData.peritosAsignados && dbData.peritosAsignados.length > 0) {
      try {
        const rows = dbData.peritosAsignados
          .filter(pa => validCadenaCodigos.has(pa.cadenaCodigo))
          .map(pa => ({
            id: pa.id,
            cadena_codigo: pa.cadenaCodigo,
            perito_id: validUserIds.has(pa.peritoId) ? pa.peritoId : null,
            especialidad_id: validEspecialidadIds.has(pa.especialidadId) ? pa.especialidadId : null,
            fecha_asignacion: pa.fechaAsignacion,
            asignado_por: pa.asignadoPor && validUserIds.has(pa.asignadoPor) ? pa.asignadoPor : null,
            estado_asignacion: pa.estadoAsignacion
          }));
        if (rows.length > 0) {
          const { error } = await client.from('peritos_asignados').upsert(rows);
          if (error) errors.push(`Peritos Asignados: ${error.message}`);
          else summary.peritosAsignados = rows.length;
        }
      } catch (err: any) {
        errors.push(`Peritos Asignados: Error de conexión (${err.message})`);
      }
    }

    // 7. Auditorias
    if (dbData.auditorias && dbData.auditorias.length > 0) {
      try {
        const rows = dbData.auditorias.map(a => ({
          id: a.id,
          usuario_id: a.usuarioId && validUserIds.has(a.usuarioId) ? a.usuarioId : null,
          usuario_nombre: a.usuarioNombre,
          fecha: a.fecha,
          hora: a.hora,
          accion: a.accion,
          ip: a.ip,
          navegador: a.navegador,
          created_at: a.createdAt
        }));
        const { error } = await client.from('auditorias').upsert(rows);
        if (error) errors.push(`Auditorías: ${error.message}`);
        else summary.auditorias = rows.length;
      } catch (err: any) {
        errors.push(`Auditorías: Error de conexión (${err.message})`);
      }
    }

    // 8. Documentos (Documentación Oficial y Evidencia Gráfica)
    if (dbData.documentos && dbData.documentos.length > 0) {
      try {
        const rows = dbData.documentos
          .filter(d => validCadenaCodigos.has(d.cadenaCodigo))
          .map(d => ({
            id: d.id,
            cadena_codigo: d.cadenaCodigo,
            nombre_archivo: d.nombreArchivo,
            tipo_archivo: d.tipoArchivo,
            fecha_carga: d.fechaCarga,
            cargado_por_id: d.cargadoPorId && validUserIds.has(d.cargadoPorId) ? d.cargadoPorId : null,
            descripcion: d.descripcion,
            tamano: d.tamano
          }));
        if (rows.length > 0) {
          const { error } = await client.from('documentos').upsert(rows);
          if (error) errors.push(`Documentos: ${error.message}`);
          else summary.documentos = rows.length;
        }
      } catch (err: any) {
        errors.push(`Documentos: Error de conexión (${err.message})`);
      }
    }

    // 9. Historiales
    if (dbData.historiales && dbData.historiales.length > 0) {
      try {
        const rows = dbData.historiales
          .filter(h => validCadenaCodigos.has(h.cadenaCodigo))
          .map(h => ({
            id: h.id,
            cadena_codigo: h.cadenaCodigo,
            fecha: h.fecha,
            hora: h.hora,
            usuario_id: h.usuarioId && validUserIds.has(h.usuarioId) ? h.usuarioId : null,
            usuario_nombre: h.usuarioNombre,
            accion: h.accion,
            observaciones: h.observaciones,
            created_at: h.createdAt
          }));
        if (rows.length > 0) {
          const { error } = await client.from('historiales').upsert(rows);
          if (error) errors.push(`Historiales: ${error.message}`);
          else summary.historiales = rows.length;
        }
      } catch (err: any) {
        errors.push(`Historiales: Error de conexión (${err.message})`);
      }
    }

    // 10. Notificaciones
    if (dbData.notificaciones && dbData.notificaciones.length > 0) {
      try {
        const rows = dbData.notificaciones
          .filter(n => validUserIds.has(n.usuarioId))
          .map(n => ({
            id: n.id,
            usuario_id: n.usuarioId,
            titulo: n.titulo,
            mensaje: n.mensaje,
            fecha: n.fecha,
            leida: n.leida
          }));
        if (rows.length > 0) {
          const { error } = await client.from('notificaciones').upsert(rows);
          if (error) errors.push(`Notificaciones: ${error.message}`);
          else summary.notificaciones = rows.length;
        }
      } catch (err: any) {
        errors.push(`Notificaciones: Error de conexión (${err.message})`);
      }
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
      errors: [`Error general de red/fetch al sincronizar con Supabase: ${err.message}`]
    };
  }
}
