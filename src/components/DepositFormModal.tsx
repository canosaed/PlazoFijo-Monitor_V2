import React, { useState, useEffect } from 'react';
import { FixedDeposit, DepositType, DepositStatus } from '../types';
import { calculateEstimatedInterest, calculateTEAFromTNA, formatCurrencyARS } from '../utils/financial';
import { Building2, Save, X, Calculator, Calendar, Landmark, Info } from 'lucide-react';

interface DepositFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deposit: FixedDeposit, eventDescription?: string) => Promise<void>;
  initialData?: Partial<FixedDeposit> | null;
}

const COMMON_BANKS = [
  'Banco Nación (BNA)',
  'Banco Galicia',
  'BBVA Argentina',
  'Banco Santander',
  'Banco Macro',
  'Banco Provincia (BAPRO)',
  'Banco Ciudad',
  'ICBC Argentina',
  'HSBC Argentina',
  'Banco Hipotecario',
  'Banco Credicoop',
  'Banco Patagonia',
  'Banco Supervielle',
  'Ualá (Compañía Financiera)',
  'Mercado Pago (Fondo Común)',
  'Otra Entidad Financiera'
];

export const DepositFormModal: React.FC<DepositFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [bank, setBank] = useState<string>('Banco Nación (BNA)');
  const [customBank, setCustomBank] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<DepositType>('TRADICIONAL_TF');
  const [capital, setCapital] = useState<number | ''>(1000000);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState<number | ''>(30);
  const [endDate, setEndDate] = useState<string>('');
  const [tna, setTna] = useState<number | ''>(37.5);
  const [tea, setTea] = useState<number | ''>('');
  const [reportedInterest, setReportedInterest] = useState<number | ''>('');
  const [autoRenewal, setAutoRenewal] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isDemo, setIsDemo] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      if (COMMON_BANKS.includes(initialData.bank || '')) {
        setBank(initialData.bank || 'Banco Nación (BNA)');
        setCustomBank('');
      } else {
        setBank('Otra Entidad Financiera');
        setCustomBank(initialData.bank || '');
      }
      setDescription(initialData.description || '');
      setType(initialData.type || 'TRADICIONAL_TF');
      setCapital(initialData.capital ?? 1000000);
      setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
      setDays(initialData.days ?? 30);
      setEndDate(initialData.endDate || '');
      setTna(initialData.tna ?? 37.5);
      setTea(initialData.tea ?? '');
      setReportedInterest(initialData.reportedInterest ?? '');
      setAutoRenewal(initialData.autoRenewal ?? false);
      setNotes(initialData.notes || '');
      setIsDemo(initialData.isDemo ?? false);
    } else {
      // Defaults
      setBank('Banco Nación (BNA)');
      setCustomBank('');
      setDescription('');
      setType('TRADICIONAL_TF');
      setCapital(1000000);
      setStartDate(new Date().toISOString().split('T')[0]);
      setDays(30);
      setTna(37.5);
      setTea('');
      setReportedInterest('');
      setAutoRenewal(false);
      setNotes('');
      setIsDemo(false);
    }
  }, [initialData, isOpen]);

  // Recalculate end date and TEA when inputs change
  useEffect(() => {
    if (startDate && typeof days === 'number' && days > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + days);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, days]);

  useEffect(() => {
    if (typeof tna === 'number' && tna > 0 && typeof days === 'number' && days > 0) {
      const calculatedTea = calculateTEAFromTNA(tna, days);
      setTea(calculatedTea);
    }
  }, [tna, days]);

  if (!isOpen) return null;

  const numCapital = typeof capital === 'number' ? capital : 0;
  const numTna = typeof tna === 'number' ? tna : 0;
  const numDays = typeof days === 'number' ? days : 0;

  const estimatedInterest = calculateEstimatedInterest(numCapital, numTna, numDays);
  const estimatedTotal = numCapital + estimatedInterest;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const effectiveBank = bank === 'Otra Entidad Financiera' ? customBank.trim() : bank;
    if (!effectiveBank) {
      errs.bank = 'Debe seleccionar o ingresar el nombre de la entidad bancaria.';
    }

    if (numCapital <= 0) {
      errs.capital = 'El capital debe ser mayor a 0 ARS.';
    }

    if (numTna <= 0) {
      errs.tna = 'La TNA debe ser un valor positivo.';
    }

    if (numDays <= 0) {
      errs.days = 'El plazo debe ser de al menos 1 día.';
    }

    if (!startDate) {
      errs.startDate = 'Debe indicar la fecha de constitución.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const effectiveBank = bank === 'Otra Entidad Financiera' ? customBank.trim() : bank;
      const id = initialData?.id || `pf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const numReportedInterest = typeof reportedInterest === 'number' ? reportedInterest : null;
      const reportedTotalAmount = numReportedInterest !== null ? numCapital + numReportedInterest : null;

      let status: DepositStatus = initialData?.status || 'VIGENTE';

      const newDeposit: FixedDeposit = {
        id,
        bank: effectiveBank,
        description: description.trim() || `Plazo Fijo ${type}`,
        type,
        capital: numCapital,
        startDate,
        endDate,
        days: numDays,
        tna: numTna,
        tea: typeof tea === 'number' ? tea : null,
        estimatedInterest,
        reportedInterest: numReportedInterest,
        collectedInterest: initialData?.collectedInterest ?? null,
        estimatedTotalAmount: estimatedTotal,
        reportedTotalAmount,
        collectedCapital: initialData?.collectedCapital ?? null,
        autoRenewal,
        status,
        previousId: initialData?.previousId || null,
        nextId: initialData?.nextId || null,
        notes: notes.trim(),
        isDemo,
        createdAt: initialData?.createdAt || now,
        updatedAt: now,
      };

      const eventMsg = initialData?.id
        ? `Edición de datos del plazo fijo en ${effectiveBank}`
        : `Registro manual de plazo fijo en ${effectiveBank}`;

      await onSave(newDeposit, eventMsg);
      onClose();
    } catch (err) {
      console.error('Error saving deposit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-space-lg py-4 bg-primary text-on-primary">
          <div className="flex items-center gap-2 font-semibold text-headline-sm">
            <Landmark className="w-5 h-5 text-tertiary-fixed" />
            <span>{initialData?.id ? 'Editar Plazo Fijo' : 'Nuevo Registro de Plazo Fijo'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-primary/80 hover:text-on-primary p-1 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-space-lg space-y-5">
          {/* Entity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Banco o Entidad Financiera *
              </label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              >
                {COMMON_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {bank === 'Otra Entidad Financiera' && (
                <input
                  type="text"
                  placeholder="Escriba el nombre de la entidad"
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  className="w-full mt-2 px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
                />
              )}
              {errors.bank && <p className="text-error text-label-sm mt-1">{errors.bank}</p>}
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Descripción / Etiqueta Opcional
              </label>
              <input
                type="text"
                placeholder="Ej: Ahorro Aguinaldo, Fondo de Reserva"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>
          </div>

          {/* Type & Capital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Tipo de Plazo Fijo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DepositType)}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              >
                <option value="TRADICIONAL_TF">Tradicional Tasa Fija</option>
                <option value="UVA">UVA (Ajustable por Inflación)</option>
                <option value="PRECANCELABLE">Precancelable</option>
                <option value="OTRO">Otro tipo</option>
              </select>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Capital Depositado (ARS $) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-body-md select-none">
                  ARS $
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={capital}
                  onChange={(e) => setCapital(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-16 pr-3 py-2 text-primary font-bold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                  placeholder="Ej: 1000000"
                />
              </div>
              {errors.capital && <p className="text-error text-label-sm mt-1">{errors.capital}</p>}
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Fecha Constitución *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
              {errors.startDate && <p className="text-error text-label-sm mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Plazo (Días) *
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={days}
                onChange={(e) => setDays(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
              />
              {errors.days && <p className="text-error text-label-sm mt-1">{errors.days}</p>}
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Fecha Vencimiento (Calculada)
              </label>
              <input
                type="date"
                value={endDate}
                readOnly
                className="w-full px-3 py-2 bg-surface-container/50 text-primary font-semibold text-body-md rounded-lg border border-outline-variant/30 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Rates & Calculations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                TNA Informada (%) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={tna}
                onChange={(e) => setTna(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder="Ej: 37.50"
              />
              {errors.tna && <p className="text-error text-label-sm mt-1">{errors.tna}</p>}
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                TEA (%) (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={tea}
                onChange={(e) => setTea(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder="44.68"
              />
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Interés Informado Banco (ARS)
              </label>
              <input
                type="number"
                step="any"
                value={reportedInterest}
                onChange={(e) => setReportedInterest(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder="Dejar vacío si desconoce"
              />
              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                Diferente al estimado si aplica comisión o ajuste
              </span>
            </div>
          </div>

          {/* Dynamic Summary Preview */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-label-sm text-on-surface-variant font-semibold block">
                Cálculo Estimado al Vencimiento
              </span>
              <span className="text-headline-sm font-bold text-primary tabular-nums">
                {formatCurrencyARS(estimatedTotal)}
              </span>
              <span className="text-label-sm text-[#10b981] font-semibold block">
                Interés estimado: +{formatCurrencyARS(estimatedInterest)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-body-md text-primary font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRenewal}
                  onChange={(e) => setAutoRenewal(e.target.checked)}
                  className="w-4 h-4 text-secondary rounded border-outline-variant focus:ring-secondary"
                />
                <span>Renovación Automática</span>
              </label>
            </div>
          </div>

          {/* Notes & Demo flag */}
          <div>
            <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
              Observaciones / Notas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              placeholder="Número de certificado, sucursal, cuenta de acreditación, etc."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
            <label className="flex items-center gap-2 text-label-sm text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
                className="w-4 h-4 text-secondary rounded border-outline-variant focus:ring-secondary"
              />
              <span>Marcar como Registro de Demostración</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-body-md font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-primary hover:bg-secondary text-on-primary px-5 py-2 rounded-lg font-semibold text-body-md shadow-sm transition-all duration-150 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{initialData?.id ? 'Guardar Cambios' : 'Registrar Plazo Fijo'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
