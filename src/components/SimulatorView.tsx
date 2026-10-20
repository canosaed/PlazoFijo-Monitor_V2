import React, { useState, useEffect } from 'react';
import { calculateEstimatedInterest, calculateTEAFromTNA, formatCurrencyARS, formatPercentage, formatDateAR } from '../utils/financial';
import { Calculator, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SimulatorViewProps {
  onRegisterFromSim: (simData: {
    capital: number;
    tna: number;
    days: number;
    startDate: string;
    endDate: string;
    estimatedInterest: number;
    estimatedTotalAmount: number;
  }) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({ onRegisterFromSim }) => {
  const [capital, setCapital] = useState<number>(1000000);
  const [tna, setTna] = useState<number>(37.5);
  const [days, setDays] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [endDate, setEndDate] = useState<string>('');
  const [estimatedInterest, setEstimatedInterest] = useState<number>(0);
  const [estimatedTotal, setEstimatedTotal] = useState<number>(0);
  const [periodYield, setPeriodYield] = useState<number>(0);
  const [tea, setTea] = useState<number>(0);

  useEffect(() => {
    if (startDate && days > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + Number(days));
      setEndDate(end.toISOString().split('T')[0]);
    }

    if (capital > 0 && tna > 0 && days > 0) {
      const interest = calculateEstimatedInterest(capital, tna, days);
      const total = capital + interest;
      const yieldPct = (interest / capital) * 100;
      const teaVal = calculateTEAFromTNA(tna, days);

      setEstimatedInterest(interest);
      setEstimatedTotal(total);
      setPeriodYield(Math.round(yieldPct * 100) / 100);
      setTea(teaVal);
    } else {
      setEstimatedInterest(0);
      setEstimatedTotal(0);
      setPeriodYield(0);
      setTea(0);
    }
  }, [capital, tna, days, startDate]);

  const handleRegister = () => {
    onRegisterFromSim({
      capital,
      tna,
      days,
      startDate,
      endDate,
      estimatedInterest,
      estimatedTotalAmount: estimatedTotal,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-secondary font-semibold text-headline-sm">
            <Calculator className="w-6 h-6 text-secondary" />
            <span>Simulador Financiero de Plazos Fijos</span>
          </div>
          <p className="text-body-md text-on-surface-variant mt-1">
            Calculá rendimientos estimados en pesos argentinos (ARS) con la convención oficial de 365 días.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
          <h3 className="text-label-lg font-bold text-primary border-b border-outline-variant/20 pb-3 flex items-center gap-2">
            Parámetros de Simulación
          </h3>

          <div>
            <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
              Capital a Invertir (ARS $)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-on-surface-variant font-bold text-body-md select-none">
                ARS $
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={capital || ''}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full pl-16 pr-4 py-2 text-primary font-bold text-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder="Ej: 1000000"
              />
            </div>
            {capital <= 0 && (
              <p className="text-error text-label-sm mt-1">El capital debe ser un importe positivo.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Tasa Nominal Anual (TNA %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="1000"
                  step="0.01"
                  value={tna || ''}
                  onChange={(e) => setTna(Number(e.target.value))}
                  className="w-full px-3 py-2 text-primary font-semibold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                  placeholder="37.50"
                />
                <span className="absolute right-3 top-2.5 text-on-surface-variant font-medium text-body-md select-none">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
                Plazo (Días)
              </label>
              <input
                type="number"
                min="1"
                max="3650"
                value={days || ''}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-primary font-semibold text-body-lg rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none tabular-nums"
                placeholder="30"
              />
            </div>
          </div>

          {/* Quick preset days buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-label-sm text-on-surface-variant self-center mr-1">Plazos habituales:</span>
            {[30, 60, 90, 180, 365].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDays(preset)}
                className={`px-2.5 py-1 text-label-sm rounded-md font-semibold transition-colors ${
                  days === preset
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container text-primary hover:bg-surface-container-high'
                }`}
              >
                {preset} d
              </button>
            ))}
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant font-semibold mb-1">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-primary text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h3 className="text-label-lg font-bold text-primary">Resultado de la Estimación</h3>
              <span className="bg-surface-container text-secondary text-label-sm font-semibold px-2.5 py-1 rounded-full">
                ARS ($)
              </span>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-secondary/20 space-y-3">
              <div>
                <span className="text-label-sm text-on-surface-variant font-medium">Monto Estimado al Vencimiento</span>
                <div className="text-headline-lg font-bold text-primary tabular-nums">
                  {formatCurrencyARS(estimatedTotal)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/20">
                <div>
                  <span className="text-label-sm text-on-surface-variant">Intereses Ganados</span>
                  <p className="text-headline-sm font-bold text-[#10b981] tabular-nums">
                    +{formatCurrencyARS(estimatedInterest)}
                  </p>
                </div>
                <div>
                  <span className="text-label-sm text-on-surface-variant">Rendimiento del Período</span>
                  <p className="text-headline-sm font-bold text-secondary tabular-nums">
                    +{formatPercentage(periodYield)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-body-md">
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
                <span className="text-label-sm text-on-surface-variant block">Fecha Estimada Vencimiento</span>
                <span className="font-semibold text-primary">{formatDateAR(endDate)}</span>
              </div>
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20">
                <span className="text-label-sm text-on-surface-variant block">TEA Estimada (Compuesta)</span>
                <span className="font-semibold text-primary">{formatPercentage(tea)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-label-sm text-on-surface-variant bg-surface-container/50 p-3 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <span>
                Nota: Este cálculo es una <strong>estimación ilustrativa</strong> utilizando la fórmula estándar bancaria argentina. Los valores reales informados por cada entidad financiera pueden presentar ligeras variaciones según sus políticas de redondeo o condiciones del contrato.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegister}
            disabled={capital <= 0 || tna <= 0 || days <= 0}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-on-primary font-semibold py-3 px-4 rounded-xl shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
            <span>Registrar Inversión desde Simulación</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
