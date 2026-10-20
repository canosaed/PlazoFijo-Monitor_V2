import { saveDeposit, getAllDeposits, getAllEvents, withTransaction } from './depositService.js';
import { logAudit } from './auditService.js';

export async function exportBackup(db: any): Promise<any> {
  const deposits = await getAllDeposits(db, true);
  const events = await getAllEvents(db);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    deposits,
    events,
  };
}

export async function restoreBackup(db: any, data: any): Promise<{ importedDeposits: number; importedEvents: number }> {
  if (!data || !Array.isArray(data.deposits) || !Array.isArray(data.events)) {
    throw new Error('Estructura de archivo de respaldo inválida.');
  }

  await withTransaction(db, async (client) => {
    // Clear current database tables
    await client.query('DELETE FROM eventos_plazo_fijo');
    await client.query('DELETE FROM plazos_fijos');

    for (const dep of data.deposits) {
      await saveDeposit(client, dep, 'Restauración desde respaldo');
    }

    // Restore events directly if needed
    for (const evt of data.events) {
      await client.query(`
        INSERT INTO eventos_plazo_fijo (
          id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(id) DO NOTHING
      `, [
        evt.id,
        evt.depositId || evt.plazo_fijo_id,
        evt.timestamp,
        evt.type || evt.tipo_evento,
        evt.description || evt.descripcion,
        evt.amounts?.capital ?? evt.monto_capital ?? null,
        evt.amounts?.interest ?? evt.monto_interes ?? null,
        evt.amounts?.total ?? evt.monto_total ?? null
      ]);
    }

    await logAudit(client, {
      tablaAfectada: 'plazos_fijos',
      registroId: 'ALL',
      tipoOperacion: 'INSERT',
      valoresNuevos: { countDeposits: data.deposits.length, countEvents: data.events.length },
    });
  });

  return {
    importedDeposits: data.deposits.length,
    importedEvents: data.events.length,
  };
}

export async function processBulkImport(
  db: any,
  deposits: any[], 
  fileName: string = 'importacion.csv'
): Promise<{ importedCount: number; errorsCount: number }> {
  let importedCount = 0;
  let errorsCount = 0;

  await withTransaction(db, async (client) => {
    for (const dep of deposits) {
      try {
        await saveDeposit(client, dep, `Importación masiva desde ${fileName}`);
        importedCount++;
      } catch (err) {
        errorsCount++;
      }
    }

    const importLogId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    await client.query(`
      INSERT INTO registro_importaciones (
        id, nombre_archivo, fecha_importacion, filas_procesadas, filas_importadas, errores_count, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      importLogId,
      fileName,
      new Date().toISOString(),
      deposits.length,
      importedCount,
      errorsCount,
      errorsCount === 0 ? 'COMPLETADO' : 'PARCIAL'
    ]);
  });

  return { importedCount, errorsCount };
}
