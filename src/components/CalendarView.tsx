import React, { useState } from 'react';
import { FixedDeposit } from '../types';
import { formatCurrencyARS, formatDateAR, formatPercentage } from '../utils/financial';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CalendarViewProps {
  deposits: FixedDeposit[];
  onOpenConfirmModal: (deposit: FixedDeposit) => void;
  onOpenRenewModal: (deposit: FixedDeposit) => void;
  onOpenDetailModal: (deposit: FixedDeposit) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  deposits,
  onOpenConfirmModal,
  onOpenRenewModal,
  onOpenDetailModal,
}) => {
  const [filterRange, setFilterRange] = useState<'7' | '15' | '30' | 'ALL'>('30');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredDeposits = deposits.filter((dep) => {
    if (dep.status === 'CERRADO' || dep.status === 'CANCELADO') return false;

    const endDate = new Date(dep.endDate);
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (filterRange === '7') return diffDays <= 7;
    if (filterRange === '15') return diffDays <= 15;
    if (filterRange === '30') return diffDays <= 30;
    return true;
  }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold text-primary flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-secondary" />
            <span>Calendario y Agenda de Vencimientos</span>
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Monitoreo proactivo de vencimientos para evitar capital ocioso en cuentas bancarias.
          </p>
        </div>

        {/* Range Filter Segment */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
          {(['7', '15', '30', 'ALL'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setFilterRange(range)}
              className={`px-3 py-1.5 text-label-sm font-bold rounded-lg transition-colors ${
                filterRange === range
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {range === 'ALL' ? 'Todos' : `≤ ${range} Días`}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Stream */}
      <div className="space-y-4">
        {filteredDeposits.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 text-center rounded-xl shadow-sm border border-outline-variant/30">
            <Clock className="w-12 h-12 text-outline/40 mx-auto mb-3" />
            <h3 className="text-headline-sm font-bold text-primary">No hay vencimientos en la ventana seleccionada</h3>
            <p className="text-body-md text-on-surface-variant mt-1">
              Probá seleccionando "Todos" para ver la totalidad de las colocaciones agendadas.
            </p>
          </div>
        ) : (
          filteredDeposits.map((dep) => {
            const endDate = new Date(dep.endDate);
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0;
            const isImminent = diffDays >= 0 && diffDays <= 7;

            return (
              <div
                key={dep.id}
                className={`bg-surface-container-lowest p-space-md rounded-xl shadow-xs border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isOverdue
                    ? 'border-rose-300 bg-rose-50/20'
                    : isImminent
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-outline-variant/30'
                }`}
              >
                {/* Left Date Badge & Bank Info */}
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl text-center min-w-[70px] ${
                      isOverdue
                        ? 'bg-rose-100 text-rose-800'
                        : isImminent
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-surface-container text-primary'
                    }`}
                  >
                    <span className="text-label-sm font-semibold uppercase block">
                      {new Date(dep.endDate).toLocaleDateString('es-AR', { month: 'short' })}
                    </span>
                    <span className="text-headline-md font-bold leading-none block">
                      {new Date(dep.endDate).getDate()}
                    </span>
                    <span className="text-[10px] font-bold block mt-0.5">
                      {isOverdue ? 'VENCIDO' : isImminent ? 'PRÓXIMO' : `${diffDays}d`}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-headline-sm font-bold text-primary">{dep.bank}</h3>
                    <p className="text-body-md text-on-surface-variant">
                      {dep.description} • TNA {formatPercentage(dep.tna)} ({dep.days} días)
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-label-sm text-on-surface-variant">
                        Constitución: <strong>{formatDateAR(dep.startDate)}</strong>
                      </span>
                      {dep.autoRenewal && (
                        <span className="bg-secondary/15 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Renovación Automática
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount and Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/20">
                  <div className="text-right">
                    <span className="text-label-sm text-on-surface-variant block">Monto al Vencimiento</span>
                    <span className="text-headline-sm font-bold text-primary tabular-nums block">
                      {formatCurrencyARS(dep.estimatedTotalAmount)}
                    </span>
                    <span className="text-label-sm text-[#10b981] font-semibold block">
                      +{formatCurrencyARS(dep.estimatedInterest)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenConfirmModal(dep)}
                      className="flex items-center gap-1.5 bg-[#10b981] hover:bg-[#047857] text-white px-3 py-2 rounded-lg text-body-md font-semibold transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acreditar</span>
                    </button>

                    <button
                      onClick={() => onOpenRenewModal(dep)}
                      className="flex items-center gap-1.5 bg-primary hover:bg-secondary text-on-primary px-3 py-2 rounded-lg text-body-md font-semibold transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Renovar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
