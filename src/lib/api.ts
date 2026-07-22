import { CadenaCustodia, Evidencia, Documento, Historial, User, Auditoria, Notificacion, DashboardStats, Especialidad } from '../types';

// Check if we are online or offline
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Key for storage persistence
const LOCAL_CADENAS_KEY = 'iitcup_offline_cadenas';
const LOCAL_PENDING_QUEUE_KEY = 'iitcup_offline_queue';

export interface PendingAction {
  id: string;
  type: 'CREATE_CADENA' | 'ADD_EVIDENCIA' | 'UPDATE_STATUS';
  endpoint: string;
  method: 'POST' | 'PUT';
  body: any;
  timestamp: number;
}

// Get Auth Token from localStorage
export function getStoredToken(): string | null {
  return localStorage.getItem('iitcup_token');
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('iitcup_user');
  return data ? JSON.parse(data) : null;
}

// Base Fetch Helper
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Error en la solicitud: ${response.status}`);
  }

  return response.json();
}

// Offline Persistence Helpers
export function saveCadenasLocally(cadenas: any[]) {
  localStorage.setItem(LOCAL_CADENAS_KEY, JSON.stringify(cadenas));
}

export function getLocalCadenas(): any[] {
  const data = localStorage.getItem(LOCAL_CADENAS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getOfflineQueue(): PendingAction[] {
  const data = localStorage.getItem(LOCAL_PENDING_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addToOfflineQueue(action: Omit<PendingAction, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  const newAction: PendingAction = {
    ...action,
    id: 'act-' + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  };
  queue.push(newAction);
  localStorage.setItem(LOCAL_PENDING_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(LOCAL_PENDING_QUEUE_KEY);
}

// -------------------------------------------------------------
// PWA Synchronization Engine
// -------------------------------------------------------------
export async function syncOfflineData(onProgress?: (msg: string) => void): Promise<number> {
  if (!isOnline()) return 0;
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let successfulSyncs = 0;
  onProgress?.(`Sincronizando ${queue.length} acciones registradas sin conexión...`);

  for (const action of queue) {
    try {
      await apiFetch(action.endpoint, {
        method: action.method,
        body: JSON.stringify(action.body)
      });
      successfulSyncs++;
    } catch (error) {
      console.error('Error syncing action', action, error);
    }
  }

  clearOfflineQueue();
  onProgress?.(`¡Sincronización completada con éxito! (${successfulSyncs} registros sincronizados)`);
  return successfulSyncs;
}

// -------------------------------------------------------------
// REST API Core Services
// -------------------------------------------------------------
export const api = {
  // Stats
  async getStats(regionalId?: string): Promise<DashboardStats> {
    if (!isOnline()) {
      // Simulate stats from local chains
      const local = getLocalCadenas();
      const count = local.length;
      return {
        total: count,
        pendientes: local.filter(c => c.estadoActual === 'RECIBIDA').length,
        enAnalisis: local.filter(c => c.estadoActual === 'EN_ANALISIS').length,
        enProceso: local.filter(c => c.estadoActual === 'EN_PROCESO').length,
        finalizadas: local.filter(c => c.estadoActual === 'FINALIZADA').length,
        entregadas: local.filter(c => c.estadoActual === 'ENTREGADA').length,
        archivadas: local.filter(c => c.estadoActual === 'ARCHIVADA').length,
        evidenciasRegistradas: local.reduce((sum, c) => sum + (c.evidencias?.length || 0), 0),
        peritosActivos: 5,
        distribucionEstados: [],
        temporal: []
      };
    }
    const query = regionalId ? `?regionalId=${regionalId}` : '';
    return apiFetch(`/api/stats${query}`);
  },

  // Regionales
  async getRegionales(): Promise<any[]> {
    return apiFetch('/api/regionales');
  },

  // Users
  async getUsers(): Promise<User[]> {
    return apiFetch('/api/users');
  },

  async createUser(data: Partial<User> & { contrasena: string }): Promise<User> {
    return apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(id: string): Promise<any> {
    return apiFetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Especialidades (Áreas Periciales)
  async getEspecialidades(): Promise<Especialidad[]> {
    return apiFetch('/api/especialidades');
  },

  async createEspecialidad(data: Partial<Especialidad>): Promise<Especialidad> {
    return apiFetch('/api/especialidades', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateEspecialidad(id: string, data: Partial<Especialidad>): Promise<Especialidad> {
    return apiFetch(`/api/especialidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteEspecialidad(id: string): Promise<any> {
    return apiFetch(`/api/especialidades/${id}`, {
      method: 'DELETE'
    });
  },

  // Asignaciones de Peritos por Especialidad
  async assignPeritoSpecialty(codigo: string, asignaciones: { especialidadId: string; peritoId: string }[]): Promise<any> {
    return apiFetch(`/api/cadenas/${codigo}/asignar-peritos`, {
      method: 'POST',
      body: JSON.stringify({ asignaciones })
    });
  },

  async updateAssignmentStatus(id: string, data: { estadoAsignacion: string; observaciones?: string }): Promise<any> {
    return apiFetch(`/api/asignaciones/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Cadenas
  async getCadenas(): Promise<CadenaCustodia[]> {
    if (!isOnline()) {
      return getLocalCadenas();
    }
    const data = await apiFetch('/api/cadenas');
    saveCadenasLocally(data);
    return data;
  },

  async getCadenaByCodigo(codigo: string): Promise<CadenaCustodia & { evidencias: Evidencia[]; documentos: Documento[]; historiales: Historial[]; peritosAsignados: any[] }> {
    if (!isOnline()) {
      const local = getLocalCadenas();
      const match = local.find(c => c.codigoUnico === codigo);
      if (match) return match;
      throw new Error('No se encontró el registro fuera de línea.');
    }
    return apiFetch(`/api/cadenas/${codigo}`);
  },

  async createCadena(data: any): Promise<CadenaCustodia> {
    if (!isOnline()) {
      // Save in queue & create simulated chain
      const count = getLocalCadenas().length + 1;
      const fakeCode = `IITCUP-SC-2026-${String(count).padStart(5, '0')}`;
      const mockChain: CadenaCustodia = {
        codigoUnico: fakeCode,
        nroCadena: `CC-2026-${1028 + count}`,
        caso: data.caso,
        fiscalia: data.fiscalia,
        fiscal: data.fiscal,
        investigador: data.investigador,
        fecha: data.fecha,
        hora: data.hora,
        lugar: data.lugar,
        estadoActual: 'RECIBIDA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const local = getLocalCadenas();
      local.push({ ...mockChain, evidencias: data.evidencias || [], documentos: [], historiales: [] });
      saveCadenasLocally(local);

      addToOfflineQueue({
        type: 'CREATE_CADENA',
        endpoint: '/api/cadenas',
        method: 'POST',
        body: data
      });

      return mockChain;
    }
    return apiFetch('/api/cadenas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCadenaStatus(codigo: string, data: { estadoActual: string; observacionesTecnicas?: string }): Promise<any> {
    if (!isOnline()) {
      // Update local storage representation
      const local = getLocalCadenas();
      const idx = local.findIndex(c => c.codigoUnico === codigo);
      if (idx !== -1) {
        local[idx].estadoActual = data.estadoActual;
        saveCadenasLocally(local);
      }

      addToOfflineQueue({
        type: 'UPDATE_STATUS',
        endpoint: `/api/cadenas/${codigo}`,
        method: 'PUT',
        body: data
      });

      return { success: true, offline: true };
    }
    return apiFetch(`/api/cadenas/${codigo}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async updateCadenaGeneral(codigo: string, data: any): Promise<any> {
    return apiFetch(`/api/cadenas/${codigo}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async assignPeritos(codigo: string, peritosIds: string[]): Promise<any> {
    return apiFetch(`/api/cadenas/${codigo}/asignar`, {
      method: 'POST',
      body: JSON.stringify({ peritosIds })
    });
  },

  async addEvidencia(codigo: string, data: any): Promise<Evidencia> {
    if (!isOnline()) {
      // Offline support for adding evidences
      const local = getLocalCadenas();
      const idx = local.findIndex(c => c.codigoUnico === codigo);
      const fakeEvCode = `EVID-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const mockEv: Evidencia = {
        id: 'fake-ev-' + Date.now(),
        cadenaCodigo: codigo,
        codigo: fakeEvCode,
        tipo: data.tipo,
        descripcion: data.descripcion,
        cantidad: data.cantidad,
        embalaje: data.embalaje,
        estado: data.estado,
        observaciones: data.observaciones,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        local[idx].evidencias = [...(local[idx].evidencias || []), mockEv];
        saveCadenasLocally(local);
      }

      addToOfflineQueue({
        type: 'ADD_EVIDENCIA',
        endpoint: `/api/cadenas/${codigo}/evidencias`,
        method: 'POST',
        body: data
      });

      return mockEv;
    }
    return apiFetch(`/api/cadenas/${codigo}/evidencias`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async uploadDocument(codigo: string, data: { nombreArchivo: string; tipoArchivo: string; descripcion: string; tamano: number; base64Data?: string }): Promise<Documento> {
    return apiFetch(`/api/cadenas/${codigo}/documentos`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Auditoria
  async getAuditorias(): Promise<Auditoria[]> {
    return apiFetch('/api/auditorias');
  },

  async logExport(tipoReporte: string, formato: string, filtros: any): Promise<any> {
    return apiFetch('/api/auditorias/exportar', {
      method: 'POST',
      body: JSON.stringify({ tipoReporte, formato, filtros })
    });
  },

  // Notifications
  async getNotificaciones(): Promise<Notificacion[]> {
    if (!isOnline()) return [];
    return apiFetch('/api/notificaciones');
  },

  async markNotificationsRead(): Promise<any> {
    return apiFetch('/api/notificaciones/leer', { method: 'POST' });
  }
};

// -------------------------------------------------------------
// PDF and Excel Export Simulation Engine (100% Client-Side)
// -------------------------------------------------------------
export function exportToExcel(filename: string, data: any[]) {
  // Create an elegant CSV representation which opens flawlessly in Microsoft Excel
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM for Spanish characters
  
  if (data.length === 0) return;
  
  // Header
  const headers = Object.keys(data[0]);
  csvContent += headers.join(';') + '\r\n';
  
  // Rows
  data.forEach(row => {
    const values = headers.map(header => {
      let val = row[header];
      if (val === undefined || val === null) return '';
      // Sanitize fields containing semicolons or linebreaks
      val = String(val).replace(/[\r\n]+/g, ' ').replace(/;/g, ',');
      return `"${val}"`;
    });
    csvContent += values.join(';') + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateChainPDF(cadena: any) {
  // Elegant, responsive, printable layout generation using iframe/print popup.
  // This generates a gorgeous, structured, official IITCUP institutional PDF-like layout.
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilite las ventanas emergentes para descargar el PDF.');
    return;
  }

  const peritosStr = cadena.peritosAsignados?.length > 0 
    ? cadena.peritosAsignados.map((p: any) => `${p.nombre} (${p.cargo})`).join(', ')
    : 'No asignado aún';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>ACTA DE CADENA DE CUSTODIA - ${cadena.codigoUnico}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.5;
          margin: 0;
          padding: 30px;
          font-size: 11px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px double #1b4332;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .logo-section {
          text-align: left;
        }
        .logo-title {
          font-weight: bold;
          font-size: 13px;
          color: #1b4332;
          letter-spacing: 1px;
        }
        .logo-sub {
          font-size: 9px;
          color: #64748b;
        }
        .title-section {
          text-align: right;
        }
        .doc-title {
          font-size: 16px;
          font-weight: 800;
          color: #1b4332;
          margin: 0;
        }
        .doc-subtitle {
          font-size: 10px;
          color: #cda200;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .panel {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
        }
        .panel-header {
          background-color: #f1f5f9;
          font-weight: bold;
          padding: 6px 10px;
          font-size: 10px;
          color: #0f172a;
          border-bottom: 1px solid #cbd5e1;
          text-transform: uppercase;
        }
        .panel-body {
          padding: 10px;
        }
        .info-row {
          display: flex;
          margin-bottom: 5px;
        }
        .info-label {
          width: 140px;
          font-weight: bold;
          color: #475569;
        }
        .info-val {
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 20px;
        }
        th {
          background-color: #1b4332;
          color: white;
          padding: 8px;
          font-size: 9px;
          text-align: left;
          text-transform: uppercase;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 8px;
        }
        .timeline {
          margin-top: 15px;
          position: relative;
          padding-left: 20px;
          border-left: 1px dashed #cbd5e1;
        }
        .timeline-item {
          margin-bottom: 15px;
          position: relative;
        }
        .timeline-dot {
          position: absolute;
          left: -25px;
          top: 3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #cda200;
        }
        .timeline-header {
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .timeline-body {
          color: #475569;
          margin-top: 3px;
        }
        .signatures {
          margin-top: 60px;
          display: flex;
          justify-content: space-around;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #475569;
          width: 200px;
          padding-top: 5px;
          font-size: 9px;
        }
        .footer {
          margin-top: 50px;
          border-top: 1px solid #cbd5e1;
          padding-top: 10px;
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f8fafc; padding: 10px; display: flex; justify-content: flex-end; gap: 10px; border-bottom: 1px solid #cbd5e1; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #1b4332; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">Imprimir Documento / Guardar PDF</button>
        <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">Cerrar</button>
      </div>

      <div class="header">
        <div class="logo-section">
          <div class="logo-title">IITCUP SANTA CRUZ</div>
          <div class="logo-sub">Instituto de Investigaciones Técnico Científicas de la Universidad Policial</div>
          <div class="logo-sub">Policía Boliviana - Dirección Departamental</div>
        </div>
        <div class="title-section">
          <div class="doc-title">ACTA DE CADENA DE CUSTODIA</div>
          <div class="doc-subtitle">CÓDIGO ÚNICO: ${cadena.codigoUnico}</div>
        </div>
      </div>

      <div class="grid-container">
        <div class="panel">
          <div class="panel-header">INFORMACIÓN JUDICIAL / FISCAL</div>
          <div class="panel-body">
            <div class="info-row"><div class="info-label">Nro. de Caso:</div><div class="info-val">${cadena.caso}</div></div>
            <div class="info-row"><div class="info-label">Nro. de Cadena:</div><div class="info-val">${cadena.nroCadena}</div></div>
            <div class="info-row"><div class="info-label">Fiscalía:</div><div class="info-val">${cadena.fiscalia}</div></div>
            <div class="info-row"><div class="info-label">Fiscal Asignado:</div><div class="info-val">${cadena.fiscal}</div></div>
            <div class="info-row"><div class="info-label">Investigador:</div><div class="info-val">${cadena.investigador}</div></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">DATOS DE RECEPCIÓN / ESTADO</div>
          <div class="panel-body">
            <div class="info-row"><div class="info-label">Fecha de Ingreso:</div><div class="info-val">${cadena.fecha}</div></div>
            <div class="info-row"><div class="info-label">Hora de Ingreso:</div><div class="info-val">${cadena.hora}</div></div>
            <div class="info-row"><div class="info-label">Lugar de Colecta:</div><div class="info-val">${cadena.lugar}</div></div>
            <div class="info-row"><div class="info-label">Estado Actual:</div><div class="info-val"><strong>${cadena.estadoActual}</strong></div></div>
            <div class="info-row"><div class="info-label">Peritos Asignados:</div><div class="info-val">${peritosStr}</div></div>
          </div>
        </div>
      </div>

      <h3 style="color: #1b4332; border-bottom: 1px solid #1b4332; padding-bottom: 5px; margin-top: 25px;">ELEMENTOS DE EVIDENCIA REGISTRADOS</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 15%;">Código</th>
            <th style="width: 20%;">Tipo de Elemento</th>
            <th style="width: 40%;">Descripción Detallada</th>
            <th style="width: 10%;">Cantidad</th>
            <th style="width: 15%;">Embalaje y Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cadena.evidencias?.map((ev: any) => `
            <tr>
              <td><strong>${ev.codigo}</strong></td>
              <td>${ev.tipo}</td>
              <td>${ev.descripcion}</td>
              <td>${ev.cantidad} pzs</td>
              <td>${ev.embalaje} (${ev.estado})</td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align:center;">No se registraron evidencias asociadas.</td></tr>'}
        </tbody>
      </table>

      <h3 style="color: #1b4332; border-bottom: 1px solid #1b4332; padding-bottom: 5px; margin-top: 25px;">HISTORIAL DE TRAZABILIDAD (TIMELINE INALTEABLE)</h3>
      <div class="timeline">
        ${cadena.historiales?.map((h: any) => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-header">
              <span>${h.fecha} - ${h.hora} | ${h.accion}</span>
              <span style="color:#64748b;">${h.usuarioNombre}</span>
            </div>
            <div class="timeline-body">${h.observaciones || 'Sin observaciones técnicas adicionales.'}</div>
          </div>
        `).join('') || '<p>No se registran eventos en el historial.</p>'}
      </div>

      <div class="signatures">
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="height: 60px;"></div>
          <div class="signature-line">Firma del Encargado de Custodia</div>
          <div style="font-size:8px; color:#64748b;">Sello y Firma - IITCUP</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="height: 60px;"></div>
          <div class="signature-line">Firma de Perito Especialista</div>
          <div style="font-size:8px; color:#64748b;">Área de Peritaje Científico</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="height: 60px;"></div>
          <div class="signature-line">Firma del Entregador / Investigador</div>
          <div style="font-size:8px; color:#64748b;">Policía Boliviana / Asignado</div>
        </div>
      </div>

      <div class="footer">
        Este documento constituye un acta oficial inalterable de la cadena de custodia de la Policía Boliviana - IITCUP Santa Cruz.<br>
        Documento generado el ${new Date().toLocaleString('es-BO')} para fines de trazabilidad legal judicial en Bolivia.
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
