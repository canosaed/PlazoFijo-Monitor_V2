// Financial Engine Server Service

export function calculateEstimatedInterest(capital: number, tna: number, days: number): number {
  if (!capital || !tna || !days || capital <= 0 || tna <= 0 || days <= 0) return 0;
  // Formula: Interest = Capital * (TNA / 100) * (days / 365)
  const interest = capital * (tna / 100) * (days / 365);
  return Math.round(interest * 100) / 100;
}

export function calculateEndDate(startDateStr: string, days: number): string {
  if (!startDateStr || !days) return '';
  const date = new Date(startDateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function deriveDepositStatus(
  endDateStr: string, 
  currentStatus: string, 
  todayStr?: string
): string {
  if (['CERRADO', 'RENOVADO', 'CANCELADO'].includes(currentStatus)) {
    return currentStatus;
  }

  const today = todayStr ? new Date(todayStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) {
    return 'VENCIDO_PENDIENTE';
  } else if (diffDays <= 7) {
    return 'PROXIMO_A_VENCER';
  } else {
    return 'VIGENTE';
  }
}
