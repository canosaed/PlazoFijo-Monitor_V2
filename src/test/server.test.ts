import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase } from '../../server/db/database';
import { saveDeposit, confirmCollection, renewDeposit } from '../../server/services/depositService';
import { calculateEstimatedInterest } from '../../server/services/financialService';

describe('Pruebas del Servidor Backend y Servicios de Dominio', () => {
  let db: ReturnType<typeof initDatabase>;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  it('debe calcular el interés estimado correctamente usando fórmula de 365 días', () => {
    const interest = calculateEstimatedInterest(100000, 37.5, 30);
    // 100000 * (37.5 / 100) * (30 / 365) = 3082.19178... -> 3082.19
    expect(interest).toBe(3082.19);
  });

  it('debe registrar el alta y actualización de un plazo fijo con auditoría', () => {
    const today = new Date().toISOString().split('T')[0];
    const depositData = {
      id: 'pf_test_1',
      bank: 'Banco Nación',
      capital: 150000,
      startDate: today,
      endDate: '2099-01-01',
      days: 31,
      tna: 38,
    };

    const created = saveDeposit(db, depositData);
    expect(created.id).toBe('pf_test_1');
    expect(created.estimatedInterest).toBe(4841.1);
    expect(created.estimatedTotalAmount).toBe(154841.1);

    const auditCount = db.prepare('SELECT count(*) as count FROM auditoria_modificaciones WHERE registro_id = ?').get('pf_test_1') as any;
    expect(auditCount.count).toBe(1);
  });

  it('debe ejecutar la confirmación de cobro atómicamente', () => {
    saveDeposit(db, {
      id: 'pf_test_2',
      bank: 'Banco Galicia',
      capital: 200000,
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      days: 31,
      tna: 38,
      status: 'PROXIMO_A_VENCER',
    });

    const confirmed = confirmCollection(db, 'pf_test_2', 6454.79, 200000, true);
    expect(confirmed.status).toBe('CERRADO');
    expect(confirmed.collectedInterest).toBe(6454.79);
    expect(confirmed.collectedCapital).toBe(200000);
  });

  it('debe ejecutar una renovación transaccional vinculando plazo anterior y nuevo', () => {
    const today = new Date().toISOString().split('T')[0];
    saveDeposit(db, {
      id: 'pf_old_1',
      bank: 'BBVA',
      capital: 300000,
      startDate: '2025-01-01',
      endDate: '2025-02-01',
      days: 31,
      tna: 38,
      status: 'VENCIDO_PENDIENTE',
    });

    const { oldDeposit, newDeposit } = renewDeposit(
      db,
      'pf_old_1',
      310000, // Capital + parte de interés
      40,     // Nueva TNA
      30,     // Nuevos días
      today,
      false
    );

    expect(oldDeposit.status).toBe('RENOVADO');
    expect(oldDeposit.nextId).toBe(newDeposit.id);
    expect(newDeposit.previousId).toBe('pf_old_1');
    expect(newDeposit.capital).toBe(310000);
    expect(newDeposit.tna).toBe(40);
    expect(newDeposit.status).toBe('VIGENTE');

    const eventsOld = db.prepare('SELECT * FROM eventos_plazo_fijo WHERE plazo_fijo_id = ?').all('pf_old_1');
    expect(eventsOld.length).toBeGreaterThanOrEqual(2);
  });
});
