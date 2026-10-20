import React, { useState, useEffect } from 'react';
import { FixedDeposit, InvestmentEvent } from '../types';
import { getAllEvents } from '../services/api';
import { formatCurrencyARS, formatPercentage, formatDateAR } from '../utils/financial';
import { X, Landmark, Calendar, History, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: FixedDeposit | null;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  deposit,
}) => {
  const [events, setEvents] = useState<InvestmentEvent[]>([]);

  useEffect(() => {
    if (deposit) {
      getAllEvents(deposit.id).then(setEvents).catch(console.error);
    }
  }, [deposit]);

  if (!isOpen || !deposit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-space-lg py-4 bg-primary text-on-primary">
          <div className="flex items-center gap-2 font-semibold text-headline-sm">
            <Landmark className="w-5 h-5 text-tertiary-fixed" />
            <span>Detalle Integral de la Inversión</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-primary/80 hover:text-on-primary p-1 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-space-lg space-y-6">
          {/* Main Summary Ribbon */}
          <div className="bg-surface-container-low p-space-md rounded-xl border border-secondary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider block">
                  {deposit.bank}
                </span>
                <h3 className="text-headline-md font-bold text-primary">{deposit.description}</h3>
              </div>
              <span className="bg-primary text-on-primary text-label-md font-semibold px-3 py-1 rounded-full">
                {deposit.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-outline-variant/20">
              <div>
                <span className="text-label-sm text-on-surface-variant block">Capital Inicial</span>
                <span className="text-headline-sm font-bold text-primary tabular-nums">
                  {formatCurrencyARS(deposit.capital)}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">TNA Aplicada</span>
                <span className="text-headline-sm font-bold text-secondary tabular-nums">
                  {formatPercentage(deposit.tna)}
                </span>
              </div>
              <div>
                <span className="text-label-sm text-on-surface-variant block">Plazo de Colocación</span>
                <span className="text-headline-sm font-bold text-primary">{deposit.days} días</span>
              </div>
            </div>
          </div>

          {/* Financial Amounts Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2">
              <h4 className="text-label-md font-bold text-primary border-b border-outline-variant/20 pb-1">
                Valores Estimados (Aplicación)
              </h4>
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">Interés Estimado:</span>
                <span className="font-semibold text-[#10b981] tabular-nums">
                  +{formatCurrencyARS(deposit.estimatedInterest)}
                </span>
              </div>
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">Total al Vencimiento:</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrencyARS(deposit.estimatedTotalAmount)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2">
              <h4 className="text-label-md font-bold text-primary border-b border-outline-variant/20 pb-1">
                Valores Reales Informados / Cobrados
              </h4>
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">Interés Informado Banco:</span>
                <span className="font-semibold text-primary tabular-nums">
                  {formatCurrencyARS(deposit.reportedInterest)}
                </span>
              </div>
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">Interés Efectivo Cobrado:</span>
                <span className="font-bold text-[#10b981] tabular-nums">
                  {formatCurrencyARS(deposit.collectedInterest)}
                </span>
              </div>
              <div className="flex justify-between text-body-md">
                <span className="text-on-surface-variant">Capital Recibido:</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrencyARS(deposit.collectedCapital)}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-md">
            <div className="p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-sm text-on-surface-variant block">Fecha Constitución</span>
              <span className="font-semibold text-primary">{formatDateAR(deposit.startDate)}</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-sm text-on-surface-variant block">Fecha Vencimiento</span>
              <span className="font-semibold text-primary">{formatDateAR(deposit.endDate)}</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-sm text-on-surface-variant block">Renovación Automática</span>
              <span className="font-semibold text-primary">{deposit.autoRenewal ? 'Sí' : 'No'}</span>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg">
              <span className="text-label-sm text-on-surface-variant block">Tipo Registro</span>
              <span className="font-semibold text-primary">{deposit.isDemo ? 'Demostración' : 'Real Usuario'}</span>
            </div>
          </div>

          {deposit.notes && (
            <div className="p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
              <span className="text-label-sm text-on-surface-variant font-semibold block mb-0.5">Observaciones</span>
              <p className="text-body-md text-primary">{deposit.notes}</p>
            </div>
          )}

          {/* History Event Log Timeline */}
          <div className="space-y-3">
            <h4 className="text-label-lg font-bold text-primary flex items-center gap-2">
              <History className="w-4 h-4 text-secondary" />
              <span>Historial Inmutable de Eventos de esta Inversión</span>
            </h4>

            <div className="bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/30 space-y-3 max-h-48 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-body-md text-on-surface-variant italic">No hay eventos registrados.</p>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 text-body-md border-b border-outline-variant/20 last:border-0 pb-2 last:pb-0">
                    <span className="bg-secondary/10 text-secondary text-[11px] font-bold px-2 py-0.5 rounded mt-0.5">
                      {evt.type}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-primary text-body-md">{evt.description}</p>
                      <span className="text-label-sm text-on-surface-variant block">
                        {new Date(evt.timestamp).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-secondary text-on-primary font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
