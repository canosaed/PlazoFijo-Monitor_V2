import React, { useState } from 'react';
import { FixedDeposit, BackupData } from '../types';
import { formatCurrencyARS, formatDateAR, calculateFinancialSummary } from '../utils/financial';
import { exportBackupJSON, restoreBackupJSON } from '../services/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { 
  FileText, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle2, 
  FileSpreadsheet, 
  Database,
  RefreshCw,
  Info
} from 'lucide-react';

interface ReportsViewProps {
  deposits: FixedDeposit[];
  onDataRestored: () => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  deposits,
  onDataRestored,
}) => {
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // 1. Export CSV
  const handleExportCSV = () => {
    const exportData = deposits.map((d) => ({
      Banco: d.bank,
      Descripcion: d.description,
      Tipo: d.type,
      CapitalARS: d.capital,
      FechaInicio: d.startDate,
      FechaVencimiento: d.endDate,
      Dias: d.days,
      TNA: d.tna,
      InteresEstimadoARS: d.estimatedInterest,
      MontoEstimadoVencimientoARS: d.estimatedTotalAmount,
      Estado: d.status,
      Observaciones: d.notes || '',
    }));

    const csvStr = Papa.unparse(exportData);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mis_plazos_fijos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export XLSX
  const handleExportXLSX = () => {
    const exportData = deposits.map((d) => ({
      Banco: d.bank,
      Descripcion: d.description,
      Tipo: d.type,
      CapitalARS: d.capital,
      FechaInicio: d.startDate,
      FechaVencimiento: d.endDate,
      Dias: d.days,
      TNA: d.tna,
      InteresEstimadoARS: d.estimatedInterest,
      MontoEstimadoVencimientoARS: d.estimatedTotalAmount,
      Estado: d.status,
      Observaciones: d.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PlazosFijos');
    XLSX.writeFile(workbook, `reporte_plazos_fijos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 3. Export JSON Backup
  const handleExportBackup = async () => {
    const backup = await exportBackupJSON();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backup_plazos_fijos_pro_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Restore JSON Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('¡ATENCIÓN! La restauración reemplazará TODOS los datos almacenados en el servidor por la información del archivo de respaldo. ¿Desea continuar?')) {
      return;
    }

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed: BackupData = JSON.parse(content);
        const res = await restoreBackupJSON(parsed);
        await onDataRestored();
        alert(`Restauración completada. Se importaron ${res.importedDeposits} colocaciones e historial.`);
      } catch (err) {
        console.error('Error al restaurar respaldo:', err);
        alert('Error: El archivo de respaldo seleccionado no tiene un formato JSON válido.');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  // 5. PDF Executive Report Generation
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const summary = calculateFinancialSummary(deposits);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PlazoFijo Pro - Reporte Ejecutivo de Inversiones', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${new Intl.DateTimeFormat('es-AR').format(new Date())}`, 14, 26);
    doc.text('Moneda Exclusiva: Pesos Argentinos (ARS $)', 14, 31);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 248, 252);
    doc.rect(14, 36, 182, 35, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Resumen Consolidado de Cartera', 18, 43);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Capital Vigente Total: ${formatCurrencyARS(summary.totalActiveCapital)}`, 18, 51);
    doc.text(`Intereses Estimados Pendientes: ${formatCurrencyARS(summary.totalPendingInterest)}`, 18, 57);
    doc.text(`Monto Estimado al Vencimiento: ${formatCurrencyARS(summary.totalEstimatedAtMaturity)}`, 18, 63);

    doc.text(`Colocaciones Vigentes: ${summary.activeCount}`, 110, 51);
    doc.text(`TNA Ponderada Promedio: ${summary.weightedAverageTna} %`, 110, 57);
    doc.text(`Pendientes de Confirmar: ${summary.pendingConfirmationCount}`, 110, 63);

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Detalle de Plazos Fijos Registrados', 14, 80);

    let y = 88;
    doc.setFontSize(9);
    doc.setFillColor(12, 45, 72);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y, 182, 8, 'F');
    doc.text('Banco', 16, y + 5.5);
    doc.text('Capital (ARS)', 70, y + 5.5);
    doc.text('Vencimiento', 115, y + 5.5);
    doc.text('Monto Est.', 150, y + 5.5);

    y += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    deposits.forEach((d, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 249, 255);
        doc.rect(14, y, 182, 7, 'F');
      }

      doc.text(d.bank.substring(0, 28), 16, y + 5);
      doc.text(formatCurrencyARS(d.capital), 70, y + 5);
      doc.text(formatDateAR(d.endDate), 115, y + 5);
      doc.text(formatCurrencyARS(d.estimatedTotalAmount), 150, y + 5);

      y += 7;
    });

    doc.save(`informe_plazos_fijos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold text-primary flex items-center gap-2">
            <FileText className="w-6 h-6 text-secondary" />
            <span>Reportes, Exportación y Respaldos</span>
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Genere informes descargables en PDF, planillas Excel/CSV y respaldos de seguridad en JSON.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reports & Export Cards */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="text-label-lg font-bold text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2">
            <Download className="w-5 h-5 text-secondary" />
            <span>Exportación de Datos e Informes</span>
          </h3>

          <p className="text-body-md text-on-surface-variant">
            Descargue el detalle de sus inversiones en formatos estandarizados para análisis en Excel o almacenamiento impreso.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleGeneratePDF}
              className="w-full flex items-center justify-between p-3.5 bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-rose-600" />
                <div className="text-left">
                  <span className="font-bold text-primary text-body-md block">Informe Ejecutivo en PDF</span>
                  <span className="text-label-sm text-on-surface-variant">Resumen consolidado con formato imprimible</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-secondary" />
            </button>

            <button
              onClick={handleExportXLSX}
              className="w-full flex items-center justify-between p-3.5 bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#10b981]" />
                <div className="text-left">
                  <span className="font-bold text-primary text-body-md block">Exportar a Excel (.xlsx)</span>
                  <span className="text-label-sm text-on-surface-variant">Planilla estructurada con todas las columnas</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-secondary" />
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-between p-3.5 bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <span className="font-bold text-primary text-body-md block">Exportar a CSV</span>
                  <span className="text-label-sm text-on-surface-variant">Archivo de texto plano delimitado por comas</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-secondary" />
            </button>
          </div>
        </div>

        {/* Backups Card */}
        <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
          <h3 className="text-label-lg font-bold text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2">
            <Database className="w-5 h-5 text-secondary" />
            <span>Respaldo y Restauración Integral (JSON)</span>
          </h3>

          <p className="text-body-md text-on-surface-variant">
            Guarde una copia exacta de sus inversiones e historial para migrar de equipo o proteger sus datos.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-between p-3.5 bg-primary hover:bg-secondary text-on-primary font-bold rounded-xl transition-colors shadow-xs"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-tertiary-fixed" />
                <span>Generar Respaldo Completo (JSON)</span>
              </div>
              <Download className="w-4 h-4" />
            </button>

            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2 text-amber-900 text-body-md">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Restaurar Base de Datos desde JSON</span>
                  <span className="text-label-sm block text-amber-800">
                    Sustituye la información actual por el contenido del respaldo cargado.
                  </span>
                </div>
              </div>

              <label className="block w-full text-center bg-surface-container hover:bg-surface-container-high text-primary font-semibold py-2 px-4 rounded-lg cursor-pointer transition-colors text-body-md border border-outline-variant/40">
                <span>{isRestoring ? 'Restaurando...' : 'Seleccionar Archivo JSON de Respaldo'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
