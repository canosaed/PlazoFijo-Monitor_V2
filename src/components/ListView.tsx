import React, { useState } from 'react';
import { FixedDeposit, DepositStatus } from '../types';
import { formatCurrencyARS, formatPercentage, formatDateAR } from '../utils/financial';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

interface ListViewProps {
  deposits: FixedDeposit[];
  onOpenNewModal: () => void;
  onOpenEditModal: (deposit: FixedDeposit) => void;
  onOpenDetailModal: (deposit: FixedDeposit) => void;
  onOpenRenewModal: (deposit: FixedDeposit) => void;
  onOpenConfirmModal: (deposit: FixedDeposit) => void;
  onDeleteDeposit: (id: string) => Promise<void>;
}

export const ListView: React.FC<ListViewProps> = ({
  deposits,
  onOpenNewModal,
  onOpenEditModal,
  onOpenDetailModal,
  onOpenRenewModal,
  onOpenConfirmModal,
  onDeleteDeposit,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'endDate' | 'capital' | 'bank' | 'tna'>('endDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Extract unique bank list
  const uniqueBanks = Array.from(new Set(deposits.map((d) => d.bank))).sort();

  // Filter logic
  const filteredDeposits = deposits.filter((dep) => {
    const matchesSearch =
      dep.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dep.notes && dep.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBank = selectedBank === 'ALL' || dep.bank === selectedBank;
    const matchesStatus = selectedStatus === 'ALL' || dep.status === selectedStatus;

    return matchesSearch && matchesBank && matchesStatus;
  });

  // Sorting logic
  const sortedDeposits = [...filteredDeposits].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'endDate') {
      comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    } else if (sortBy === 'capital') {
      comparison = a.capital - b.capital;
    } else if (sortBy === 'bank') {
      comparison = a.bank.localeCompare(b.bank);
    } else if (sortBy === 'tna') {
      comparison = a.tna - b.tna;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusBadge = (status: DepositStatus) => {
    switch (status) {
      case 'VIGENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-[#10b981]/15 text-[#047857]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            Vigente
          </span>
        );
      case 'PROXIMO_A_VENCER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Próximo a Vencer
          </span>
        );
      case 'VENCIDO_PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-rose-100 text-rose-800 animate-pulse">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Vencido Pendiente
          </span>
        );
      case 'RENOVADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-surface-container text-secondary">
            <RefreshCw className="w-3.5 h-3.5" />
            Renovado
          </span>
        );
      case 'CERRADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-outline-variant/30 text-outline">
            Cerrado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-error/15 text-error">
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div>
          <h2 className="text-headline-sm font-bold text-primary">Mis Plazos Fijos Registrados</h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Gestión integral de colocaciones financieras en pesos argentinos (ARS).
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-secondary text-on-primary font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-all duration-150"
        >
          <Plus className="w-5 h-5 text-tertiary-fixed" />
          <span>Nuevo Plazo Fijo</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-on-surface-variant" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por banco, descripción o notas..."
              className="w-full pl-9 pr-3 py-2 text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            />
          </div>

          {/* Bank Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="w-full px-3 py-2 text-body-md text-primary rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            >
              <option value="ALL">Todos los Bancos</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-body-md text-primary rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="PROXIMO_A_VENCER">Próximos a Vencer (≤7 días)</option>
              <option value="VENCIDO_PENDIENTE">Vencidos Pendientes de Confirmar</option>
              <option value="RENOVADO">Renovados</option>
              <option value="CERRADO">Cerrados / Acreditados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30 text-label-sm uppercase font-semibold tracking-wider select-none">
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary" onClick={() => {
                  if (sortBy === 'bank') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('bank'); setSortOrder('asc'); }
                }}>
                  <div className="flex items-center gap-1">
                    <span>Entidad / Descripción</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary text-right" onClick={() => {
                  if (sortBy === 'capital') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('capital'); setSortOrder('desc'); }
                }}>
                  <div className="flex items-center justify-end gap-1">
                    <span>Capital (ARS)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary text-right" onClick={() => {
                  if (sortBy === 'tna') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('tna'); setSortOrder('desc'); }
                }}>
                  <div className="flex items-center justify-end gap-1">
                    <span>TNA / Plazo</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary" onClick={() => {
                  if (sortBy === 'endDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  else { setSortBy('endDate'); setSortOrder('asc'); }
                }}>
                  <div className="flex items-center gap-1">
                    <span>Vencimiento</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Monto Est. Vencimiento</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-body-md text-primary">
              {sortedDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-on-surface-variant">
                    <Building2 className="w-12 h-12 text-outline/40 mx-auto mb-3" />
                    <p className="font-semibold text-headline-sm text-primary">No se encontraron plazos fijos</p>
                    <p className="text-body-md mt-1">
                      {searchTerm || selectedBank !== 'ALL' || selectedStatus !== 'ALL'
                        ? 'Probá ajustando los filtros de búsqueda.'
                        : 'Aún no registraste ninguna inversión en pesos.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary">{dep.bank}</div>
                      <div className="text-body-sm text-on-surface-variant flex items-center gap-1">
                        <span>{dep.description}</span>
                        {dep.isDemo && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                            DEMO
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                      {formatCurrencyARS(dep.capital)}
                    </td>

                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <div className="font-semibold text-secondary">{formatPercentage(dep.tna)}</div>
                      <div className="text-label-sm text-on-surface-variant">{dep.days} días</div>
                    </td>

                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="font-semibold text-primary">{formatDateAR(dep.endDate)}</div>
                      <div className="text-label-sm text-on-surface-variant">Desde {formatDateAR(dep.startDate)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right tabular-nums">
                      <div className="font-bold text-primary">{formatCurrencyARS(dep.estimatedTotalAmount)}</div>
                      <div className="text-label-sm text-[#10b981] font-semibold">
                        +{formatCurrencyARS(dep.estimatedInterest)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(dep.status)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Detail */}
                        <button
                          title="Ver Detalle"
                          onClick={() => onOpenDetailModal(dep)}
                          className="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-surface-container rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          title="Editar"
                          onClick={() => onOpenEditModal(dep)}
                          className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Renew */}
                        {(dep.status === 'VIGENTE' || dep.status === 'PROXIMO_A_VENCER' || dep.status === 'VENCIDO_PENDIENTE') && (
                          <button
                            title="Renovar Inversión"
                            onClick={() => onOpenRenewModal(dep)}
                            className="p-1.5 text-secondary hover:bg-surface-container rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* Confirm Collection */}
                        {(dep.status === 'VENCIDO_PENDIENTE' || dep.status === 'PROXIMO_A_VENCER') && (
                          <button
                            title="Confirmar Cobro / Acreditación"
                            onClick={() => onOpenConfirmModal(dep)}
                            className="p-1.5 text-[#10b981] hover:bg-surface-container rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          title="Eliminar"
                          onClick={async () => {
                            if (window.confirm(`¿Está seguro de eliminar el registro de ${dep.bank}?`)) {
                              await onDeleteDeposit(dep.id);
                            }
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-label-sm text-on-surface-variant">
          <span>Mostrando {sortedDeposits.length} de {deposits.length} colocaciones registradas</span>
          <span className="font-semibold text-primary">Todos los valores en Pesos Argentinos (ARS)</span>
        </div>
      </div>
    </div>
  );
};
