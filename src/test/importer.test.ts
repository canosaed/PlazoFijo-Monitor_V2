import { describe, it, expect } from 'vitest';
import { validateAndParseImportRow } from '../utils/importer';
import { FixedDeposit } from '../types';

describe('Excel / CSV Importer Logic', () => {
  it('should parse valid row with Argentine number & date formats correctly', () => {
    const row = {
      Banco: 'Banco Nación (BNA)',
      Descripcion: 'Colocación Test',
      Capital: '1.500.000,50',
      FechaInicio: '10/10/2024',
      Dias: '30',
      TNA: '38,5',
      Observaciones: 'Prueba de importación'
    };

    const parsed = validateAndParseImportRow(row, 1, []);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.parsedDeposit).not.toBeNull();
    expect(parsed.parsedDeposit?.bank).toBe('Banco Nación (BNA)');
    expect(parsed.parsedDeposit?.capital).toBe(1500000.50);
    expect(parsed.parsedDeposit?.startDate).toBe('2024-10-10');
    expect(parsed.parsedDeposit?.days).toBe(30);
    expect(parsed.parsedDeposit?.tna).toBe(38.5);
  });

  it('should flag errors when required fields are missing or invalid', () => {
    const invalidRow = {
      Banco: '',
      Capital: 'abc',
      FechaInicio: 'fecha_invalida',
      Dias: '-5',
      TNA: '0'
    };

    const parsed = validateAndParseImportRow(invalidRow, 2, []);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.parsedDeposit).toBeNull();
  });

  it('should detect potential duplicate entries matching bank, capital and start date', () => {
    const existing: FixedDeposit[] = [
      {
        id: 'pf_1',
        bank: 'Banco Galicia',
        description: '',
        type: 'TRADICIONAL_TF',
        capital: 2000000,
        startDate: '2024-09-01',
        endDate: '2024-10-01',
        days: 30,
        tna: 37,
        estimatedInterest: 60821.92,
        estimatedTotalAmount: 2060821.92,
        autoRenewal: false,
        status: 'VIGENTE',
        isDemo: false,
        createdAt: '',
        updatedAt: '',
      }
    ];

    const duplicateRow = {
      Banco: 'banco galicia',
      Capital: '2000000',
      FechaInicio: '2024-09-01',
      Dias: '30',
      TNA: '37'
    };

    const parsed = validateAndParseImportRow(duplicateRow, 3, existing);
    expect(parsed.isDuplicate).toBe(true);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });
});
