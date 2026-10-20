import React, { useState } from 'react';
import { FixedDeposit } from '../types';
import { validateAndParseImportRow, RawImportRow, TEMPLATE_HEADERS, SAMPLE_TEMPLATE_ROWS } from '../utils/importer';
import { formatCurrencyARS, formatDateAR } from '../utils/financial';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface ImportViewProps {
  existingDeposits: FixedDeposit[];
  onImportConfirm: (depositsToImport: FixedDeposit[]) => Promise<void>;
}

export const ImportView: React.FC<ImportViewProps> = ({
  existingDeposits,
  onImportConfirm,
}) => {
  const [rows, setRows] = useState<RawImportRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    rejected: number;
    duplicates: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setImportSummary(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          processParsedJson(json);
        } catch (err) {
          console.error('Error leyendo Excel:', err);
          alert('Error al leer el archivo Excel. Verifique el formato.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedJson(results.data as Record<string, any>[]);
          setIsProcessing(false);
        },
        error: (err) => {
          console.error('Error parseando CSV:', err);
          alert('Error al leer el archivo CSV.');
          setIsProcessing(false);
        },
      });
    }
  };

  const processParsedJson = (jsonRows: Record<string, any>[]) => {
    const parsedRows = jsonRows.map((r, idx) => 
      validateAndParseImportRow(r, idx + 1, existingDeposits)
    );
    setRows(parsedRows);
  };

  const downloadCSVTemplate = () => {
    const csvContent = Papa.unparse(SAMPLE_TEMPLATE_ROWS);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_plazos_fijos_pro.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadXLSXTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PlazosFijos');
    XLSX.writeFile(workbook, 'plantilla_plazos_fijos_pro.xlsx');
  };

  const toggleSelectRow = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleExecuteImport = async () => {
    const selectedRows = rows.filter((r) => r.selected && r.parsedDeposit);
    if (selectedRows.length === 0) {
      alert('No hay registros válidos seleccionados para importar.');
      return;
    }

    const depositsToImport = selectedRows.map((r) => r.parsedDeposit!);
    const duplicatesCount = selectedRows.filter((r) => r.isDuplicate).length;
    const rejectedCount = rows.length - selectedRows.length;

    await onImportConfirm(depositsToImport);

    setImportSummary({
      imported: depositsToImport.length,
      rejected: rejectedCount,
      duplicates: duplicatesCount,
    });
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const duplicateCount = rows.filter((r) => r.isDuplicate).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-sm font-bold text-primary flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-secondary" />
            <span>Importación de Plazos Fijos (Excel / CSV)</span>
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Incorpore masivamente colocaciones financieras desde planillas con interpretación de formato argentino.
          </p>
        </div>

        {/* Download Templates */}
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container text-primary font-semibold text-body-md rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <Download className="w-4 h-4 text-secondary" />
            <span>Plantilla CSV</span>
          </button>
          <button
            onClick={downloadXLSXTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-secondary/10 text-secondary font-semibold text-body-md rounded-lg hover:bg-secondary/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Plantilla Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border-2 border-dashed border-outline-variant/60 hover:border-secondary transition-all text-center">
        <Upload className="w-10 h-10 text-secondary mx-auto mb-2" />
        <h3 className="text-label-lg font-bold text-primary">Seleccione su archivo Excel (.xlsx, .xls) o CSV</h3>
        <p className="text-body-md text-on-surface-variant mt-1">
          Formato con encabezados: Banco, Capital, FechaInicio, Dias, TNA, etc.
        </p>

        <label className="inline-block mt-4 bg-primary hover:bg-secondary text-on-primary font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs">
          <span>{fileName ? `Cambiar Archivo (${fileName})` : 'Cargar Archivo'}</span>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Summary report banner if imported */}
      {importSummary && (
        <div className="bg-[#10b981]/15 border border-[#10b981]/30 p-space-md rounded-xl text-primary space-y-2">
          <div className="flex items-center gap-2 text-headline-sm font-bold text-[#047857]">
            <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
            <span>¡Importación completada con éxito!</span>
          </div>
          <p className="text-body-md">
            Se incorporaron <strong>{importSummary.imported}</strong> nuevos registros.{' '}
            {importSummary.duplicates > 0 && `(De los cuales ${importSummary.duplicates} tenían posible duplicación).`}{' '}
            {importSummary.rejected > 0 && `Se excluyeron ${importSummary.rejected} filas inválidas.`}
          </p>
        </div>
      )}

      {/* Preview Table & Validation Step */}
      {rows.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden space-y-4 p-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div>
              <h3 className="text-headline-sm font-bold text-primary">Vista Previa y Mapeo de Registros</h3>
              <p className="text-body-md text-on-surface-variant">
                Total filas analizadas: <strong>{rows.length}</strong> | Válidas: <strong>{validCount}</strong> | Posibles duplicados: <strong>{duplicateCount}</strong>
              </p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={validCount === 0}
              className="flex items-center gap-2 bg-primary hover:bg-secondary text-on-primary font-bold py-2.5 px-5 rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
              <span>Confirmar Importación ({rows.filter((r) => r.selected).length})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/30 text-label-sm uppercase font-semibold select-none">
                  <th className="py-3 px-3 text-center">Importar</th>
                  <th className="py-3 px-3">Fila</th>
                  <th className="py-3 px-3">Entidad Bancaria</th>
                  <th className="py-3 px-3 text-right">Capital</th>
                  <th className="py-3 px-3">Inicio</th>
                  <th className="py-3 px-3 text-right">Plazo / TNA</th>
                  <th className="py-3 px-3 text-right">Monto Est. Venc.</th>
                  <th className="py-3 px-3">Estado Validaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-md text-primary">
                {rows.map((r, idx) => (
                  <tr key={idx} className={r.errors.length > 0 ? 'bg-rose-50/50' : r.isDuplicate ? 'bg-amber-50/50' : 'hover:bg-surface-container-low/40'}>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.selected && r.errors.length === 0}
                        disabled={r.errors.length > 0}
                        onChange={() => toggleSelectRow(idx)}
                        className="w-4 h-4 text-secondary rounded border-outline-variant focus:ring-secondary cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-3 text-label-sm font-semibold text-on-surface-variant">
                      #{r.rowIndex}
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      {r.parsedDeposit ? r.parsedDeposit.bank : String(r.data['Banco'] || r.data['bank'] || '—')}
                    </td>

                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      {r.parsedDeposit ? formatCurrencyARS(r.parsedDeposit.capital) : '—'}
                    </td>

                    <td className="py-3 px-3 tabular-nums">
                      {r.parsedDeposit ? formatDateAR(r.parsedDeposit.startDate) : '—'}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {r.parsedDeposit ? `${r.parsedDeposit.days}d / ${r.parsedDeposit.tna}%` : '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      {r.parsedDeposit ? formatCurrencyARS(r.parsedDeposit.estimatedTotalAmount) : '—'}
                    </td>

                    <td className="py-3 px-3">
                      {r.errors.length > 0 ? (
                        <div className="flex items-center gap-1 text-error text-label-sm font-semibold">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{r.errors.join(' ')}</span>
                        </div>
                      ) : r.isDuplicate ? (
                        <div className="flex items-center gap-1 text-amber-700 text-label-sm font-semibold">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Posible duplicado detectado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#047857] text-label-sm font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                          <span>Válido para importar</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
