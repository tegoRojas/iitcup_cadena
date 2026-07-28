# POLICÍA BOLIVIANA - IITCUP
## INSTITUTO DE INVESTIGACIONES TÉCNICO CIENTÍFICAS DE LA UNIVERSIDAD POLICIAL
### SISTEMA DE GESTIÓN DE CADENA DE CUSTODIA Y SEGUIMIENTO DE CASOS

---

# DOCUMENTO EXPLICATIVO DE ROLES Y PERMISOS DE USUARIO

El **Sistema de Gestión de Cadena de Custodia y Seguimiento de Casos del IITCUP** implementa un modelo de control de acceso basado en roles (**RBAC - Role-Based Access Control**), diseñado para cumplir con la estricta confidencialidad, integridad y trazabilidad legal exigida en el manejo de evidencias periciales y actuaciones forenses.

A continuación, se detalla la estructura, responsabilidades, permisos y alcance de cada uno de los **cuatro (4) roles de usuario** configurados en la plataforma.

---

## 1. ADMINISTRADOR (Administrador del Sistema / Regional)

### 📌 Perfil y Definición
El **Administrador** posee el nivel de acceso técnico y operativo más elevado dentro del ámbito de la regional. Está destinado al personal encargado de la gestión de la infraestructura digital del IITCUP, jefes de sistemas o encargados departamentales con atribuciones de administración.

### 🔑 Permisos y Capacidades Principales
* **Gestión Integral de Usuarios**:
  * Crear, editar, activar o inactivar cuentas de usuario.
  * Asignar credenciales de acceso, nombres, apellidos, C.I., cargo institucional, correo electrónico y número telefónico.
  * Configurar el rol de cada usuario y vincular a los Peritos con sus respectivas especialidades forenses.
* **Gestión de Especialidades / Áreas Periciales**:
  * Crear y gestionar las áreas forenses (ej. *Documentología*, *Balística Forense*, *Informática Forense*, *Biología y Genética*, *Química Forense*, *Toxicología*, *Laboratorio Móvil*, etc.).
  * Activar o inhabilitar especialidades de acuerdo con los requerimientos operativos de la institución.
* **Gestión y Control de Cadenas de Custodia**:
  * Registrar la apertura de nuevas Cadenas de Custodia y Casos.
  * Editar información general del caso (RUP, Fiscalía, Fiscal asignado, Investigador asignado, etc.).
  * Asignar o reasignar peritos a los casos según la especialidad requerida.
  * Modificar o actualizar estados del ciclo de vida de la evidencia.
* **Auditoría y Seguridad**:
  * Acceso exclusivo al **Módulo de Auditoría del Sistema**, donde puede revisar la bitácora inmutable de eventos.
  * Monitorear direcciones IP, navegadores utilizados, fecha, hora exacta y acciones ejecutadas por todos los usuarios del sistema.
* **Reportes y Exportación**:
  * Descargar reportes generales en formato Excel.
  * Imprimir la versión digital oficial del Formulario de Cadena de Custodia y Actas de Recepción.

---

## 2. ENCARGADO (Encargado de Custodia y Recepción de Evidencias)

### 📌 Perfil y Definición
El **Encargado** representa al funcionario custodio responsable de la recepción física, registro inicial y custodia temporal de las evidencias recolectadas en el lugar del hecho o remitidas por la Fiscalía/Investigadores.

### 🔑 Permisos y Capacidades Principales
* **Recepción y Registro de Casos**:
  * Aperturar y registrar nuevas Cadenas de Custodia en el sistema asignando el Código Único e indicando RUP, unidad remitente, fiscalía, fiscal, investigador, fecha, hora y lugar de recolección.
* **Gestión de Evidencias e Inventarios**:
  * Registrar cada uno de los elementos probatorios (evidencias) vinculados al caso, detallando tipo, cantidad, tipo de embalaje, estado físico y observaciones.
* **Asignación de Peritos y Especialidades**:
  * Seleccionar las especialidades técnicas requeridas para el análisis del caso.
  * Asignar a los Peritos Forenses habilitados para la elaboración de la pericia.
* **Manejo del Ciclo de Vida y Documentación**:
  * Actualizar los estados operacionales de la evidencia (*RECIBIDA*, *EN_ANALISIS*, *EN_PROCESO*, *FINALIZADA*, *ENTREGADA*, *ARCHIVADA*).
  * Adjuntar requerimientos fiscales, resoluciones y documentación de respaldo en formato PDF o imágenes.
* **Emisión de Documentos Oficiales**:
  * Generar e imprimir la Ficha Técnica Oficial de Cadena de Custodia y el Registro de Historial de Trazabilidad.

---

## 3. PERITO (Perito Forense / Investigador Técnico-Científico)

### 📌 Perfil y Definición
El **Perito** es el profesional especializado (ej. especialista en balística, informática forense, dactiloscopia, etc.) asignado para efectuar los análisis técnico-científicos, toma de muestras, procesamiento de evidencias e informes periciales/dictámenes.

### 🔑 Permisos y Capacidades Principales
* **Vista Personalizada y Enfocada**:
  * Acceso al Dashboard y listado de Cadenas de Custodia filtrado automáticamente para mostrar **únicamente los casos asignados a su persona o área pericial**.
* **Procesamiento Pericial de Evidencias**:
  * Modificar el estado del análisis (*EN_ANALISIS*, *EN_PROCESO*, *FINALIZADA*).
  * Registrar observaciones técnicas y notas de avance en la cadena de custodia.
* **Carga de Documentos y Evidencia Gráfica**:
  * Subir archivos adjuntos, dictámenes forenses firmados, certificados y muestreos fotográficos forenses asociados a la investigación.
* **Trazabilidad e Historial**:
  * Consultar el historial completo de recepción, movimientos y custodia previa de la evidencia asignada.
  * Descargar o previsualizar documentos respaldatorios e imprimir formularios de custodia.

---

## 4. SUPERVISOR (Supervisor Nacional / Dirección / Mando Institucional)

### 📌 Perfil y Definición
El **Supervisor** cuenta con un perfil de fiscalización, control institucional y monitoreo de alto nivel (Dirección Nacional, Jefatura Departamental o Mandos Policiales/Fiscales autorizados).

### 🔑 Permisos y Capacidades Principales
* **Dashboard Nacional / Departamental**:
  * Visualización de indicadores estadísticos consolidados en tiempo real: total de casos, distribución por estados operacionales, cantidad de evidencias resguardadas, rendimiento de peritos e historial temporal.
* **Supervisión Global de Casos**:
  * Búsqueda y consulta detallada de cualquier cadena de custodia o caso registrado a nivel regional o nacional.
* **Fiscalización de Usuarios y Unidades**:
  * Consultar la nómina de usuarios, cargos, estados (activos/inactivos) y especialidades forenses habilitadas.
* **Revisión de Trazabilidad y Auditorías**:
  * Acceso al módulo de auditoría de seguridad para verificar el cumplimiento estricto de las normas de la cadena de custodia e integridad del debido proceso.
* **Acceso en Modo Lectura / Control Intrusivo Cero**:
  * Permite una fiscalización transparente sin posibilidad de alterar accidentalmente datos técnicos o estados asignados por el personal operativo.

---

## RESUMEN COMPARATIVO DE MATRIZ DE PERMISOS (RBAC)

| Módulo / Funcionalidad | ADMINISTRADOR | ENCARGADO | PERITO | SUPERVISOR |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard** | ✅ Completo | ✅ Regional | 🔍 Casos Asignados | 🌐 Nacional / Global |
| **Crear Cadena de Custodia** | ✅ | ✅ | ❌ | ❌ |
| **Registrar Evidencias** | ✅ | ✅ | 🔍 En sus casos | ❌ (Solo lectura) |
| **Asignar Peritos** | ✅ | ✅ | ❌ | ❌ |
| **Modificar Estado de Custodia**| ✅ | ✅ | ✅ (Sus casos) | ❌ |
| **Adjuntar Dictámenes / Fotos** | ✅ | ✅ | ✅ | ❌ |
| **Imprimir Ficha Oficial / Excel**| ✅ | ✅ | ✅ | ✅ |
| **Gestión de Usuarios** | ✅ | ❌ | ❌ | 🔍 Solo lectura |
| **Gestión de Especialidades** | ✅ | ❌ | ❌ | 🔍 Solo lectura |
| **Auditoría de Seguridad** | ✅ | ❌ | ❌ | ✅ Solo lectura |

---
*Policía Boliviana • Instituto de Investigaciones Técnico Científicas (IITCUP)*  
*Santa Cruz - Bolivia*
