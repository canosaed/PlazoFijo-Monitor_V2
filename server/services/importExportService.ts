import Database from 'better-sqlite3';
import { saveDeposit, getAllDeposits, getAllEvents } from './depositService.js';
import { logAudit } from './auditService.js';

export function exportBackup(db: Database.Database): any {
  const deposits = getAllDeposits(db, true);
  const events = getAllEvents(db);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    deposits,
    events,
  };
}

export function restoreBackup(db: Database.Database, data: any): { importedDeposits: number; importedEvents: number } {
  if (!data || !Array.isArray(data.deposits) || !Array.isArray(data.events)) {
    throw new Error('Estructura de archivo de respaldo inválida.');
  }

  const runTransaction = db.transaction(() => {
    // Clear current database tables
    db.prepare('DELETE FROM eventos_plazo_fijo').run();
    db.prepare('DELETE FROM plazos_fijos').run();

    for (const dep of data.deposits) {
      saveDeposit(db, dep, 'Restauración desde respaldo');
    }

    // Restore events directly if needed
    for (const evt of data.events) {
      db.prepare(`
        INSERT OR IGNORE INTO eventos_plazo_fijo (
          id, plazo_fijo_id, timestamp, tipo_evento, descripcion, monto_capital, monto_interes, monto_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        evt.id,
        evt.depositId || evt.plazo_fijo_id,
        evt.timestamp,
        evt.type || evt.tipo_evento,
        evt.description || evt.descripcion,
        evt.amounts?.capital ?? evt.monto_capital ?? null,
        evt.amounts?.interest ?? evt.monto_interes ?? null,
        evt.amounts?.total ?? evt.monto_total ?? null
      );
    }

    logAudit(db, {
      tablaAfectada: 'plazos_fijos',
      registroId: 'ALL',
      tipoOperacion: 'INSERT',
      valoresNuevos: { countDeposits: data.deposits.length, countEvents: data.events.length },
    });
  });

  runTransaction();

  return {
    importedDeposits: data.deposits.length,
    importedEvents: data.events.length,
  };
}

export function processBulkImport(
  db: Database.Database,
  deposits: any[],
  fileName: string = 'importacion.csv'
): { importedCount: number; errorsCount: number } {
  let importedCount = 0;
  let errorsCount = 0;

  const runTransaction = db.transaction(() => {
    for (const dep of deposits) {
      try {
        saveDeposit(db, dep, `Importación masiva desde ${fileName}`);
        importedCount++;
      } catch (err) {
        errorsCount++;
      }
    }

    const importLogId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    db.prepare(`
      INSERT INTO registro_importaciones (
        id, nombre_archivo, fecha_importacion, filas_procesadas, filas_importadas, errores_count, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      importLogId,
      fileName,
      new Date().toISOString(),
      deposits.length,
      importedCount,
      errorsCount,
      errorsCount === 0 ? 'COMPLETADO' : 'PARCIAL'
    );
  });

  runTransaction();

  return { importedCount, errorsCount };
}
