import { FixedDeposit, FinancialSummary, DepositStatus } from '../types';

/**
 * Standard Fixed Deposit interest calculation for Argentina (365 days convention)
 * Formula: Interés = Capital * (TNA / 100) * (Días / 365)
 */
export function calculateEstimatedInterest(capital: number, tna: number, days: number): number {
  if (capital <= 0 || tna < 0 || days <= 0) return 0;
  const interest = capital * (tna / 100) * (days / 365);
  return Math.round(interest * 100) / 100;
}

/**
 * Calculates TEA from TNA assuming 30-day compounded periods or 365/days periods
 */
export function calculateTEAFromTNA(tna: number, days: number = 30): number {
  if (tna <= 0 || days <= 0) return 0;
  const periods = 365 / days;
  const ratePerPeriod = (tna / 100) / periods;
  const tea = (Math.pow(1 + ratePerPeriod, periods) - 1) * 100;
  return Math.round(tea * 100) / 100;
}

/**
 * Formats a numeric currency value into Argentine Pesos format: $ 1.234.567,89
 */
export function formatCurrencyARS(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `$ ${formatted}`;
}

/**
 * Formats a rate percentage into Argentine format: 37,50 %
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} %`;
}

/**
 * Formats an ISO YYYY-MM-DD date to Argentine standard DD/MM/AAAA
 */
export function formatDateAR(isoDateString: string | null | undefined): string {
  if (!isoDateString) return '—';
  const parts = isoDateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return isoDateString;
}

/**
 * Parses input strings in various Argentine formats (e.g. "1.234.567,89", "$1234567.89", "1234567,89")
 */
export function parseArgentineNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return isNaN(input) ? null : input;

  let cleaned = input.toString().trim().replace(/[$ \s]/g, '');
  if (!cleaned) return null;

  // Handles "1.234.567,89" format vs "1234567.89"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Standard AR format: dots for thousands, comma for decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Comma as decimal point
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parses date string in DD/MM/AAAA or YYYY-MM-DD format to standard YYYY-MM-DD ISO format
 */
export function parseArgentineDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Check DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Derive status for a fixed deposit based on dates and current status
 */
export function deriveDepositStatus(deposit: FixedDeposit, referenceDateStr: string = new Date().toISOString().split('T')[0]): DepositStatus {
  // Respect explicit terminal states
  if (deposit.status === 'RENOVADO' || deposit.status === 'CERRADO' || deposit.status === 'CANCELADO') {
    return deposit.status;
  }

  const refDate = new Date(referenceDateStr);
  const endDate = new Date(deposit.endDate);

  const diffTime = endDate.getTime() - refDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'VENCIDO_PENDIENTE';
  } else if (diffDays <= 7) {
    return 'PROXIMO_A_VENCER';
  } else {
    return 'VIGENTE';
  }
}

/**
 * Calculates total summary stats across active deposits
 */
export function calculateFinancialSummary(deposits: FixedDeposit[], referenceDateStr: string = new Date().toISOString().split('T')[0]): FinancialSummary {
  const refDate = new Date(referenceDateStr);

  let totalActiveCapital = 0;
  let totalPendingInterest = 0;
  let totalEstimatedAtMaturity = 0;
  let weightedTnaSum = 0;
  let activeCount = 0;

  let upcomingMaturities7dCount = 0;
  let upcomingMaturities15dCount = 0;
  let upcomingMaturities30dCount = 0;
  let pendingConfirmationCount = 0;

  deposits.forEach(d => {
    const status = deriveDepositStatus(d, referenceDateStr);

    if (status === 'VIGENTE' || status === 'PROXIMO_A_VENCER') {
      totalActiveCapital += d.capital;
      totalPendingInterest += d.estimatedInterest;
      totalEstimatedAtMaturity += d.estimatedTotalAmount;
      weightedTnaSum += d.tna * d.capital;
      activeCount++;
    }

    if (status === 'VENCIDO_PENDIENTE') {
      pendingConfirmationCount++;
    }

    const endDate = new Date(d.endDate);
    const diffDays = Math.ceil((endDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) {
      upcomingMaturities7dCount++;
    }
    if (diffDays >= 0 && diffDays <= 15) {
      upcomingMaturities15dCount++;
    }
    if (diffDays >= 0 && diffDays <= 30) {
      upcomingMaturities30dCount++;
    }
  });

  const weightedAverageTna = totalActiveCapital > 0
    ? Math.round((weightedTnaSum / totalActiveCapital) * 100) / 100
    : 0;

  return {
    totalActiveCapital,
    totalPendingInterest,
    totalEstimatedAtMaturity,
    activeCount,
    upcomingMaturities7dCount,
    upcomingMaturities15dCount,
    upcomingMaturities30dCount,
    pendingConfirmationCount,
    weightedAverageTna,
  };
}
