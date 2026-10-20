import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import {
  getAllDeposits,
  getDepositById,
  saveDeposit,
  confirmCollection,
  renewDeposit,
  deleteDeposit,
  clearData,
  getAllEvents
} from '../services/depositService.js';
import { exportBackup, restoreBackup, processBulkImport } from '../services/importExportService.js';

const router = Router();

// GET /api/v1/deposits
router.get('/deposits', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const includeDemo = req.query.includeDemo !== 'false';
    const deposits = getAllDeposits(db, includeDemo);
    res.json({ success: true, data: deposits });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/deposits/:id
router.get('/deposits/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const deposit = getDepositById(db, req.params.id);
    if (!deposit) {
      return res.status(404).json({ success: false, error: 'Plazo fijo no encontrado' });
    }
    res.json({ success: true, data: deposit });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/deposits
router.post('/deposits', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { deposit, eventDescription } = req.body;
    if (!deposit || !deposit.bank || !deposit.capital || !deposit.startDate || !deposit.endDate) {
      return res.status(400).json({ success: false, error: 'Campos requeridos incompletos' });
    }
    const saved = saveDeposit(db, deposit, eventDescription);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/deposits/:id/confirm-collection
router.post('/deposits/:id/confirm-collection', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { collectedInterest, collectedCapital, closeInvestment } = req.body;
    const updated = confirmCollection(
      db,
      req.params.id,
      Number(collectedInterest || 0),
      Number(collectedCapital || 0),
      Boolean(closeInvestment)
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/deposits/:id/renew
router.post('/deposits/:id/renew', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { newCapital, newTna, newDays, newStartDate, autoRenewal } = req.body;
    if (!newCapital || !newTna || !newDays || !newStartDate) {
      return res.status(400).json({ success: false, error: 'Parámetros de renovación incompletos' });
    }
    const result = renewDeposit(
      db,
      req.params.id,
      Number(newCapital),
      Number(newTna),
      Number(newDays),
      String(newStartDate),
      Boolean(autoRenewal)
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/deposits/:id
router.delete('/deposits/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    deleteDeposit(db, req.params.id);
    res.json({ success: true, message: 'Plazo fijo eliminado correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/deposits (clear demo or all)
router.post('/clear-data', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { includeReal } = req.body;
    clearData(db, Boolean(includeReal));
    res.json({ success: true, message: 'Datos borrados exitosamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/events
router.get('/events', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const depositId = req.query.depositId as string | undefined;
    const events = getAllEvents(db, depositId);
    res.json({ success: true, data: events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/financial-entities
router.get('/financial-entities', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM entidades_financieras WHERE activo = 1 ORDER BY nombre ASC').all();
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/import
router.post('/import', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { deposits, fileName } = req.body;
    if (!Array.isArray(deposits)) {
      return res.status(400).json({ success: false, error: 'Lista de plazos fijos requerida' });
    }
    const result = processBulkImport(db, deposits, fileName || 'import.csv');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/backup
router.get('/backup', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const backup = exportBackup(db);
    res.json({ success: true, data: backup });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/backup/restore
router.post('/backup/restore', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const backupData = req.body;
    const result = restoreBackup(db, backupData);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/migrate-indexeddb (idempotent migration)
router.post('/migrate-indexeddb', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { deposits, events } = req.body;
    if (!Array.isArray(deposits)) {
      return res.status(400).json({ success: false, error: 'Deposits array required' });
    }

    let migratedDeposits = 0;
    for (const dep of deposits) {
      saveDeposit(db, dep, 'Migración transparente desde IndexedDB');
      migratedDeposits++;
    }

    if (Array.isArray(events)) {
      for (const evt of events) {
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
    }

    res.json({ success: true, message: 'Migración completada', migratedDeposits });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
