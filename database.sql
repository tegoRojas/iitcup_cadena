-- ==========================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS POSTGRESQL
-- SISTEMA DE GESTIÓN DE CADENA DE CUSTODIA - IITCUP SANTA CRUZ, BOLIVIA
-- ==========================================

-- 1. Creación de Tipos ENUM
CREATE TYPE rol_enum AS ENUM ('ADMINISTRADOR', 'ENCARGADO', 'PERITO');
CREATE TYPE estado_cadena_enum AS ENUM ('RECIBIDA', 'EN_ANALISIS', 'EN_PROCESO', 'FINALIZADA', 'ENTREGADA', 'ARCHIVADA');
CREATE TYPE estado_usuario_enum AS ENUM ('ACTIVO', 'INACTIVO');

-- 2. Creación de Tabla: Usuarios
CREATE TABLE "User" (
    "id" VARCHAR(36) PRIMARY KEY,
    "nombre" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "ci" VARCHAR(20) UNIQUE NOT NULL,
    "cargo" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(100) UNIQUE NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "usuario" VARCHAR(50) UNIQUE NOT NULL,
    "contrasenaHash" VARCHAR(255) NOT NULL,
    "rol" rol_enum DEFAULT 'PERITO',
    "estado" estado_usuario_enum DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Creación de Tabla: Cadenas de Custodia
CREATE TABLE "CadenaCustodia" (
    "codigoUnico" VARCHAR(50) PRIMARY KEY,
    "nroCadena" VARCHAR(50) UNIQUE NOT NULL,
    "caso" VARCHAR(50) NOT NULL,
    "fiscalia" VARCHAR(100) NOT NULL,
    "fiscal" VARCHAR(100) NOT NULL,
    "investigador" VARCHAR(100) NOT NULL,
    "fecha" VARCHAR(10) NOT NULL, -- Formato YYYY-MM-DD
    "hora" VARCHAR(8) NOT NULL,   -- Formato HH:MM
    "lugar" VARCHAR(255) NOT NULL,
    "estadoActual" estado_cadena_enum DEFAULT 'RECIBIDA',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Creación de Tabla: Evidencias
CREATE TABLE "Evidencia" (
    "id" VARCHAR(36) PRIMARY KEY,
    "cadenaCodigo" VARCHAR(50) NOT NULL,
    "codigo" VARCHAR(50) UNIQUE NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "peso" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "embalaje" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(100) NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("cadenaCodigo") REFERENCES "CadenaCustodia"("codigoUnico") ON DELETE CASCADE
);

-- 5. Creación de Tabla: Peritos Asignados (Relación N:M)
CREATE TABLE "PeritoAsignado" (
    "id" VARCHAR(36) PRIMARY KEY,
    "cadenaCodigo" VARCHAR(50) NOT NULL,
    "peritoId" VARCHAR(36) NOT NULL,
    "fechaAsignacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asignadoPor" VARCHAR(100) NOT NULL,
    "estadoAsignacion" VARCHAR(50) DEFAULT 'ASIGNADO',
    FOREIGN KEY ("cadenaCodigo") REFERENCES "CadenaCustodia"("codigoUnico") ON DELETE CASCADE,
    FOREIGN KEY ("peritoId") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE ("cadenaCodigo", "peritoId")
);

-- 6. Creación de Tabla: Documentos (Gestión Documental)
CREATE TABLE "Documento" (
    "id" VARCHAR(36) PRIMARY KEY,
    "cadenaCodigo" VARCHAR(50) NOT NULL,
    "nombreArchivo" VARCHAR(255) NOT NULL,
    "tipoArchivo" VARCHAR(50) NOT NULL,
    "fechaCarga" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cargadoPorId" VARCHAR(36) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "tamano" INTEGER NOT NULL,
    FOREIGN KEY ("cadenaCodigo") REFERENCES "CadenaCustodia"("codigoUnico") ON DELETE CASCADE,
    FOREIGN KEY ("cargadoPorId") REFERENCES "User"("id")
);

-- 7. Creación de Tabla: Historial / Línea de Tiempo
CREATE TABLE "Historial" (
    "id" VARCHAR(36) PRIMARY KEY,
    "cadenaCodigo" VARCHAR(50) NOT NULL,
    "fecha" VARCHAR(10) NOT NULL,
    "hora" VARCHAR(8) NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,
    "usuarioNombre" VARCHAR(150) NOT NULL,
    "accion" VARCHAR(255) NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("cadenaCodigo") REFERENCES "CadenaCustodia"("codigoUnico") ON DELETE CASCADE,
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

-- 8. Creación de Tabla: Auditoría Inalterable
CREATE TABLE "Auditoria" (
    "id" VARCHAR(36) PRIMARY KEY,
    "usuarioId" VARCHAR(36) NOT NULL,
    "usuarioNombre" VARCHAR(150) NOT NULL,
    "fecha" VARCHAR(10) NOT NULL,
    "hora" VARCHAR(8) NOT NULL,
    "accion" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "navegador" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id")
);

-- 9. Creación de Tabla: Notificaciones en Tiempo Real
CREATE TABLE "Notificacion" (
    "id" VARCHAR(36) PRIMARY KEY,
    "usuarioId" VARCHAR(36) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN DEFAULT FALSE,
    FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- 10. Índices de Rendimiento
CREATE INDEX idx_cadena_custodia_caso ON "CadenaCustodia"("caso");
CREATE INDEX idx_cadena_custodia_estado ON "CadenaCustodia"("estadoActual");
CREATE INDEX idx_evidencia_cadena ON "Evidencia"("cadenaCodigo");
CREATE INDEX idx_perito_asignado_perito ON "PeritoAsignado"("peritoId");
CREATE INDEX idx_documento_cadena ON "Documento"("cadenaCodigo");
CREATE INDEX idx_historial_cadena ON "Historial"("cadenaCodigo");
CREATE INDEX idx_auditoria_usuario ON "Auditoria"("usuarioId");
CREATE INDEX idx_notificacion_usuario ON "Notificacion"("usuarioId");
CREATE INDEX idx_notificacion_leida ON "Notificacion"("leida");

-- 11. Restricción para asegurar la inalterabilidad de la auditoría (Evitar DELETE y UPDATE)
CREATE OR REPLACE FUNCTION prevenir_alteracion_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'No está permitido modificar o eliminar registros de la bitácora de auditoría.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auditoria_inalterable
BEFORE UPDATE OR DELETE ON "Auditoria"
FOR EACH ROW EXECUTE FUNCTION prevenir_alteracion_auditoria();
