# POLICÍA BOLIVIANA - IITCUP
## INSTITUTO DE INVESTIGACIONES TÉCNICO CIENTÍFICAS DE LA UNIVERSIDAD POLICIAL
### SISTEMA DE GESTIÓN DE CADENA DE CUSTODIA Y SEGUIMIENTO DE CASOS

---

# DOCUMENTO DE ESTRUCTURA Y MODELO DE BASE DE DATOS

## 1. INTRODUCCIÓN AL MODELO DE DATOS

El **Sistema de Gestión de Cadena de Custodia y Seguimiento de Casos del IITCUP** se fundamenta en un modelo relacional estandarizado que garantiza la **integridad, trazabilidad, no repetibilidad y estricta confidencialidad** de los datos judiciales y evidencia pericial.

El modelo está diseñado para soportar la trazabilidad forense desde el momento del ingreso de una evidencia física hasta su disposición final o archivo, manteniendo la disyunción y control jerárquico por regionales, especialidades periciales, peritos y usuarios custodios.

---

## 2. DIAGRAMA RELACIONAL SIMPLIFICADO (ER)

```
 [ REGIONALES ]
       │ 1
       │
       │ N
  [ USUARIOS ] ──────< N:M >────── [ ESPECIALIDADES ]
       │ 1                               │
       │ (Asignado/Creador)              │ (Requerida)
       │ N                               │
 [ CADENAS_CUSTODIA ] ───< N:M >─────────┘
       │
       ├─ (1:N) ──> [ EVIDENCIAS ]
       ├─ (1:N) ──> [ PERITOS_ASIGNADOS ]
       ├─ (1:N) ──> [ DOCUMENTOS_ADJUNTOS ]
       └─ (1:N) ──> [ HISTORIAL_CUSTODIA ]

 [ AUDITORIA_SISTEMA ] ─── (Registra actividad global)
 [ NOTIFICACIONES ]     ─── (Alertas por usuario)
```

---

## 3. DICCIONARIO DE DATOS Y TABLAS DEL SISTEMA

### 3.1. Tabla: `regionales`
* **Propósito:** Almacena las sedes departamentales y unidades operativas regionales del IITCUP (ej. Santa Cruz, La Paz, Cochabamba).

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único de la regional |
| `nombre` | VARCHAR(100) | | NO | Nombre oficial de la regional (ej. *Santa Cruz*) |
| `codigo` | VARCHAR(10) | **UQ** | NO | Código mnemónico institucional (ej. *SCZ*, *LPZ*) |
| `activo` | BOOLEAN | | NO | Estado operacional de la regional (true/false) |
| `fecha_creacion` | TIMESTAMP | | NO | Fecha y hora de registro de la sede |

---

### 3.2. Tabla: `especialidades`
* **Propósito:** Define las áreas científico-forenses autorizadas en el laboratorio del IITCUP.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único de la especialidad |
| `nombre` | VARCHAR(100) | **UQ** | NO | Nombre de la especialidad (ej. *Balística Forense*, *Documentología*) |
| `descripcion` | TEXT | | SÍ | Alcance técnico del área forense |
| `estado` | ENUM('ACTIVO', 'INACTIVO') | | NO | Estado de disponibilidad en el catálogo |
| `createdAt` | TIMESTAMP | | NO | Fecha de creación del registro |

---

### 3.3. Tabla: `usuarios`
* **Propósito:** Almacena la información de acceso, perfil institucional, rol y adscripción regional del personal del IITCUP.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único del usuario |
| `nombre` | VARCHAR(100) | | NO | Nombres del funcionario |
| `apellidos` | VARCHAR(100) | | NO | Apellidos del funcionario |
| `ci` | VARCHAR(20) | **UQ** | NO | Cédula de Identidad con complemento |
| `cargo` | VARCHAR(100) | | NO | Cargo institucional (ej. *Perito Balístico*, *Encargado Custodia*) |
| `correo` | VARCHAR(120) | **UQ** | NO | Correo electrónico institucional o personal |
| `telefono` | VARCHAR(20) | | SÍ | Número telefónico de contacto |
| `usuario` | VARCHAR(50) | **UQ** | NO | Nombre de usuario para autenticación |
| `rol` | ENUM('ADMINISTRADOR', 'ENCARGADO', 'PERITO', 'SUPERVISOR') | | NO | Nivel de permisos asignado (RBAC) |
| `estado` | ENUM('ACTIVO', 'INACTIVO') | | NO | Estado de la cuenta de usuario |
| `regional_id` | VARCHAR(36) | **FK** | NO | Referencia a `regionales.id` |
| `createdAt` | TIMESTAMP | | NO | Fecha de alta en la plataforma |
| `updatedAt` | TIMESTAMP | | NO | Última modificación de datos |

---

### 3.4. Tabla Intermedia: `usuario_especialidades`
* **Propósito:** Relación M:N entre usuarios (Peritos) y las especialidades que están calificados para dictaminar.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `usuario_id` | VARCHAR(36) | **PK, FK** | NO | Referencia a `usuarios.id` |
| `especialidad_id` | VARCHAR(36) | **PK, FK** | NO | Referencia a `especialidades.id` |

---

### 3.5. Tabla: `cadenas_custodia`
* **Propósito:** Entidad principal (encabezado del caso). Registra la apertura de la Cadena de Custodia con datos procesales y del lugar del hecho.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `codigoUnico` | VARCHAR(50) | **PK** | NO | Código único correlativo de la cadena (ej. *IITCUP-SC-2026-00001*) |
| `nroCadena` | VARCHAR(30) | | NO | Número correlativo o correlato policial |
| `nroRUP` | VARCHAR(15) | | SÍ | Número RUP (Registro Único Policial / Caso) |
| `unidad` | VARCHAR(100) | | SÍ | Unidad policial o remisor (ej. FELCC, FELCN) |
| `regionalId` | VARCHAR(36) | **FK** | SÍ/NO | Referencia a `regionales.id` |
| `nroFUD` | VARCHAR(20) | | NO | Número FUD (Formulario Único Denuncia / Caso) |
| `institucionSolicitante` | VARCHAR(50) | | NO | Institución Requiriente (MINISTERIO PÚBLICO, ÓRGANO JUDICIAL, FISCALÍA POLICIAL, OTRO) |
| `autoridadSolicitante` | VARCHAR(100) | | NO | Nombre de la Autoridad Requiriente / Fiscal |
| `investigador` | VARCHAR(150) | | NO | Nombre del Investigador Asignado (Colector) |
| `fecha` | DATE | | NO | Fecha del hecho o coleccionamiento |
| `hora` | TIME | | NO | Hora del hecho o coleccionamiento |
| `lugar` | VARCHAR(255) | | NO | Dirección o sitio de recolección de evidencias |
| `estadoActual` | ENUM('RECIBIDA', 'EN_ANALISIS', 'EN_PROCESO', 'FINALIZADA', 'ENTREGADA', 'ARCHIVADA') | | NO | Estado del ciclo de vida procesal |
| `createdAt` | TIMESTAMP | | NO | Fecha de registro en el sistema |
| `updatedAt` | TIMESTAMP | | NO | Última actualización |

---

### 3.6. Tabla Intermedia: `cadena_especialidades`
* **Propósito:** Relación M:N entre un caso de Cadena de Custodia y las especialidades requeridas para los peritajes.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `cadena_codigo` | VARCHAR(50) | **PK, FK** | NO | Referencia a `cadenas_custodia.codigoUnico` |
| `especialidad_id` | VARCHAR(36) | **PK, FK** | NO | Referencia a `especialidades.id` |

---

### 3.7. Tabla: `evidencias`
* **Propósito:** Detalle individual de los elementos físicos o muestras biológicas/digitales colectadas bajo la misma cadena.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único de la evidencia |
| `cadenaCodigo` | VARCHAR(50) | **FK** | NO | Referencia a `cadenas_custodia.codigoUnico` |
| `codigo` | VARCHAR(30) | | NO | Código interno del elemento (ej. *EVD-01*, *EVD-02*) |
| `tipo` | VARCHAR(100) | | NO | Tipo de elemento (ej. *Arma de fuego*, *Celular*, *Prenda*) |
| `descripcion` | TEXT | | NO | Descripción detallada y estado físico al recibir |
| `cantidad` | INT | | NO | Cantidad o volumen recibido |
| `embalaje` | VARCHAR(100) | | NO | Tipo de embalaje (ej. *Bolsa de papel*, *Caja precintada*) |
| `estado` | VARCHAR(50) | | NO | Condición del elemento (ej. *Íntegro*, *Con precinto*) |
| `observaciones` | TEXT | | SÍ | Notas adicionales de recepción |
| `createdAt` | TIMESTAMP | | NO | Fecha de registro |
| `updatedAt` | TIMESTAMP | | NO | Última actualización |

---

### 3.8. Tabla: `peritos_asignados`
* **Propósito:** Asignación de profesionales peritos a un caso o especialidad concreta dentro de la Cadena de Custodia.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único de la asignación |
| `cadenaCodigo` | VARCHAR(50) | **FK** | NO | Referencia a `cadenas_custodia.codigoUnico` |
| `peritoId` | VARCHAR(36) | **FK** | NO | Referencia a `usuarios.id` |
| `especialidadId` | VARCHAR(36) | **FK** | SÍ | Referencia a `especialidades.id` |
| `nombre` | VARCHAR(150) | | NO | Nombre completo del perito al momento de la asignación |
| `cargo` | VARCHAR(100) | | NO | Cargo o especialidad |
| `fechaAsignacion`| TIMESTAMP | | NO | Fecha y hora en que fue designado |
| `asignadoPor` | VARCHAR(150) | | NO | Nombre o ID del Encargado/Admin que asignó |
| `estadoAsignacion`| VARCHAR(50) | | NO | Estado (ej. *ASIGNADO*, *EN_CURSO*, *COMPLETADO*) |

---

### 3.9. Tabla: `documentos_adjuntos`
* **Propósito:** Archivos respaldatorios digitalizados (requerimientos fiscales, actas, dictámenes, fijaciones fotográficas).

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador del documento |
| `cadenaCodigo` | VARCHAR(50) | **FK** | NO | Referencia a `cadenas_custodia.codigoUnico` |
| `nombreArchivo` | VARCHAR(255) | | NO | Nombre original del archivo subido |
| `tipoArchivo` | VARCHAR(100) | | NO | Tipo MIME (ej. *application/pdf*, *image/jpeg*) |
| `fechaCarga` | TIMESTAMP | | NO | Fecha y hora de subida |
| `cargadoPorId` | VARCHAR(36) | **FK** | NO | Referencia al usuario que subió el documento |
| `descripcion` | VARCHAR(255) | | SÍ | Breve descripción del contenido del documento |
| `tamano` | INT | | NO | Tamaño del archivo en bytes |
| `base64Data` | LONGTEXT / BLOB | | SÍ | Almacenamiento directo o URI del archivo |

---

### 3.10. Tabla: `historial_custodia`
* **Propósito:** Registro inmutable de trazabilidad que garantiza el principio de no alteración en la cadena de custodia.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador único del evento histórico |
| `cadenaCodigo` | VARCHAR(50) | **FK** | NO | Referencia a `cadenas_custodia.codigoUnico` |
| `fecha` | DATE | | NO | Fecha del evento |
| `hora` | TIME | | NO | Hora exacta del evento |
| `usuarioId` | VARCHAR(36) | **FK** | NO | Referencia al usuario ejecutor |
| `usuarioNombre` | VARCHAR(150) | | NO | Nombre del usuario que registró el cambio |
| `accion` | VARCHAR(255) | | NO | Acción realizada (ej. *Cambio de estado a EN_ANALISIS*) |
| `observaciones` | TEXT | | SÍ | Justificación o detalle de la acción |
| `createdAt` | TIMESTAMP | | NO | Timestamp de inserción |

---

### 3.11. Tabla: `auditoria_sistema`
* **Propósito:** Bitácora global de ciberseguridad y accesos para cumplimiento de normativas de auditoría informática.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador del registro de auditoría |
| `usuarioId` | VARCHAR(36) | **FK** | NO | Referencia a `usuarios.id` |
| `usuarioNombre` | VARCHAR(150) | | NO | Identificación del usuario en la sesión |
| `fecha` | DATE | | NO | Fecha del suceso |
| `hora` | TIME | | NO | Hora exacta del suceso |
| `accion` | VARCHAR(255) | | NO | Evento (ej. *Inicio de sesión exitoso*, *Registro de caso*) |
| `ip` | VARCHAR(45) | | NO | Dirección IP pública/privada de origen |
| `navegador` | VARCHAR(255) | | NO | User-Agent / Navegador utilizado |
| `createdAt` | TIMESTAMP | | NO | Marca de tiempo del log |

---

### 3.12. Tabla: `notificaciones`
* **Propósito:** Sistema de alertas internas destinadas a avisar a los peritos o funcionarios sobre asignaciones y actualizaciones de casos.

| Campo | Tipo de Dato | Clave | Nulo | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| `id` | VARCHAR(36) / UUID | **PK** | NO | Identificador de la notificación |
| `usuarioId` | VARCHAR(36) | **FK** | NO | Referencia al usuario destinatario |
| `titulo` | VARCHAR(150) | | NO | Título o asunto de la alerta |
| `mensaje` | TEXT | | NO | Cuerpo informativo de la notificación |
| `fecha` | TIMESTAMP | | NO | Fecha y hora de emisión |
| `leida` | BOOLEAN | | NO | Indicador de lectura (true/false) |

---

## 4. REGLAS DE INTEGRIDAD Y RESTRICCIONES (CONSTRAINTS)

1. **Unicidad Obligatoria (UNIQUE):**
   - `usuarios.ci` y `usuarios.correo`: Evita duplicidad de cuentas de personal.
   - `cadenas_custodia.codigoUnico`: Código correlativo irrepetible asignado por regional y año.
   - `especialidades.nombre`: Nombre único por especialidad.
2. **Integridad Referencial (FOREIGN KEYS):**
   - Eliminación / Modificación en Cascada restringida (`ON DELETE RESTRICT / NO ACTION`) en `cadenas_custodia` para prevenir el borrado accidental de expedientes forenses con evidencia activa.
3. **Inmutabilidad de la Trazabilidad:**
   - La tabla `historial_custodia` solo permite operaciones de inserción (`INSERT`), estando estrictamente prohibidas las modificaciones (`UPDATE`) o eliminaciones (`DELETE`) a nivel de aplicación e infraestructura de base de datos.

---
*Policía Boliviana • Instituto de Investigaciones Técnico Científicas (IITCUP)*  
*Santa Cruz - Bolivia*
