import React, { useState, useEffect } from 'react';
import type { FixedDeposit, InvestmentEvent } from './types';
import { 
  getAllDeposits, 
  saveDeposit, 
  deleteDeposit, 
  getAllEvents, 
  clearAllData,
  confirmCollectionApi,
  renewDepositApi,
  importDepositsApi
} from './services/api';
import { checkAndMigrateIndexedDB } from './services/migration';
import { DEMO_DEPOSITS } from './services/demoData';

import { DashboardView } from './components/DashboardView';
import { ListView } from './components/ListView';
import { SimulatorView } from './components/SimulatorView';
import { ImportView } from './components/ImportView';
import { CalendarView } from './components/CalendarView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';

import { DepositFormModal } from './components/DepositFormModal';
import { DetailModal } from './components/DetailModal';
import { OperationalActionModal } from './components/OperationalActionModal';

import { 
  LayoutDashboard, 
  Wallet, 
  Calculator, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  History, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Menu, 
  X 
} from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [deposits, setDeposits] = useState<FixedDeposit[]>([]);
  const [events, setEvents] = useState<InvestmentEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [editingDeposit, setEditingDeposit] = useState<FixedDeposit | null>(null);
  const [detailDeposit, setDetailDeposit] = useState<FixedDeposit | null>(null);
  const [opModalConfig, setOpModalConfig] = useState<{
    isOpen: boolean;
    type: 'CONFIRM' | 'RENEW';
    deposit: FixedDeposit | null;
  }>({ isOpen: false, type: 'CONFIRM', deposit: null });

  const loadData = async () => {
    try {
      // Automatic migration from IndexedDB if needed
      await checkAndMigrateIndexedDB();

      let data = await getAllDeposits(true);
      if (data.length === 0) {
        // Auto-seed demo data if empty database
        for (const dep of DEMO_DEPOSITS) {
          await saveDeposit(dep);
        }
        data = await getAllDeposits(true);
      }
      setDeposits(data);
      const evts = await getAllEvents();
      setEvents(evts);
    } catch (err) {
      console.error('Error al cargar datos del Backend API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveDeposit = async (dep: FixedDeposit, eventMsg?: string) => {
    await saveDeposit(dep, eventMsg);
    await loadData();
  };

  const handleDeleteDeposit = async (id: string) => {
    await deleteDeposit(id);
    await loadData();
  };

  const handleRegisterFromSim = (simData: any) => {
    setEditingDeposit({
      id: '',
      bank: 'Banco Nación (BNA)',
      description: 'Plazo Fijo desde Simulación',
      type: 'TRADICIONAL_TF',
      capital: simData.capital,
      startDate: simData.startDate,
      endDate: simData.endDate,
      days: simData.days,
      tna: simData.tna,
      estimatedInterest: simData.estimatedInterest,
      estimatedTotalAmount: simData.estimatedTotalAmount,
      autoRenewal: false,
      status: 'VIGENTE',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsNewModalOpen(true);
  };

  const handleImportConfirm = async (importedDeposits: FixedDeposit[]) => {
    await importDepositsApi(importedDeposits, 'Importación Masiva Planilla');
    await loadData();
    setCurrentView('list');
  };

  const handleConfirmCollection = async (
    depositId: string, 
    collectedInterest: number, 
    collectedCapital: number, 
    closeInvestment: boolean
  ) => {
    await confirmCollectionApi(depositId, collectedInterest, collectedCapital, closeInvestment);
    await loadData();
  };

  const handleRenewDeposit = async (
    oldDeposit: FixedDeposit,
    newCapital: number,
    newTna: number,
    newDays: number,
    newStartDate: string,
    autoRenewal: boolean
  ) => {
    await renewDepositApi(
      oldDeposit.id,
      newCapital,
      newTna,
      newDays,
      newStartDate,
      autoRenewal
    );
    await loadData();
  };

  const handleToggleDemoData = async () => {
    if (window.confirm('¿Desea limpiar los datos de prueba y comenzar con una base vacía?')) {
      await clearAllData(false);
      await loadData();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Inicio / Dashboard', icon: LayoutDashboard },
    { id: 'list', label: 'Mis Plazos Fijos', icon: Wallet },
    { id: 'simulator', label: 'Simulador Financiero', icon: Calculator },
    { id: 'calendar', label: 'Calendario de Vencimientos', icon: CalendarIcon },
    { id: 'import', label: 'Importar Excel / CSV', icon: FileSpreadsheet },
    { id: 'history', label: 'Historial / Trazabilidad', icon: History },
    { id: 'reports', label: 'Reportes y Respaldos', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary font-semibold">
        <RefreshCw className="w-8 h-8 animate-spin text-secondary mr-2" />
        <span>Cargando PlazoFijo Pro...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-primary text-on-primary flex-shrink-0 md:min-h-screen flex flex-col justify-between p-space-md">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-on-primary/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-tertiary-fixed text-tertiary font-bold flex items-center justify-center text-lg shadow-xs">
                PF
              </div>
              <div>
                <span className="font-bold text-headline-sm text-on-primary tracking-tight block leading-tight">
                  PlazoFijo<span className="text-tertiary-fixed">Pro</span>
                </span>
                <span className="text-[10px] text-on-primary/60 uppercase font-semibold">
                  Argentina ARS v2.0
                </span>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-on-primary hover:bg-white/10 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`mt-4 space-y-1 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-body-md transition-colors text-left ${
                    isActive
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'text-on-primary/80 hover:text-on-primary hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="hidden md:block pt-4 border-t border-on-primary/10 text-label-sm text-on-primary/70 space-y-2">
          <div className="flex items-center gap-1.5 text-tertiary-fixed font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Persistencia postgreSQL</span>
          </div>
          <p className="text-[11px] text-on-primary/60">
            Arquitectura 3 Capas Backend Express + API v1.
          </p>
          <button
            onClick={handleToggleDemoData}
            className="w-full text-left text-[11px] text-tertiary-fixed hover:underline pt-1 block"
          >
            Restablecer / Limpiar Datos Demo
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-space-md sm:p-space-lg max-w-7xl mx-auto w-full">
        {currentView === 'dashboard' && (
          <DashboardView
            deposits={deposits}
            onNavigateToList={() => setCurrentView('list')}
            onNavigateToSimulator={() => setCurrentView('simulator')}
          />
        )}

        {currentView === 'list' && (
          <ListView
            deposits={deposits}
            onOpenNewModal={() => {
              setEditingDeposit(null);
              setIsNewModalOpen(true);
            }}
            onOpenEditModal={(dep) => {
              setEditingDeposit(dep);
              setIsNewModalOpen(true);
            }}
            onOpenDetailModal={(dep) => setDetailDeposit(dep)}
            onOpenRenewModal={(dep) => setOpModalConfig({ isOpen: true, type: 'RENEW', deposit: dep })}
            onOpenConfirmModal={(dep) => setOpModalConfig({ isOpen: true, type: 'CONFIRM', deposit: dep })}
            onDeleteDeposit={handleDeleteDeposit}
          />
        )}

        {currentView === 'simulator' && (
          <SimulatorView onRegisterFromSim={handleRegisterFromSim} />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            deposits={deposits}
            onOpenConfirmModal={(dep) => setOpModalConfig({ isOpen: true, type: 'CONFIRM', deposit: dep })}
            onOpenRenewModal={(dep) => setOpModalConfig({ isOpen: true, type: 'RENEW', deposit: dep })}
            onOpenDetailModal={(dep) => setDetailDeposit(dep)}
          />
        )}

        {currentView === 'import' && (
          <ImportView
            existingDeposits={deposits}
            onImportConfirm={handleImportConfirm}
          />
        )}

        {currentView === 'history' && (
          <HistoryView events={events} />
        )}

        {currentView === 'reports' && (
          <ReportsView
            deposits={deposits}
            onDataRestored={loadData}
          />
        )}
      </main>

      {/* Modals */}
      <DepositFormModal
        isOpen={isNewModalOpen}
        initialData={editingDeposit}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleSaveDeposit}
      />

      <DetailModal
        isOpen={!!detailDeposit}
        deposit={detailDeposit}
        onClose={() => setDetailDeposit(null)}
      />

      <OperationalActionModal
        isOpen={opModalConfig.isOpen}
        type={opModalConfig.type}
        deposit={opModalConfig.deposit}
        onClose={() => setOpModalConfig({ isOpen: false, type: 'CONFIRM', deposit: null })}
        onConfirmCollection={handleConfirmCollection}
        onRenewDeposit={handleRenewDeposit}
      />
    </div>
  );
}

export default App;
