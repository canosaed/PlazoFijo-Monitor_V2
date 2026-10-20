import React, { useState } from 'react';
import { FixedDeposit, DepositStatus } from '../types';
import { calculateEstimatedInterest, calculateTEAFromTNA, formatCurrencyARS, formatPercentage, formatDateAR } from '../utils/financial';
import { RefreshCw, CheckCircle2, Landmark, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface OperationalActionModalProps {
  isOpen: boolean;
  type: 'CONFIRM' | 'RENEW';
  deposit: FixedDeposit | null;
  onClose: () => void;
  onConfirmCollection: (
    depositId: string, 
    collectedInterest: number, 
    collectedCapital: number, 
    closeInvestment: boolean
  ) => Promise<void>;
  onRenewDeposit: (
    oldDeposit: FixedDeposit,
    newCapital: number,
    newTna: number,
    newDays: number,
    newStartDate: string,
    autoRenewal: boolean
  ) => Promise<void>;
}

export const OperationalActionModal: React.FC<OperationalActionModalProps> = ({
  isOpen,
  type,
  deposit,
  onClose,
  onConfirmCollection,
  onRenewDeposit,
}) => {
  // Confirm Collection State
  const [collectedInterest, setCollectedInterest] = useState<number | ''>(deposit?.estimatedInterest || '');
  const [collectedCapital, setCollectedCapital] = useState<number | ''>(deposit?.capital || '');
  const [closeInvestment, setCloseInvestment] = useState<boolean>(true);

  // Renewal State
  const [renewCapital, setRenewCapital] = useState<number | ''>(deposit?.estimatedTotalAmount || deposit?.capital || '');
  const [renewTna, setRenewTna] = useState<number | ''>(deposit?.tna || 37.5);
  const [renewDays, setRenewDays] = useState<number | ''>(deposit?.days || 30);
  const [renewStartDate, setRenewStartDate] = useState<string>(deposit?.endDate || new Date().toISOString().split('T')[0]);
  const [renewAuto, setRenewAuto] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !deposit) return null;

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numInterest = typeof collectedInterest === 'number' ? collectedInterest : deposit.estimatedInterest;
      const numCapital = typeof collectedCapital === 'number' ? collectedCapital : deposit.capital;

      await onConfirmCollection(deposit.id, numInterest, numCapital, closeInvestment);
      onClose();
    } catch (err) {
      console.error('Error al confirmar cobro:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const numCap = typeof renewCapital === 'number' ? renewCapital : deposit.estimatedTotalAmount;
      const numTna = typeof renewTna === 'number' ? renewTna : deposit.tna;
      const numDays = typeof renewDays === 'number' ? renewDays : 30;

      await onRenewDeposit(deposit, numCap, numTna, numDays, renewStartDate, renewAuto);
      onClose();
    } catch (err) {
      console.error('Error al renovar:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest w-full max-w-xl rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-space-lg py-4 bg-primary text-on-primary">
          <div className="flex items-center gap-2 font-semibold text-headline-sm">
            {type === 'CONFIRM' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
                <span>Confirmar Cobro / Acreditación</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 text-tertiary-fixed" />
                <span>Renovar Plazo Fijo Vincular</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-primary/80 hover:text-on-primary p-1 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Existing Deposit Context */}
        <div className="bg-surface-container-low p-4 border-b border-outline-variant/30 text-body-md">
          <div className="flex items-center justify-between font-bold text-primary">
            <span>{deposit.bank}</span>
            <span className="tabular-nums">{formatCurrencyARS(deposit.capital)}</span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            {deposit.description} • Vencimiento: {formatDateAR(deposit.endDate)}
          </p>
        </div>

        {type === 'CONFIRM' ? (
          <form onSubmit={handleConfirmSubmit} className="p-space-lg space-y-5">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Interés Efectivamente Cobrado (ARS $)
              </label>
              <input
                type="number"
                step="any"
                value={collectedInterest}
                onChange={(e) => setCollectedInterest(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary font-bold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder={deposit.estimatedInterest.toString()}
              />
              <span className="text-label-sm text-on-surface-variant block mt-1">
                Estimado original: {formatCurrencyARS(deposit.estimatedInterest)}
              </span>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Capital Efectivamente Recibido (ARS $)
              </label>
              <input
                type="number"
                step="any"
                value={collectedCapital}
                onChange={(e) => setCollectedCapital(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary font-bold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder={deposit.capital.toString()}
              />
            </div>

            <div className="bg-surface-container/50 p-3 rounded-lg border border-outline-variant/20">
              <label className="flex items-center gap-2 text-body-md text-primary font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={closeInvestment}
                  onChange={(e) => setCloseInvestment(e.target.checked)}
                  className="w-4 h-4 text-secondary rounded border-outline-variant focus:ring-secondary"
                />
                <span>Marcar inversión como CERRADA / ACREDITADA</span>
              </label>
              <p className="text-label-sm text-on-surface-variant mt-1 pl-6">
                Al cerrar la inversión, el capital dejará de computarse como capital activo vigente.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-body-md font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-[#10b981] hover:bg-[#047857] text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Acreditación</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRenewSubmit} className="p-space-lg space-y-5">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-body-sm">
              <strong>Trazabilidad de Renovación:</strong> La colocación anterior se marcará como <strong>RENOVADO</strong> y se creará un nuevo registro vinculado con su capital actualizado. No se duplicará el capital activo.
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Nuevo Capital a Invertir (ARS $)
              </label>
              <input
                type="number"
                step="any"
                value={renewCapital}
                onChange={(e) => setRenewCapital(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-primary font-bold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
              />
              <span className="text-label-sm text-on-surface-variant block mt-1">
                Capital + Interés de colocación anterior: {formatCurrencyARS(deposit.estimatedTotalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                  Nueva TNA (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={renewTna}
                  onChange={(e) => setRenewTna(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-primary font-semibold text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                  Nuevo Plazo (Días)
                </label>
                <input
                  type="number"
                  value={renewDays}
                  onChange={(e) => setRenewDays(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-primary font-semibold text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Fecha de Inicio de Renovación
              </label>
              <input
                type="date"
                value={renewStartDate}
                onChange={(e) => setRenewStartDate(e.target.value)}
                className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-body-md font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-primary hover:bg-secondary text-on-primary font-semibold px-5 py-2 rounded-lg transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Generar Renovación</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
