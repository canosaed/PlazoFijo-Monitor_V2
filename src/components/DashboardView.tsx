import React from 'react';
import { FixedDeposit } from '../types';
import { calculateFinancialSummary, formatCurrencyARS, formatPercentage, formatDateAR } from '../utils/financial';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  TrendingUp,
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle2,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

interface DashboardViewProps {
  deposits: FixedDeposit[];
  onNavigateToList: (statusFilter?: string) => void;
  onNavigateToSimulator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  deposits,
  onNavigateToList,
  onNavigateToSimulator,
}) => {
  const summary = calculateFinancialSummary(deposits);

  // Group capital by Bank for Doughnut chart
  const bankCapitalMap: Record<string, number> = {};
  deposits.forEach((d) => {
    if (d.status === 'VIGENTE' || d.status === 'PROXIMO_A_VENCER') {
      bankCapitalMap[d.bank] = (bankCapitalMap[d.bank] || 0) + d.capital;
    }
  });

  const bankLabels = Object.keys(bankCapitalMap);
  const bankDataValues = Object.values(bankCapitalMap);

  const doughnutData = {
    labels: bankLabels.length > 0 ? bankLabels : ['Sin Colocaciones'],
    datasets: [
      {
        data: bankDataValues.length > 0 ? bankDataValues : [1],
        backgroundColor: [
          '#0c2d48',
          '#1a60a3',
          '#10b981',
          '#f59e0b',
          '#6366f1',
          '#ec4899',
          '#8b5cf6',
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Group maturities by month
  const monthlyMaturityMap: Record<string, number> = {};
  deposits.forEach((d) => {
    if (d.endDate) {
      const monthYear = d.endDate.substring(0, 7); // YYYY-MM
      monthlyMaturityMap[monthYear] = (monthlyMaturityMap[monthYear] || 0) + d.estimatedTotalAmount;
    }
  });

  const sortedMonths = Object.keys(monthlyMaturityMap).sort();
  const barData = {
    labels: sortedMonths.map((m) => {
      const [y, month] = m.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${monthNames[parseInt(month, 10) - 1]} ${y}`;
    }),
    datasets: [
      {
        label: 'Monto a Cobrar (ARS $)',
        data: sortedMonths.map((m) => monthlyMaturityMap[m]),
        backgroundColor: '#1a60a3',
        borderRadius: 6,
      },
    ],
  };

  // Imminent expirations list (≤ 15 days)
  const imminentDeposits = deposits
    .filter((d) => d.status === 'VIGENTE' || d.status === 'PROXIMO_A_VENCER' || d.status === 'VENCIDO_PENDIENTE')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner Ribbon */}
      <div className="bg-primary text-on-primary p-space-lg rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-surface-container-lowest/15 text-tertiary-fixed text-label-sm font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Consola Financiera ARS
            </span>
            <span className="text-on-primary/70 text-body-sm">
              Almacenamiento Local Seguro
            </span>
          </div>
          <h1 className="text-headline-lg font-bold mt-1">Monitor de Plazos Fijos</h1>
          <p className="text-body-md text-on-primary/80 mt-0.5">
            Métricas calculadas en tiempo real sobre {summary.activeCount} colocaciones vigentes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToList()}
            className="flex items-center gap-2 bg-surface-container-lowest text-primary hover:bg-surface-container font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-colors"
          >
            <Wallet className="w-4 h-4 text-secondary" />
            <span>Ver Mis Inversiones</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Capital Vigente */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-md font-semibold">Capital Vigente Total</span>
            <div className="p-2 bg-surface-container-low rounded-lg text-primary">
              <Wallet className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div>
            <div className="text-headline-md font-bold text-primary tabular-nums">
              {formatCurrencyARS(summary.totalActiveCapital)}
            </div>
            <div className="text-label-sm text-on-surface-variant mt-1 flex items-center justify-between">
              <span>TNA Ponderada Promedio:</span>
              <span className="font-bold text-secondary">{formatPercentage(summary.weightedAverageTna)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Intereses Estimados */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-md font-semibold">Intereses Est. Pendientes</span>
            <div className="p-2 bg-surface-container-low rounded-lg text-[#10b981]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-headline-md font-bold text-[#10b981] tabular-nums">
              +{formatCurrencyARS(summary.totalPendingInterest)}
            </div>
            <div className="text-label-sm text-on-surface-variant mt-1">
              Monto est. al vencimiento: <strong className="text-primary">{formatCurrencyARS(summary.totalEstimatedAtMaturity)}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Próximos Vencimientos */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-md font-semibold">Vencimientos Próximos</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-headline-md font-bold text-primary tabular-nums">
              {summary.upcomingMaturities7dCount}{' '}
              <span className="text-body-md font-medium text-on-surface-variant">en ≤ 7 días</span>
            </div>
            <div className="text-label-sm text-on-surface-variant mt-1">
              Próximos a 15d: <strong>{summary.upcomingMaturities15dCount}</strong> | 30d: <strong>{summary.upcomingMaturities30dCount}</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Pendientes de Confirmación */}
        <div
          onClick={() => onNavigateToList('VENCIDO_PENDIENTE')}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-outline-variant/30 flex flex-col justify-between cursor-pointer hover:border-secondary transition-all"
        >
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-label-md font-semibold">Pendientes de Confirmar</span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-headline-md font-bold text-rose-600 tabular-nums">
              {summary.pendingConfirmationCount}
            </div>
            <div className="text-label-sm text-rose-700 mt-1 flex items-center gap-1 font-semibold">
              <span>Revisar acreditación de capital / cobro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Interactive Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bank Capital Distribution Doughnut */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h3 className="text-label-lg font-bold text-primary flex items-center gap-2">
              <Building2 className="w-5 h-5 text-secondary" />
              <span>Distribución por Entidad Bancaria</span>
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center p-2">
            {bankLabels.length === 0 ? (
              <p className="text-on-surface-variant text-body-md italic">No hay datos vigentes suficientes para el gráfico.</p>
            ) : (
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Monthly Maturities Bar Chart */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h3 className="text-label-lg font-bold text-primary flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-secondary" />
              <span>Cronograma de Vencimientos por Mes</span>
            </h3>
          </div>
          <div className="h-64 p-2">
            {sortedMonths.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-on-surface-variant text-body-md italic">No existen vencimientos registrados.</p>
              </div>
            ) : (
              <Bar data={barData} options={{ maintainAspectRatio: false, responsive: true }} />
            )}
          </div>
        </div>
      </div>

      {/* Imminent Maturities List Module */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <h3 className="text-label-lg font-bold text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Próximas Colocaciones a Vencer</span>
          </h3>
          <button
            onClick={() => onNavigateToList()}
            className="text-label-sm font-semibold text-secondary hover:underline"
          >
            Ver todas
          </button>
        </div>

        <div className="divide-y divide-outline-variant/20">
          {imminentDeposits.length === 0 ? (
            <p className="p-4 text-center text-on-surface-variant text-body-md italic">
              No hay vencimientos próximos en los próximos días.
            </p>
          ) : (
            imminentDeposits.map((dep) => (
              <div key={dep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-container-low/40 px-2 rounded-lg transition-colors">
                <div>
                  <div className="font-bold text-primary">{dep.bank}</div>
                  <div className="text-body-sm text-on-surface-variant">
                    {dep.description} • TNA {formatPercentage(dep.tna)}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-label-sm text-on-surface-variant">Vencimiento</div>
                    <div className="font-bold text-primary">{formatDateAR(dep.endDate)}</div>
                  </div>
                  <div>
                    <div className="text-label-sm text-on-surface-variant">Monto a Acreditar</div>
                    <div className="font-bold text-[#10b981] tabular-nums">
                      {formatCurrencyARS(dep.estimatedTotalAmount)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
