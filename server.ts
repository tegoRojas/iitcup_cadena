import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword } from './server/db';
import { authMiddleware, signToken, requireRole, AuthenticatedRequest } from './server/auth';

const app = express();
const PORT = 3000;

// Body parsing middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Custom middleware to capture Client IP and User Agent
const captureAuditoriaInfo = (req: express.Request) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const navegador = req.headers['user-agent'] || 'Desconocido';
  return { ip, navegador };
};

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Autenticación (Login)
app.post('/api/auth/login', (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  const user = db.getUserByUsername(usuario);
  if (!user || user.estado === 'INACTIVO') {
    return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo.' });
  }

  const inputHash = hashPassword(contrasena);
  if (user.contrasenaHash !== inputHash) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  // Sign Token
  const token = signToken({
    userId: user.id,
    usuario: user.usuario,
    rol: user.rol,
    nombreCompleto: `${user.nombre} ${user.apellidos}`,
    regionalId: user.regionalId
  });

  // Log Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(user.id, `${user.nombre} ${user.apellidos}`, `INICIO DE SESIÓN EXITOSO (Rol: ${user.rol})`, info.ip, info.navegador);

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      ci: user.ci,
      cargo: user.cargo,
      correo: user.correo,
      telefono: user.telefono,
      usuario: user.usuario,
      rol: user.rol,
      estado: user.estado,
      regionalId: user.regionalId
    }
  });
});

// GET Regionales
app.get('/api/regionales', authMiddleware, (req, res) => {
  res.json(db.getRegionales());
});

// 2. Dashboard Stats
app.get('/api/stats', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const cadenas = db.getCadenas();
  const evidencias = db.getAllEvidencias();
  const users = db.getUsers();

  let filteredCadenas = cadenas;
  const regionalQuery = req.query.regionalId as string;

  if (user.rol === 'SUPERVISOR') {
    if (regionalQuery && regionalQuery !== 'ALL') {
      filteredCadenas = cadenas.filter(c => c.regionalId === regionalQuery);
    }
  } else {
    filteredCadenas = cadenas.filter(c => c.regionalId === user.regionalId);
  }

  if (user.rol === 'PERITO') {
    const asignaciones = db.getAsignacionesByPerito(user.userId);
    const codigosAsignados = asignaciones.map(a => a.cadenaCodigo);
    filteredCadenas = filteredCadenas.filter(c => codigosAsignados.includes(c.codigoUnico));
  }

  const total = filteredCadenas.length;
  const recibidas = filteredCadenas.filter(c => c.estadoActual === 'RECIBIDA').length;
  const analisis = filteredCadenas.filter(c => c.estadoActual === 'EN_ANALISIS').length;
  const proceso = filteredCadenas.filter(c => c.estadoActual === 'EN_PROCESO').length;
  const finalizadas = filteredCadenas.filter(c => c.estadoActual === 'FINALIZADA').length;
  const entregadas = filteredCadenas.filter(c => c.estadoActual === 'ENTREGADA').length;
  const archivadas = filteredCadenas.filter(c => c.estadoActual === 'ARCHIVADA').length;

  const peritosActivos = users.filter(u => u.rol === 'PERITO' && u.estado === 'ACTIVO' && (
    user.rol === 'SUPERVISOR' 
      ? (regionalQuery && regionalQuery !== 'ALL' ? u.regionalId === regionalQuery : true) 
      : u.regionalId === user.regionalId
  )).length;
  
  // count evidences belonging to the filtered chains
  const filteredChainCodes = filteredCadenas.map(c => c.codigoUnico);
  const evidenciasRegistradas = evidencias.filter(ev => filteredChainCodes.includes(ev.cadenaCodigo)).length;

  // Monthly breakdown for Line Chart (simulated based on historical dates)
  const temporal = filteredCadenas.reduce((acc: Record<string, number>, c) => {
    const month = c.fecha.substring(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const temporalArray = Object.entries(temporal).map(([mes, cantidad]) => ({ mes, cantidad }));

  // Supervisors get Cases by Regional chart data
  const casosPorRegional = db.getRegionales().map(r => {
    const count = cadenas.filter(c => c.regionalId === r.id).length;
    return { name: r.nombre, value: count };
  });

  res.json({
    total,
    pendientes: recibidas, // "Pendientes" mapped from RECIBIDA
    enAnalisis: analisis,
    enProceso: proceso,
    finalizadas,
    entregadas,
    archivadas,
    evidenciasRegistradas,
    peritosActivos,
    distribucionEstados: [
      { name: 'Recibidas', value: recibidas },
      { name: 'En Análisis', value: analisis },
      { name: 'En Proceso', value: proceso },
      { name: 'Finalizadas', value: finalizadas },
      { name: 'Entregadas', value: entregadas },
      { name: 'Archivadas', value: archivadas }
    ],
    temporal: temporalArray.sort((a, b) => a.mes.localeCompare(b.mes)),
    casosPorRegional
  });
});

// 3. CRUD Usuarios (Permite lectura a roles autorizados, escritura a Administrador únicamente)
app.get('/api/users', authMiddleware, requireRole(['ADMINISTRADOR', 'ENCARGADO', 'PERITO', 'SUPERVISOR']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let users = db.getUsers();
  
  if (user.rol !== 'SUPERVISOR') {
    users = users.filter(u => u.regionalId === user.regionalId);
  }

  const safeUsers = users.map(u => {
    const { contrasenaHash, ...safeUser } = u;
    return safeUser;
  });
  res.json(safeUsers);
});

app.post('/api/users', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { nombre, apellidos, ci, cargo, correo, telefono, usuario, contrasena, rol, estado, especialidades, regionalId } = req.body;
  
  if (!nombre || !apellidos || !ci || !cargo || !correo || !telefono || !usuario || !contrasena || !rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para crear el usuario.' });
  }

  const targetRegionalId = regionalId || user.regionalId;
  if (user.rol !== 'SUPERVISOR' && targetRegionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede crear usuarios para otra Regional.' });
  }

  // Check unique constraints
  const existingUser = db.getUserByUsername(usuario) || db.getUsers().find(u => u.ci === ci || u.correo === correo);
  if (existingUser) {
    return res.status(400).json({ error: 'El usuario, CI o correo ya se encuentra registrado en el sistema.' });
  }

  const contrasenaHash = hashPassword(contrasena);
  const newUser = db.createUser({
    nombre,
    apellidos,
    ci,
    cargo,
    correo,
    telefono,
    usuario,
    contrasenaHash,
    rol,
    estado: estado || 'ACTIVO',
    especialidades: especialidades || [],
    regionalId: targetRegionalId
  });

  // Log Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `CREACIÓN DE USUARIO: ${usuario} (Rol: ${rol})`, info.ip, info.navegador);

  const { contrasenaHash: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.put('/api/users/:id', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = req.user!;
  const { nombre, apellidos, ci, cargo, correo, telefono, usuario, contrasena, rol, estado, especialidades, regionalId } = req.body;

  const target = db.getUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (user.rol !== 'SUPERVISOR' && target.regionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede modificar usuarios de otra Regional.' });
  }

  const targetRegionalId = regionalId || target.regionalId;
  if (user.rol !== 'SUPERVISOR' && targetRegionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede mover un usuario a otra Regional.' });
  }

  const updates: any = {};
  if (nombre) updates.nombre = nombre;
  if (apellidos) updates.apellidos = apellidos;
  if (ci) updates.ci = ci;
  if (cargo) updates.cargo = cargo;
  if (correo) updates.correo = correo;
  if (telefono) updates.telefono = telefono;
  if (usuario) updates.usuario = usuario;
  if (rol) updates.rol = rol;
  if (estado) updates.estado = estado;
  if (especialidades !== undefined) updates.especialidades = especialidades;
  if (targetRegionalId) updates.regionalId = targetRegionalId;
  if (contrasena) {
    updates.contrasenaHash = hashPassword(contrasena);
  }

  const updated = db.updateUser(id, updates);
  if (!updated) {
    return res.status(400).json({ error: 'Error al actualizar el usuario.' });
  }

  // Log Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `EDICIÓN DE USUARIO: ${updated.usuario}`, info.ip, info.navegador);

  const { contrasenaHash: _, ...safeUser } = updated;
  res.json(safeUser);
});

app.delete('/api/users/:id', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const user = req.user!;
  const target = db.getUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (user.rol !== 'SUPERVISOR' && target.regionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede eliminar usuarios de otra Regional.' });
  }

  if (target.id === req.user!.userId) {
    return res.status(400).json({ error: 'No es posible eliminarse a sí mismo del sistema.' });
  }

  db.deleteUser(id);

  // Log Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `ELIMINACIÓN DE USUARIO ID: ${id} (${target.usuario})`, info.ip, info.navegador);

  res.json({ success: true, message: 'Usuario eliminado exitosamente.' });
});

// 4. Cadenas de Custodia (CRUD & Business Logic)
app.get('/api/cadenas', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const chains = db.getCadenas();

  let filtered = chains;
  if (user.rol !== 'SUPERVISOR') {
    filtered = chains.filter(c => c.regionalId === user.regionalId);
  }

  if (user.rol === 'PERITO') {
    // See ONLY assigned chains
    const asignaciones = db.getAsignacionesByPerito(user.userId);
    const codigosAsignados = asignaciones.map(a => a.cadenaCodigo);
    filtered = filtered.filter(c => codigosAsignados.includes(c.codigoUnico));
  }

  // Decorate chains with their evidences and assignments for rich read-only monitoring
  const richChains = filtered.map(c => {
    const evs = db.getEvidenciasByCadena(c.codigoUnico);
    const asigs = db.getAsignacionesByCadena(c.codigoUnico);
    return {
      ...c,
      evidenciasCount: evs.length,
      evidencias: evs,
      peritosAsignados: asigs
    };
  });

  res.json(richChains);
});

app.get('/api/cadenas/:codigo', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const user = req.user!;

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (user.rol !== 'SUPERVISOR' && cadena.regionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. Este registro pertenece a otra Regional.' });
  }

  // Access check for peritos
  if (user.rol === 'PERITO') {
    const asignaciones = db.getAsignacionesByPerito(user.userId);
    const isAssigned = asignaciones.some(a => a.cadenaCodigo === codigo);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Acceso denegado. No está asignado a esta cadena.' });
    }
  }

  // Assemble full details
  const evidencias = db.getEvidenciasByCadena(codigo);
  const documentos = db.getDocumentosByCadena(codigo);
  const historiales = db.getHistorialByCadena(codigo);
  const asignacionesRaw = db.getAsignacionesByCadena(codigo);
  
  // Map peritos names
  const peritos = asignacionesRaw.map(asig => {
    const pUser = db.getUserById(asig.peritoId);
    return {
      id: asig.id,
      peritoId: asig.peritoId,
      especialidadId: asig.especialidadId,
      nombre: pUser ? `${pUser.nombre} ${pUser.apellidos}` : 'Desconocido',
      cargo: pUser ? pUser.cargo : 'Perito',
      fechaAsignacion: asig.fechaAsignacion,
      asignadoPor: asig.asignadoPor,
      estadoAsignacion: asig.estadoAsignacion
    };
  });

  res.json({
    ...cadena,
    evidencias,
    documentos,
    historiales,
    peritosAsignados: peritos
  });
});

app.post('/api/cadenas', authMiddleware, requireRole(['ENCARGADO', 'ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { caso, fiscalia, fiscal, investigador, fecha, hora, lugar, evidencias, especialidadesRequeridas, unidad, regionalId } = req.body;

  if (!caso || !fiscalia || !fiscal || !investigador || !fecha || !hora || !lugar || !unidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la cadena (caso, fiscalia, fiscal, investigador, fecha, hora, lugar, unidad).' });
  }

  const targetRegionalId = regionalId || req.user!.regionalId || 'reg-sc';
  if (req.user!.rol !== 'SUPERVISOR' && targetRegionalId !== req.user!.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede crear cadenas de custodia para otra Regional.' });
  }

  // Create chain
  const newCadena = db.createCadena({
    caso,
    fiscalia,
    fiscal,
    investigador,
    fecha,
    hora,
    lugar,
    unidad,
    regionalId: targetRegionalId,
    especialidadesRequeridas: especialidadesRequeridas || []
  });

  // Log History
  db.addHistorial(
    newCadena.codigoUnico,
    req.user!.userId,
    req.user!.nombreCompleto,
    'CREACIÓN Y APERTURA DE CADENA',
    `Se registra la cadena de custodia bajo el nro. de caso ${caso} e investigador ${investigador}.`
  );

  // Add Evidences if provided (No "peso" field)
  if (evidencias && Array.isArray(evidencias)) {
    evidencias.forEach((ev: any) => {
      db.createEvidencia({
        cadenaCodigo: newCadena.codigoUnico,
        tipo: ev.tipo || 'Evidencia Genérica',
        descripcion: ev.descripcion || '',
        cantidad: Number(ev.cantidad) || 1,
        embalaje: ev.embalaje || 'Bolsa sellada',
        estado: ev.estado || 'Lacrado',
        observaciones: ev.observaciones || ''
      });
    });
  }

  // Log Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    req.user!.userId,
    req.user!.nombreCompleto,
    `CREACIÓN DE CADENA DE CUSTODIA CÓDIGO: ${newCadena.codigoUnico}`,
    info.ip,
    info.navegador
  );

  res.status(201).json(newCadena);
});

// Update chain info and status transitions
app.put('/api/cadenas/:codigo', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const { estadoActual, caso, fiscalia, fiscal, investigador, fecha, hora, lugar, observacionesTecnicas, unidad } = req.body;
  const user = req.user!;

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (user.rol !== 'SUPERVISOR' && cadena.regionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede modificar registros de otra Regional.' });
  }

  const info = captureAuditoriaInfo(req);

  // 1. Check permissions and perform appropriate modifications
  if (user.rol === 'PERITO') {
    // A perito can ONLY edit technical observations, results, and limited statuses (e.g., transition to EN_PROCESO, FINALIZADA)
    const asignaciones = db.getAsignacionesByPerito(user.userId);
    const isAssigned = asignaciones.some(a => a.cadenaCodigo === codigo);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Acceso denegado. No está asignado a esta cadena pericial.' });
    }

    const updates: any = {};
    if (estadoActual) {
      // Validate allowed transitions for Perito
      if (!['EN_ANALISIS', 'EN_PROCESO', 'FINALIZADA'].includes(estadoActual)) {
        return res.status(400).json({ error: 'Como perito solo puede marcar el estado como En Análisis, En Proceso o Finalizada.' });
      }
      updates.estadoActual = estadoActual;
    }

    const oldEstado = cadena.estadoActual;
    const updated = db.updateCadena(codigo, updates);

    // Register Technical Timeline
    if (observacionesTecnicas || estadoActual) {
      db.addHistorial(
        codigo,
        user.userId,
        user.nombreCompleto,
        estadoActual ? `ESTADO ACTUALIZADO POR PERITO A: ${estadoActual}` : 'OBSERVACIONES TÉCNICAS REGISTRADAS',
        `Detalle técnico: ${observacionesTecnicas || 'Actualización de progreso de peritaje.'}`
      );

      db.addAuditoria(
        user.userId,
        user.nombreCompleto,
        `PERITO ACTUALIZA CADENA ${codigo}: ${estadoActual ? `Estado ${oldEstado} -> ${estadoActual}` : 'Agregó observaciones'}`,
        info.ip,
        info.navegador
      );
    }

    return res.json(updated);
  }

  // 2. Encargado/Admin Roles can modify everything
  const updates: any = {};
  if (estadoActual) updates.estadoActual = estadoActual;
  if (caso) updates.caso = caso;
  if (fiscalia) updates.fiscalia = fiscalia;
  if (fiscal) updates.fiscal = fiscal;
  if (investigador) updates.investigador = investigador;
  if (fecha) updates.fecha = fecha;
  if (hora) updates.hora = hora;
  if (lugar) updates.lugar = lugar;
  if (unidad) updates.unidad = unidad;

  const oldEstado = cadena.estadoActual;
  const updated = db.updateCadena(codigo, updates);

  // Create timeline history for change
  if (estadoActual && oldEstado !== estadoActual) {
    db.addHistorial(
      codigo,
      user.userId,
      user.nombreCompleto,
      `CAMBIO DE ESTADO DE CADENA A: ${estadoActual}`,
      `El encargado de custodia modificó el estado de ${oldEstado} a ${estadoActual}.`
    );

    // Create notifications for assigned peritos
    const asignados = db.getAsignacionesByCadena(codigo);
    asignados.forEach(asig => {
      db.addNotificacion(
        asig.peritoId,
        `Cambio de Estado - ${codigo}`,
        `La cadena de custodia asignada ${codigo} cambió su estado a ${estadoActual} por ${user.nombreCompleto}.`
      );
    });
  } else {
    db.addHistorial(
      codigo,
      user.userId,
      user.nombreCompleto,
      'MODIFICACIÓN DE DATOS GENERALES',
      `Se actualizaron los datos generales del requerimiento por el personal de custodia.`
    );
  }

  db.addAuditoria(
    user.userId,
    user.nombreCompleto,
    `MODIFICACIÓN DE CADENA ${codigo} ${estadoActual ? `(Estado: ${oldEstado} -> ${estadoActual})` : ''}`,
    info.ip,
    info.navegador
  );

  res.json(updated);
});

// 5. Asignación de Peritos (Encargado o Administrador)
app.post('/api/cadenas/:codigo/asignar', authMiddleware, requireRole(['ENCARGADO', 'ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const { peritosIds } = req.body; // Array of User IDs

  if (!peritosIds || !Array.isArray(peritosIds)) {
    return res.status(400).json({ error: 'Se requiere una lista de IDs de peritos para asignar.' });
  }

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (req.user!.rol !== 'SUPERVISOR' && cadena.regionalId !== req.user!.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede asignar peritos a una cadena de otra Regional.' });
  }

  // Clear existing assignments and set new ones
  db.clearAsignaciones(codigo);

  peritosIds.forEach(pId => {
    const pUser = db.getUserById(pId);
    if (pUser && pUser.rol === 'PERITO') {
      db.assignPerito(codigo, pId, req.user!.nombreCompleto);
      
      // Notify perito
      db.addNotificacion(
        pId,
        'Nueva Asignación de Caso - IITCUP',
        `Se le asignó el caso ${cadena.caso} (Cadena: ${codigo}) para peritaje científico.`
      );
    }
  });

  // Update status automatically to EN_ANALISIS upon assignment
  db.updateCadena(codigo, { estadoActual: 'EN_ANALISIS' });

  // Add Timeline History
  db.addHistorial(
    codigo,
    req.user!.userId,
    req.user!.nombreCompleto,
    'ASIGNACIÓN DE PERITOS Y ESTADO EN ANÁLISIS',
    `Se asignaron peritos para la investigación forense. La cadena transiciona automáticamente al estado EN ANÁLISIS.`
  );

  // Audit
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    req.user!.userId,
    req.user!.nombreCompleto,
    `ASIGNACIÓN DE PERITOS PARA CASO ${codigo}. Total asignados: ${peritosIds.length}`,
    info.ip,
    info.navegador
  );

  res.json({ success: true, message: 'Peritos asignados y notificados correctamente.' });
});

// 6. Carga de Documentos / Evidencias Fotográficas (Base64)
app.post('/api/cadenas/:codigo/documentos', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const { nombreArchivo, tipoArchivo, descripcion, tamano, base64Data } = req.body;
  const user = req.user!;

  if (!nombreArchivo || !tipoArchivo || !descripcion) {
    return res.status(400).json({ error: 'Faltan metadatos del documento (nombre, tipo, descripción).' });
  }

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (user.rol !== 'SUPERVISOR' && cadena.regionalId !== user.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede cargar documentos en una cadena de otra Regional.' });
  }

  // Register document in DB (base64 simulation is kept metadata-only for database sizing,
  // or can be saved if required. We store the document metadata securely).
  const newDoc = db.createDocumento({
    cadenaCodigo: codigo,
    nombreArchivo,
    tipoArchivo,
    cargadoPorId: user.userId,
    descripcion,
    tamano: tamano || 102400
  });

  // Create timeline history
  db.addHistorial(
    codigo,
    user.userId,
    user.nombreCompleto,
    `CARGA DE ARCHIVO: ${nombreArchivo.toUpperCase()}`,
    `Se adjuntó evidencia documental/fotográfica. Descripción: ${descripcion}`
  );

  // Notify assigned members if uploaded by perito
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    user.userId,
    user.nombreCompleto,
    `CARGÓ DOCUMENTO: ${nombreArchivo} EN CADENA ${codigo}`,
    info.ip,
    info.navegador
  );

  res.status(201).json(newDoc);
});

// 7. Auditoría Completa (Administradores y Supervisores)
app.get('/api/auditorias', authMiddleware, requireRole(['ADMINISTRADOR', 'SUPERVISOR']), (req, res) => {
  res.json(db.getAuditorias());
});

// Registrar exportaciones hechas por el Supervisor / Admin
app.post('/api/auditorias/exportar', authMiddleware, requireRole(['ADMINISTRADOR', 'SUPERVISOR']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { tipoReporte, formato, filtros } = req.body;
  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    user.userId,
    user.nombreCompleto,
    `EXPORTACIÓN DE REPORTE: ${tipoReporte} (${formato}) | Filtros aplicados: ${JSON.stringify(filtros)}`,
    info.ip,
    info.navegador
  );
  res.json({ success: true, message: 'Exportación registrada en auditoría.' });
});

// 8. Notificaciones en Tiempo Real
app.get('/api/notificaciones', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json(db.getNotificacionesByUser(req.user!.userId));
});

app.post('/api/notificaciones/leer', authMiddleware, (req: AuthenticatedRequest, res) => {
  db.markNotificacionesAsRead(req.user!.userId);
  res.json({ success: true });
});

// 9. Evidencias endpoints
app.post('/api/cadenas/:codigo/evidencias', authMiddleware, requireRole(['ENCARGADO', 'ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const { tipo, descripcion, cantidad, embalaje, estado, observaciones } = req.body;

  if (!tipo || !descripcion || !cantidad || !embalaje || !estado) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes para registrar la evidencia (tipo, descripcion, cantidad, embalaje, estado).' });
  }

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (req.user!.rol !== 'SUPERVISOR' && cadena.regionalId !== req.user!.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede agregar evidencias a una cadena de otra Regional.' });
  }

  const newEv = db.createEvidencia({
    cadenaCodigo: codigo,
    tipo,
    descripcion,
    cantidad: Number(cantidad),
    embalaje,
    estado,
    observaciones
  });

  db.addHistorial(
    codigo,
    req.user!.userId,
    req.user!.nombreCompleto,
    `ADICIÓN DE EVIDENCIA: ${newEv.codigo}`,
    `Se agrega un elemento de tipo ${tipo}. Descripción: ${descripcion}`
  );

  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    req.user!.userId,
    req.user!.nombreCompleto,
    `AGREGÓ EVIDENCIA ${newEv.codigo} A CADENA ${codigo}`,
    info.ip,
    info.navegador
  );

  res.status(201).json(newEv);
});

// 10. Especialidades (Áreas Periciales) CRUD
app.get('/api/especialidades', authMiddleware, (req, res) => {
  res.json(db.getEspecialidades());
});

app.post('/api/especialidades', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { nombre, descripcion, estado } = req.body;
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: 'El nombre y descripción de la especialidad son requeridos.' });
  }

  const existing = db.getEspecialidades().find(e => e.nombre.toLowerCase() === nombre.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una especialidad con este nombre.' });
  }

  const newEsp = db.createEspecialidad({
    nombre,
    descripcion,
    estado: estado || 'ACTIVO'
  });

  const info = captureAuditoriaInfo(req);
  db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `CREACIÓN ÁREA PERICIAL: ${nombre}`, info.ip, info.navegador);

  res.status(201).json(newEsp);
});

app.put('/api/especialidades/:id', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { nombre, descripcion, estado } = req.body;

  try {
    const updated = db.updateEspecialidad(id, { nombre, descripcion, estado });
    const info = captureAuditoriaInfo(req);
    db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `MODIFICACIÓN ÁREA PERICIAL: ${updated.nombre}`, info.ip, info.navegador);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar la especialidad.' });
  }
});

app.delete('/api/especialidades/:id', authMiddleware, requireRole(['ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const target = db.getEspecialidades().find(e => e.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Especialidad no encontrada.' });
  }

  try {
    db.deleteEspecialidad(id);
    const info = captureAuditoriaInfo(req);
    db.addAuditoria(req.user!.userId, req.user!.nombreCompleto, `ELIMINACIÓN ÁREA PERICIAL: ${target.nombre}`, info.ip, info.navegador);
    res.json({ success: true, message: 'Especialidad eliminada correctamente.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'No se puede eliminar la especialidad.' });
  }
});

// 11. Asignación Inteligente de Peritos por Especialidad
app.post('/api/cadenas/:codigo/asignar-peritos', authMiddleware, requireRole(['ENCARGADO', 'ADMINISTRADOR']), (req: AuthenticatedRequest, res) => {
  const { codigo } = req.params;
  const { asignaciones } = req.body; // Array of { especialidadId, peritoId }

  if (!asignaciones || !Array.isArray(asignaciones)) {
    return res.status(400).json({ error: 'Se requiere un listado de asignaciones periciales.' });
  }

  const cadena = db.getCadenaByCodigo(codigo);
  if (!cadena) {
    return res.status(404).json({ error: 'Cadena de custodia no encontrada.' });
  }

  if (req.user!.rol !== 'SUPERVISOR' && cadena.regionalId !== req.user!.regionalId) {
    return res.status(403).json({ error: 'Acceso denegado. No puede asignar peritos a una cadena de otra Regional.' });
  }

  // Clear existing perito assignments
  db.clearAsignaciones(codigo);

  // Perform each specialty assignment
  asignaciones.forEach(asig => {
    const { especialidadId, peritoId } = asig;
    const pUser = db.getUserById(peritoId);
    const esp = db.getEspecialidades().find(e => e.id === especialidadId);

    if (pUser && pUser.rol === 'PERITO' && esp) {
      db.assignPeritoWithSpecialty(codigo, peritoId, especialidadId, req.user!.nombreCompleto);

      // Notify perito
      db.addNotificacion(
        peritoId,
        'Asignación de Peritaje Especializado',
        `Se le ha asignado el área de "${esp.nombre}" en el caso ${cadena.caso} (Cadena: ${codigo}).`
      );
    }
  });

  // Set chain status to EN_ANALISIS automatically
  db.updateCadena(codigo, { estadoActual: 'EN_ANALISIS' });

  // Add trace history log
  db.addHistorial(
    codigo,
    req.user!.userId,
    req.user!.nombreCompleto,
    'ASIGNACIÓN INTELIGENTE DE PERITOS',
    `Se asignaron peritos calificados según las áreas periciales requeridas para la investigación forense.`
  );

  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    req.user!.userId,
    req.user!.nombreCompleto,
    `ASIGNACIÓN INTELIGENTE PARA CASO ${codigo}. Total áreas: ${asignaciones.length}`,
    info.ip,
    info.navegador
  );

  res.json({ success: true, message: 'Asignación de peritos por área pericial guardada correctamente.' });
});

// 12. Actualización de Estado de Asignación por Perito
app.put('/api/asignaciones/:id/estado', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { estadoAsignacion, observaciones } = req.body; // PENDIENTE, FINALIZADA

  if (!estadoAsignacion) {
    return res.status(400).json({ error: 'El estado de asignación es requerido.' });
  }

  // Find the assignment across all chains in memory
  const chains = db.getCadenas();
  let targetAsig: any = null;
  let targetChainCode = '';

  for (const c of chains) {
    const asigs = db.getAsignacionesByCadena(c.codigoUnico);
    const match = asigs.find(a => a.id === id);
    if (match) {
      targetAsig = match;
      targetChainCode = c.codigoUnico;
      break;
    }
  }

  if (!targetAsig) {
    return res.status(404).json({ error: 'Asignación pericial no encontrada.' });
  }

  // Auth guard: peritos can only update their own assignments
  if (req.user!.rol === 'PERITO' && targetAsig.peritoId !== req.user!.userId) {
    return res.status(403).json({ error: 'No está autorizado para modificar esta asignación.' });
  }

  const updated = db.updateAsignacionEstado(id, estadoAsignacion);

  if (estadoAsignacion === 'FINALIZADA') {
    const pUser = db.getUserById(targetAsig.peritoId);
    const esp = db.getEspecialidades().find(e => e.id === targetAsig.especialidadId);
    const pName = pUser ? `${pUser.nombre} ${pUser.apellidos}` : 'Perito';
    const espName = esp ? esp.nombre : 'Área';

    // Log history
    db.addHistorial(
      targetChainCode,
      req.user!.userId,
      req.user!.nombreCompleto,
      `PERITAJE CONCLUIDO - ${espName.toUpperCase()}`,
      `El perito ${pName} concluyó el peritaje en el área de "${espName}". Observaciones técnicas: ${observaciones || 'Sin observaciones.'}`
    );

    // Notify Encargados & Admins
    const staff = db.getUsers().filter(u => u.rol === 'ADMINISTRADOR' || u.rol === 'ENCARGADO');
    staff.forEach(u => {
      db.addNotificacion(
        u.id,
        `Peritaje Concluido - Caso ${targetChainCode}`,
        `El perito ${pName} ha completado el análisis forense de ${espName}.`
      );
    });
  }

  const info = captureAuditoriaInfo(req);
  db.addAuditoria(
    req.user!.userId,
    req.user!.nombreCompleto,
    `ACTUALIZACIÓN ASIGNACIÓN ID ${id} A ESTADO: ${estadoAsignacion}`,
    info.ip,
    info.navegador
  );

  res.json(updated);
});

// Start Server & Vite Integration
async function startServer() {
  // Vite integration for rich development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IITCUP SERVER] Corriendo en http://localhost:${PORT}`);
  });
}

startServer();
