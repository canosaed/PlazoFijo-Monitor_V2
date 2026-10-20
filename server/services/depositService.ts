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

function formatDateString(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val);
  return str.includes('T') ? str.split('T')[0] : str;
}

function formatDateTimeString(val: any): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) {
    return val.toISOString();
  }
  return String(val);
}

export async function withTransaction<T>(db: any, callback: (client: any) => Promise<T>): Promise<T> {
  const isPool = typeof db.connect === 'function';
  const client = isPool ? await db.connect() : db;
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback errors if already aborted
    }
    throw err;
  } finally {
    if (isPool) {
      client.release();
    }
  }
}

export function mapRowToDeposit(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    bank: row.banco,
    description: row.descripcion || '',
    type: row.tipo || 'TRADICIONAL_TF',
    capital: Number(row.capital),
    startDate: formatDateString(row.fecha_inicio),
    endDate: formatDateString(row.fecha_vencimiento),
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
    createdAt: formatDateTimeString(row.created_at),
    updatedAt: formatDateTimeString(row.updated_at),
  };
}

export async function getAllDeposits(db: any, includeDemo: boolean = true): Promise<any[]> {
  let query = 'SELECT * FROM plazos_fijos';
  if (!includeDemo) {
    query += ' WHERE is_demo = 0';
  }
  query += ' ORDER BY fecha_vencimiento ASC';

  const res = await db.query(query);
  return res.rows.map((r: any) => {
    const dep = mapRowToDeposit(r);
    dep.status = deriveDepositStatus(dep.endDate, dep.status);
    return dep;
  });
}

export async function getDepositById(db: any, id: string): Promise<any | null> {
  const res = await db.query('SELECT * FROM plazos_fijos WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const dep = mapRowToDeposit(res.rows[0]);
  dep.status = deriveDepositStatus(dep.endDate, dep.status);
  return dep;
}

export async function saveDeposit(db: any, data: DepositData, eventDescription?: string): Promise<any> {
  const now = new Date().toISOString();
  const id = data.id || `pf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const estimatedInterest = data.estimatedInterest ?? calculateEstimatedInterest(data.capital, data.tna, data.days);
  const estimatedTotalAmount = data.estimatedTotalAmount ?? (data.capital + estimatedInterest);
  const status = data.status || deriveDepositStatus(data.endDate, 'VIGENTE');

  return await withTransaction(db, async (client) => {
    const existingRes = await client.query('SELECT * FROM plazos_fijos WHERE id = $1', [id]);
    const existingRow = existingRes.rows[0];
    const isUpdate = Boolean(existingRow);

    await client.query(`
      INSERT INTO plazos_fijos (
        id, entidad_id, banco, descripcion, tipo, capital, moneda,
        fecha_inicio, fecha_vencimiento, dias, tna, tea,
        interes_estimado, interes_informado, interes_cobrado,
        monto_estimado, monto_informado, capital_recibido,
        renovacion_automatica, estado, id_plazo_anterior, id_plazo_siguiente,
        observaciones, is_demo, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26
      )
      ON CONFLICT(id) DO UPDATE SET
        banco=EXCLUDED.banco,
        descripcion=EXCLUDED.descripcion,
        tipo=EXCLUDED.tipo,
        capital=EXCLUDED.capital,
        fecha_inicio=EXCLUDED.fecha_inicio,
        fecha_vencimiento=EXCLUDED.fecha_vencimiento,
        dias=EXCLUDED.dias,
        tna=EXCLUDED.tna,
        tea=EXCLUDED.tea,
        interes_estimado=EXCLUDED.interes_estimado,
        interes_informado=EXCLUDED.interes_informado,
        interes_cobrado=EXCLUDED.interes_cobrado,
        monto_estimado=EXCLUDED.monto_estimado,
        monto_informado=EXCLUDED.monto_informado,
        capital_recibido=EXCLUDED.capital_recibido,
        renovacion_automatica=EXCLUDED.renovacion_automatica,
        estado=EXCLUDED.estado,
        id_plazo_anterior=EXCLUDED.id_plazo_anterior,
        id_plazo_siguiente=EXCLUDED.id_plazo_siguiente,
        observaciones=EXCLUDED.observaciones,
        is_demo=EXCLUDED.is_demo,
        updated_at=EXCLUDED.updated_at
    `, [
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
    ]);

    // Record Event
    const eventType = isUpdate ? 'MODIFICACION' : 'ALTA';
    const desc = eventDescription || (isUpdate ? `Modificación de datos de plazo fijo en ${data.bank}` : `Alta de plazo fijo en ${data.bank}`);

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.query(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [eventId, id, now, eventType, desc, data.capital, estimatedInterest, estimatedTotalAmount]);

    // Log Audit
    await logAudit(client, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: isUpdate ? 'UPDATE' : 'INSERT',
      valoresAnteriores: isUpdate ? mapRowToDeposit(existingRow) : null,
      valoresNuevos: { id, bank: data.bank, capital: data.capital, status },
    });

    const resSaved = await client.query('SELECT * FROM plazos_fijos WHERE id = $1', [id]);
    const dep = mapRowToDeposit(resSaved.rows[0]);
    dep.status = deriveDepositStatus(dep.endDate, dep.status);
    return dep;
  });
}

export async function confirmCollection(
  db: any,
  id: string,
  collectedInterest: number,
  collectedCapital: number,
  closeInvestment: boolean
): Promise<any> {
  const existing = await getDepositById(db, id);
  if (!existing) throw new Error('Plazo fijo no encontrado');

  const now = new Date().toISOString();
  const newStatus = closeInvestment ? 'CERRADO' : existing.status;

  return await withTransaction(db, async (client) => {
    await client.query(`
      UPDATE plazos_fijos SET
        interes_cobrado = $1,
        capital_recibido = $2,
        estado = $3,
        updated_at = $4
      WHERE id = $5
    `, [collectedInterest, collectedCapital, newStatus, now, id]);

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.query(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      eventId, id, now, 'CONFIRMACION_COBRO',
      `Confirmación de cobro: Interés $ ${collectedInterest.toLocaleString('es-AR')}`,
      collectedCapital, collectedInterest, (collectedCapital + collectedInterest)
    ]);

    await logAudit(client, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: 'UPDATE',
      valoresAnteriores: { status: existing.status, collectedInterest: existing.collectedInterest },
      valoresNuevos: { status: newStatus, collectedInterest, collectedCapital },
    });

    const res = await client.query('SELECT * FROM plazos_fijos WHERE id = $1', [id]);
    const dep = mapRowToDeposit(res.rows[0]);
    dep.status = deriveDepositStatus(dep.endDate, dep.status);
    return dep;
  });
}

export async function renewDeposit(
  db: any,
  oldDepositId: string,
  newCapital: number,
  newTna: number,
  newDays: number,
  newStartDate: string,
  autoRenewal: boolean
): Promise<{ oldDeposit: any; newDeposit: any }> {
  const oldDeposit = await getDepositById(db, oldDepositId);
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

  return await withTransaction(db, async (client) => {
    // 1. Create new deposit first so Foreign Key constraint (id_plazo_siguiente) is satisfied
    await client.query(`
      INSERT INTO plazos_fijos (
        id, banco, descripcion, tipo, capital, moneda,
        fecha_inicio, fecha_vencimiento, dias, tna,
        interes_estimado, monto_estimado,
        renovacion_automatica, estado, id_plazo_anterior,
        observaciones, is_demo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [
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
    ]);

    // 2. Update old deposit pointing nextId to new deposit
    await client.query(`
      UPDATE plazos_fijos SET
        estado = 'RENOVADO',
        id_plazo_siguiente = $1,
        updated_at = $2
      WHERE id = $3
    `, [newDepositId, now, oldDepositId]);

    // Event on old deposit
    const evtOldId = `evt_${Date.now()}_1_${Math.random().toString(36).substring(2, 5)}`;
    await client.query(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [evtOldId, oldDepositId, now, 'RENOVACION', 'Inversión marcada como RENOVADA', oldDeposit.capital, oldDeposit.estimatedInterest, oldDeposit.estimatedTotalAmount]);

    // Event on new deposit
    const evtNewId = `evt_${Date.now()}_2_${Math.random().toString(36).substring(2, 5)}`;
    await client.query(`
      INSERT INTO eventos_plazo_fijo (
        id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [evtNewId, newDepositId, now, 'ALTA', `Renovación vinculada al plazo fijo ID ${oldDepositId}`, newCapital, estimatedInterest, estimatedTotalAmount]);

    await logAudit(client, {
      tablaAfectada: 'plazos_fijos',
      registroId: oldDepositId,
      tipoOperacion: 'UPDATE',
      valoresAnteriores: { status: oldDeposit.status },
      valoresNuevos: { status: 'RENOVADO', nextId: newDepositId },
    });

    const oldRes = await client.query('SELECT * FROM plazos_fijos WHERE id = $1', [oldDepositId]);
    const newRes = await client.query('SELECT * FROM plazos_fijos WHERE id = $1', [newDepositId]);

    const updatedOldDeposit = mapRowToDeposit(oldRes.rows[0]);
    updatedOldDeposit.status = deriveDepositStatus(updatedOldDeposit.endDate, updatedOldDeposit.status);

    const createdNewDeposit = mapRowToDeposit(newRes.rows[0]);
    createdNewDeposit.status = deriveDepositStatus(createdNewDeposit.endDate, createdNewDeposit.status);

    return { oldDeposit: updatedOldDeposit, newDeposit: createdNewDeposit };
  });
}

export async function deleteDeposit(db: any, id: string): Promise<void> {
  const existing = await getDepositById(db, id);
  if (!existing) return;

  await withTransaction(db, async (client) => {
    await client.query('DELETE FROM eventos_plazo_fijo WHERE plazo_fijo_id = $1', [id]);
    await client.query('DELETE FROM plazos_fijos WHERE id = $1', [id]);

    await logAudit(client, {
      tablaAfectada: 'plazos_fijos',
      registroId: id,
      tipoOperacion: 'DELETE',
      valoresAnteriores: existing,
    });
  });
}

export async function clearData(db: any, includeReal: boolean = false): Promise<void> {
  await withTransaction(db, async (client) => {
    if (includeReal) {
      await client.query('DELETE FROM eventos_plazo_fijo');
      await client.query('DELETE FROM plazos_fijos');
    } else {
      const demoDeposits = await client.query('SELECT id FROM plazos_fijos WHERE is_demo = 1');
      for (const d of demoDeposits.rows) {
        await client.query('DELETE FROM eventos_plazo_fijo WHERE plazo_fijo_id = $1', [d.id]);
        await client.query('DELETE FROM plazos_fijos WHERE id = $1', [d.id]);
      }
    }
  });
}

export async function getAllEvents(db: any, depositId?: string): Promise<any[]> {
  let query = 'SELECT * FROM eventos_plazo_fijo';
  const params: any[] = [];

  if (depositId) {
    query += ' WHERE plazo_fijo_id = $1';
    params.push(depositId);
  }

  query += ' ORDER BY timestamp DESC';

  const res = await db.query(query, params);
  return res.rows.map((r: any) => ({
    id: r.id,
    depositId: r.plazo_fijo_id,
    timestamp: formatDateTimeString(r.timestamp),
    type: r.tipo_evento,
    description: r.descripcion,
    amounts: {
      capital: r.monto_capital != null ? Number(r.monto_capital) : null,
      interest: r.monto_interes != null ? Number(r.monto_interes) : null,
      total: r.monto_total != null ? Number(r.monto_total) : null,
    },
    metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
  }));
}
