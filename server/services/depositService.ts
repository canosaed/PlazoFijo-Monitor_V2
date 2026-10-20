import Database from 'better-sqlite3';
import { calculateEstimatedInterest, deriveDepositStatus } from './financialService.js';
import { logAudit } from './auditService.js';

export interface DepositData {
  id?: string;
  entidadId?: string | null;
  bank: string;
  description?: string;
  type?: string;
  capital: number;
  moneda?: string;
  startDate: string;
  endDate: string;
  days: number;
  tna: number;
  tea?: number | null;
  estimatedInterest?: number;
  reportedInterest?: number | null;
  collectedInterest?: number | null;
  estimatedTotalAmount?: number;
  reportedTotalAmount?: number | null;
  collectedCapital?: number | null;
  autoRenewal?: boolean;
  status?: string;
  previousId?: string | null;
  nextId?: string | null;
  notes?: string;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function mapRowToDeposit(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    bank: row.banco,
    description: row.descripcion || '',
    type: row.tipo || 'TRADICIONAL_TF',
    capital: Number(row.capital),
    startDate: row.fecha_inicio,
    endDate: row.fecha_vencimiento,
    days: Number(row.dias),
    tna: Number(row.tna),
    tea: row.tea != null ? Number(row.tea) : null,
    estimatedInterest: Number(row.interes_estimado),
    reportedInterest: row.interes_informado != null ? Number(row.interes_informado) : null,
    collectedInterest: row.interes_cobrado != null ? Number(row.interes_cobrado) : null,
    estimatedTotalAmount: Number(row.monto_estimado),
    reportedTotalAmount: row.monto_informado != null ? Number(row.monto_informado) : null,
    collectedCapital: row.capital_recibido != null ? Number(row.capital_recibido) : null,
    autoRenewal: Boolean(row.renovacion_automatica),
    status: row.estado,
    previousId: row.id_plazo_anterior || null,
    nextId: row.id_plazo_siguiente || null,
    notes: row.observaciones || '',
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getAllDeposits(db: Database.Database, includeDemo: boolean = true): any[] {
  let query = 'SELECT * FROM plazos_fijos';
  if (!includeDemo) {
    query += ' WHERE is_demo = 0';
  }
  query += ' ORDER BY fecha_vencimiento ASC';

  const rows = db.prepare(query).all();
  return rows.map(r => {
    const dep = mapRowToDeposit(r);
    dep.status = deriveDepositStatus(dep.endDate, dep.status);
    return dep;
  });
}

export function getDepositById(db: Database.Database, id: string): any | null {
  const row = db.prepare('SELECT * FROM plazos_fijos WHERE id = ?').get(id);
  if (!row) return null;
  const dep = mapRowToDeposit(row);
  dep.status = deriveDepositStatus(dep.endDate, dep.status);
  return dep;
}

export function saveDeposit(db: Database.Database, data: DepositData, eventDescription?: string): any {
  const now = new Date().toISOString();
  const id = data.id || `pf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const estimatedInterest = data.estimatedInterest ?? calculateEstimatedInterest(data.capital, data.tna, data.days);
  const estimatedTotalAmount = data.estimatedTotalAmount ?? (data.capital + estimatedInterest);
  const status = data.status || deriveDepositStatus(data.endDate, 'VIGENTE');

  const existingRow = db.prepare('SELECT * FROM plazos_fijos WHERE id = ?').get(id);
  const isUpdate = Boolean(existingRow);

  const stmt = db.prepare(`
    INSERT INTO plazos_fijos (
      id, entidad_id, banco, descripcion, tipo, capital, moneda,
      fecha_inicio, fecha_vencimiento, dias, tna, tea,
      interes_estimado, interes_informado, interes_cobrado,
      monto_estimado, monto_informado, capital_recibido,
      renovacion_automatica, estado, id_plazo_anterior, id_plazo_siguiente,
      observaciones, is_demo, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      banco=excluded.banco,
      descripcion=excluded.descripcion,
      tipo=excluded.tipo,
      capital=excluded.capital,
      fecha_inicio=excluded.fecha_inicio,
      fecha_vencimiento=excluded.fecha_vencimiento,
      dias=excluded.dias,
      tna=excluded.tna,
      tea=excluded.tea,
      interes_estimado=excluded.interes_estimado,
      interes_informado=excluded.interes_informado,
      interes_cobrado=excluded.interes_cobrado,
      monto_estimado=excluded.monto_estimado,
      monto_informado=excluded.monto_informado,
      capital_recibido=excluded.capital_recibido,
      renovacion_automatica=excluded.renovacion_automatica,
      estado=excluded.estado,
      id_plazo_anterior=excluded.id_plazo_anterior,
      id_plazo_siguiente=excluded.id_plazo_siguiente,
      observaciones=excluded.observaciones,
      is_demo=excluded.is_demo,
      updated_at=excluded.updated_at
  `);

  const runTransaction = db.transaction(() => {
    stmt.run(
      id,
      data.entidadId || null,
      data.bank,
      data.description || '',
      data.type || 'TRADICIONAL_TF',
      data.capital,
      data.moneda || 'ARS',
      data.startDate,
      data.endDate,
      data.days,
      data.tna,
      data.tea ?? null,
      estimatedInterest,
      data.reportedInterest ?? null,
      data.collectedInterest ?? null,
      estimatedTotalAmount,
      data.reportedTotalAmount ?? null,
      data.collectedCapital ?? null,
      data.autoRenewal ? 1 : 0,
      status,
      data.previousId || null,
      data.nextId || null,
      data.notes || '',
      data.isDemo ? 1 : 0,
      data.createdAt || now,
      now
    );

    // Record Event
    const eventType = isUpdate ? 'MODIFICACION' : 'ALTA';
    const desc = eventDescription || (isUpdate ? `Modificación de datos de plazo fijo en ${data.bank}` : `Alta de plazo fijo en ${data.bank}`);

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, id, now, eventType, desc, data.capital, estimatedInterest, estimatedTotalAmount);

    // Log Audit
    logAudit(db, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: isUpdate ? 'UPDATE' : 'INSERT',
      valoresAnteriores: isUpdate ? mapRowToDeposit(existingRow) : null,
      valoresNuevos: { id, bank: data.bank, capital: data.capital, status },
    });
  });

  runTransaction();
  return getDepositById(db, id);
}

export function confirmCollection(
  db: Database.Database,
  id: string,
  collectedInterest: number,
  collectedCapital: number,
  closeInvestment: boolean
): any {
  const existing = getDepositById(db, id);
  if (!existing) throw new Error('Plazo fijo no encontrado');

  const now = new Date().toISOString();
  const newStatus = closeInvestment ? 'CERRADO' : existing.status;

  const runTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE plazos_fijos SET
        interes_cobrado = ?,
        capital_recibido = ?,
        estado = ?,
        updated_at = ?
      WHERE id = ?
    `).run(collectedInterest, collectedCapital, newStatus, now, id);

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId, id, now, 'CONFIRMACION_COBRO',
      `Confirmación de cobro: Interés $ ${collectedInterest.toLocaleString('es-AR')}`,
      collectedCapital, collectedInterest, (collectedCapital + collectedInterest)
    );

    logAudit(db, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: 'UPDATE',
      valoresAnteriores: { status: existing.status, collectedInterest: existing.collectedInterest },
      valoresNuevos: { status: newStatus, collectedInterest, collectedCapital },
    });
  });

  runTransaction();
  return getDepositById(db, id);
}

export function renewDeposit(
  db: Database.Database,
  oldDepositId: string,
  newCapital: number,
  newTna: number,
  newDays: number,
  newStartDate: string,
  autoRenewal: boolean
): { oldDeposit: any; newDeposit: any } {
  const oldDeposit = getDepositById(db, oldDepositId);
  if (!oldDeposit) throw new Error('Plazo fijo a renovar no encontrado');

  const newDepositId = `pf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // End date calculation
  const start = new Date(newStartDate);
  const end = new Date(start);
  end.setDate(start.getDate() + newDays);
  const newEndDate = end.toISOString().split('T')[0];

  const estimatedInterest = calculateEstimatedInterest(newCapital, newTna, newDays);
  const estimatedTotalAmount = newCapital + estimatedInterest;

  let createdNewDeposit: any = null;
  let updatedOldDeposit: any = null;

  const runTransaction = db.transaction(() => {
    // 1. Create new deposit first so Foreign Key constraint (id_plazo_siguiente) is satisfied
    db.prepare(`
      INSERT INTO plazos_fijos (
        id, banco, descripcion, tipo, capital, moneda,
        fecha_inicio, fecha_vencimiento, dias, tna,
        interes_estimado, monto_estimado,
        renovacion_automatica, estado, id_plazo_anterior,
        observaciones, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newDepositId,
      oldDeposit.bank,
      `Renovación de ${oldDeposit.description || oldDeposit.bank}`,
      oldDeposit.type || 'TRADICIONAL_TF',
      newCapital,
      'ARS',
      newStartDate,
      newEndDate,
      newDays,
      newTna,
      estimatedInterest,
      estimatedTotalAmount,
      autoRenewal ? 1 : 0,
      'VIGENTE',
      oldDepositId,
      `Renovado desde plazo fijo anterior ID ${oldDepositId}`,
      oldDeposit.isDemo ? 1 : 0,
      now,
      now
    );

    // 2. Update old deposit pointing nextId to new deposit
    db.prepare(`
      UPDATE plazos_fijos SET
        estado = 'RENOVADO',
        id_plazo_siguiente = ?,
        updated_at = ?
      WHERE id = ?
    `).run(newDepositId, now, oldDepositId);

    // Event on old deposit
    const evtOldId = `evt_${Date.now()}_1_${Math.random().toString(36).substring(2, 5)}`;
    db.prepare(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(evtOldId, oldDepositId, now, 'RENOVACION', 'Inversión marcada como RENOVADA', oldDeposit.capital, oldDeposit.estimatedInterest, oldDeposit.estimatedTotalAmount);

    // Event on new deposit
    const evtNewId = `evt_${Date.now()}_2_${Math.random().toString(36).substring(2, 5)}`;
    db.prepare(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(evtNewId, newDepositId, now, 'ALTA', `Renovación vinculada al plazo fijo ID ${oldDepositId}`, newCapital, estimatedInterest, estimatedTotalAmount);

    logAudit(db, {
      tablaAfectada: 'plazos_fijos',
      registroId: oldDepositId,
      tipoOperacion: 'UPDATE',
      valoresAnteriores: { status: oldDeposit.status },
      valoresNuevos: { status: 'RENOVADO', nextId: newDepositId },
    });
  });

  runTransaction();

  updatedOldDeposit = getDepositById(db, oldDepositId);
  createdNewDeposit = getDepositById(db, newDepositId);

  return { oldDeposit: updatedOldDeposit, newDeposit: createdNewDeposit };
}

export function deleteDeposit(db: Database.Database, id: string): void {
  const existing = getDepositById(db, id);
  if (!existing) return;

  const runTransaction = db.transaction(() => {
    db.prepare('DELETE FROM eventos_plazo_fijo WHERE plazo_fijo_id = ?').run(id);
    db.prepare('DELETE FROM plazos_fijos WHERE id = ?').run(id);

    logAudit(db, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: 'DELETE',
      valoresAnteriores: existing,
    });
  });

  runTransaction();
}

export function clearData(db: Database.Database, includeReal: boolean = false): void {
  const runTransaction = db.transaction(() => {
    if (includeReal) {
      db.prepare('DELETE FROM eventos_plazo_fijo').run();
      db.prepare('DELETE FROM plazos_fijos').run();
    } else {
      const demoDeposits = db.prepare('SELECT id FROM plazos_fijos WHERE is_demo = 1').all();
      for (const d of demoDeposits as any[]) {
        db.prepare('DELETE FROM eventos_plazo_fijo WHERE plazo_fijo_id = ?').run(d.id);
        db.prepare('DELETE FROM plazos_fijos WHERE id = ?').run(d.id);
      }
    }
  });

  runTransaction();
}

export function getAllEvents(db: Database.Database, depositId?: string): any[] {
  let query = 'SELECT * FROM eventos_plazo_fijo';
  const params: any[] = [];

  if (depositId) {
    query += ' WHERE plazo_fijo_id = ?';
    params.push(depositId);
  }

  query += ' ORDER BY timestamp DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map((r: any) => ({
    id: r.id,
    depositId: r.plazo_fijo_id,
    timestamp: r.timestamp,
    type: r.tipo_evento,
    description: r.descripcion,
    amounts: {
      capital: r.monto_capital != null ? Number(r.monto_capital) : null,
      interest: r.monto_interes != null ? Number(r.monto_interes) : null,
      total: r.monto_total != null ? Number(r.monto_total) : null,
    },
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  }));
}
