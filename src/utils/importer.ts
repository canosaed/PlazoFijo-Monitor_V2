import { parseArgentineNumber, parseArgentineDate, calculateEstimatedInterest } from './financial';
import { FixedDeposit, DepositType, DepositStatus } from '../types';

export interface RawImportRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
  parsedDeposit?: FixedDeposit | null;
  isDuplicate?: boolean;
  selected?: boolean;
}

export const TEMPLATE_HEADERS = [
  'Banco',
  'Descripcion',
  'Tipo',
  'Capital',
  'FechaInicio',
  'Dias',
  'TNA',
  'InteresInformado',
  'Observaciones'
];

export const SAMPLE_TEMPLATE_ROWS = [
  {
    Banco: 'Banco Nación (BNA)',
    Descripcion: 'Plazo Fijo BNA+ Tradicional',
    Tipo: 'TRADICIONAL_TF',
    Capital: '1500000',
    FechaInicio: '15/10/2024',
    Dias: '30',
    TNA: '37.5',
    InteresInformado: '46232.88',
    Observaciones: 'Sucursal Plaza de Mayo'
  },
  {
    Banco: 'Banco Galicia',
    Descripcion: 'Inversión Web Galicia',
    Tipo: 'TRADICIONAL_TF',
    Capital: '2500000,50',
    FechaInicio: '01/11/2024',
    Dias: '60',
    TNA: '39.0',
    InteresInformado: '',
    Observaciones: 'Renovación automática'
  }
];

export function validateAndParseImportRow(
  row: Record<string, any>,
  rowIndex: number,
  existingDeposits: FixedDeposit[] = []
): RawImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract fields flexibily matching case
  const getVal = (key: string) => {
    const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return foundKey ? row[foundKey] : undefined;
  };

  const rawBank = getVal('banco') || getVal('bank') || getVal('entidad') || '';
  const rawDesc = getVal('descripcion') || getVal('description') || getVal('concepto') || '';
  const rawType = getVal('tipo') || getVal('type') || 'TRADICIONAL_TF';
  const rawCapital = getVal('capital') || getVal('monto') || getVal('importe') || '';
  const rawStartDate = getVal('fechainicio') || getVal('startdate') || getVal('fecha') || '';
  const rawDays = getVal('dias') || getVal('days') || getVal('plazo') || '';
  const rawTna = getVal('tna') || getVal('tasa') || '';
  const rawReportedInterest = getVal('interesinformado') || getVal('interes') || '';
  const rawNotes = getVal('observaciones') || getVal('notes') || '';

  // 1. Bank
  const bank = String(rawBank).trim();
  if (!bank) {
    errors.push('El campo Banco/Entidad es obligatorio.');
  }

  // 2. Capital
  const capital = parseArgentineNumber(rawCapital);
  if (capital === null || capital <= 0) {
    errors.push(`Capital inválido: "${rawCapital}". Debe ser un número positivo.`);
  }

  // 3. Start Date
  const startDate = parseArgentineDate(String(rawStartDate));
  if (!startDate) {
    errors.push(`Fecha de inicio inválida: "${rawStartDate}". Formato esperado: DD/MM/AAAA o YYYY-MM-DD.`);
  }

  // 4. Days
  let days = parseInt(String(rawDays).trim(), 10);
  if (isNaN(days) || days <= 0) {
    errors.push(`Plazo en días inválido: "${rawDays}".`);
  }

  // 5. TNA
  const tna = parseArgentineNumber(rawTna);
  if (tna === null || tna <= 0) {
    errors.push(`TNA inválida: "${rawTna}". Debe ser un porcentaje positivo.`);
  }

  // Optional reported interest
  const reportedInterest = parseArgentineNumber(rawReportedInterest);

  let parsedDeposit: FixedDeposit | null = null;
  let isDuplicate = false;

  if (errors.length === 0 && capital && startDate && days && tna) {
    // Calculate End Date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days);
    const endDate = end.toISOString().split('T')[0];

    const estimatedInterest = calculateEstimatedInterest(capital, tna, days);
    const estimatedTotalAmount = capital + estimatedInterest;

    // Check potential duplicate (same bank, capital, startDate)
    isDuplicate = existingDeposits.some(d =>
      d.bank.toLowerCase() === bank.toLowerCase() &&
      Math.abs(d.capital - capital) < 0.01 &&
      d.startDate === startDate
    );

    if (isDuplicate) {
      warnings.push('Posible registro duplicado detectado en la base existente.');
    }

    parsedDeposit = {
      id: `pf_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bank,
      description: String(rawDesc).trim() || `Plazo Fijo Importado`,
      type: (rawType.toString().toUpperCase() as DepositType) || 'TRADICIONAL_TF',
      capital,
      startDate,
      endDate,
      days,
      tna,
      tea: null,
      estimatedInterest,
      reportedInterest,
      collectedInterest: null,
      estimatedTotalAmount,
      reportedTotalAmount: reportedInterest ? capital + reportedInterest : null,
      collectedCapital: null,
      autoRenewal: false,
      status: 'VIGENTE',
      notes: String(rawNotes).trim(),
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    rowIndex,
    data: row,
    errors,
    warnings,
    parsedDeposit,
    isDuplicate,
    selected: errors.length === 0,
  };
}
