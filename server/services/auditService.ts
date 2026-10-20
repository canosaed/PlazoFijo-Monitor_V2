import Database from 'better-sqlite3';

export interface AuditRecord {
  tablaAfectada: string;
  registroId: string;
  tipoOperacion: 'INSERT' | 'UPDATE' | 'DELETE';
  valoresAnteriores?: any;
  valoresNuevos?: any;
  origen?: string;
}

export function logAudit(db: Database.Database, record: AuditRecord): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO auditoria_modificaciones (
        id, tabla_afectada, registro_id, tipo_operacion,
        valores_anteriores, valores_nuevos, origen, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    stmt.run(
      id,
      record.tablaAfectada,
      record.registroId,
      record.tipoOperacion,
      record.valoresAnteriores ? JSON.stringify(record.valoresAnteriores) : null,
      record.valoresNuevos ? JSON.stringify(record.valoresNuevos) : null,
      record.origen || 'API_LOCAL',
      now
    );
  } catch (err) {
    console.error('Error recording audit log:', err);
  }
}
