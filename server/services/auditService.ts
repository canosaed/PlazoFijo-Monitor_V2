export interface AuditRecord {
  tablaAfectada: string;
  registroId: string;
  tipoOperacion: 'INSERT' | 'UPDATE' | 'DELETE';
  valoresAnteriores?: any;
  valoresNuevos?: any;
  origen?: string;
}

export async function logAudit(db: any, record: AuditRecord): Promise<void> {
  try {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.query(`
      INSERT INTO auditoria_modificaciones (
        id, tabla_afectada, registro_id, tipo_operacion,
        valores_anteriores, valores_nuevos, origen, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      record.tablaAfectada,
      record.registroId,
      record.tipoOperacion,
      record.valoresAnteriores ? JSON.stringify(record.valoresAnteriores) : null,
      record.valoresNuevos ? JSON.stringify(record.valoresNuevos) : null,
      record.origen || 'API_LOCAL',
      now
    ]);
  } catch (err) {
    console.error('Error recording audit log:', err);
  }
}
