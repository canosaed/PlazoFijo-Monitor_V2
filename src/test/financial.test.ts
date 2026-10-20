import { describe, it, expect } from 'vitest';
import { 
  calculateEstimatedInterest, 
  calculateTEAFromTNA, 
  formatCurrencyARS, 
  formatPercentage, 
  formatDateAR, 
  parseArgentineNumber, 
  parseArgentineDate,
  calculateFinancialSummary,
  deriveDepositStatus
} from '../utils/financial';
import { FixedDeposit } from '../types';

describe('Financial Engine & Argentine Format Utilities', () => {
  it('should accurately calculate fixed deposit estimated interest (365 days convention)', () => {
    // Test Case: $1.000.000 ARS at 37.5% TNA for 30 days
    // Interés = 1000000 * (0.375) * (30 / 365) = 30821.9178... -> $ 30.821,92
    const interest = calculateEstimatedInterest(1000000, 37.5, 30);
    expect(interest).toBe(30821.92);
  });

  it('should calculate TEA correctly from TNA', () => {
    const tea = calculateTEAFromTNA(37.5, 30);
    expect(tea).toBeGreaterThan(37.5);
    expect(tea).toBeCloseTo(44.68, 1);
  });

  it('should format ARS currency with correct Argentine separators', () => {
    expect(formatCurrencyARS(1234567.89)).toBe('$ 1.234.567,89');
    expect(formatCurrencyARS(0)).toBe('$ 0,00');
    expect(formatCurrencyARS(null)).toBe('—');
  });

  it('should format percentage with Argentine comma', () => {
    expect(formatPercentage(39.5)).toBe('39,50 %');
    expect(formatPercentage(null)).toBe('—');
  });

  it('should format ISO dates into Argentine DD/MM/AAAA', () => {
    expect(formatDateAR('2024-10-20')).toBe('20/10/2024');
    expect(formatDateAR(null)).toBe('—');
  });

  it('should parse Argentine number inputs properly', () => {
    expect(parseArgentineNumber('1.234.567,89')).toBe(1234567.89);
    expect(parseArgentineNumber('$ 500.000,50')).toBe(500000.50);
    expect(parseArgentineNumber('1000000')).toBe(1000000);
    expect(parseArgentineNumber('1000,5')).toBe(1000.5);
    expect(parseArgentineNumber('')).toBeNull();
  });

  it('should parse Argentine date formats (DD/MM/AAAA) into ISO YYYY-MM-DD', () => {
    expect(parseArgentineDate('20/10/2024')).toBe('2024-10-20');
    expect(parseArgentineDate('01/05/2025')).toBe('2025-05-01');
    expect(parseArgentineDate('2024-10-20')).toBe('2024-10-20');
  });

  it('should compute financial summary correctly excluding non-active/closed capital', () => {
    const mockDeposits: FixedDeposit[] = [
      {
        id: '1',
        bank: 'Banco A',
        description: '',
        type: 'TRADICIONAL_TF',
        capital: 1000000,
        startDate: '2024-10-01',
        endDate: '2024-10-31',
        days: 30,
        tna: 40,
        estimatedInterest: 32876.71,
        estimatedTotalAmount: 1032876.71,
        autoRenewal: false,
        status: 'VIGENTE',
        isDemo: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        bank: 'Banco B',
        description: '',
        type: 'TRADICIONAL_TF',
        capital: 2000000,
        startDate: '2024-08-01',
        endDate: '2024-08-31',
        days: 30,
        tna: 35,
        estimatedInterest: 57534.25,
        estimatedTotalAmount: 2057534.25,
        autoRenewal: false,
        status: 'RENOVADO', // Closed/Renewed past deposit -> should NOT be counted in active capital
        isDemo: false,
        createdAt: '',
        updatedAt: '',
      }
    ];

    const summary = calculateFinancialSummary(mockDeposits, '2024-10-15');
    expect(summary.totalActiveCapital).toBe(1000000); // Only Banco A
    expect(summary.activeCount).toBe(1);
    expect(summary.weightedAverageTna).toBe(40);
  });
});
