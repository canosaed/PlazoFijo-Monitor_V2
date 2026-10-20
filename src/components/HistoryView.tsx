import React, { useState } from 'react';
import { InvestmentEvent } from '../types';
import { History, Search, Filter, Calendar, Tag } from 'lucide-react';

interface HistoryViewProps {
  events: InvestmentEvent[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ events }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || evt.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'ALTA':
        return <span className="bg-[#10b981]/15 text-[#047857] text-label-sm font-bold px-2.5 py-0.5 rounded-full">ALTA</span>;
      case 'MODIFICACION':
        return <span className="bg-surface-container text-secondary text-label-sm font-bold px-2.5 py-0.5 rounded-full">MODIFICACIÓN</span>;
      case 'CONFIRMACION_COBRO':
        return <span className="bg-[#10b981]/20 text-[#047857] text-label-sm font-bold px-2.5 py-0.5 rounded-full">COBRO / ACREDITACIÓN</span>;
      case 'RENOVACION':
        return <span className="bg-amber-100 text-amber-800 text-label-sm font-bold px-2.5 py-0.5 rounded-full">RENOVACIÓN</span>;
      case 'CIERRE':
        return <span className="bg-outline-variant/30 text-outline text-label-sm font-bold px-2.5 py-0.5 rounded-full">CIERRE</span>;
      default:
        return <span className="bg-surface-container text-primary text-label-sm font-bold px-2.5 py-0.5 rounded-full">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold text-primary flex items-center gap-2">
            <History className="w-6 h-6 text-secondary" />
            <span>Historial y Trazabilidad Inmutable de Operaciones</span>
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Registro cronológico inalterable de todos los eventos (altas, modificaciones, cobranzas y renovaciones).
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar evento por descripción..."
            className="w-full pl-9 pr-3 py-2 text-body-md rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 text-body-md text-primary rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          >
            <option value="ALL">Todos los Tipos de Evento</option>
            <option value="ALTA">Altas</option>
            <option value="MODIFICACION">Modificaciones</option>
            <option value="CONFIRMACION_COBRO">Cobranzas / Acreditaciones</option>
            <option value="RENOVACION">Renovaciones</option>
            <option value="CIERRE">Cierres</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
        {filteredEvents.length === 0 ? (
          <p className="p-8 text-center text-on-surface-variant text-body-md italic">
            No se encontraron eventos registrados con los criterios seleccionados.
          </p>
        ) : (
          <div className="relative border-l-2 border-outline-variant/30 ml-4 space-y-6">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative pl-6">
                {/* Node Dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-secondary border-2 border-surface-container-lowest shadow-xs"></div>

                <div className="bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/20 space-y-1 hover:border-secondary/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      {getEventTypeBadge(evt.type)}
                      <span className="text-label-sm text-on-surface-variant font-medium">
                        ID Evento: {evt.id}
                      </span>
                    </div>

                    <span className="text-label-sm text-on-surface-variant font-semibold">
                      {new Date(evt.timestamp).toLocaleString('es-AR')}
                    </span>
                  </div>

                  <p className="font-bold text-primary text-body-md mt-1">{evt.description}</p>

                  {evt.amounts && (
                    <div className="flex flex-wrap gap-4 pt-2 text-label-sm text-on-surface-variant border-t border-outline-variant/20">
                      {evt.amounts.capital !== undefined && evt.amounts.capital !== null && (
                        <span>
                          Capital: <strong className="text-primary">${evt.amounts.capital.toLocaleString('es-AR')}</strong>
                        </span>
                      )}
                      {evt.amounts.interest !== undefined && evt.amounts.interest !== null && (
                        <span>
                          Interés: <strong className="text-[#10b981]">${evt.amounts.interest.toLocaleString('es-AR')}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
